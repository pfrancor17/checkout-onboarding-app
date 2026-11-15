output "app_url" {
  description = "Public URL of the app."
  value       = local.app_url
}

output "api_docs_url" {
  description = "Public Swagger UI."
  value       = "${local.app_url}/api/docs"
}

output "webhook_url" {
  description = "URL to configure for the payment gateway events."
  value       = "${local.app_url}/api/webhooks/payment-events"
}

output "region" {
  value = var.region
}

output "web_bucket" {
  value = aws_s3_bucket.web.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.app.id
}

output "api_service_name" {
  value = aws_lightsail_container_service.api.name
}

output "api_service_url" {
  description = "Direct URL of the container (CloudFront is the public entry)."
  value       = aws_lightsail_container_service.api.url
}
