#!/usr/bin/env bash
# Deploys the whole app to AWS (Lightsail + S3 + CloudFront) with Terraform.
#
#   ./infra/scripts/deploy.sh
#
# Reads the payment gateway sandbox keys from backend/.env (never printed,
# never committed) and passes them to Terraform as TF_VAR_* variables.
# Terraform asks for confirmation before creating or changing anything.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INFRA="$ROOT/infra"
ENV_FILE="$ROOT/backend/.env"
IMAGE_LOCAL="checkout-backend:latest"

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
fail() { printf '\033[1;31m✖ %s\033[0m\n' "$1" >&2; exit 1; }

# ---- 0. Prerequisites -------------------------------------------------------
step "Checking tools and AWS access"
for tool in aws terraform docker lightsailctl npm; do
  command -v "$tool" >/dev/null || fail "Missing '$tool'. See infra/README.md."
done
docker info >/dev/null 2>&1 || fail "Docker is not running."
aws sts get-caller-identity --query Arn --output text >/dev/null \
  || fail "AWS CLI is not configured (run 'aws configure')."
[ -f "$ENV_FILE" ] || fail "Missing $ENV_FILE (copy backend/.env.example)."

# ---- 1. Secrets from backend/.env -> TF_VAR_* (never echoed) -----------------
read_env() {
  local value
  value="$(grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"'"'"'\r')"
  [ -n "$value" ] || fail "$1 is empty in backend/.env"
  printf '%s' "$value"
}
for name in PAYMENT_API_URL PAYMENT_PUBLIC_KEY PAYMENT_PRIVATE_KEY \
            PAYMENT_INTEGRITY_SECRET PAYMENT_EVENTS_SECRET; do
  # Assigned on its own line so a missing key stops the script (set -e).
  value="$(read_env "$name")"
  export "TF_VAR_$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')=$value"
done
unset value

cd "$INFRA"
terraform init -input=false -upgrade >/dev/null

# ---- 2. Infrastructure (database, container service, bucket, CDN) ----------
step "Creating / updating the infrastructure (the first time takes ~15 min)"
terraform apply

SERVICE="$(terraform output -raw api_service_name)"
BUCKET="$(terraform output -raw web_bucket)"
DISTRIBUTION="$(terraform output -raw distribution_id)"
APP_URL="$(terraform output -raw app_url)"
REGION="$(terraform output -raw region)"

# ---- 3. Backend image -> Lightsail ------------------------------------------
step "Building the backend image (linux/amd64)"
docker buildx build --platform linux/amd64 --load -t "$IMAGE_LOCAL" "$ROOT/backend"

step "Pushing the image to the container service"
PUSH_OUTPUT="$(aws lightsail push-container-image --region "$REGION" \
  --service-name "$SERVICE" --label backend --image "$IMAGE_LOCAL")"
IMAGE_REF="$(printf '%s' "$PUSH_OUTPUT" | grep -oE '":[^"]+"' | tail -1 | tr -d '"')"
[ -n "$IMAGE_REF" ] || fail "Could not read the pushed image name."
echo "Image: $IMAGE_REF"
printf 'api_image = "%s"\n' "$IMAGE_REF" > "$INFRA/image.auto.tfvars"

step "Deploying the new image"
terraform apply

# ---- 4. Frontend -> S3 + CloudFront -----------------------------------------
step "Building the frontend"
# Only PUBLIC values go into the browser bundle: the gateway URL and its
# public key. Private keys stay in the backend.
PAYMENT_API_URL="$(read_env PAYMENT_API_URL)"
PAYMENT_PUBLIC_KEY="$(read_env PAYMENT_PUBLIC_KEY)"
(
  cd "$ROOT/frontend"
  npm ci --silent
  VITE_API_URL="/api" \
  VITE_PAYMENT_API_URL="$PAYMENT_API_URL" \
  VITE_PAYMENT_PUBLIC_KEY="$PAYMENT_PUBLIC_KEY" \
  npm run build
)

step "Uploading the frontend"
DIST="$ROOT/frontend/dist"
# Hashed assets never change: cache them for a year.
aws s3 sync "$DIST/assets" "s3://$BUCKET/assets" --delete \
  --cache-control "public,max-age=31536000,immutable"
# Product images and the favicon keep their names: cache for a day.
aws s3 sync "$DIST" "s3://$BUCKET" --delete \
  --exclude "assets/*" --exclude "index.html" \
  --cache-control "public,max-age=86400"
# index.html must always be fresh so new deployments show up at once.
aws s3 cp "$DIST/index.html" "s3://$BUCKET/index.html" --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" \
  --paths "/index.html" "/images/*" "/favicon.svg" >/dev/null

# ---- 5. Wait until the API answers through CloudFront ------------------------
step "Waiting for the API (container start + migrations + seed)"
for _ in $(seq 1 60); do
  if curl -fsS "$APP_URL/api/health" >/dev/null 2>&1; then
    printf '\n\033[1;32m✔ Deployed\033[0m\n'
    echo "App:      $APP_URL"
    echo "Swagger:  $(terraform output -raw api_docs_url)"
    echo "Webhook:  $(terraform output -raw webhook_url)"
    exit 0
  fi
  sleep 10
done
fail "The API did not answer in 10 minutes. Check: aws lightsail get-container-log --service-name $SERVICE --container-name api"
