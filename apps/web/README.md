# @ghotok/web

Public website and user dashboard — Next.js 15 (App Router), React 19.

```bash
cp .env.example .env.local
npm run dev          # http://localhost:3000 (needs the API on :5000)
npm test             # dictionary checks
```

| Folder                | Contents                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `app/`                | Routes. Public pages are server components; `dashboard/` is client-side. |
| `components/`         | Header, footer, cards, search filters, OTP and Google sign-in            |
| `lib/i18n/{en,bn}.js` | UI strings (biodata labels come from `@ghotok/shared`)                   |
| `lib/content.js`      | Long-form pages (FAQ, guide, policies) in both languages                 |
| `lib/server.js`       | Server-side API access, language/theme cookies, site settings            |

`NEXT_PUBLIC_*` variables are compiled in at build time. See [docs/architecture.md](../../docs/architecture.md#website).
