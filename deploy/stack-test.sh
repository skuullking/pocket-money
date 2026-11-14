#!/usr/bin/env bash
# Démarre la pile de production complète (docker-compose.yml) sur DOMAIN=localhost
# et la vérifie de bout en bout : Caddy (HTTPS), nginx, API, Postgres, Socket.IO,
# sauvegarde, restauration, monitor. Destructif : à lancer en CI ou sur une machine
# de test, jamais sur le serveur de production.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${STACK_TEST:-}" != "yes" ]; then
  echo "Refus : ce test écrase la base de la pile. Relancer avec STACK_TEST=yes." >&2
  exit 1
fi

BASE=https://localhost
CURL=(curl -sS -k --max-time 15)
# Les réponses sont lues en entier avant d'être cherchées : avec pipefail, un
# `curl | grep -q` échoue dès que grep s'arrête avant la fin d'un gros fichier.
contains() { grep -q -- "$2" <<< "$1"; }
JAR=$(mktemp)
fail() { echo "ÉCHEC : $*" >&2; exit 1; }
ok() { echo "ok - $*"; }

if [ ! -f .env ]; then
  cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
DOMAIN=localhost
RESEND_API_KEY=re_stack_test_not_a_real_key
EMAIL_FROM=PocketMoney <no-reply@example.com>
LEGAL_OPERATOR=Stack test
LEGAL_CONTACT=contact@example.com
LEGAL_HOST=Stack test
EOF
fi

docker compose up -d --build --wait --wait-timeout 300 || {
  docker compose ps; docker compose logs --tail 100; fail "la pile ne démarre pas"
}
ok "pile démarrée, app healthy"

# ── HTTPS, nginx, API, base ────────────────────────────────────────────────
health=$("${CURL[@]}" "$BASE/api/health")
contains "$health" '"status":"ok"' || fail "/api/health : $health"
ok "/api/health via Caddy → nginx → API → Postgres"

headers=$("${CURL[@]}" -D - -o /dev/null "$BASE/")
grep -qi '^strict-transport-security' <<< "$headers" || fail "pas de HSTS"
grep -qi '^x-frame-options: DENY' <<< "$headers" || fail "pas de X-Frame-Options"
ok "en-têtes de sécurité Caddy"

redirect=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 http://localhost/)
case "$redirect" in 30[178]\ https://*) ok "HTTP redirigé vers HTTPS";; *) fail "redirection HTTP : $redirect";; esac

contains "$("${CURL[@]}" "$BASE/privacy")" '<div id="root">' || fail "route SPA /privacy"
index=$("${CURL[@]}" "$BASE/")
asset=$(grep -o '/assets/index-[^"]*\.js' <<< "$index" | sed -n 1p)
[ -n "$asset" ] || fail "bundle JS introuvable dans index.html"
contains "$("${CURL[@]}" "$BASE$asset")" 'Stack test' || fail "LEGAL_OPERATOR absent du bundle"
ok "SPA servie, fallback des routes, pages légales compilées"

# ── Inscription, cookie, session ───────────────────────────────────────────
signup() {
  "${CURL[@]}" -c "$JAR" -b "$JAR" -o /dev/null -w '%{http_code}' \
    -H 'Content-Type: application/json' -H "Origin: $BASE" \
    -d "{\"name\":\"$1\",\"email\":\"$2\",\"password\":\"stack-test-pw\",\"familyName\":\"Famille $1\",\"acceptTerms\":true,\"parentalConsent\":true}" \
    "$BASE/api/auth/register/parent/create"
}
login() {
  "${CURL[@]}" -c "$JAR" -b "$JAR" -o /dev/null -w '%{http_code}' \
    -H 'Content-Type: application/json' -H "Origin: $BASE" \
    -d "{\"email\":\"$1\",\"password\":\"stack-test-pw\"}" "$BASE/api/auth/login"
}

[ "$(signup Avant avant@example.com)" = 201 ] || fail "inscription parent"
grep -q 'localhost' "$JAR" || fail "cookie d'auth non posé"
me=$("${CURL[@]}" -b "$JAR" "$BASE/api/auth/me")
contains "$me" '"name":"Avant"' || fail "/api/auth/me : $me"
ok "inscription, cookie httpOnly et session à travers les deux proxys"

csrf=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -b "$JAR" -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.example' -d '{}' "$BASE/api/auth/logout")
[ "$csrf" = 403 ] || fail "requête d'une autre origine acceptée ($csrf)"
ok "requêtes d'une autre origine refusées"

# ── Temps réel ─────────────────────────────────────────────────────────────
cookie=$(awk '!/^#/ || /^#HttpOnly_/ {sub(/^#HttpOnly_/, ""); if (NF >= 7) printf "%s=%s; ", $6, $7}' "$JAR")
contains "$cookie" 'pm_session=' || fail "cookie de session illisible dans $JAR"
# Handshake HTTP d'abord : sépare un souci de proxy d'un souci de WebSocket.
handshake=$("${CURL[@]}" -H "Origin: $BASE" -H "Cookie: $cookie" "$BASE/socket.io/?EIO=4&transport=polling")
contains "$handshake" '"sid"' || fail "handshake Socket.IO en polling : $handshake"
upgrade=$(curl -sk --http1.1 --max-time 5 -o /dev/null -w '%{http_code}' \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: c3RhY2stdGVzdC1rZXktMTI=' -H "Origin: $BASE" -H "Cookie: $cookie" \
  "$BASE/socket.io/?EIO=4&transport=websocket" || true)
echo "upgrade WebSocket via Caddy et nginx : HTTP $upgrade"
NODE_TLS_REJECT_UNAUTHORIZED=0 SOCKET_COOKIE="$cookie" SOCKET_URL="$BASE" \
  node deploy/socket-check.mjs || fail "Socket.IO"
ok "Socket.IO en WebSocket, authentifié par le cookie"

# ── Monitor ────────────────────────────────────────────────────────────────
contains "$(docker compose exec -T monitor wget -q -O - http://app/api/health)" '"status":"ok"' \
  || fail "monitor n'atteint pas l'app"
ok "monitor atteint http://app/api/health"

# ── Sauvegarde automatique ─────────────────────────────────────────────────
for _ in $(seq 30); do
  docker compose exec -T backup sh -c 'ls /backups/pocketmoney-*.dump' >/dev/null 2>&1 && break
  sleep 2
done
docker compose exec -T backup sh -c 'ls /backups/pocketmoney-*.dump' >/dev/null || fail "aucune sauvegarde quotidienne"
contains "$(docker compose logs backup)" 'backup ok' || fail "backup.sh n'a pas confirmé"
ok "sauvegarde quotidienne écrite et vérifiée"

# ── Restauration (procédure du README) ─────────────────────────────────────
docker compose exec -T backup pg_dump --format=custom --file=/backups/stack-test.dump
[ "$(signup Apres apres@example.com)" = 201 ] || fail "seconde inscription"
docker compose stop app
docker compose exec -T -e CONFIRM_RESTORE=yes backup sh /deploy/restore.sh /backups/stack-test.dump
docker compose start app
docker compose up -d --wait --wait-timeout 120 app
rm -f "$JAR"; JAR=$(mktemp)
[ "$(login avant@example.com)" = 200 ] || fail "compte d'avant la sauvegarde perdu"
[ "$(login apres@example.com)" = 401 ] || fail "compte d'après la sauvegarde toujours là"
ok "restauration : retour exact à l'état sauvegardé"

echo "Pile de production validée."
