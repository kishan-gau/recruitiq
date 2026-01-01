# RecruitIQ

> Modern Recruitment Management System for Enterprise Hiring Teams

## 📋 Overview

RecruitIQ is a comprehensive recruitment management platform built for modern hiring teams. It provides end-to-end applicant tracking, candidate management, interview scheduling, and analytics capabilities in a secure, multi-tenant architecture.

## ✨ Features

- 🎯 **Job Management** - Create, publish, and manage job postings across multiple channels
- 👥 **Candidate Tracking** - Comprehensive applicant tracking with resume parsing and candidate profiles
- 📅 **Interview Scheduling** - Automated scheduling with calendar integrations
- 📊 **Analytics & Reporting** - Real-time insights into hiring metrics and pipeline health
- 🔒 **Multi-Tenant Security** - Enterprise-grade security with organization-level data isolation
- 🌐 **API-First Design** - RESTful API for integrations and custom workflows
- ⚡ **Performance Optimized** - Fast response times with caching and query optimization
- 🤖 **Workflow Automation** - ActivePieces integration for no-code automation with 400+ apps

## 🏗️ Architecture

RecruitIQ follows a layered architecture pattern:

```
┌─────────────────────────────────────────┐
│          Frontend (React)               │
│  - Unified Web App (apps/web)           │
│    • All Product Modules                │
│      (Recruitment, HRIS, Payroll, Scheduling)|
└─────────────────────────────────────────┘
                  │ HTTP/REST
┌─────────────────────────────────────────┐
│         API Layer (Express)             │
│  Routes → Controllers → Services        │
└─────────────────────────────────────────┘
                  │
┌─────────────────────────────────────────┐
│    Business Logic (Services)            │
│  - Validation                           │
│  - Authorization                        │
│  - Business Rules                       │
└─────────────────────────────────────────┘
                  │
┌─────────────────────────────────────────┐
│    Data Access (Repositories)           │
│  - Database Queries                     │
│  - Tenant Isolation                     │
└─────────────────────────────────────────┘
                  │
┌─────────────────────────────────────────┐
│         Database (PostgreSQL)           │
└─────────────────────────────────────────┘
```

## 🚀 Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 15+
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Joi
- **Testing:** Jest, Supertest
- **API Documentation:** Swagger/OpenAPI

### Frontend
- **Framework:** React 18+
- **Styling:** TailwindCSS
- **Build Tool:** Vite
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Testing:** Vitest, Playwright

### DevOps
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Monitoring:** Custom logging with Winston
- **Version Control:** Git

## 📚 Documentation

