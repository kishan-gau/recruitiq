import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

// Create PostgreSQL connection pool for Platform/Portal database
// In production: separate database for customer/license/subscription data
// In development: uses same database as tenant data (PLATFORM_DATABASE_NAME defaults to DATABASE_NAME)
const pool = new Pool({
  host: process.env.PLATFORM_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
  port: process.env.PLATFORM_DATABASE_PORT || process.env.DATABASE_PORT || 5432,
  database: process.env.PLATFORM_DATABASE_NAME || process.env.DATABASE_NAME || 'recruitiq_dev',
  user: process.env.PLATFORM_DATABASE_USER || process.env.DATABASE_USER || 'postgres',
  password: process.env.PLATFORM_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message)
    console.error('   Check your .env file database credentials')
  } else {
    console.log('✅ Connected to PostgreSQL database')
  }
})

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message)
})

export default pool
