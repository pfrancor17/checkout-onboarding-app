# syntax=docker/dockerfile:1

# ---- Build: compile TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Runtime: only production dependencies and the compiled code ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Never run as root inside the container.
USER node
EXPOSE 3000

# Migrations + seed (idempotent), then the API.
CMD ["sh", "-c", "node dist/database/prepare-database.js && node dist/main.js"]
