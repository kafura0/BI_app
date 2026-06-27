#!/usr/bin/env bash
set -euo pipefail

# Database backup script for BI SaaS Platform
# Schedule via cron:  0 3 * * * /path/to/scripts/backup-db.sh
#
# Prerequisites:
#   - pg_dump (postgresql-client) installed on the host or in a container
#   - Docker Compose project is running
#
# Usage:
#   ./scripts/backup-db.sh                    # interactive
#   BACKUP_DIR=/custom/path ./backup-db.sh    # custom path

COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../docker" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/bi_saas_$TIMESTAMP.sql.gz"
DB_CONTAINER="${DB_CONTAINER:-docker-postgres-1}"
DB_NAME="${DB_NAME:-bi_saas}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

mkdir -p "$BACKUP_DIR"

if [ -z "$DB_PASSWORD" ]; then
  if [ -f "$COMPOSE_DIR/.env" ]; then
    DB_PASSWORD=$(grep -oP 'POSTGRES_PASSWORD=\K.*' "$COMPOSE_DIR/.env" || true)
  fi
fi

export PGPASSWORD="$DB_PASSWORD"

echo "Backing up $DB_NAME from container $DB_CONTAINER ..."
docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T "$DB_CONTAINER" \
  pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "Backup saved: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Cleanup backups older than 30 days
find "$BACKUP_DIR" -name "bi_saas_*.sql.gz" -mtime +30 -delete
echo "Cleaned up backups older than 30 days."
