FROM node:24-slim AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS development
COPY . .
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start:dev"]

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:24-slim AS production
RUN useradd -ms /bin/sh -u 1001 app
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev \
  && npm install prisma@^8.0.0-rc.29 @prisma/cli-engine@^0.9.0 --no-save
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=app:app /app/migrations ./migrations
COPY --from=builder --chown=app:app /app/src/prisma/contract.prisma ./src/prisma/contract.prisma
COPY --chown=app:app docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
USER app
EXPOSE 3005
ENV PORT=3005
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start:prod"]
