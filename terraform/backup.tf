# S3 bucket for Longhorn volume backups (Minecraft world data).
# Longhorn is configured to target this bucket via k8s/monitoring/longhorn-backup.yaml.

resource "aws_s3_bucket" "backups" {
  bucket        = "mineforge-ai-backups-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = {
    Name    = "${var.project_name}-backups"
    Project = var.project_name
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM user Longhorn uses to write backups
resource "aws_iam_user" "longhorn_backup" {
  name = "${var.project_name}-longhorn-backup"
  tags = { Project = var.project_name }
}

resource "aws_iam_access_key" "longhorn_backup" {
  user = aws_iam_user.longhorn_backup.name
}

resource "aws_iam_user_policy" "longhorn_backup" {
  name = "longhorn-s3-backup"
  user = aws_iam_user.longhorn_backup.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ]
      Resource = [
        aws_s3_bucket.backups.arn,
        "${aws_s3_bucket.backups.arn}/*"
      ]
    }]
  })
}

output "backup_bucket" {
  description = "S3 bucket name for Longhorn backups"
  value       = aws_s3_bucket.backups.bucket
}

output "longhorn_backup_access_key_id" {
  description = "Access key ID for Longhorn backup IAM user (put in longhorn-backup secret)"
  value       = aws_iam_access_key.longhorn_backup.id
  sensitive   = false
}

output "longhorn_backup_secret_access_key" {
  description = "Secret key for Longhorn backup IAM user (put in longhorn-backup secret)"
  value       = aws_iam_access_key.longhorn_backup.secret
  sensitive   = true
}
