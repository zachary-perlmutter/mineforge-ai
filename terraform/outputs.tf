output "server_public_ip" {
  description = "Public IP of the K3s server node"
  value       = aws_instance.k3s_server.public_ip
}

output "server_public_dns" {
  description = "Public DNS of the K3s server node"
  value       = aws_instance.k3s_server.public_dns
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "ssh_command" {
  description = "SSH command to connect to the server node"
  value       = "ssh -i ~/.ssh/id_rsa ubuntu@${aws_instance.k3s_server.public_ip}"
}

output "web_url" {
  description = "MineForge web portal URL"
  value       = "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "s3_bucket" {
  description = "S3 bucket for the React build"
  value       = aws_s3_bucket.web.bucket
}

output "cloudfront_id" {
  description = "CloudFront distribution ID (needed for cache invalidation)"
  value       = aws_cloudfront_distribution.web.id
}
