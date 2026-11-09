#!/bin/sh
# Surveille l'application depuis l'intérieur de la pile et prévient au changement d'état.
# Ne détecte pas la perte du serveur entier : ajouter une sonde externe sur /api/health.
set -u

if [ -z "${ALERT_WEBHOOK_URL:-}" ]; then
  echo "ALERT_WEBHOOK_URL absent : surveillance désactivée"
  exec sleep 2147483647
fi

alert() {
  body=$(printf '{"text":"%s","content":"%s"}' "$1" "$1")
  wget -q -O /dev/null --header='Content-Type: application/json' --post-data="$body" "$ALERT_WEBHOOK_URL" \
    || echo "alerte non remise: $1" >&2
}

failures=0
down=false
while true; do
  if wget -q -T 10 -O /dev/null "$MONITOR_URL"; then
    if [ "$down" = true ]; then
      alert "PocketMoney est de nouveau disponible."
    fi
    failures=0
    down=false
  else
    failures=$((failures + 1))
    if [ "$failures" -ge 3 ] && [ "$down" = false ]; then
      alert "PocketMoney est indisponible depuis 3 minutes."
      down=true
    fi
  fi
  sleep 60
done
