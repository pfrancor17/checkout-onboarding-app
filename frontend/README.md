# Frontend – Checkout Onboarding SPA

React 19 + TypeScript + Vite, Redux Toolkit (Flux) with redux-persist, tested with Jest + Testing Library.

## Run locally

```bash
cp .env.example .env.local   # API URL and the gateway PUBLIC key
npm install
npm run dev                  # http://localhost:5173 (backend on :3000)
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` / `npm run build` | Dev server / production build |
| `npm test` / `npm run test:cov` | Unit tests / coverage (threshold 80%) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## Notes

- **Mobile first**: designed for 375 px wide screens (iPhone SE) and up; layout with flexbox and grid only.
- **Progress survives a refresh**: the checkout step is persisted in `localStorage` (whitelisted slices only).
- **Card data is never stored**: number, CVC and expiry stay inside the payment form and go straight to the gateway to be tokenized.
- Jest runs through `babel-jest` (TypeScript 6 is not supported by `ts-jest` yet); `tsc` does the type checking.
