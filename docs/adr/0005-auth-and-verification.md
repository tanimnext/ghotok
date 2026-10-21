# 0005 — Sign-in methods and verification

**Status:** Accepted · 2026-10

## Context

Many families in Bangladesh use a mobile number rather than email; some prefer "Continue with Google". Verified contact details also build trust on a biodata.

## Decision

- Accounts are identified by email **or** a Bangladeshi mobile number (normalised to `01XXXXXXXXX`; `+880` and Bangla digits are accepted). Passwords are bcrypt-hashed.
- Sessions are stateless JWTs (`Authorization: Bearer`). Each user has a `tokenVersion`; incrementing it signs out every device (password change or reset, role change, suspension, "sign out everywhere").
- **Email verification** by a link (24 h). **Phone verification** and **password reset by phone** by a 6-digit SMS code (10 min, 5 attempts, one resend per minute). Codes and links are stored only as SHA-256 hashes with a TTL index.
- SMS is sent through a pluggable driver: `log` for development and an `http` driver configured with a URL template, so any Bangladeshi SMS gateway works without code changes.
- **Google sign-in** verifies the ID token on the server. A verified Google email links to an existing account with that email; a new user is asked for gender once (the biodata needs it).
- Verified phone and email are copied onto the biodata and shown as badges; staff can also verify them manually after a call.
- Deleting an account frees the email and phone (kept privately for payment records and abuse reports) and soft-deletes the biodata.

## Consequences

- No session store needed; revocation costs one indexed lookup per request.
- The SMS driver must be configured before production (the API refuses to start with `SMS_DRIVER=log` in production).
- `GOOGLE_CLIENT_ID` empty = the Google button is simply not shown.
