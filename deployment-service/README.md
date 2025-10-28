# RecruitIQ Deployment Service

A microservice for automating RecruitIQ instance deployments on TransIP OpenStack infrastructure.

## Features

- 🚀 **One-Click Deployments** - Deploy RecruitIQ instances with a single API call
- 🔐 **TransIP Integration** - Full integration with TransIP REST API v6
- ⚡ **Job Queue** - Asynchronous deployment processing with Bull/Redis
- 🛡️ **Safety Guards** - Dry-run mode and billing guard to prevent accidental charges
- 📊 **Progress Tracking** - Real-time deployment status and logs
- 🔄 **Instance Management** - Start, stop, reboot, delete, and snapshot instances
- ☁️ **Cloud-Init** - Automated OS and application installation
- 🔒 **Secure** - JWT authentication and API key support

## Architecture

```
deployment-service/
├── src/
│   ├── config/           # Configuration management
│   ├── controllers/      # API controllers
│   ├── middleware/       # Express middleware
│   ├── queue/           # Bull queue for async jobs
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   └── transip/     # TransIP API integration
│   └── server.js        # Express server
├── tests/               # Unit and integration tests
├── package.json
└── README.md
```

## Prerequisites

- Node.js >= 18.0.0
- Redis (for job queue)
- TransIP account with API access
- TransIP private key

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your TransIP credentials
nano .env
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TRANSIP_ACCOUNT_NAME` | Your TransIP account name | - |
| `TRANSIP_PRIVATE_KEY_PATH` | Path to your TransIP private key | - |
| `TRANSIP_API_URL` | TransIP API base URL | `https://api.transip.nl/v6` |
| `TRANSIP_READ_ONLY` | Read-only mode (no changes) | `false` |
| `DEPLOYMENT_DRY_RUN` | Simulate deployments without API calls | `true` |
| `DEPLOYMENT_BILLING_GUARD` | Require approval for billing operations | `true` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `DEPLOYMENT_SERVICE_PORT` | Service port | `5001` |
| `LICENSE_MANAGER_URL` | License Manager API URL | `http://localhost:5000` |
| `LICENSE_MANAGER_API_KEY` | API key for service-to-service auth | - |

### Safety Features

**Dry Run Mode** (`DEPLOYMENT_DRY_RUN=true`)
- Simulates all API calls without actually creating resources
- Perfect for testing and development
- No charges incurred

**Billing Guard** (`DEPLOYMENT_BILLING_GUARD=true`)
- Blocks all operations that could create invoices
- Must be explicitly disabled to create real resources
- Additional safety layer for production

**Read-Only Mode** (`TRANSIP_READ_ONLY=true`)
- TransIP API token will be read-only
- Cannot make any changes via API
- Useful for monitoring and status checks

## TransIP Setup

### 1. Generate Private Key

1. Log in to TransIP Control Panel
2. Navigate to Account → API
3. Enable API access
4. Generate a new key pair
5. Download the private key
6. Save it securely (e.g., `/etc/secrets/transip-private.key`)

```bash
# Set proper permissions
chmod 600 /path/to/transip-private.key
```

### 2. Whitelist IP Address (Optional)

If using IP whitelisting:
1. Go to TransIP Control Panel → API
2. Add your server's IP address to the whitelist

## Usage

### Start Service

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally (Ubuntu)
sudo apt install redis-server
sudo systemctl start redis
```

### Health Check

```bash
curl http://localhost:5001/health
```

## API Endpoints

### Authentication

All endpoints require either:
- **JWT Token**: `Authorization: Bearer <token>`
- **API Key**: `X-API-Key: <api-key>`

### Deployments

#### Create Deployment
```http
POST /api/deployments
Content-Type: application/json

