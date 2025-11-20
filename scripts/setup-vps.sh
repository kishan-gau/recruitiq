#!/bin/bash

# RecruitIQ VPS Deployment Script
# This script sets up the TransIP VPS for first-time deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}RecruitIQ VPS Setup Script${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install required packages
echo -e "${YELLOW}Installing required packages...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    git

# Install Docker
echo -e "${YELLOW}Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Install Docker Compose
echo -e "${YELLOW}Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# Create deployment user
echo -e "${YELLOW}Creating deployment user...${NC}"
if ! id -u deployuser > /dev/null 2>&1; then
    useradd -m -s /bin/bash deployuser
    usermod -aG docker deployuser
    echo -e "${GREEN}Deployment user created${NC}"
else
    echo -e "${GREEN}Deployment user already exists${NC}"
fi

# Setup SSH for deployment user
echo -e "${YELLOW}Setting up SSH for deployment user...${NC}"
mkdir -p /home/deployuser/.ssh
chmod 700 /home/deployuser/.ssh

# You'll need to add your deployment SSH public key here
read -p "Enter SSH public key for deployment (or press Enter to skip): " ssh_key
if [ ! -z "$ssh_key" ]; then
    echo "$ssh_key" > /home/deployuser/.ssh/authorized_keys
    chmod 600 /home/deployuser/.ssh/authorized_keys
    chown -R deployuser:deployuser /home/deployuser/.ssh
fi

# Create application directory
echo -e "${YELLOW}Creating application directory...${NC}"
mkdir -p /opt/recruitiq
chown deployuser:deployuser /opt/recruitiq

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

# Configure fail2ban
echo -e "${YELLOW}Configuring fail2ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban

# Setup log rotation
echo -e "${YELLOW}Setting up log rotation...${NC}"
cat > /etc/logrotate.d/recruitiq << 'EOF'
/opt/recruitiq/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deployuser deployuser
    sharedscripts
}
EOF

# Setup automatic security updates
echo -e "${YELLOW}Configuring automatic security updates...${NC}"
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Configure swap (useful for VPS with limited RAM)
echo -e "${YELLOW}Setting up swap space...${NC}"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# Create monitoring script
echo -e "${YELLOW}Creating monitoring script...${NC}"
cat > /opt/recruitiq/monitor.sh << 'EOF'
#!/bin/bash
# Check if services are running and restart if needed

cd /opt/recruitiq

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "$(date): Services down, attempting restart..." >> /opt/recruitiq/logs/monitor.log
    docker-compose up -d
fi

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "$(date): Disk usage critical: ${DISK_USAGE}%" >> /opt/recruitiq/logs/monitor.log
    # Clean up old Docker images
    docker image prune -a -f --filter "until=168h"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "$(date): Memory usage critical: ${MEM_USAGE}%" >> /opt/recruitiq/logs/monitor.log
fi
EOF

chmod +x /opt/recruitiq/monitor.sh

# Setup cron job for monitoring
echo -e "${YELLOW}Setting up monitoring cron job...${NC}"
(crontab -u deployuser -l 2>/dev/null; echo "*/5 * * * * /opt/recruitiq/monitor.sh") | crontab -u deployuser -

# Create backup script
echo -e "${YELLOW}Creating backup script...${NC}"
cat > /opt/recruitiq/backup.sh << 'EOF'
#!/bin/bash
# Backup database and important files

BACKUP_DIR="/opt/recruitiq/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup volumes
tar -czf $BACKUP_DIR/volumes_$DATE.tar.gz /var/lib/docker/volumes/recruitiq_*

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "$(date): Backup completed" >> /opt/recruitiq/logs/backup.log
EOF

chmod +x /opt/recruitiq/backup.sh

# Setup daily backup cron job
(crontab -u deployuser -l 2>/dev/null; echo "0 2 * * * /opt/recruitiq/backup.sh") | crontab -u deployuser -

# Create logs directory
mkdir -p /opt/recruitiq/logs
chown -R deployuser:deployuser /opt/recruitiq/logs

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}VPS Setup Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Add your deployment SSH key to /home/deployuser/.ssh/authorized_keys"
echo "2. Configure GitHub Secrets for deployment"
echo "3. Set up DNS records for your domain"
echo "4. Run the deployment workflow from GitHub Actions"
echo ""
echo -e "${YELLOW}Important files:${NC}"
echo "- Application directory: /opt/recruitiq"
echo "- Logs: /opt/recruitiq/logs"
echo "- Backups: /opt/recruitiq/backups"
echo ""
echo -e "${GREEN}VPS is ready for deployment!${NC}"
