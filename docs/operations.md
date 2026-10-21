# Operations guide

For support, admin and super-admin staff, and for the developer on call.

## Roles

| Role         | Daily work                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| `support`    | Biodata approvals, NID verification, hiding a biodata, reports, support tickets, contact inbox, users (view) |
| `admin`      | + payments, refunds, manual connection changes, restore queue, suspending users, audit log, settings (view)  |
| `superadmin` | + roles, packages, site settings, downloads                                                                  |

Give each person their own account (Admin › Users and roles). Never share the super-admin login. Every decision is recorded in the audit log with the staff member's name.

## Daily queues (Admin › Overview)

Work them in this order:

1. **Urgent reports (possible minor)** — the biodata is already hidden. Check the age (NID if uploaded, call the guardian). If the person is under age (bride < 18, groom < 21), keep it hidden, resolve the report and suspend the account. Otherwise unhide it and dismiss.
2. **Payments to verify** — match the TrxID, amount and sender number in the bKash/Nagad/Rocket merchant statement. Approve credits the connections immediately; reject with a reason the user will see.
3. **Biodatas awaiting review** — oldest first. Check that the guardian number is not the user's own (the system blocks the obvious case), the age is plausible, the text is respectful and has no contact details hidden in free text. Approve, or ask for corrections with a clear note.
4. **NIDs to verify** — name and date of birth must match the biodata.
5. **Refund requests** — usually from "wrong number" or "no response" reports. Call the number once if in doubt. Approving returns one connection.
6. **Open tickets** and **new contact messages** — reply within one working day.
7. **Restore requests** — restored biodatas go back to review.

## Common tasks

| Task                                     | Where                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A user paid but entered the wrong TrxID  | Reject the wrong one; ask them to resubmit, or grant connections manually with the real TrxID in the reason |
| Give a goodwill connection               | Users › user › Manual connection adjustment (reason is mandatory and audited)                               |
| Mark a phone as verified after a call    | Users › user › Verification                                                                                 |
| Fix a typo in a biodata                  | Biodata approvals › open › Edit section (status does not change; audited)                                   |
| Change payment numbers or the notice bar | Site settings (super admin)                                                                                 |
| Add a printable form or banner           | Downloads (super admin)                                                                                     |
| Export payments for accounting           | Payments › date range › Export CSV                                                                          |

## Incidents

1. Check `https://api.ghotok.com.bd/api/health`. `db: down` → database problem (Atlas status page or `docker compose ps mongo`).
2. `docker compose logs --since 30m api` — look for `"level":50` (errors). Every user-facing error has a request id.
3. Payments stuck as "Started" are online bKash attempts the user abandoned; they need no action.
4. If many users report missing SMS codes, check the SMS provider balance and the API log for `SMS gateway error`.
5. To sign every user out (e.g. after a leaked secret), rotate `JWT_SECRET` and restart the API.

## Data requests

- **Delete my account:** users can do it themselves (Account and security). Staff can suspend an account; deletion by staff is not exposed, to keep payment records intact.
- **Remove my biodata:** users delete it themselves; it can be restored on request. Hidden or deleted biodatas never appear in search or the sitemap.