### Getting Started
- [Installation Guide](#installation)
- [Configuration](#configuration)
- [Docker Development Setup](#-docker-development-setup)
- [Running Tests](#testing)

### Development Standards
- **📖 [Coding Standards](./CODING_STANDARDS.md)** - **START HERE!** Comprehensive coding standards for all code
  - [Backend Standards](./docs/BACKEND_STANDARDS.md) - Services, repositories, controllers
  - [Frontend Standards](./docs/FRONTEND_STANDARDS.md) - React components, hooks, state management
  - [Testing Standards](./docs/TESTING_STANDARDS.md) - Unit, integration, E2E testing
  - [Security Standards](./docs/SECURITY_STANDARDS.md) - Authentication, authorization, data protection
  - [Database Standards](./docs/DATABASE_STANDARDS.md) - Schema, queries, migrations, indexing
  - [API Standards](./docs/API_STANDARDS.md) - REST conventions, response format, error handling
  - [Git Standards](./docs/GIT_STANDARDS.md) - Commit messages, branching, PR process
  - [Documentation Standards](./docs/DOCUMENTATION_STANDARDS.md) - JSDoc, README, API docs
  - [Performance Standards](./docs/PERFORMANCE_STANDARDS.md) - Optimization, caching, monitoring

### Architecture & Planning
- [Multi-Product SaaS Architecture](./MULTI_PRODUCT_SAAS_ARCHITECTURE.md)
- [Production Resource Planning](./PRODUCTION_RESOURCE_PLANNING.md)
- [Docker Deployment Guide](./DOCKER_DEPLOYMENT_GUIDE.md)
- [Security Audit Report](./SECURITY_AUDIT_REPORT.md)
- **[Feature Management System](./FEATURE_MANAGEMENT_IMPLEMENTATION_COMPLETE.md)** - Tier-based access control
  - [Quick Start Guide](./FEATURE_MANAGEMENT_QUICK_START.md) - Developer reference with examples
- **[Mobile UX Strategy](./docs/mobile/)** - Progressive Web App proposal for employee portal
  - [Full Proposal](./docs/mobile/EMPLOYEE_MOBILE_UX_PROPOSAL.md) - Comprehensive 50-page analysis
  - [Quick Reference](./docs/mobile/MOBILE_UX_QUICK_REFERENCE.md) - Executive summary (5 min read)

### Integrations & Automation
- **[ActivePieces Integration Plan](./ACTIVEPIECES_INTEGRATION_PLAN.md)** - Workflow automation platform integration
  - [Quick Start Guide](./docs/integrations/ACTIVEPIECES_QUICK_START.md) - 30-minute setup guide
  - Connect to 400+ apps (Slack, Gmail, OpenAI, etc.)
  - No-code workflow builder for custom automation
  - AI-powered recruitment workflows

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 15 or higher
- npm or yarn

### Backend Setup

```bash
# Clone repository
git clone https://github.com/yourorg/recruitiq.git
cd recruitiq

# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

Backend will be available at `http://localhost:3001`

### Frontend Setup

#### Unified Web App (Recommended)

The unified web app consolidates all product features (HRIS/Nexus, Payroll/PayLinQ, Recruitment/RecruitIQ, Scheduling/ScheduleHub) into a single application:

```bash
# From project root (uses pnpm workspace)
pnpm dev:web

# Or navigate to web app
cd apps/web

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with API URL

# Start development server
pnpm dev
```

Web app will be available at `http://localhost:5177`

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recruitiq
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=24h

# Encryption
ENCRYPTION_KEY=your_encryption_key_32_bytes_hex

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password

# Redis (optional - for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend Environment Variables

Create `.env` file in `apps/web` directory:

```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=RecruitIQ Web
```

## 🐳 Docker Development Setup

### Quick Start (Automatic Database Setup)

For rapid development environment setup with automated database initialization:

```powershell
# Navigate to backend directory
cd backend

# Option 1: Basic setup (manual tenant creation required)
.\docker-init\setup.ps1

# Option 2: Complete setup with automatic tenant creation
# (requires license-id and customer-id from existing database records)
.\docker-init\setup.ps1 -LicenseId "your-license-uuid" -CustomerId "your-customer-uuid"

# Reset environment (clean slate)
.\docker-init\setup.ps1 -Reset
```

**What happens automatically:**
- ✅ PostgreSQL 15 container with RecruitIQ database
- ✅ Database schema creation (migrations)
- ✅ Production-ready seed data (organizations, users, features)
- ✅ Conditional tenant creation (when license/customer IDs provided)
- ✅ Development user account creation

### Manual Docker Setup

If you prefer manual control:

```bash
# Clone and navigate
git clone https://github.com/yourorg/recruitiq.git
cd recruitiq/backend

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### Tenant Creation

If you didn't provide license/customer IDs during setup:

```bash
# Create tenant manually (inside running container)
docker-compose exec backend node scripts/onboard-tenant.js \
  --license-id "your-license-uuid" \
  --customer-id "your-customer-uuid" \
  --email "admin@yourcompany.com" \
  --name "Your Company"
```

### Validation & Troubleshooting

```powershell
# Validate setup
.\docker-init\validate.ps1

# Test both scenarios
.\docker-init\test-workflow.ps1 -FullTest

# Check database status
docker-compose exec postgres psql -U postgres -d recruitiq -c "\dt"

# View recent logs
docker-compose logs --tail 20 postgres

# Reset if needed
docker-compose down -v
```

### Quick Reference

For a comprehensive command reference, see: [`backend/docker-init/QUICK_REFERENCE.md`](backend/docker-init/QUICK_REFERENCE.md)
.\docker-init\setup.ps1 -Reset
```

**Note:** License and customer IDs must come from existing database records. Contact your system administrator or check the platform database for valid values.

See [Docker Database Auto-Initialization](./backend/docker-init/README.md) for detailed documentation.

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- JobService.test.js

# Run integration tests
npm run test:integration

# Run security tests
npm run test:security
```

### Frontend Tests

```bash
cd apps/web

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run tests with UI
npm run test:ui
```

## 📊 Test Coverage Requirements

- **Overall:** 80% minimum
- **Services:** 90% minimum
- **Repositories:** 85% minimum
- **Controllers:** 75% minimum

Current coverage: **32/32 integration tests passing (100%)**

## 🏃 Running in Production

### Using Docker

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

See [Docker Deployment Guide](./DOCKER_DEPLOYMENT_GUIDE.md) for detailed instructions.

### Manual Deployment

```bash
# Backend
cd backend
npm run build
NODE_ENV=production npm start

# Frontend (Unified Web App)
cd apps/web
npm run build
# Serve dist/ folder with nginx or similar
```

## 🔒 Security

RecruitIQ implements enterprise-grade security:

- **Authentication:** JWT-based authentication with refresh tokens
- **Authorization:** Role-based access control (RBAC)
- **Tenant Isolation:** Organization-level data segregation enforced at database level
- **Input Validation:** Comprehensive validation using Joi schemas
- **SQL Injection Prevention:** Parameterized queries with custom wrapper
- **XSS Prevention:** Output encoding and Content Security Policy
- **CSRF Protection:** CSRF tokens for state-changing operations
- **Rate Limiting:** API rate limiting to prevent abuse
- **Audit Logging:** Complete audit trail of all operations

See [Security Standards](./docs/SECURITY_STANDARDS.md) for complete security guidelines.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Read the standards:** Start with [CODING_STANDARDS.md](./CODING_STANDARDS.md)
2. **Create a branch:** `git checkout -b feature/your-feature`
3. **Follow conventions:** Use proper commit message format (see [Git Standards](./docs/GIT_STANDARDS.md))
4. **Write tests:** Maintain test coverage requirements
5. **Submit PR:** Fill out the PR template completely

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/job-salary-filter

# 2. Make changes following coding standards

# 3. Write tests
npm test

# 4. Commit with conventional format
git commit -m "feat(jobs): add salary range filter to job search"

# 5. Push and create PR
git push origin feature/job-salary-filter
```

### Code Review Process

All code changes require:
- [ ] Code follows [Coding Standards](./CODING_STANDARDS.md)
- [ ] Tests added/updated with 80%+ coverage
- [ ] All tests passing
- [ ] Documentation updated
- [ ] PR template filled out
- [ ] At least one approving review

## 📁 Project Structure

```
recruitiq/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/    # HTTP request handlers
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Data access layer
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── products/       # Dynamic product modules
│   │   ├── utils/          # Utility functions
│   │   └── database/       # Database config & migrations
│   └── tests/              # Test suites
├── apps/
│   ├── web/                # Unified React application
│   │   ├── src/
│   │   │   ├── components/  # Reusable React components
│   │   │   ├── pages/       # Product module pages
│   │   │   ├── contexts/    # React contexts
│   │   │   ├── services/    # API service layer
│   │   │   └── utils/       # Utility functions
│   │   └── tests/           # Component tests
│   └── portal/              # Deprecated (merged into web)
├── packages/                # Shared packages
│   ├── api-client/         # Centralized API client
│   ├── auth/               # Authentication utilities
│   ├── types/              # TypeScript type definitions
│   ├── ui/                 # Shared UI components
│   └── utils/              # Shared utilities
├── docs/                    # Documentation
│   ├── BACKEND_STANDARDS.md
│   ├── FRONTEND_STANDARDS.md
│   ├── TESTING_STANDARDS.md
│   └── ... (all standards documents)
└── CODING_STANDARDS.md     # Main standards overview
```

## 🎯 Performance Goals

- **API Response Time:** P95 < 200ms
- **Database Queries:** < 100ms for simple queries
- **Page Load Time:** < 2 seconds
- **Lighthouse Score:** > 90
- **Bundle Size:** < 200KB gzipped

See [Performance Standards](./docs/PERFORMANCE_STANDARDS.md) for optimization guidelines.

## 📈 Roadmap

### Current Phase (Phase 2) ✅
- [x] Controller to Service layer migration
- [x] Comprehensive test coverage
- [x] Complete coding standards documentation
- [x] Mobile UX strategy proposal (PWA recommendation)

### Next Phase (Phase 3) - In Planning
- [ ] **Progressive Web App (PWA) for Employees** - Mobile-first employee portal (Q1 2026)
  - [ ] PWA infrastructure (service worker, manifest)
  - [ ] Employee self-service features (attendance, payroll, profile)
  - [ ] Offline capabilities and push notifications
- [ ] Advanced search and filtering
- [ ] Email notifications
- [ ] Resume parsing with AI
- [ ] Integration with job boards
- [ ] Advanced analytics dashboard

### Future Phases
- [ ] Native mobile applications (iOS/Android) - Evaluate after PWA adoption
- [ ] Video interview integration
- [ ] AI-powered candidate matching
- [ ] Multi-language support

## 📞 Support

- **Documentation:** [Coding Standards](./CODING_STANDARDS.md)
- **Issues:** [GitHub Issues](https://github.com/yourorg/recruitiq/issues)
- **Email:** support@recruitiq.com

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

## 👥 Team

RecruitIQ is built and maintained by a dedicated team of developers committed to creating the best recruitment management platform.

## 🙏 Acknowledgments

- Express.js community
- React community
- PostgreSQL community
- All contributors and testers

---

**Important:** Before writing any code, please read the [Coding Standards](./CODING_STANDARDS.md) document. It contains mandatory guidelines that all code must follow.

For questions about standards or architecture decisions, please refer to the relevant documentation or open a discussion issue.
