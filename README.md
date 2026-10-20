# Ghotok (ghotok.com.bd)

Ghotok is a matchmaking platform for every faith in Bangladesh: Hindu, Muslim, Christian, Buddhist and others. Families create free biodatas, browse and filter verified profiles, and unlock guardian contact details with paid "connections". Staff review biodatas, verify NIDs and payments, and handle reports from an admin panel.

The site works in **Bangla and English** and has **light and dark modes**.

## Contents

| Folder | What it is | Stack |
|---|---|---|
| `server/` | REST API | Node.js 20+, Express 4, MongoDB (Mongoose 8), JWT, Zod |
| `web/` | Public website and user dashboard | Next.js 15 (App Router), React 19, server-side rendered for SEO |
| `admin/` | Staff admin panel | React 19 + Vite, React Router |

## Features

### Public website
- Home page with quick search, stats, recently approved biodatas, packages
- Biodata search with filters: type, religion, marital status, age, height, division, district, education, profession, complexion, family status, NID-verified only, and search by biodata number
- Biodata detail page with all public sections. Contact details stay hidden until unlocked.
- SEO: server-rendered pages, per-biodata titles and descriptions, canonical URLs, `sitemap.xml`, `robots.txt`, FAQ structured data
- Pages: Packages, Guide, FAQ, About, Contact, Privacy policy, Terms, Refund policy

### User dashboard
- Account: register with email and/or a Bangladeshi mobile number, log in, forgot/reset password, change password, sign out of all devices
- Biodata: an 11-step form (general, address, education, family, personal, occupation, marriage, expected partner, private contact, photo + NID, pledge) that saves as you go, then is submitted for review
- Validation: legal minimum age (bride 18, groom 21), and the guardian number must be valid and must not be the user's own number
- Hide or show the biodata (with a reason); delete it (soft delete) and request a restore
- Connection balance, purchase history and a full connection ledger
- Profile visits (today, 7 days, 30 days) and who added you to favorites
- Lists: favorites, not interested (hidden from search), who favorited me, unlocked contacts
- Proposals: send (free; requires your own approved biodata) and receive. Accepting a proposal reveals both guardian contacts without spending connections.
- Report a biodata, optionally asking for the connection back
- In-app notifications and support tickets

### Payments
- **Manual:** the user sends money with bKash, Nagad or Rocket and submits the TrxID; staff verify it. A TrxID can only be used once.
- **bKash Tokenized Checkout:** ready in code and switched off by default. Set `BKASH_API_ENABLED=true` and add merchant credentials, and an "instant bKash" button appears. Connections are added automatically after the callback.
- Default packages: 3 connections for ৳300 and 5 connections for ৳500. Packages can be edited in the admin panel.

### Admin panel (role based)
| Role | Can do |
|---|---|
| `support` (reviewer) | Biodata approvals (approve, reject, ask for corrections), NID verification, hide from search, reports, support tickets, view users |
| `admin` | Everything above, plus payments, refunds, manual connection grant/revoke/refund, recovery queue, suspend users, packages (view), audit log |
| `superadmin` | Everything, plus role assignment and package editing |

Overview dashboard: work queues, totals, revenue, 14-day signup and revenue charts, and biodatas by status. Every staff decision is written to an **audit log**.

### Privacy and security
- Public API responses never include contact details, NID, photo key, owner id or exact birth date (age only)
- Photos and NID files are private; they are streamed only to the owner, staff, or (for photos) users who unlocked the contact
- File uploads are checked by magic bytes, not only by extension (JPG, PNG, WEBP, PDF; max 5 MB)
- Passwords hashed with bcrypt; JWTs are invalidated on password change, role change, suspension and "sign out everywhere"
- Helmet, CORS allow-list, rate limits on auth and on the whole API
- Connection balance changes are atomic and can never go below zero; every change is recorded in a ledger

## Local setup

Requirements: Node.js 20+ and MongoDB 6+ (local, Docker or MongoDB Atlas).

