# Backend – Checkout Onboarding API

NestJS + TypeORM + PostgreSQL.

## Run locally

```bash
cp .env.example .env          # adjust values if needed
docker compose up -d          # from the repo root: starts PostgreSQL on port 5433
npm install
npm run db:setup              # runs migrations + seeds dummy products (idempotent)
npm run start:dev
```

- Health check: `GET http://localhost:3000/api/health`
- Swagger UI: `http://localhost:3000/api/docs`

## Scripts

| Script | Description |
|---|---|
| `npm run migration:run` / `migration:revert` | Apply / revert migrations |
| `npm run seed` | Insert dummy products (skips existing SKUs) |
| `npm test` / `npm run test:cov` | Unit tests / coverage (threshold 80%) |
| `npm run test:e2e` | HTTP-level tests |
| `npm run lint` / `npm run build` | Lint / compile |
