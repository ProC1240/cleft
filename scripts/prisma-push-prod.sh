#!/usr/bin/env bash
# Push Prisma schema to Supabase (when Render Free Shell is unavailable).
# Usage:
#   DATABASE_URL='postgresql://...' ./scripts/prisma-push-prod.sh

set -euo pipefail
cd "$(dirname "$0")/../backend"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: Set DATABASE_URL to your Supabase connection string."
  echo "  DATABASE_URL='postgresql://...' ./scripts/prisma-push-prod.sh"
  exit 1
fi

echo "Pushing schema to production database..."
npx prisma db push

echo "Done."
