#!/bin/bash

# Database Schema and Seed Initialization
# This script creates the database schema and applies all seeds
# It's designed to be run inside the backend container

set -e

echo "🔧 Initializing database schema and seeds..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until node -e "
const pool = require('./src/config/database.js').default;
pool.query('SELECT 1').then(() => {
  console.log('Database ready!');
  process.exit(0);
}).catch(err => {
  console.log('Database not ready yet...', err.message);
  process.exit(1);
});
" 2>/dev/null; do
  sleep 2
done

echo "✅ Database connection established"

# Run migrations
echo "📋 Running database migrations..."
npm run migrate:latest

# Run production seeds
echo "🌱 Running production seeds..."
npm run seed:production

echo "✅ Database initialization completed"