#!/bin/sh
# =============================================================================
# Docker Entrypoint — Run migrations then start the server
# =============================================================================
set -e

echo "======================================"
echo "  ERP System — Starting Up"
echo "  Environment: ${NODE_ENV:-production}"
echo "======================================"

# Wait for PostgreSQL to be ready (extra safety beyond depends_on)
echo "⏳ Waiting for database..."
until node -e "
  const { Pool } = require('pg');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  p.query('SELECT 1').then(() => { p.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "   Database not ready — retrying in 3s..."
  sleep 3
done
echo "✅ Database is ready"

# Run database migrations
echo "🔄 Running database migrations..."
node scripts/migrate-db.js
echo "✅ Migrations complete"

# Start the application
echo "🚀 Starting ERP server on port ${PORT:-5000}..."
exec node server.js
