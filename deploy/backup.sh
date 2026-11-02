#!/bin/sh
# Daily backup of both databases and uploaded media. Keeps 7 days in /opt/exacta/backups.
# Cron: 30 4 * * * /opt/exacta/backup.sh >> /opt/exacta/backups/backup.log 2>&1
set -e
cd /opt/exacta
DIR=/opt/exacta/backups
STAMP=$(date +%F)
mkdir -p "$DIR"

docker compose exec -T db pg_dump -U exacta -d exacta | gzip > "$DIR/exacta-$STAMP.sql.gz"
docker compose exec -T db pg_dump -U exacta -d n8n | gzip > "$DIR/n8n-$STAMP.sql.gz"
docker compose exec -T web tar -C /app/media -czf - . > "$DIR/media-$STAMP.tar.gz"

find "$DIR" -type f \( -name '*.gz' \) -mtime +7 -delete
echo "$(date -Is) backup ok"
