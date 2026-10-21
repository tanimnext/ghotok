# Ghotok (ghotok.com.bd)

Ghotok is a matchmaking platform for every faith in Bangladesh — Hindu, Muslim, Christian, Buddhist and others. Families create a free biodata, browse and filter reviewed profiles, and unlock a guardian's contact details with paid **connections** (3 for ৳300, 5 for ৳500, paid with bKash, Nagad or Rocket). Staff review biodatas, verify NIDs and payments, and handle reports from a separate admin panel.

Everything works in **Bangla and English**, in **light and dark mode**, on phones and desktops.

[![CI](https://github.com/tanimnext/ghotok/actions/workflows/ci.yml/badge.svg)](https://github.com/tanimnext/ghotok/actions/workflows/ci.yml)

## Repository layout

This is an npm-workspaces monorepo. Shared code lives in `packages/`, deployable apps in `apps/`.

| Path              | What it is                                                                  | Stack                                       |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `apps/api`        | REST API (`/api`, docs at `/api/docs`)                                      | Node 22, Express 4, MongoDB/Mongoose 8, Zod |
| `apps/web`        | Public website and user dashboard (server-rendered for SEO)                 | Next.js 15 App Router, React 19             |
| `apps/admin`      | Staff admin panel                                                           | React 19, Vite, React Router                |
| `packages/shared` | Biodata schema, option lists, locations, business rules, bilingual messages | Plain ES modules (no dependencies)          |
| `packages/ui`     | Shared styles, API client, form and biodata components                      | React 19                                    |
| `e2e`             | End-to-end tests across all three apps                                      | Playwright                                  |
| `docs`            | Architecture, decisions (ADRs), deployment, API and operations guides       | Markdown                                    |

The most important design idea: **the biodata is defined once**, in [`packages/shared/src/biodata/schema.js`](packages/shared/src/biodata/schema.js). The database model, input validation, submission rules, the public projection, the 12-step form and every read-only view are generated from it. See [docs/architecture.md](docs/architecture.md).

## Quick start (development)

Requirements: **Node.js 22.12+** (see `.nvmrc`) and **MongoDB 6+** (local, Docker or Atlas).

```bash
npm install                                   # installs every workspace

cp apps/api/.env.example apps/api/.env        # set MONGODB_URI at least
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env

npm run seed:demo                             # packages, super admin and 24 demo biodatas
npm run dev                                   # API :5000 · website :3000 · admin :5173
```

- Website: http://localhost:3000 — demo users `demo1@example.com` … `demo24@example.com`, password `demo12345`
- Admin: http://localhost:5173 — `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `apps/api/.env`
- API docs: http://localhost:5000/api/docs

In development, SMS codes and emails are not sent: they are written to the API log (`SMS_DRIVER=log`, empty `SMTP_HOST`).

No local MongoDB? `docker run -d -p 27017:27017 mongo:7`, or run the whole stack with Docker (below).

## Scripts (run from the repository root)

| Command             | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `npm run dev`       | API, website and admin with hot reload                                 |
| `npm run build`     | Production builds of the website and admin                             |
| `npm test`          | Unit tests (shared, website dictionaries) and API integration tests    |
| `npm run test:e2e`  | Playwright end-to-end tests (run `npm run build` first)                |
| `npm run lint`      | ESLint for the whole repository                                        |
| `npm run format`    | Prettier (use `format:check` in CI)                                    |
| `npm run check`     | Lint + format check + tests + build — run this before every push       |
| `npm run seed`      | Create the packages and the first super admin (safe to run again)      |
| `npm run seed:demo` | Same, plus demo biodatas (refused when `NODE_ENV=production`)          |
| `npm run openapi`   | Export the OpenAPI document to `docs/api/openapi.json`                 |
| `npm run geo:build` | Rebuild the division/district/upazila list from `packages/shared/data` |

## Docker

```bash
cp .env.docker.example .env.docker      # set JWT_SECRET, SEED_ADMIN_PASSWORD, SMS gateway…
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker exec api node apps/api/src/scripts/seed.js
```

This starts MongoDB, the API (:5000), the website (:3000) and the admin panel (:5173). Production deployment, TLS, backups and third-party setup (Cloudflare R2, SMTP, SMS, bKash, Google sign-in) are described in [docs/deployment.md](docs/deployment.md).

## Testing

- **Unit** — `packages/shared/test`: phone numbers, dates and ages, input sanitising, submission rules, locations, labels.
- **API integration** — `apps/api/tests`: every module against an in-memory MongoDB (auth, OTP, Google sign-in, biodata rules and search, payments and the connection ledger, proposals, reports, refunds, roles, settings, downloads, the contact form, OpenAPI).
- **Dictionaries** — `apps/web/test`, `apps/admin/test`: English and Bangla have the same keys and every key used in the code exists.
- **End-to-end** — `e2e/`: the full product loop in a real browser (register → fill the 12-step biodata → admin approves → another family pays → admin verifies → unlock), search with live location counts, language/theme switching, the contact form, admin pages, CSV export; desktop and mobile.

## Documentation

- [Architecture](docs/architecture.md) — how the pieces fit, data model, how to add a field or an endpoint
- [Decisions (ADRs)](docs/adr) — why the monorepo, the schema-driven biodata, the connection ledger, Next.js, and the sign-in methods
- [API guide](docs/api.md) — authentication, errors, pagination, rate limits (the full reference is generated at `/api/docs`)
- [Deployment](docs/deployment.md) — production setup and the go-live checklist
- [Operations](docs/operations.md) — daily work for support and admin staff, backups, incidents
- [Feature parity](docs/feature-parity.md) — how Ghotok covers the features of the competitor it was benchmarked against
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## License

Proprietary. © Ghotok. All rights reserved.
