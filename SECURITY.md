# Security

## Reporting a vulnerability

Email **security@ghotok.com.bd** (or the support address in Admin › Site settings) with steps to reproduce. Please do not open a public issue. We aim to acknowledge within 2 working days.

## What we protect

Ghotok stores personal information about families: guardian phone numbers, dates of birth, NID images and photos. The rules are:

- Contact details, exact dates of birth, NIDs and photos are never in public responses or pages. They are released only to the owner, to staff, and (contact and photo) to a user who unlocked them or whose proposal was accepted.
- Files are stored privately (Cloudflare R2 or a private volume) under random keys and streamed through the API after an access check.
- Staff access is role based; every staff decision is in the audit log.

## Practices in the code

- Passwords: bcrypt. Sessions: JWT with server-side revocation (`tokenVersion`).
- One-time codes and links: SHA-256 hashed, short-lived, attempt-limited.
- Input: validated with Zod on every route; biodata input whitelisted against the schema; uploads checked by magic bytes and size.
- HTTP: Helmet headers, CORS allow-list, rate limits, request ids, no stack traces in responses, secrets redacted from logs.
- Configuration: the API refuses to start in production with unsafe settings (weak JWT secret, SMS log driver, default admin password).
- CSV exports neutralise spreadsheet formulas.

## Operational checklist

- Rotate `JWT_SECRET` if it may have leaked (signs everyone out).
- Keep dependencies current (`npm outdated`, `npm audit`) and rebuild images monthly for base-image patches.
- Restrict `admin.ghotok.com.bd` (office IPs or an extra auth layer) if possible.
- Back up the database and files; test restores.
