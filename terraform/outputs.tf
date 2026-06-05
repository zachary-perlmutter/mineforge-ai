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
