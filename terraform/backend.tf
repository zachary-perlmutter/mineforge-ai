terraform {
  backend "s3" {
    bucket         = "mineforge-ai-tfstate-908730890940"
    key            = "mineforge-ai/terraform.tfstate"
    region         = "us-east-1"
    profile        = "mineforge"
    dynamodb_table = "mineforge-ai-tfstate-lock"
    encrypt        = true
  }
}
