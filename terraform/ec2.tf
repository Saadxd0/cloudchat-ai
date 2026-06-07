# Get latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

# Create SSH key pair
resource "aws_key_pair" "cloudchat_key" {
  key_name   = var.key_name
  public_key = file("~/.ssh/id_rsa.pub")
}

# EC2 Instance
resource "aws_instance" "cloudchat_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.cloudchat_key.key_name
  vpc_security_group_ids = [aws_security_group.cloudchat_sg.id]

  tags = {
    Name = "cloudchat-server"
  }

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io docker-compose
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ubuntu
  EOF
}

output "ec2_public_ip" {
  value = aws_instance.cloudchat_server.public_ip
}

output "ec2_public_dns" {
  value = aws_instance.cloudchat_server.public_dns
}