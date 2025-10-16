# AWS EC2 Deployment Guide
## ContractPodAI Documentation Assistant

This guide provides step-by-step instructions for deploying the ContractPodAI Documentation Assistant to AWS EC2 with RDS PostgreSQL database.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS RDS Setup](#aws-rds-setup)
3. [AWS ECR Setup](#aws-ecr-setup)
4. [AWS EC2 Setup](#aws-ec2-setup)
5. [Application Deployment](#application-deployment)
6. [Database Migration](#database-migration)
7. [GitHub Actions CI/CD Setup](#github-actions-cicd-setup)
8. [SSL/TLS Configuration](#ssltls-configuration-optional)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Restore](#backup--restore)
11. [Troubleshooting](#troubleshooting)
12. [Cost Optimization](#cost-optimization)

---

## Prerequisites

### Required Tools
- AWS Account with appropriate permissions
- AWS CLI installed and configured (`aws configure`)
- SSH client (Terminal on Mac/Linux, PuTTY on Windows)
- Git installed locally
- Docker and Docker Compose (optional for local testing)

### Required Secrets
- **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Session Secret**: Generate with `openssl rand -base64 32`
- **AWS Credentials**: IAM user with EC2, RDS, and ECR permissions

### Estimated Costs (us-east-1)
- **EC2 t3.medium**: ~$30/month (or use t3.small for ~$15/month)
- **RDS db.t3.micro**: ~$15/month (Free Tier: 750 hours/month for 12 months)
- **ECR Storage**: ~$0.10/GB/month
- **Data Transfer**: ~$0.09/GB (first 1GB free)
- **Total**: ~$45-60/month (or ~$25-30 with Free Tier)

---

## AWS RDS Setup

### Step 1: Create RDS PostgreSQL Database

1. **Navigate to RDS Console:**
   ```
   AWS Console → RDS → Databases → Create database
   ```

2. **Database Settings:**
   - **Engine**: PostgreSQL 15.x or later
   - **Template**: Free tier (for testing) or Production (for production)
   - **DB Instance Identifier**: `contractpodai-db`
   - **Master Username**: `contractpodai_admin`
   - **Master Password**: Generate and save securely (min 8 chars)

3. **Instance Configuration:**
   - **DB Instance Class**: db.t3.micro (Free Tier) or db.t3.small
   - **Storage Type**: General Purpose SSD (gp3)
   - **Allocated Storage**: 20 GB
   - **Enable Storage Autoscaling**: Yes (max 100 GB)

4. **Connectivity:**
   - **VPC**: Default VPC or create new
   - **Public Access**: No (access via EC2 in same VPC)
   - **VPC Security Group**: Create new (e.g., `contractpodai-rds-sg`)
   - **Availability Zone**: No preference

5. **Database Authentication:**
   - **Database Name**: `contractpodai_docs`
   - **Port**: 5432 (default)

6. **Backup & Maintenance:**
   - **Enable Automated Backups**: Yes
   - **Backup Retention**: 7 days
   - **Backup Window**: Select preferred time
   - **Maintenance Window**: Select preferred time

7. **Create Database** (takes 5-10 minutes)

### Step 2: Configure Security Group

1. **Edit RDS Security Group:**
   ```
   EC2 Console → Security Groups → <contractpodai-rds-sg>
   ```

2. **Add Inbound Rule:**
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: Custom → Select EC2 security group (created later)
   - **Description**: Allow EC2 app to connect to RDS

3. **Save Rules**

### Step 3: Note RDS Connection Details

After RDS instance is available:
1. Click on DB instance → **Connectivity & security**
2. Note the **Endpoint**: `contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com`
3. Note the **Port**: `5432`

**Connection String Format:**
```
postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs
```

---

## AWS ECR Setup

### Step 1: Create ECR Repository

```bash
# Set region
export AWS_REGION=us-east-1

# Create ECR repository
aws ecr create-repository \
  --repository-name contractpodai-docs-assistant \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Note the repository URI
# Output: <account-id>.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant
```

### Step 2: Build and Push Initial Image (Optional)

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin <account-id>.dkr.ecr.$AWS_REGION.amazonaws.com

# Build image
docker build -t contractpodai-docs-assistant:latest .

# Tag image for ECR
docker tag contractpodai-docs-assistant:latest <account-id>.dkr.ecr.$AWS_REGION.amazonaws.com/contractpodai-docs-assistant:latest

# Push image
docker push <account-id>.dkr.ecr.$AWS_REGION.amazonaws.com/contractpodai-docs-assistant:latest
```

---

## AWS EC2 Setup

### Step 1: Launch EC2 Instance

1. **Navigate to EC2 Console:**
   ```
   AWS Console → EC2 → Instances → Launch Instance
   ```

2. **Instance Configuration:**
   - **Name**: `contractpodai-app-server`
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t3.medium (2 vCPU, 4 GB RAM) or t3.small
   - **Key Pair**: Create new or use existing (download .pem file)

3. **Network Settings:**
   - **VPC**: Same as RDS
   - **Subnet**: Public subnet (for internet access)
   - **Auto-assign Public IP**: Enable
   - **Security Group**: Create new (e.g., `contractpodai-ec2-sg`)

4. **Security Group Rules:**
   - **SSH**: Port 22, Source: My IP (or your office IP range)
   - **HTTP**: Port 80, Source: 0.0.0.0/0 (for load balancer/Nginx)
   - **HTTPS**: Port 443, Source: 0.0.0.0/0 (for SSL)
   - **Custom TCP**: Port 5000, Source: 0.0.0.0/0 (app port, or restrict to ALB)

5. **Storage:**
   - **Size**: 30 GB gp3
   - **Volume Type**: General Purpose SSD (gp3)
   - **Delete on Termination**: Yes (or No for data persistence)

6. **Advanced Details:**
   - **IAM Role**: Create new role with ECR read permissions (AmazonEC2ContainerRegistryReadOnly)
   - **User Data** (optional, for automated setup):
   ```bash
   #!/bin/bash
   apt-get update
   apt-get install -y docker.io docker-compose awscli
   systemctl start docker
   systemctl enable docker
   usermod -aG docker ubuntu
   ```

7. **Launch Instance**

### Step 2: Connect to EC2 Instance

```bash
# SSH to EC2 (replace with your key and IP)
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Step 3: Install Docker and Docker Compose

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Log out and log back in for group changes to take effect
exit
# SSH back in
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Step 4: Install AWS CLI (if not using IAM role)

```bash
# Install AWS CLI
sudo apt-get install -y awscli

# Configure AWS CLI (if not using IAM role)
aws configure
# Enter Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

### Step 5: Configure IAM Role for ECR Access

If you didn't attach IAM role during launch:

1. **Create IAM Role:**
   ```
   IAM Console → Roles → Create role
   - Trusted Entity: AWS service → EC2
   - Permissions: AmazonEC2ContainerRegistryReadOnly
   - Role name: ec2-ecr-access-role
   ```

2. **Attach to EC2:**
   ```
   EC2 Console → Instances → Select instance → Actions → Security → Modify IAM role
   - Select: ec2-ecr-access-role
   - Update IAM role
   ```

---

## Application Deployment

### Step 1: Prepare Application Directory

```bash
# Create application directory
mkdir -p /home/ubuntu/contractpodai-docs-assistant
cd /home/ubuntu/contractpodai-docs-assistant

# Clone repository (or upload files via SCP)
git clone https://github.com/YOUR_ORG/contractpodai-docs-assistant.git .

# Or use SCP to upload files from local machine:
# scp -i your-key.pem -r ./* ubuntu@<EC2_PUBLIC_IP>:/home/ubuntu/contractpodai-docs-assistant/
```

### Step 2: Create Environment File

```bash
# Copy example env file
cp .env.example .env

# Edit with actual values
nano .env
```

**Edit `.env` with your values:**

```env
# Node Environment
NODE_ENV=production

# AWS RDS Database
DATABASE_URL=postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs
PGHOST=contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com
PGPORT=5432
PGUSER=contractpodai_admin
PGPASSWORD=YOUR_PASSWORD
PGDATABASE=contractpodai_docs

# API Keys
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your_random_session_secret_here
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X)

### Step 3: Configure ECR Image for Deployment

The docker-compose.yml file uses the `DOCKER_IMAGE` environment variable to specify which image to run. This allows you to use ECR images in production while using local builds in development.

**Important: You MUST export DOCKER_IMAGE before running docker-compose up, otherwise it will use the local fallback image instead of your ECR image.**

```bash
# Set your ECR repository details
export AWS_ACCOUNT_ID=<your-account-id>
export AWS_REGION=us-east-1
export ECR_REPOSITORY=contractpodai-docs-assistant
export IMAGE_TAG=latest  # or specific commit SHA

# Export DOCKER_IMAGE environment variable
export DOCKER_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

# Verify it's set correctly
echo $DOCKER_IMAGE
# Output: 123456789.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant:latest
```

**Pro Tip: Add to your shell profile for persistence**

```bash
# Add to ~/.bashrc or ~/.profile
echo 'export DOCKER_IMAGE=123456789.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant:latest' >> ~/.bashrc
source ~/.bashrc
```

### Step 4: Login to ECR and Pull Image

```bash
# Login to ECR (using IAM role)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Pull image
docker pull <account-id>.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant:latest

# Or build locally if no ECR image yet
docker-compose build
```

### Step 5: Start Application

```bash
# IMPORTANT: Ensure DOCKER_IMAGE is set (from Step 3)
echo $DOCKER_IMAGE
# Should output: <account-id>.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant:latest

# If not set, export it now:
export DOCKER_IMAGE=<account-id>.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant:latest

# Start application with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Verify correct image is running
docker-compose ps
# Should show ECR image, not local image
```

### Step 6: Verify Application

```bash
# Check health endpoint
curl http://localhost:5000/api/health

# Expected output: {"status":"ok"}

# From your browser, visit:
http://<EC2_PUBLIC_IP>:5000
```

---

## Database Migration

### Step 1: Connect to Database

```bash
# Install PostgreSQL client (for testing)
sudo apt-get install -y postgresql-client

# Test connection
psql "postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs"
```

### Step 2: Run Database Migrations

The application uses Drizzle ORM for schema management.

**Option A: Push Schema (Recommended for Initial Setup)**

```bash
# Enter Docker container
docker-compose exec app sh

# Push database schema
npm run db:push

# Exit container
exit
```

**Option B: Generate and Run Migrations**

```bash
# Generate migration
docker-compose exec app npm run db:generate

# Apply migration
docker-compose exec app npm run db:migrate
```

### Step 3: Create Admin User

After database is set up, create the first admin user:

```bash
# Connect to PostgreSQL
psql "postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs"

# Insert admin user (password: admin123 - CHANGE THIS!)
INSERT INTO users (email, password, name, employee_id, is_admin, is_active)
VALUES (
  'admin@contractpodai.com',
  '$2b$10$rJXKxmX4xqLZGxq1KxqLZOkXxqLZGxqLZGxqLZGxqLZGxqLZGxqLZ',  -- bcrypt hash of 'admin123'
  'Admin User',
  'ADMIN001',
  true,
  true
);

# Exit psql
\q
```

**IMPORTANT: Change admin password immediately after first login!**

### Step 4: Verify Database Tables

```bash
# List all tables
psql "postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs" -c "\dt"

# Expected tables:
# - users
# - sessions
# - conversations
# - conversation_messages
# - documents
# - document_chunks
# - password_reset_requests
# - user_activity
# - message_feedback
# - feedback_submissions
```

---

## GitHub Actions CI/CD Setup

See [GitHub Actions Setup Guide](.github/GITHUB_ACTIONS_SETUP.md) for detailed instructions.

**Quick Summary:**

1. **Set GitHub Secrets** (in repository settings):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `ECR_REPOSITORY_NAME`: `contractpodai-docs-assistant`
   - `EC2_HOST`: EC2 public IP or DNS
   - `EC2_USERNAME`: `ubuntu`
   - `EC2_SSH_PRIVATE_KEY`: Full PEM content

2. **Push to main branch** to trigger deployment

3. **Monitor deployment** in GitHub Actions tab

**Note:** GitHub Actions workflow automatically exports `DOCKER_IMAGE` before running `docker-compose up` on EC2, ensuring the correct ECR image is deployed. For manual deployments, you must export `DOCKER_IMAGE` yourself as described in Step 3 above.

---

## SSL/TLS Configuration (Optional)

### Option 1: Using Nginx as Reverse Proxy with Let's Encrypt

#### Install Nginx

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

#### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/contractpodai
```

**Add configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/contractpodai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Auto-renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot adds auto-renewal cron job automatically
```

### Option 2: Using AWS Application Load Balancer (ALB)

1. **Create ALB** in AWS Console
2. **Create Target Group** pointing to EC2 instance port 5000
3. **Add SSL Certificate** from ACM (AWS Certificate Manager)
4. **Update Security Groups** to allow ALB → EC2 traffic
5. **Point DNS** to ALB DNS name

---

## Monitoring & Logging

### Application Logs

```bash
# View real-time logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app

# View last 100 lines
docker-compose logs --tail=100 app

# Export logs to file
docker-compose logs > app-logs-$(date +%Y%m%d).log
```

### System Monitoring

```bash
# Monitor Docker containers
docker stats

# Monitor system resources
htop  # Install with: sudo apt-get install htop

# Monitor disk usage
df -h

# Monitor Docker volumes
docker volume ls
docker system df
```

### AWS CloudWatch (Optional)

1. **Install CloudWatch Agent:**
   ```bash
   wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
   sudo dpkg -i amazon-cloudwatch-agent.deb
   ```

2. **Configure agent** to send logs to CloudWatch

3. **Create CloudWatch Dashboards** for metrics

### Set Up Alerts

Create CloudWatch Alarms for:
- EC2 CPU > 80%
- RDS CPU > 80%
- RDS Free Storage < 2GB
- Application health check failures

---

## Backup & Restore

### Docker Volumes Backup

```bash
# Backup uploads volume
docker run --rm -v uploads-data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup-$(date +%Y%m%d).tar.gz /data

# Backup feedback volume
docker run --rm -v feedback-data:/data -v $(pwd):/backup alpine tar czf /backup/feedback-backup-$(date +%Y%m%d).tar.gz /data

# List backups
ls -lh *-backup-*.tar.gz
```

### Docker Volumes Restore

```bash
# Restore uploads
docker run --rm -v uploads-data:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup-20250101.tar.gz -C /

# Restore feedback
docker run --rm -v feedback-data:/data -v $(pwd):/backup alpine tar xzf /backup/feedback-backup-20250101.tar.gz -C /
```

### RDS Automated Backups

RDS automatically creates backups based on retention period (7 days).

**Manual Snapshot:**
```bash
aws rds create-db-snapshot \
  --db-instance-identifier contractpodai-db \
  --db-snapshot-identifier contractpodai-manual-snapshot-$(date +%Y%m%d)
```

**Restore from Snapshot:**
1. AWS Console → RDS → Snapshots
2. Select snapshot → Actions → Restore snapshot
3. Configure new instance → Restore

### Database Export/Import

**Export Database:**
```bash
pg_dump "postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs" > contractpodai_backup_$(date +%Y%m%d).sql
```

**Import Database:**
```bash
psql "postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs" < contractpodai_backup_20250101.sql
```

### Automated Backup Script

Create `/home/ubuntu/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup volumes
docker run --rm -v uploads-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads-$DATE.tar.gz /data
docker run --rm -v feedback-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/feedback-$DATE.tar.gz /data

# Backup database
pg_dump "postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs" > $BACKUP_DIR/database-$DATE.sql

# Upload to S3 (optional)
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/contractpodai/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Schedule with cron:**
```bash
chmod +x /home/ubuntu/backup.sh
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/backup.sh >> /home/ubuntu/backup.log 2>&1
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
docker-compose logs
```

**Common issues:**
- **Database connection failed**: Verify DATABASE_URL in .env
- **Port 5000 in use**: `sudo lsof -i :5000`, kill process or change port
- **Permission denied**: Check file permissions, docker group membership

**Restart application:**
```bash
docker-compose down
docker-compose up -d
```

### Database Connection Issues

**Test connection from EC2:**
```bash
psql "postgresql://contractpodai_admin:YOUR_PASSWORD@contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/contractpodai_docs"
```

**Check RDS security group:**
- Ensure inbound rule allows EC2 security group on port 5432
- Verify RDS is in same VPC as EC2

**Check network connectivity:**
```bash
telnet contractpodai-db.xxxxxx.us-east-1.rds.amazonaws.com 5432
```

### ECR Login Failed

**Check IAM role:**
```bash
aws sts get-caller-identity
```

**Manual login:**
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Wrong Image Running (Using Local Instead of ECR)

**Problem**: Application is using local fallback image instead of ECR image

**Check current image:**
```bash
docker-compose ps
# Look at IMAGE column - should show ECR registry URL
```

**Solution**: Export DOCKER_IMAGE before docker-compose up
```bash
# Set ECR image
export DOCKER_IMAGE=<account-id>.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant:latest

# Restart with correct image
docker-compose down
docker-compose up -d

# Verify ECR image is now running
docker-compose ps
```

**Make it persistent:**
```bash
echo 'export DOCKER_IMAGE=<account-id>.dkr.ecr.us-east-1.amazonaws.com/contractpodai-docs-assistant:latest' >> ~/.bashrc
source ~/.bashrc
```

### Health Check Fails

**Test locally:**
```bash
curl http://localhost:5000/api/health
```

**Check if app is running:**
```bash
docker-compose ps
docker-compose logs app
```

**Verify environment variables:**
```bash
docker-compose exec app printenv | grep DATABASE_URL
```

### Out of Memory

**Check memory usage:**
```bash
free -h
docker stats
```

**Increase swap space:**
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Or upgrade EC2 instance type:**
```bash
# Stop instance, change type to t3.medium, restart
```

### Disk Space Full

**Check disk usage:**
```bash
df -h
docker system df
```

**Clean Docker resources:**
```bash
docker system prune -a
docker volume prune
```

**Clean old logs:**
```bash
sudo journalctl --vacuum-time=7d
find /var/log -name "*.log" -mtime +30 -delete
```

### SSL Certificate Issues

**Check certificate expiry:**
```bash
sudo certbot certificates
```

**Renew certificate:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### GitHub Actions Deployment Failed

**Check SSH connection:**
```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

**Verify GitHub Secrets:**
- EC2_SSH_PRIVATE_KEY has full PEM content (including headers)
- EC2_HOST is correct (public IP or DNS)
- AWS credentials have ECR permissions

**Check EC2 security group:**
- Port 22 open from GitHub Actions IPs (or 0.0.0.0/0 temporarily)

---

## Cost Optimization

### EC2 Instance

- **Use Reserved Instances** (1-year or 3-year) for 40-60% savings
- **Use Savings Plans** for flexible commitment
- **Right-size instance**: Start with t3.small, upgrade if needed
- **Schedule downtime**: Stop instance during off-hours (development only)

### RDS Database

- **Use Reserved Instances** for production databases
- **Enable Storage Autoscaling** to avoid over-provisioning
- **Delete old snapshots** after retention period
- **Use db.t3.micro** for development (Free Tier eligible)

### ECR Storage

- **Set lifecycle policies** to delete old images:
  ```bash
  aws ecr put-lifecycle-policy \
    --repository-name contractpodai-docs-assistant \
    --lifecycle-policy-text '{"rules":[{"rulePriority":1,"selection":{"tagStatus":"untagged","countType":"imageCountMoreThan","countNumber":3},"action":{"type":"expire"}}]}'
  ```

### Data Transfer

- **Use CloudFront CDN** to reduce data transfer costs
- **Enable compression** in Nginx
- **Keep resources in same region** to avoid cross-region charges

### Monitoring Costs

```bash
# Check AWS costs
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

---

## Production Checklist

### Before Going Live

- [ ] RDS automated backups enabled (7-30 days retention)
- [ ] SSL/TLS certificate installed and configured
- [ ] Domain name configured with DNS
- [ ] Admin password changed from default
- [ ] Strong SESSION_SECRET generated
- [ ] API keys verified and valid
- [ ] **DOCKER_IMAGE environment variable configured (critical for ECR deployment)**
- [ ] Verified ECR image is running (not local fallback): `docker-compose ps`
- [ ] Security groups restricted (no 0.0.0.0/0 for SSH)
- [ ] CloudWatch alarms configured
- [ ] Backup automation scheduled
- [ ] Health check monitoring enabled
- [ ] Application logs reviewed
- [ ] Performance tested under load
- [ ] GitHub Actions CI/CD tested
- [ ] Rollback procedure documented and tested

### Security Hardening

- [ ] Disable password authentication for SSH (use keys only)
- [ ] Enable AWS GuardDuty for threat detection
- [ ] Use AWS WAF for application firewall
- [ ] Enable RDS encryption at rest
- [ ] Enable CloudTrail for audit logging
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Implement least privilege IAM policies
- [ ] Regular security updates: `sudo apt-get update && sudo apt-get upgrade`

### Monitoring Checklist

- [ ] Application health check endpoint working
- [ ] CloudWatch metrics flowing
- [ ] Log aggregation configured
- [ ] Alert notifications set up (email, Slack, PagerDuty)
- [ ] Uptime monitoring (Pingdom, UptimeRobot)
- [ ] APM tool integrated (optional: New Relic, Datadog)

---

## Additional Resources

### AWS Documentation
- [RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [ECR User Guide](https://docs.aws.amazon.com/ecr/)
- [VPC Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)

### Docker Documentation
- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Volumes](https://docs.docker.com/storage/volumes/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Application Documentation
- [GitHub Actions Setup](.github/GITHUB_ACTIONS_SETUP.md)
- [Environment Variables](.env.example)
- [Project README](README.md)

---

## Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Monitor application health and logs
- Check CloudWatch alarms

**Weekly:**
- Review application logs for errors
- Check disk space and clean if needed
- Update Docker images: `docker-compose pull && docker-compose up -d`

**Monthly:**
- Review AWS costs and optimize
- Update system packages: `sudo apt-get update && sudo apt-get upgrade`
- Rotate credentials and API keys
- Test backup and restore procedures
- Review and update SSL certificates

**Quarterly:**
- Security audit and penetration testing
- Performance optimization review
- Capacity planning and scaling review
- Disaster recovery drill

### Getting Help

For issues or questions:
1. Check this deployment guide
2. Review application logs: `docker-compose logs`
3. Check AWS CloudWatch logs and metrics
4. Contact DevOps team or platform administrator

---

## Conclusion

You have successfully deployed ContractPodAI Documentation Assistant to AWS EC2 with RDS PostgreSQL database. The application is now running in production with:

✅ High-availability database (AWS RDS)  
✅ Scalable compute (AWS EC2)  
✅ Automated CI/CD (GitHub Actions)  
✅ Persistent storage (Docker volumes)  
✅ Secure configuration (SSL/TLS)  
✅ Monitoring and alerting (CloudWatch)  
✅ Backup and disaster recovery  

**Next Steps:**
1. Configure domain name and SSL
2. Set up monitoring dashboards
3. Schedule automated backups
4. Perform load testing
5. Train users and administrators

---

*Last Updated: January 2025*  
*Version: 1.0*
