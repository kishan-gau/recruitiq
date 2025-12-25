#!/bin/bash

# Backend startup script with automatic migrations
# This ensures migrations run every time the container starts

set -e  # Exit on any error

echo "🚀 Starting RecruitIQ Backend..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
while ! pg_isready -h postgres -p 5432 -U postgres; do
  echo "   PostgreSQL not ready, waiting 2 seconds..."
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "📊 Running database migrations..."
npm run migrate:latest
if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migration failed!"
  exit 1
fi

# Check if we need to run seeds (only in development)
if [ "$NODE_ENV" = "development" ]; then
  echo "🌱 Checking if seeds are needed..."
  
  # Check if organizations table has data
  ORG_COUNT=$(psql -h postgres -U postgres -d recruitiq_dev -t -c "SELECT COUNT(*) FROM organizations;" 2>/dev/null || echo "0")
  
  if [ "$ORG_COUNT" -eq 0 ]; then
    echo "🌱 Running database seeds..."
    npm run seed
    echo "✅ Seeds completed successfully"
  else
    echo "ℹ️  Database already has data, skipping seeds"
  fi
fi

# Start the development server
echo "🎯 Starting development server..."
exec npm run dev