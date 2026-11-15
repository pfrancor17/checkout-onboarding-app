# Managed PostgreSQL. Private by default: only Lightsail resources in the
# same Region (the API container) can reach it.

resource "random_password" "db" {
  length  = 32
  special = false # Lightsail rejects some symbols (/, @, ")
}

resource "aws_lightsail_database" "main" {
  relational_database_name = "${var.project}-db"
  availability_zone        = "${var.region}a"
  blueprint_id             = "postgres_16"
  bundle_id                = var.db_bundle
  master_database_name     = "checkout"
  master_username          = "checkout"
  master_password          = random_password.db.result
  publicly_accessible      = var.db_public
  backup_retention_enabled = true
  skip_final_snapshot      = true
  apply_immediately        = true
}
