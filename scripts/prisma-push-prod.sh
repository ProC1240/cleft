#!/usr/bin/env bash

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
