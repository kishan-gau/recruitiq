# RecruitIQ Platform Admin Portal

The admin portal for managing the RecruitIQ SaaS platform. This portal is **separate from the customer-facing application** and provides tools for platform administrators to monitor security, view logs, manage licenses, and oversee all cloud instances.

## Overview

This portal is designed for **platform owners/administrators only** - not for end customers or licensees. It provides a centralized view of:

- **Security Monitoring**: Real-time security events, alerts, and threats across all cloud instances
- **Log Viewing**: Centralized logs from all cloud instances with search and filtering
- **License Management**: Create, view, update, and revoke customer licenses
- **Instance Management**: Monitor health and status of all cloud deployments

## Architecture

### Office 365-Style App Switcher

The portal features an Office 365-style app switcher (grid icon in top-right) that allows quick navigation between:

- Portal Home (Dashboard)
- Security Monitor
- Log Viewer
- License Manager
- RecruitIQ (main customer application)

### Deployment Model

The portal connects to **cloud instances only**. On-premise customer deployments do not send data to the portal.

```
┌─────────────────────────────────────────┐
│     RecruitIQ Platform Portal          │
│  (portal.recruitiq.com - Port 5174)    │
│                                         │
│  - Security Dashboard                   │
│  - Log Viewer                           │
│  - License Manager                      │
└─────────────────────────────────────────┘
              ▲
              │ Reads from
              │
┌─────────────┴───────────────────────────┐
│   Central Logging/Monitoring Database   │
│        (PostgreSQL - Platform)          │
│                                         │
│  Tables:                                │
│  - system_logs                          │
│  - security_events                      │
│  - security_alerts                      │
└─────────────────────────────────────────┘
              ▲
              │ Writes to
              │
┌─────────────┴───────────────────────────┐
│      Cloud Instances (Multi-tenant)     │
│   app1.recruitiq.com, app2.recruitiq..  │
│                                         │
│  Each with:                             │
│  - DEPLOYMENT_TYPE=cloud                │
│  - TENANT_ID=unique-tenant-id           │
│  - CENTRAL_LOGGING_ENABLED=true         │
│  - CENTRAL_MONITORING_ENABLED=true      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   On-Premise Instances (Isolated)       │
│   (Customer-hosted, no external access) │
│                                         │
│  - DEPLOYMENT_TYPE=onpremise            │
│  - CENTRAL_LOGGING_ENABLED=false        │
│  - CENTRAL_MONITORING_ENABLED=false     │
│  - Logs stay local                      │
└─────────────────────────────────────────┘
```

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Data visualization

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on http://localhost:4000

### Installation

```bash
cd portal
npm install
```

### Run Development Server

```bash
npm run dev
```

The portal will be available at http://localhost:5174

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Project Structure

```
portal/
├── src/
│   ├── components/
│   │   ├── AppSwitcher.jsx      # Office 365-style app switcher
│   │   └── Layout.jsx            # Main layout with header/sidebar
│   ├── pages/
│   │   ├── Dashboard.jsx         # Portal home/overview
│   │   ├── security/
│   │   │   ├── SecurityDashboard.jsx   # Real-time security monitoring
│   │   │   ├── SecurityEvents.jsx      # Security event viewer
│   │   │   └── SecurityAlerts.jsx      # Alert history
│   │   ├── logs/
│   │   │   ├── LogViewer.jsx           # Main log viewer
│   │   │   └── SystemLogs.jsx          # System logs
│   │   └── licenses/
│   │       └── LicenseManager.jsx      # License management
│   ├── App.jsx                   # Route configuration
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## API Integration

The portal expects the backend API to provide these endpoints:

### Security Monitoring

- `GET /api/security/dashboard` - Security overview
- `GET /api/security/events` - Security events list
- `GET /api/security/alerts` - Security alerts
- `GET /api/security/metrics` - Security metrics

### Logs

- `GET /api/portal/logs` - Query system logs
- `GET /api/portal/logs/security` - Query security events
- `GET /api/portal/logs/search` - Search logs
- `GET /api/portal/logs/download` - Export logs

### Licenses

- `GET /api/licenses` - List all licenses
- `POST /api/licenses` - Create new license
- `PUT /api/licenses/:id` - Update license
- `DELETE /api/licenses/:id` - Revoke license

All endpoints require authentication with `platform_admin` role.

## Access Control

The portal is **restricted to platform administrators only**. Customers/licensees do NOT have access.

- Portal URL: `portal.recruitiq.com` (separate from customer app)
- Requires platform admin authentication
- Tenant isolation enforced - admins can view all tenants
- All actions are audit logged

## Environment Variables

The portal reads from `.env`:

```bash
# API Backend URL
VITE_API_URL=http://localhost:4000

# Portal Configuration
VITE_PORTAL_URL=http://localhost:5174
```

## Deployment

### Production Deployment

1. Build the portal:
   ```bash
   npm run build
   ```

2. Deploy `dist/` to a static hosting service or web server

3. Configure subdomain: `portal.recruitiq.com`

4. Set up CORS on backend to allow portal origin

5. Configure authentication to require `platform_admin` role

### Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Security Considerations

1. **Authentication Required**: All portal access requires platform admin authentication
2. **HTTPS Only**: Portal should only be accessible over HTTPS in production
3. **CORS Configuration**: Backend must whitelist portal domain
4. **Rate Limiting**: Apply rate limits to prevent API abuse
5. **Audit Logging**: All portal actions are logged for compliance

## Future Enhancements

- [ ] Real-time updates via WebSockets
- [ ] Advanced log search with full-text search
- [ ] Tenant management interface
- [ ] Usage analytics and reporting
- [ ] Automated security response workflows
- [ ] Multi-factor authentication for portal access
- [ ] Role-based access within portal (super admin, security admin, support)

## Support

For questions or issues with the portal, contact the platform development team.
