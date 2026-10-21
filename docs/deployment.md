# Deployment

## Recommended setup

| Piece       | Recommendation                                                       | Domain                |
| ----------- | -------------------------------------------------------------------- | --------------------- |
| Website     | `ghotok-web` container (Next.js standalone)                          | `ghotok.com.bd`       |
| API         | `ghotok-api` container                                               | `api.ghotok.com.bd`   |
| Admin panel | `ghotok-admin` container (nginx, static)                             | `admin.ghotok.com.bd` |
| Database    | MongoDB Atlas (M10+ with backups) or the `mongo` container + backups | private               |
| Files       | Cloudflare R2 bucket (private)                                       | private               |
| TLS / proxy | Caddy or nginx in front of the three containers                      |                       |

A single 2 vCPU / 4 GB VPS (e.g. in Singapore or Mumbai for low latency to Bangladesh) runs all three containers comfortably at launch. Use MongoDB Atlas if you do not want to operate database backups yourself.

## 1. Configure

```bash
cp .env.docker.example .env.docker
```

Set at least:

| Variable                                               | Notes                                                                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_WEB_URL`, `PUBLIC_API_URL`, `PUBLIC_ADMIN_URL` | `https://ghotok.com.bd`, `https://api.ghotok.com.bd`, `https://admin.ghotok.com.bd` — also used for CORS, emails and the bKash callback |
| `JWT_SECRET`                                           | `openssl rand -hex 32`. Changing it signs everyone out.                                                                                 |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`              | The first super admin. Change the password after the first login.                                                                       |
| `MONGODB_URI`                                          | Only if you use Atlas instead of the bundled `mongo` service (remove `mongo` from compose)                                              |
| `SMS_*`                                                | Required in production — see below                                                                                                      |
| `SMTP_*`, `MAIL_FROM`, `SUPPORT_EMAIL`                 | Email verification, password reset, notifications, contact form                                                                         |
| `STORAGE_DRIVER=r2`, `R2_*`                            | Recommended. With `local`, files live in the `uploads` volume — back it up.                                                             |
| `BKASH_*_NUMBER`, `NAGAD_*`, `ROCKET_*`                | Defaults; staff can change them later in Admin › Site settings                                                                          |
| `GOOGLE_CLIENT_ID`                                     | Optional; empty hides "Continue with Google"                                                                                            |
| `BKASH_API_ENABLED`, `BKASH_APP_KEY`, …                | Optional online bKash checkout                                                                                                          |

Every variable is documented in [`apps/api/.env.example`](../apps/api/.env.example). The API validates them at start-up and **refuses to start in production** with a weak `JWT_SECRET`, `SMS_DRIVER=log`, or the default admin password.

## 2. Build and start

```bash
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker exec api node apps/api/src/scripts/seed.js   # packages + super admin, once
```

`NEXT_PUBLIC_*` and `VITE_*` values are compiled into the website and admin bundles, so rebuild the `web` and `admin` images whenever the public URLs change.

## 3. TLS and routing (Caddy example)

```caddyfile
ghotok.com.bd, www.ghotok.com.bd {
  reverse_proxy localhost:3000
}
api.ghotok.com.bd {
  reverse_proxy localhost:5000
}
admin.ghotok.com.bd {
  # Optional extra layer: restrict to office IPs or add basic auth
  reverse_proxy localhost:5173
}
```

Keep `TRUST_PROXY=1` (one proxy in front) so rate limits see real client IPs. Do not expose MongoDB to the internet.

## Third-party setup

### Cloudflare R2

1. Create a bucket (keep it **private** — files are streamed through the API after access checks).
2. Create an API token with Object Read & Write on that bucket.
3. Set `STORAGE_DRIVER=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
4. Turn on object versioning or a lifecycle rule for deleted objects if you want undo.

### SMS gateway

Any Bangladeshi bulk-SMS provider with an HTTP API works. Example for a GET-style gateway:

```env
SMS_DRIVER=http
SMS_HTTP_METHOD=GET
SMS_HTTP_URL=https://gateway.example.com/api/send?api_key={apiKey}&senderid={senderId}&number={to}&message={message}
SMS_API_KEY=…
SMS_SENDER_ID=Ghotok
```

`{to}` is sent as `8801XXXXXXXXX`. For POST/JSON gateways set `SMS_HTTP_METHOD=POST` and `SMS_HTTP_BODY` to a JSON template with the same placeholders. Register a masking sender ID with your provider (BTRC approval can take a few days).

### Email (SMTP)

Any SMTP provider (Amazon SES, Zoho, Brevo…). Set `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS or 465 TLS), `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`. Add SPF, DKIM and DMARC records for `ghotok.com.bd` or mail will land in spam.

### bKash Tokenized Checkout (optional)

1. Get merchant credentials from bKash (sandbox first).
2. Set `BKASH_API_ENABLED=true`, `BKASH_BASE_URL` (sandbox or live), `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`.
3. The callback URL is `${PUBLIC_API_URL}/api/payments/bkash/callback`; give it to bKash if they whitelist URLs.

Manual TrxID payments keep working alongside it.

### Google sign-in (optional)

1. Google Cloud console → APIs & Services → Credentials → OAuth client ID → _Web application_.
2. Authorised JavaScript origins: `https://ghotok.com.bd` (and `http://localhost:3000` for development).
3. Set `GOOGLE_CLIENT_ID` on the API. The website reads it from `GET /api/auth/config`.

## Backups

- **MongoDB:** Atlas continuous backups, or a nightly `mongodump --archive --gzip` from the `mongo` container to off-site storage (e.g. a second R2 bucket). Keep 30 days. Test a restore every quarter.
- **Files:** R2 is durable; enable versioning for accidental deletes. With local storage, back up the `uploads` volume with the database dump.

```bash
# nightly (cron) example
docker compose exec -T mongo mongodump --archive --gzip --db ghotok > /backups/ghotok-$(date +%F).archive.gz
```

## Monitoring

- Uptime check on `https://api.ghotok.com.bd/api/health` (returns 503 when the database is unreachable) and on the website home page.
- Logs are JSON on stdout (`docker compose logs -f api`). Each request has an `X-Request-Id`; include it when reporting a problem. Ship logs to any collector (Grafana Loki, Better Stack, CloudWatch) if needed.

## Updating

```bash
git pull
docker compose --env-file .env.docker up --build -d
```

There are no database migrations to run: schema changes are additive (new optional fields). If a future change needs a data migration, add a script under `apps/api/src/scripts/` and document it in the changelog.

Rollback: check out the previous tag and run the same command.

## Go-live checklist

- [ ] Public URLs, CORS origins and the bKash callback use `https://`
- [ ] Strong `JWT_SECRET`; admin password changed after the first login; staff accounts created with the right roles
- [ ] SMS gateway, SMTP (with SPF/DKIM/DMARC) and R2 tested end to end (register, verify phone, reset password, upload a photo)
- [ ] Payment numbers and support contact details filled in Admin › Site settings
- [ ] Privacy policy, terms, refund policy and child safety policy reviewed by a lawyer (`apps/web/lib/content.js`)
- [ ] Backups scheduled and one restore tested
- [ ] Uptime monitoring and alerting on
- [ ] Google Search Console: submit `https://ghotok.com.bd/sitemap.xml`
- [ ] No demo data in production (`seed --demo` is refused when `NODE_ENV=production`)
