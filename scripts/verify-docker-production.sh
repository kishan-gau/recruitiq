#!/bin/bash
# Docker Production Verification Script
# 
# This script verifies the Docker production setup is ready for deployment
#
# Usage: bash scripts/verify-docker-production.sh

set -e

echo "======================================"
echo "Docker Production Verification Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 not found"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 not found"
        return 1
    fi
}

ERRORS=0

# 1. Check Prerequisites
echo "1. Checking Prerequisites..."
check_command docker || ((ERRORS++))
check_command docker-compose || check_command docker compose || ((ERRORS++))
check_command pnpm || ((ERRORS++))
echo ""

# 2. Check Docker Files
echo "2. Checking Docker Configuration Files..."
check_file "Dockerfile.web" || ((ERRORS++))
check_file "Dockerfile.backend" || ((ERRORS++))
check_file "docker-compose.yml" || ((ERRORS++))
check_file "docker-compose.production.yml" || ((ERRORS++))
check_file "nginx/frontend.conf" || ((ERRORS++))
echo ""

# 3. Check Environment Files
echo "3. Checking Environment Configuration..."
check_file ".env.development" || ((ERRORS++))
check_file ".env.production.template" || ((ERRORS++))
check_file "backend/.env" || ((ERRORS++))

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠${NC} .env.production not found (expected for first-time setup)"
    echo "  Create it with: cp .env.production.template .env.production"
else
    echo -e "${GREEN}✓${NC} .env.production exists"
fi
echo ""

# 4. Check Web App Build
echo "4. Checking Web App Build..."
if [ -d "apps/web/dist" ]; then
    echo -e "${GREEN}✓${NC} apps/web/dist directory exists"
    FILE_COUNT=$(find apps/web/dist -type f | wc -l)
    echo "  Found $FILE_COUNT files in dist directory"
    
    if [ -f "apps/web/dist/index.html" ]; then
        echo -e "${GREEN}✓${NC} index.html exists in dist"
    else
        echo -e "${RED}✗${NC} index.html not found in dist"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} apps/web/dist directory not found"
    echo "  Build the app with: pnpm build:web"
    ((ERRORS++))
fi
echo ""

# 5. Check Documentation
echo "5. Checking Documentation..."
check_file "DOCKER_PRODUCTION_GUIDE.md" || ((ERRORS++))
check_file "DOCKER_SETUP.md" || ((ERRORS++))
check_file "DOCKER_STATUS.md" || ((ERRORS++))
echo ""

# 6. Test Web App Build (if not already built)
if [ ! -d "apps/web/dist" ]; then
    echo "6. Testing Web App Build..."
    echo "  Running: pnpm build:web"
    if pnpm build:web; then
        echo -e "${GREEN}✓${NC} Web app built successfully"
    else
        echo -e "${RED}✗${NC} Web app build failed"
        ((ERRORS++))
    fi
    echo ""
fi

# 7. Docker Compose Validation
echo "7. Validating Docker Compose Configuration..."
if docker compose -f docker-compose.production.yml config > /dev/null 2>&1 || docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.production.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.production.yml has errors"
    ((ERRORS++))
fi
echo ""

# Summary
echo "======================================"
echo "Verification Summary"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "The Docker production setup is ready for deployment."
    echo ""
    echo "Next steps:"
    echo "  1. Configure production environment:"
    echo "     cp .env.production.template .env.production"
    echo "     # Edit .env.production with your values"
    echo ""
    echo "  2. Deploy with Docker:"
    echo "     docker-compose -f docker-compose.production.yml up -d"
    echo ""
    echo "  3. Verify deployment:"
    echo "     curl http://localhost/health"
    echo "     curl http://localhost:3001/health"
    echo ""
    echo "See DOCKER_PRODUCTION_GUIDE.md for detailed instructions."
    exit 0
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before deploying to production."
    echo "See DOCKER_PRODUCTION_GUIDE.md for help."
    exit 1
fi
