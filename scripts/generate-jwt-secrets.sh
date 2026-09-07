#!/usr/bin/env bash
set -euo pipefail

echo "Add these to Render → cleft-api → Environment:"
echo ""
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)"
