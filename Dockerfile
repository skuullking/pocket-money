# ── 1. Build frontend ────────────────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN VITE_API_URL=/api npm run build

# ── 2. Build backend ─────────────────────────────────────────────────────────
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate && npm run build

# ── 3. Runtime: nginx + node, managed by supervisord ─────────────────────────
FROM node:18-alpine
RUN apk add --no-cache nginx supervisor

# Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-builder /app/node_modules/.prisma        ./node_modules/.prisma
COPY --from=backend-builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=backend-builder /app/node_modules/prisma         ./node_modules/prisma
COPY --from=backend-builder /app/dist                        ./dist
COPY backend/prisma                                          ./prisma
COPY backend/start.sh                                        ./start.sh
RUN chmod +x start.sh

# Frontend → nginx
COPY --from=frontend-builder /app/dist     /usr/share/nginx/html
COPY frontend/nginx.conf                   /etc/nginx/http.d/default.conf

# Supervisord config
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
