#!/usr/bin/env bash
set -euo pipefail

# Generate production secrets and print them to stdout.
# Usage:
#   ./scripts/generate-secrets.sh                      # show values
#   ./scripts/generate-secrets.sh >> docker/.env        # append to env file

echo "# Generated $(date)"
echo "# Run: source <(./scripts/generate-secrets.sh)"
echo ""

# 64-char hex (32 bytes) — used for JWT signing + encryption
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo "SECRET_KEY=$SECRET_KEY"

# 24-char alphanumeric — used for Postgres password
POSTGRES_PASSWORD=$(python3 -c "import secrets; import string; chars = string.ascii_letters + string.digits; print(''.join(secrets.choice(chars) for _ in range(24)))")
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"

echo ""
echo "# Add these to your docker/.env file and then set:"
echo "#   OPENAI_API_KEY=sk-..."
echo "#   DOMAIN=app.yourdomain.com"
echo "#   API_DOMAIN=api.yourdomain.com"
echo "#   CADDY_EMAIL=admin@yourdomain.com"
echo "#   SMTP_* (optional)"
echo "#   STRIPE_* (optional)"
