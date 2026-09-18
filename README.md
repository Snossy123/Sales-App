# GPS App (Sales-App)

React 19 + TypeScript + Vite SPA for نظام GPS للمبيعات (Arabic RTL). Talks to [Sales-API](../Sales-API/README.md) over `/api/v1`.

Client staff guide (Arabic): [`../docs/client-user-manual-ar.md`](../docs/client-user-manual-ar.md)

## Requirements

- Node.js 20+ (or the version used in CI)
- npm

## Environment

Copy [`.env.example`](.env.example).

| Variable | Meaning |
| --- | --- |
| `VITE_DEMO_MODE=true` | Standalone mock API (MSW). For demos only. |
| `VITE_DEMO_MODE=false` | Real Laravel API |
| `VITE_API_URL` | Production API base, e.g. `https://example.com/public/api/v1` |
| `VITE_PROXY_TARGET` | Docker/local proxy target (compose sets `http://api:8100`) |

Production builds must ship with `VITE_DEMO_MODE=false` and a real `VITE_API_URL`. See [`.env.production`](.env.production) for the hosted pattern.

## Local

```bash
npm install
npm run dev
```

Default Vite port in Docker compose is **5174**. SPA fallback for Vercel is in [`vercel.json`](vercel.json).

## Docker

From the GPS repo root (MySQL network must exist — [`../.env.docker.example`](../.env.docker.example)):

```bash
docker compose up -d --build
```

- Frontend: http://localhost:5174
- API: http://localhost:8100

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## Handover notes

- Sidebar labels and roles live in `src/lib/permissions.ts`; CRM items in `src/modules/crm/lib/crmNavCatalog.ts`.
- Incomplete POS/accessory checkouts persist as drafts and surface in the incomplete-procedures banner.
- Do not commit secrets. Keep production API URLs in env, not in source, when rotating hosts.
