#!/bin/bash

# Quick deployment script for manual deployments
# Usage: ./deploy.sh [environment] [apps]
# Example: ./deploy.sh production all
# Example: ./deploy.sh staging backend,nexus

set -e

ENVIRONMENT=${1:-production}
APPS=${2:-all}

echo "🚀 Deploying RecruitIQ to $ENVIRONMENT"
echo "📦 Apps: $APPS"

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    source .env.$ENVIRONMENT
else
    echo "❌ Environment file .env.$ENVIRONMENT not found"
    exit 1
fi

# Check required variables
if [ -z "$VPS_HOST" ] || [ -z "$VPS_USER" ]; then
    echo "❌ VPS_HOST and VPS_USER must be set in .env.$ENVIRONMENT"
    exit 1
fi

# Build images
echo "🔨 Building Docker images..."
if [ "$APPS" == "all" ]; then
    docker-compose -f docker-compose.production.yml build
else
    IFS=',' read -ra APP_ARRAY <<< "$APPS"
    for app in "${APP_ARRAY[@]}"; do
        docker-compose -f docker-compose.production.yml build "$app"
    done
fi

# Save images to tar files
echo "📦 Saving images..."
mkdir -p dist/images
if [ "$APPS" == "all" ]; then
    docker save -o dist/images/backend.tar recruitiq_backend:latest
    docker save -o dist/images/nexus.tar recruitiq_nexus:latest
    docker save -o dist/images/paylinq.tar recruitiq_paylinq:latest
    docker save -o dist/images/portal.tar recruitiq_portal:latest
    docker save -o dist/images/recruitiq.tar recruitiq_recruitiq:latest
else
    IFS=',' read -ra APP_ARRAY <<< "$APPS"
    for app in "${APP_ARRAY[@]}"; do
        docker save -o dist/images/$app.tar recruitiq_$app:latest
    done
fi

# Transfer images to VPS
echo "📤 Transferring images to VPS..."
scp -r dist/images/*.tar $VPS_USER@$VPS_HOST:/tmp/

# Transfer configuration
echo "📤 Transferring configuration..."
scp docker-compose.production.yml $VPS_USER@$VPS_HOST:/opt/recruitiq/docker-compose.yml
scp -r nginx $VPS_USER@$VPS_HOST:/opt/recruitiq/

# Deploy on VPS
echo "🚀 Deploying on VPS..."
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /opt/recruitiq

# Load images
for image in /tmp/*.tar; do
    docker load -i $image
    rm $image
done

# Pull other required images
docker-compose pull postgres redis traefik

# Run migrations
docker-compose run --rm backend npm run migrate

# Deploy
docker-compose up -d

# Health check
sleep 30
docker-compose ps
curl -f http://localhost:3001/health || exit 1

# Cleanup
docker image prune -f

echo "✅ Deployment complete!"
ENDSSH

echo "✅ RecruitIQ deployed successfully to $ENVIRONMENT!"
echo "🌐 Check status: ssh $VPS_USER@$VPS_HOST 'cd /opt/recruitiq && docker-compose ps'"
