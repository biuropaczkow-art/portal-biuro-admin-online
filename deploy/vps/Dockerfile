FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node site ./site
USER node
ENV HOST=0.0.0.0 PORT=18080 NODE_ENV=production
EXPOSE 18080
CMD ["node","server.mjs"]
