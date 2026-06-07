variable "aws_region" {
  description = "AWS region"
  default     = "eu-north-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.medium"
}

variable "key_name" {
  description = "SSH key pair name"
  default     = "cloudchat-key"
}