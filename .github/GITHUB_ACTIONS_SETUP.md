# GitHub Actions CI/CD Setup

This document explains how to set up GitHub Actions for automated deployment to AWS EC2.

## Required GitHub Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions, then add the following secrets:

### AWS Credentials

| Secret Name | Description | Example |
|------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key ID with ECR and EC2 permissions | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `ECR_REPOSITORY_NAME` | Amazon ECR repository name for Docker images | `contractpodai-docs-assistant` |

### EC2 Access

| Secret Name | Description | Example |
|------------|-------------|---------|
| `EC2_HOST` | Public IP address or DNS of your EC2 instance | `ec2-54-123-45-67.compute-1.amazonaws.com` |
| `EC2_USERNAME` | SSH username for EC2 instance | `ubuntu` |
| `EC2_SSH_PRIVATE_KEY` | Private SSH key for EC2 access (full PEM content) | `-----BEGIN RSA PRIVATE KEY-----...` |

## AWS IAM Permissions

Create an IAM user for GitHub Actions with the following permissions:

### ECR Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

### EC2 Permissions (if using Systems Manager)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ssm:SendCommand",
        "ssm:GetCommandInvocation"
      ],
      "Resource": "*"
    }
  ]
}
```

## EC2 Instance Setup

Ensure your EC2 instance has:

1. **Docker and Docker Compose installed**
2. **AWS CLI configured** (for ECR login)
3. **Application directory created:**
   ```bash
   mkdir -p /home/ubuntu/contractpodai-docs-assistant
   cd /home/ubuntu/contractpodai-docs-assistant
   ```

4. **Docker Compose file deployed** with image placeholder:
   ```yaml
   version: '3.8'
   services:
     app:
       image: <ECR_REGISTRY>/<ECR_REPOSITORY>:latest
       # ... rest of your docker-compose.yml
   ```

5. **Environment file (.env) with secrets:**
   ```bash
   cp .env.example .env
   # Edit .env with actual values for:
   # - DATABASE_URL (AWS RDS)
   # - GEMINI_API_KEY
   # - SESSION_SECRET
   ```

6. **SSH access configured:**
   - Add GitHub Actions SSH public key to `~/.ssh/authorized_keys`
   - Ensure security group allows SSH (port 22) from GitHub Actions IPs

## Amazon ECR Setup

1. **Create ECR repository:**
   ```bash
   aws ecr create-repository \
     --repository-name contractpodai-docs-assistant \
     --region us-east-1
   ```

2. **Note the repository URI:**
   ```
   <account-id>.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant
   ```

3. **Set ECR_REPOSITORY_NAME secret** to `contractpodai-docs-assistant`

## Workflow Triggers

The GitHub Actions workflow runs:
- **Automatically** on every push to the `main` branch
- **Manually** via workflow dispatch in GitHub Actions tab

## Deployment Process

1. Developer pushes code to `main` branch
2. GitHub Actions workflow triggers
3. Code is checked out and Docker image is built
4. Image is pushed to Amazon ECR with commit SHA tag
5. SSH connection to EC2 instance
6. Pull latest image from ECR
7. Stop old container and start new one
8. Verify health endpoint
9. Notify success/failure

## Health Check

The workflow verifies deployment by checking:
```
http://<EC2_HOST>:5000/api/health
```

Expected response: `{"status":"ok"}`

## Troubleshooting

### SSH Connection Failed
- Verify EC2_SSH_PRIVATE_KEY is complete PEM content (including headers/footers)
- Check security group allows SSH from GitHub Actions
- Confirm EC2_USERNAME is correct (usually `ubuntu` for Ubuntu AMI)

### ECR Login Failed
- Verify AWS credentials have ECR permissions
- Check ECR repository exists in correct region
- Ensure AWS_REGION matches ECR repository region

### Docker Pull Failed on EC2
- Ensure AWS CLI is configured on EC2 instance
- Verify EC2 instance IAM role has ECR read permissions
- Check network connectivity to ECR

### Health Check Failed
- Verify port 5000 is exposed in docker-compose.yml
- Check application logs: `docker-compose logs`
- Ensure .env file has correct database and API credentials
- Verify security group allows inbound traffic on port 5000

## Security Best Practices

1. **Use IAM roles** for EC2 instead of storing AWS credentials
2. **Rotate SSH keys** regularly
3. **Use AWS Secrets Manager** for sensitive environment variables
4. **Enable ECR image scanning** for vulnerability detection
5. **Restrict GitHub Actions** to specific branches or protected tags
6. **Use GitHub Environments** with required reviewers for production deployments

## Alternative: Docker Hub Deployment

If using Docker Hub instead of ECR:

1. Replace ECR login with Docker Hub login
2. Set `DOCKER_HUB_USERNAME` and `DOCKER_HUB_TOKEN` secrets
3. Modify workflow to push to Docker Hub repository
4. Update EC2 deployment to pull from Docker Hub

## Monitoring

After deployment, monitor:
- **Application logs:** `docker-compose logs -f`
- **Container health:** `docker-compose ps`
- **Resource usage:** `docker stats`
- **AWS CloudWatch** for EC2 metrics
- **Application health endpoint:** Regular health checks

## Rollback

To rollback to a previous version:

1. Find previous image tag in ECR (commit SHA)
2. Update docker-compose.yml with old image tag
3. Run `docker-compose up -d` on EC2
4. Or trigger workflow with specific commit SHA

## Next Steps

1. Set up all GitHub Secrets
2. Create ECR repository
3. Configure EC2 instance
4. Push to main branch to trigger first deployment
5. Monitor deployment in GitHub Actions tab
6. Verify application is running at http://<EC2_HOST>:5000
