/**
 * Development Gateway
 * 
 * Single entry point for all development services.
 * Proxies requests to appropriate backend/frontend services.
 * 
 * This solves cookie issues by ensuring all requests go through
 * the same origin (localhost:3000), mirroring production architecture.
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import http from 'http';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

// Enable CORS for development
app.use(cors({
  origin: true,
  credentials: true
}));

// Log all requests
app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.url}`);
  next();
});

// API Proxy - Forward to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:4000',
  changeOrigin: false, // Keep cookies on same origin
  ws: true, // Support WebSockets
  logLevel: 'silent',
  onProxyReq: (proxyReq, req, res) => {
    // Forward cookies from browser to backend
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
    // Log detailed request info
    console.log(`[Gateway] → Backend: ${req.method} ${req.url}`, {
      hasCookies: !!req.headers.cookie,
      cookieHeader: req.headers.cookie
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log detailed response info including Set-Cookie headers
    const setCookieHeaders = proxyRes.headers['set-cookie'];
    console.log(`[Gateway] ← Backend: ${req.method} ${req.url} → ${proxyRes.statusCode}`, {
      hasSetCookie: !!setCookieHeaders,
      setCookieCount: setCookieHeaders?.length || 0
    });
    
    // Ensure Set-Cookie headers are preserved
    if (setCookieHeaders) {
      console.log('[Gateway] Set-Cookie headers:', setCookieHeaders);
    }
  },
  onError: (err, req, res) => {
    console.error(`[Gateway] Proxy error for ${req.url}:`, err.message);
    // Check if res is a proper HTTP response object
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway proxy error', message: err.message }));
    }
  }
}));

// Frontend Proxy - Forward to Vite dev server
const viteProxy = createProxyMiddleware({
  target: 'http://localhost:5174',
  changeOrigin: false,
  ws: true, // Support Vite HMR
  logLevel: 'silent',
  onError: (err, req, res) => {
    console.error(`[Gateway] Frontend proxy error:`, err.message);
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Frontend not available', 
        message: 'Make sure the Vite dev server is running on port 5174' 
      }));
    }
  }
});

app.use('/', viteProxy);

// Handle WebSocket upgrade for Vite HMR
server.on('upgrade', (req, socket, head) => {
  console.log('[Gateway] WebSocket upgrade request:', req.url);
  viteProxy.upgrade(req, socket, head);
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   🚀 RecruitIQ Development Gateway Started        ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  📍 Gateway URL:      http://localhost:${PORT}`);
  console.log(`  🔗 API Proxy:        http://localhost:${PORT}/api → localhost:4000`);
  console.log(`  🎨 Frontend Proxy:   http://localhost:${PORT}/ → localhost:5174`);
  console.log('');
  console.log('  ✅ All services on single origin - cookies work!');
  console.log('  ✅ Mirrors production architecture');
  console.log('');
  console.log('  Make sure these are running:');
  console.log('    - Backend:  cd backend && npm run dev');
  console.log('    - Frontend: cd apps/paylinq && pnpm dev');
  console.log('');
  console.log('  Then open: http://localhost:3000');
  console.log('');
});
