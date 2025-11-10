# Development Gateway

Single entry point for all RecruitIQ development services.

## Why?

- **Solves cookie issues**: All services on same origin (localhost:3000)
- **Mirrors production**: Same architecture as production deployment
- **Simpler development**: One URL for everything

## Usage

### Option 1: Run everything together (Recommended)

```bash
# From repo root
pnpm install
cd dev-gateway && npm install && cd ..
pnpm run dev:all
```

Then open: **http://localhost:3000**

### Option 2: Run services separately

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd apps/paylinq
pnpm dev

# Terminal 3 - Gateway
cd dev-gateway
npm start
```

Then open: **http://localhost:3000**

## How it works

```
localhost:3000 (Gateway)
├── /api/* → localhost:4000 (Backend)
└── /* → localhost:5174 (Vite Dev Server)
```

- All requests go through port 3000
- Cookies work perfectly (same origin)
- Production-like environment

## Production

In production, this gateway is replaced by:
- CDN/Load Balancer
- Or nginx/Caddy reverse proxy
- Same architecture, different implementation

## Troubleshooting

**Gateway shows 502 errors?**
- Make sure backend is running on port 4000
- Make sure Vite dev server is running on port 5174

**Cookies still not working?**
- Clear all browser cookies
- Make sure you're accessing via http://localhost:3000 (not 5174)
- Check backend .env has ALLOWED_ORIGINS including localhost:3000
