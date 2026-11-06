# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:24-alpine
WORKDIR /app
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/deploy/vps/server.mjs ./server.mjs
COPY --from=builder --chown=node:node /app/deploy/vps/site ./site
USER node
ENV HOST=0.0.0.0 PORT=18080 NODE_ENV=production
EXPOSE 18080
CMD ["node", "server.mjs"]
