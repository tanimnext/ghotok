# 0003 — Connections as an atomic ledger

**Status:** Accepted · 2026-10

## Context

Connections are money. A family pays ৳300 for 3 connections and spends one to see a guardian's number. Double clicks, two admins approving the same payment, or a bKash callback arriving twice must never create or lose connections, and support staff must be able to explain every balance.

## Decision

- `users.connections` is the balance. It only changes through `adjustConnections()`, which uses one atomic `findOneAndUpdate` with `$inc` and, for debits, a `connections >= amount` guard. The balance can never go negative.
- Every change appends a row to `ledgers` (`purchase`, `unlock`, `refund`, `admin_grant`, `admin_revoke`, `signup_bonus`) with the balance after, a reference and the staff member who made it.
- Approving a payment flips its status atomically (`pending → approved`) before crediting, so it credits exactly once.
- `unlocks` has a unique index on (user, biodata). The unlock row is created first; if the debit fails, it is removed. A second click returns the existing contact for free.
- An accepted proposal creates free unlocks for both families (`source: 'proposal'`).
- Refunds are requests that staff approve; approval marks the unlock as refunded and credits one connection.

## Consequences

- Concurrency-safe without MongoDB transactions (works on a standalone server and Atlas alike).
- The ledger is the audit trail shown to users ("Connection history") and staff.
- Tests cover double approval, double unlock and negative balances (`apps/api/tests/billing.test.js`).
