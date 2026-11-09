# ── 1. Build frontend ────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN VITE_API_URL=/api npm run build

# ── 2. Build backend ─────────────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
# Prisma choisit son moteur selon l'OpenSSL détecté : il doit être présent au build.
RUN apk add --no-cache openssl
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate && npm run build

# ── 3. Runtime: nginx + node, managed by supervisord ─────────────────────────
FROM node:22-alpine
RUN apk add --no-cache nginx supervisor openssl
ENV NODE_ENV=production

# Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/dist                 ./dist
COPY backend/prisma                                   ./prisma
COPY backend/start.sh                                 ./start.sh
# Un checkout Windows peut livrer des fins de ligne CRLF, illisibles par sh.
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Frontend → nginx
COPY --from=frontend-builder /app/dist     /usr/share/nginx/html
COPY frontend/nginx.conf                   /etc/nginx/http.d/default.conf

# Supervisord config
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
