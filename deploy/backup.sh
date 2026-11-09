#!/bin/sh
# Sauvegarde quotidienne, vérifiée avant d'être conservée. PG* vient de docker-compose.yml.
set -u
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

while true; do
  target="/backups/pocketmoney-$(date -u +%Y%m%dT%H%M%SZ).dump"
  if pg_dump --format=custom --file="$target.tmp" && pg_restore --list "$target.tmp" > /dev/null; then
    mv "$target.tmp" "$target"
    find /backups -name 'pocketmoney-*.dump' -mtime +"$RETENTION_DAYS" -delete
    echo "backup ok: $target"
  else
    rm -f "$target.tmp"
    echo "backup FAILED: $target" >&2
  fi
  sleep 86400
done
