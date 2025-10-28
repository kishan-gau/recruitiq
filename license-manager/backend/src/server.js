import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

// Import routes
import adminRoutes from './routes/admin.js'
import validationRoutes from './routes/validation.js'
import telemetryRoutes from './routes/telemetry.js'
import tierRoutes from './routes/tiers.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5174']
app.use(cors({
  origin: corsOrigins,
  credentials: true
}))

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', limiter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'RecruitIQ License Manager'
  })
})

// API routes
app.use('/api/admin', adminRoutes)
app.use('/api/validate', validationRoutes)
app.use('/api/telemetry', telemetryRoutes)
app.use('/api/tiers', tierRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RecruitIQ License Manager API',
    version: '1.0.0',
    endpoints: {
      admin: '/api/admin/*',
      validation: '/api/validate/*',
      telemetry: '/api/telemetry/*',
      tiers: '/api/tiers/*',
      health: '/health'
    },
    documentation: 'See README.md for full API documentation'
  })
})

// 404 handler
app.use(notFoundHandler)

// Error handler (must be last)
app.use(errorHandler)

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   RecruitIQ License Manager API                          ║
║   Version: 1.0.0                                         ║
║                                                           ║
║   Server running on port ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                           ║
║                                                           ║
║   Endpoints:                                             ║
║   - Admin Panel:  http://localhost:${PORT}/api/admin          ║
║   - Validation:   http://localhost:${PORT}/api/validate      ║
║   - Telemetry:    http://localhost:${PORT}/api/telemetry     ║
║   - Tiers:        http://localhost:${PORT}/api/tiers         ║
║   - Health Check: http://localhost:${PORT}/health            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`)
  } else {
    console.error('❌ Server error:', err.message)
  }
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message)
  console.error(err.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise)
  console.error('Reason:', reason)
  process.exit(1)
})

export default app
