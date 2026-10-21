# API guide

The complete, always-current reference is generated from the code:

- Interactive docs: `GET /api/docs` (Swagger UI)
- Machine-readable: `GET /api/docs/openapi.json` — a snapshot is committed at [`docs/api/openapi.json`](api/openapi.json) (`npm run openapi` refreshes it)

This page explains the conventions.

## Base URL and format

- All routes are under `/api`. Requests and responses are JSON (`Content-Type: application/json`), except file uploads (`multipart/form-data`, field `file`) and downloads.
- `GET /api/health` → `{ ok, db }` (503 when MongoDB is down) for load balancers and uptime checks.
- Every response has an `X-Request-Id` header (send your own to correlate logs).

## Authentication

```http
POST /api/auth/login
{ "identifier": "01712345678", "password": "…" }

→ 200 { "token": "eyJ…", "user": { "id": "…", "role": "user", "connections": 3, … } }
```

Send the token on later requests: `Authorization: Bearer <token>`. Tokens last `JWT_EXPIRES_IN` (default 7 days) and are revoked when the password, role or status changes, or after `POST /api/auth/logout-all`.

Other sign-in routes: `POST /auth/register`, `POST /auth/google` (Google ID token; returns `202 { needsGender: true }` for a new user), `POST /auth/forgot-password` + `POST /auth/reset-password` (email link token or phone + SMS code), `POST /auth/phone/send-code` + `POST /auth/phone/verify`, `POST /auth/email/send-verification` + `POST /auth/email/verify`.

Staff routes (`/api/admin/*`) need a staff role: `support` < `admin` < `superadmin`. The docs list the minimum role for each route.

## Language

Send `X-Lang: bn` or `X-Lang: en` (or a normal `Accept-Language`). Error messages come back in that language. Data (option values, codes) is language-neutral; labels for option values are in `@ghotok/shared`.

## Errors

```json
{
  "error": "Please check the highlighted fields.",
  "code": "VALIDATION",
  "fields": { "contact.guardianPhone": "Enter a valid Bangladeshi mobile number" },
  "fieldCodes": { "contact.guardianPhone": "invalid_phone" }
}
```

- `code` is stable — branch on it, never on `error` text. All codes are listed in `packages/shared/src/i18n/errors.js` (`ERRORS`, `FIELD_ERRORS`).
- `fields` / `fieldCodes` appear for field-level problems, keyed by dotted path.
- Status codes: 400 invalid input or a broken business rule, 401 not signed in / token revoked, 403 not allowed (role, suspended account), 404 not found, 409 duplicate (email, phone, TrxID, existing proposal), 429 rate limited, 500 unexpected. A file that is too large or of the wrong type is a 400 (`FILE_TOO_LARGE`, `FILE_TYPE`, `FILE_INVALID`).

## Pagination

List endpoints accept `page` (from 1) and `limit` and return:

```json
{ "items": [ … ], "total": 128, "page": 2, "limit": 12, "pages": 11 }
```

## Biodata codes

Public biodatas are addressed by code: `GH-1001`. The API also accepts `gh1001` or `1001`.

## Search

`GET /api/biodatas` — all filters are optional; multi-value filters take comma-separated values; unknown values are ignored rather than rejected.

| Parameter                                                                           | Example                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------- |
| `type`                                                                              | `bride` / `groom`                       |
| `religion`, `marital`, `complexion`, `occupation`, `economic`, `medium`, `category` | `hindu,buddhist`                        |
| `division`, `district`, `upazila` (permanent address)                               | `dhaka`, `gazipur`, `gazipur-kaliakair` |
| `presentDivision`, `presentDistrict`, `presentUpazila`, `country`, `abroad=1`       | `japan`                                 |
| `ageMin`, `ageMax`, `heightMin`, `heightMax` (inches)                               | `22`, `30`, `60`, `70`                  |
| `education` (minimum level)                                                         | `bachelor`                              |
| `verified=1` (NID verified)                                                         |                                         |
| `q` (biodata code)                                                                  | `GH-1001`                               |
| `sort`                                                                              | `newest`, `age_asc`, `age_desc`         |

`GET /api/biodatas/location-counts?level=district&parent=dhaka&which=permanent` returns `{ counts: { gazipur: 12, … } }` for the same filters, for "how many in each place" pickers.

## Rate limits

Per IP: sign-in and sign-up 30 per 15 minutes; SMS/email codes 10 per hour; the contact form 5 per hour; everything 300 per minute. Limited responses are `429` with `code: "RATE_LIMITED"` and standard `RateLimit` headers.

## Files

Photos and NIDs are never public URLs. Fetch them with the token:

- `GET /api/files/photo/:biodataId` — owner, staff, or a user who unlocked that contact
- `GET /api/files/nid/:biodataId` — owner or staff

Public downloads: `GET /api/resources`, `GET /api/resources/:id/download`.

## Payments

- `GET /api/packages` — packages plus the active payment numbers and whether online bKash is enabled.
- `POST /api/payments/manual` — `{ packageId, method, senderNumber, trxId }`; staff verify it. A TrxID can be used once per method.
- `POST /api/payments/bkash/create` → `{ bkashURL }`; bKash returns the browser to `GET /api/payments/bkash/callback`, which executes the payment and credits connections automatically.
