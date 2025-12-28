#!/bin/bash

# Health check script for all RecruitIQ services
# Usage: ./health-check.sh [domain]

DOMAIN=${1:-localhost}

echo "🏥 RecruitIQ Health Check"
echo "=========================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check service
check_service() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    
    echo -n "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ OK ($response)${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED (HTTP $response)${NC}"
        return 1
    fi
}

# Function to check service with auth
check_service_auth() {
    local name=$1
    local url=$2
    local token=$3
    
    echo -n "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" \
        -H "Authorization: Bearer $token" --max-time 10)
    
    if [ "$response" -eq 200 ] || [ "$response" -eq 401 ]; then
        echo -e "${GREEN}✓ OK ($response)${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED (HTTP $response)${NC}"
        return 1
    fi
}

# Check backend API
echo ""
echo "Backend Services:"
check_service "Backend Health" "https://api.$DOMAIN/health" 200
check_service "Backend API Status" "https://api.$DOMAIN/api/status" 200

# Check frontend applications
echo ""
echo "Frontend Applications:"
check_service "Unified Web App" "https://$DOMAIN/" 200
check_service "Web App - Recruitment" "https://$DOMAIN/recruitment" 200
check_service "Web App - HRIS" "https://$DOMAIN/hris" 200
check_service "Web App - Payroll" "https://$DOMAIN/payroll" 200
check_service "Web App - Scheduling" "https://$DOMAIN/scheduling" 200

# Check infrastructure
echo ""
echo "Infrastructure:"
check_service "Traefik Dashboard" "https://traefik.$DOMAIN/" 401  # Should require auth

# Check SSL certificates
echo ""
echo "SSL Certificates:"
for subdomain in "" "api" "traefik"; do
    if [ -z "$subdomain" ]; then
        host="$DOMAIN"
    else
        host="$subdomain.$DOMAIN"
    fi
    
    echo -n "Checking SSL for $host... "
    
    if echo | openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null | \
       openssl x509 -noout -dates 2>/dev/null | grep -q "notAfter"; then
        expiry=$(echo | openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null | \
                 openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        echo -e "${GREEN}✓ Valid (expires: $expiry)${NC}"
    else
        echo -e "${RED}✗ Invalid or missing${NC}"
    fi
done

# Check Docker services (if running locally or via SSH)
if [ "$DOMAIN" == "localhost" ] || [ -f "/opt/recruitiq/docker-compose.yml" ]; then
    echo ""
    echo "Docker Services:"
    
    services=("postgres" "redis" "backend" "nexus" "paylinq" "portal" "recruitiq" "traefik")
    
    for service in "${services[@]}"; do
        echo -n "Checking $service container... "
        
        if docker ps --filter "name=recruitiq_$service" --format "{{.Status}}" | grep -q "Up"; then
            status=$(docker ps --filter "name=recruitiq_$service" --format "{{.Status}}")
            echo -e "${GREEN}✓ Running ($status)${NC}"
        else
            echo -e "${RED}✗ Not running${NC}"
        fi
    done
fi

# Check disk space
echo ""
echo "System Resources:"
echo -n "Disk space... "
disk_usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    echo -e "${GREEN}✓ OK (${disk_usage}% used)${NC}"
elif [ "$disk_usage" -lt 90 ]; then
    echo -e "${YELLOW}⚠ Warning (${disk_usage}% used)${NC}"
else
    echo -e "${RED}✗ Critical (${disk_usage}% used)${NC}"
fi

# Check memory
echo -n "Memory usage... "
if command -v free &> /dev/null; then
    mem_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    if [ "$mem_usage" -lt 80 ]; then
        echo -e "${GREEN}✓ OK (${mem_usage}% used)${NC}"
    elif [ "$mem_usage" -lt 90 ]; then
        echo -e "${YELLOW}⚠ Warning (${mem_usage}% used)${NC}"
    else
        echo -e "${RED}✗ Critical (${mem_usage}% used)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Cannot check (free command not available)${NC}"
fi

echo ""
echo "=========================="
echo "Health check complete!"
