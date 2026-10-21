# 0004 — Next.js for the website, Vite for the admin panel

**Status:** Accepted · 2026-10

## Context

Most visitors arrive from search engines and Facebook links to a specific biodata or a search like "Hindu bride Dhaka". Those pages must be indexable and fast on mid-range Android phones. The admin panel is private, used by a few staff members on desktops.

## Decision

- **Website: Next.js (App Router).** Public pages are server components with per-page titles, descriptions, canonical URLs, a sitemap and robots rules. API responses are cached for 30–60 seconds. The search page is a plain GET form, so it works before JavaScript loads and every result page has its own URL.
- **Admin: React + Vite**, a static single-page app served by nginx. No SEO, no server needed, and it can be hosted on a separate subdomain behind extra protection.
- Both use the same components, styles and API client from `packages/ui`.

## Consequences

- Two front-end build systems, but each is the simplest fit for its job.
- `NEXT_PUBLIC_*` and `VITE_*` values are compiled in at build time; Docker images take them as build arguments.
- Language and theme are cookies on the website (server-rendered correctly on first paint) and `localStorage` in the admin panel.
