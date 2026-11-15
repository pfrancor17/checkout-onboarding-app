# NestJS API in a Lightsail container service. Lightsail gives it an HTTPS
# endpoint; CloudFront forwards /api/* to it.

resource "aws_lightsail_container_service" "api" {
  name  = "${var.project}-api"
  power = var.api_power
  scale = 1
}

locals {
  api_domain = trimsuffix(trimprefix(aws_lightsail_container_service.api.url, "https://"), "/")
  app_url    = "https://${aws_cloudfront_distribution.app.domain_name}"
}

resource "aws_lightsail_container_service_deployment_version" "api" {
  count        = var.api_image == "" ? 0 : 1
  service_name = aws_lightsail_container_service.api.name

  container {
    container_name = "api"
    image          = var.api_image

    ports = {
      "3000" = "HTTP"
    }

    environment = {
      NODE_ENV    = "production"
      PORT        = "3000"
      CORS_ORIGIN = local.app_url

      DB_HOST     = aws_lightsail_database.main.master_endpoint_address
      DB_PORT     = tostring(aws_lightsail_database.main.master_endpoint_port)
      DB_USER     = aws_lightsail_database.main.master_username
      DB_PASSWORD = random_password.db.result
      DB_NAME     = aws_lightsail_database.main.master_database_name
      DB_SSL      = "true"
      # Migrations + seed run in the container start command.
      DB_RUN_MIGRATIONS = "false"

      BASE_FEE_IN_CENTS     = tostring(var.base_fee_in_cents)
      DELIVERY_FEE_IN_CENTS = tostring(var.delivery_fee_in_cents)

      PAYMENT_API_URL          = var.payment_api_url
      PAYMENT_PUBLIC_KEY       = var.payment_public_key
      PAYMENT_PRIVATE_KEY      = var.payment_private_key
      PAYMENT_INTEGRITY_SECRET = var.payment_integrity_secret
      PAYMENT_EVENTS_SECRET    = var.payment_events_secret
    }
  }

  public_endpoint {
    container_name = "api"
    container_port = 3000

    health_check {
      path                = "/api/health"
      success_codes       = "200"
      interval_seconds    = 10
      timeout_seconds     = 5
      healthy_threshold   = 2
      unhealthy_threshold = 3
    }
  }
}
