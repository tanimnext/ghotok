# @ghotok/admin

Staff admin panel — React 19, Vite, React Router. A static single-page app that talks only to the API.

```bash
cp .env.example .env
npm run dev          # http://localhost:5173 (needs the API on :5000)
npm run build        # → dist/ (served by nginx in Docker, see Dockerfile and nginx.conf)
```

Sign in with a staff account (`support`, `admin` or `superadmin`). Pages are in `src/pages`, strings in `src/i18n`, status labels come from `@ghotok/shared`. Day-to-day staff work is described in [docs/operations.md](../../docs/operations.md).
