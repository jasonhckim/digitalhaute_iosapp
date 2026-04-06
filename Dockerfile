FROM node:22-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY server/ server/
COPY shared/ shared/
COPY tsconfig.json ./
RUN npm run server:build

FROM node:22-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/server_dist ./server_dist
COPY server/templates/ server/templates/
COPY assets/ assets/

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server_dist/index.js"]