```bash
# 1. API
cd server
cp .env.example .env          # set MONGODB_URI, JWT_SECRET and payment numbers
npm install
npm run seed -- --demo        # packages + super admin (+ 8 demo biodatas; skip --demo in production)
npm run dev                   # http://localhost:5000

# 2. Website
cd ../web
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000

# 3. Admin panel
cd ../admin
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

The super admin login comes from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `server/.env` (default `admin@ghotok.com.bd` / `ChangeMe!2026`). **Change it before going live.**

Quick MongoDB with Docker: `docker run -d -p 27017:27017 --name ghotok-mongo mongo:7`

## Tests

```bash
cd server && npm test
```

The test suite starts its own in-memory MongoDB. It covers registration and login, biodata validation, review, search privacy, manual payment verification and double-credit protection, unlocking, favorites, proposals, report-and-refund, role permissions, the no-op-save rule, hide/delete/restore, support tickets, private file access and view counting.

## Environment variables

See `server/.env.example`, `web/.env.example` and `admin/.env.example`. The most important ones:

| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | server | Database connection |
| `JWT_SECRET` | server | Long random string (required in production) |
| `CORS_ORIGINS` | server | Website and admin URLs, comma separated |
| `WEB_URL`, `API_PUBLIC_URL` | server | Used for bKash callback and password-reset links |
| `BKASH_MERCHANT_NUMBER`, `NAGAD_MERCHANT_NUMBER`, `ROCKET_MERCHANT_NUMBER` | server | Numbers shown to users for manual payment |
| `BKASH_API_ENABLED` + `BKASH_*` | server | bKash Tokenized Checkout credentials |
| `STORAGE_DRIVER` + `R2_*` | server | `local` disk or Cloudflare R2 |
| `SMTP_*` | server | Email for password reset (logs to console when empty) |
| `NEXT_PUBLIC_API_URL`, `API_URL`, `NEXT_PUBLIC_SITE_URL` | web | API and canonical site URL |
| `NEXT_PUBLIC_ADMIN_URL` | web | Shows an "Admin" link in the header for staff |
| `VITE_API_URL`, `VITE_WEB_URL` | admin | API and website URLs |

## Deployment outline

- **API:** any Node host (VPS with PM2, Railway, Render). Run behind HTTPS. `npm start`.
- **Website:** `npm run build` then `npm start`, or deploy to Vercel. `output: 'standalone'` is enabled for Docker or VPS use.
- **Admin:** `npm run build`, then serve the `dist/` folder as a static site with SPA fallback to `index.html` (Netlify, Cloudflare Pages, Nginx). Use a separate subdomain, e.g. `admin.ghotok.com.bd`.
- **Database:** MongoDB Atlas (a replica set also enables multi-document transactions later).
- **Files:** set `STORAGE_DRIVER=r2` and the `R2_*` keys for Cloudflare R2.

## Before launch

- Have a lawyer review the Privacy policy, Terms and Refund policy texts (`web/lib/content.js`). They are drafts.
- Replace the placeholder office address and hotline on the Contact page.
- Set real payment numbers, and apply for bKash/Nagad merchant APIs if you want instant payment.
- Change the seeded super-admin password and create separate staff accounts.
- Configure SMTP so password-reset emails are delivered.

## Not built yet

- SMS OTP for phone verification and phone-only password reset (needs an SMS gateway such as SSL Wireless or BulkSMSBD)
- Google sign-in
- Nagad and Rocket automatic payment APIs (manual verification works today)
- Upazila dropdown (users type the upazila/area; division and district are lists)
- Email notifications (in-app notifications are built)

## Project structure

```
server/src
  config/        env and database
  models/        User, Biodata, commerce (Package, Payment, Ledger, Unlock, RefundRequest), social, support
  routes/        auth, biodatas (public), me (dashboard), payments, files, admin
  services/      connections ledger, notifications + audit, storage (local/R2), bKash, mailer
  utils/         validation helpers, phone normalisation, biodata field whitelist
  scripts/seed.js
web/
  app/           Next.js routes (public pages, (auth), dashboard/*)
  components/    Header, Footer, BiodataCard, BiodataSections, UI kit
  lib/           API client, Bangla/English dictionary, formatting, page content
admin/src
  pages/         Overview, Biodatas, BiodataReview, Payments, Refunds, Reports, Recovery, Tickets, Users, Packages, Audit
```

`server/src/constants.js` holds the shared option lists. `web/lib/constants.js` and `admin/src/lib/constants.js` are copies of it; keep them in sync.
