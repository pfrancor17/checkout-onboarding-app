variable "project" {
  description = "Prefix for every resource name."
  type        = string
  default     = "checkout-onboarding"
}

variable "region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
}

# ---- Backend container (Lightsail) ----

variable "api_power" {
  description = "Lightsail container power: nano (0.5 GB RAM) or micro (1 GB RAM)."
  type        = string
  default     = "nano"
}

variable "api_image" {
  description = "Image pushed to the container service (e.g. ':checkout-onboarding-api.backend.3'). Empty = create the service without a deployment yet."
  type        = string
  default     = ""
}

# ---- Database (Lightsail managed PostgreSQL) ----

variable "db_bundle" {
  description = "Lightsail database bundle."
  type        = string
  default     = "micro_2_0"
}

variable "db_public" {
  description = "Expose the database outside Lightsail. Keep false: the container reaches it inside the same Region."
  type        = bool
  default     = false
}

# ---- Checkout fees (cents, COP) ----

variable "base_fee_in_cents" {
  type    = number
  default = 300000
}

variable "delivery_fee_in_cents" {
  type    = number
  default = 1000000
}

# ---- Payment gateway (sandbox). Passed as TF_VAR_* by scripts/deploy.sh ----

variable "payment_api_url" {
  description = "Payment gateway sandbox API URL."
  type        = string
  sensitive   = true
}

variable "payment_public_key" {
  type      = string
  sensitive = true
}

variable "payment_private_key" {
  type      = string
  sensitive = true
}

variable "payment_integrity_secret" {
  type      = string
  sensitive = true
}

variable "payment_events_secret" {
  type      = string
  sensitive = true
}
