# Changelog

All notable changes. Dates are in Asia/Dhaka time.

## [1.0.0] — 2026-10-21

### Added

- Monorepo with shared packages: the biodata schema drives the database model, validation, submission rules, public view, the 12-step form and the admin editor.
- Faith-aware biodata: religion-specific questions for Hindu, Muslim, Christian and Buddhist families; gendered wording; special categories; married status; education methods including madrasa Alia/Qawmi.
- Locations down to upazila (8 divisions, 64 districts, 494 upazilas) with live counts in search; present address and living abroad by country.
- Accounts: phone OTP verification, password reset by SMS code, email verification, Google sign-in, account deletion.
- Website: verified badges, share/print/copy biodata number, birth month, contact form, downloads page, child safety policy, notification bell, mobile tab bar, chat button, announcement bar, PWA manifest.
- Admin: inline biodata editing, contact inbox, downloads manager, site settings (payment numbers, contact details, social links, announcement), payment CSV export with date range, manual phone/email verification, urgent "possible minor" reports, lazy-loaded pages, phone-friendly menu.
- OpenAPI documentation generated from the route definitions at `/api/docs`.
- Structured JSON logging, request ids, graceful shutdown, production configuration checks.
- Tests: 15 unit, 5 dictionary, 39 API integration and 13 end-to-end checks (desktop and mobile).
- Docker images for the API, website (Next.js standalone) and admin (nginx), docker compose, GitHub Actions CI.
- Documentation: architecture, ADRs, API guide, deployment, operations, feature parity.

### Changed

- Restructured `server/`, `web/`, `admin/` into `apps/api`, `apps/web`, `apps/admin`.
- Biodata URLs use the code (`/biodatas/GH-1001`).

## [0.1.0] — 2026-10-20

- First version: API, Next.js website and React admin panel.
