FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
# Copy Prisma-generated client and CLI from builder
COPY --from=builder /app/node_modules/.prisma         ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client  ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/prisma          ./node_modules/prisma
COPY --from=builder /app/dist                         ./dist
COPY prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]
