FROM node:24-slim AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS development
RUN useradd -ms /bin/sh -u 1001 app
COPY --chown=app:app . .
USER app
CMD ["npm", "run", "start:dev"]

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:24-slim AS production
RUN useradd -ms /bin/sh -u 1001 app
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder --chown=app:app /app/dist ./dist
USER app
EXPOSE 3005
ENV PORT=3005
CMD ["npm", "run", "start:prod"]
