#!/usr/bin/env bash
# Deletes everything created by deploy.sh (database, container service,
# bucket and CloudFront). Terraform lists what it will delete and asks
# for confirmation. Run it once the evaluation is over.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

# The variables are required by the configuration even to destroy it.
read_env() {
  local value
  value="$(grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"'"'"'\r')"
  [ -n "$value" ] || { echo "$1 is empty in backend/.env" >&2; exit 1; }
  printf '%s' "$value"
}
for name in PAYMENT_API_URL PAYMENT_PUBLIC_KEY PAYMENT_PRIVATE_KEY \
            PAYMENT_INTEGRITY_SECRET PAYMENT_EVENTS_SECRET; do
  # Assigned on its own line so a missing key stops the script (set -e).
  value="$(read_env "$name")"
  export "TF_VAR_$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')=$value"
done
unset value

cd "$ROOT/infra"
terraform init -input=false >/dev/null
terraform destroy
rm -f image.auto.tfvars
echo "Everything was deleted. AWS stops charging credits for these resources."