{
  "instanceId": "inst-123",
  "customerId": "cust-456",
  "customerName": "Acme Corp",
  "licenseKey": "LICENSE-KEY-HERE",
  "tier": "professional",
  "hostname": "recruitiq-acme",
  "domain": "example.com",
  "email": "admin@acme.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Deployment job created",
  "job": {
    "jobId": "deployment-inst-123-1234567890",
    "instanceId": "inst-123",
    "status": "queued",
    "createdAt": "2025-10-28T12:00:00.000Z"
  }
}
```

#### Get Deployment Status
```http
GET /api/deployments/:jobId
```

Response:
```json
{
  "success": true,
  "deployment": {
    "found": true,
    "jobId": "deployment-inst-123-1234567890",
    "instanceId": "inst-123",
    "state": "completed",
    "progress": 100,
    "result": {
      "success": true,
      "vpsName": "recruitiq-inst-123",
      "ipAddress": "185.3.211.123",
      "hostname": "recruitiq-acme",
      "fqdn": "recruitiq-acme.example.com",
      "status": "deployed"
    }
  }
}
```

#### Cancel Deployment
```http
DELETE /api/deployments/:jobId
```

#### Get Queue Statistics
```http
GET /api/deployments/stats
```

### Instance Management

#### Get Instance Details
```http
GET /api/instances/:vpsName
```

#### Start Instance
```http
POST /api/instances/:vpsName/start
```

#### Stop Instance
```http
POST /api/instances/:vpsName/stop
```

#### Reboot Instance
```http
POST /api/instances/:vpsName/reboot
```

#### Delete Instance
```http
DELETE /api/instances/:vpsName
```

⚠️ **Warning**: Deletion is permanent and requires billing guard to be disabled.

#### Create Snapshot
```http
POST /api/instances/:vpsName/snapshots
Content-Type: application/json

{
  "description": "Pre-upgrade snapshot"
}
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format
```

## Deployment Flow

1. **Job Creation**
   - API receives deployment request
   - Job is added to Redis queue
   - Returns job ID to caller

2. **Queue Processing**
   - Worker picks up job
   - Generates cloud-init configuration
   - Calls TransIP API to create VPS

3. **VPS Provisioning**
   - TransIP provisions VPS
   - Cloud-init installs OS
   - Docker containers start
   - Nginx configures reverse proxy
   - Let's Encrypt sets up SSL

4. **Callback**
   - Instance calls back to confirm deployment
   - Status updated in License Manager
   - Job marked as completed

## Cloud-Init Workflow

The deployment service generates a cloud-init configuration that:

1. ✅ Updates packages
2. ✅ Installs Docker, Nginx, Certbot
3. ✅ Configures firewall (UFW)
4. ✅ Creates docker-compose.yml
5. ✅ Sets up PostgreSQL and Redis
6. ✅ Deploys RecruitIQ backend and frontend
7. ✅ Configures Nginx reverse proxy
8. ✅ Obtains SSL certificate (if domain provided)
9. ✅ Sends deployment callback

## Monitoring

### Queue Dashboard

For production monitoring, consider installing Bull Board:

```bash
npm install @bull-board/api @bull-board/express
```

Add to `src/server.js`:

```javascript
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(deploymentQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Visit `http://localhost:5001/admin/queues` to see the dashboard.

## Security Best Practices

1. **Private Key Storage**
   - Store in secure location (vault, secrets manager)
   - Never commit to git
   - Use restrictive file permissions (600)

2. **API Keys**
   - Rotate regularly
   - Use different keys for dev/staging/prod
   - Store in environment variables

3. **Network Security**
   - Use firewall rules
   - Limit API access by IP
   - Enable HTTPS only

4. **Token Management**
   - Short token expiry (30 minutes)
   - Automatic refresh on expiry
   - Clear tokens on logout

## Troubleshooting

### "Authentication failed"
- Check `TRANSIP_ACCOUNT_NAME` is correct
- Verify private key path and permissions
- Ensure private key matches your TransIP account

### "Too many requests"
- TransIP API has rate limits
- Reduce `MAX_CONCURRENT_DEPLOYMENTS`
- Implement exponential backoff

### "Billing guard active"
- Set `DEPLOYMENT_BILLING_GUARD=false` to proceed
- Only disable in controlled environments
- Review cost implications first

### Redis connection failed
- Ensure Redis is running
- Check `REDIS_URL` is correct
- Verify network connectivity

## Production Checklist

Before deploying to production:

- [ ] Generate secure JWT secret
- [ ] Set up production Redis instance
- [ ] Configure TransIP private key securely
- [ ] Set `DEPLOYMENT_DRY_RUN=false`
- [ ] Review and set `DEPLOYMENT_BILLING_GUARD` appropriately
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Test failover scenarios
- [ ] Document runbooks

## Support

For issues and questions:
- Check the logs in `console`
- Review TransIP API documentation: https://api.transip.nl/rest/docs.html
- Contact RecruitIQ support

## License

MIT
