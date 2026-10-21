# Feature parity with ordhekdeen.com

Ghotok was benchmarked against ordhekdeen.com, a popular Bangladeshi matchmaking site for Muslim families. The goal was **feature parity, adapted to every faith** — not a copy. No code, text, images or data were taken from ordhekdeen: only its public pages were reviewed (home, biodata search, about, FAQ, guide, contact, banner downloads, child safety policy), without logging in, and respecting its `robots.txt`.

Legend: ✅ equivalent or better · ➕ Ghotok only · ⚙️ needs configuration before launch

## Public website

| Feature                                                                                        | Ghotok | Where                                                              |
| ---------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| Bangla and English, switchable on every page                                                   | ✅     | header toggle, `lang` cookie                                       |
| Light and dark mode                                                                            | ➕     | header toggle                                                      |
| Home page with quick search, statistics, how it works                                          | ✅     | `/`                                                                |
| Biodata search, free without an account                                                        | ✅     | `/biodatas`                                                        |
| Filter: groom / bride                                                                          | ✅     |                                                                    |
| Filter: marital status (incl. married, divorced, widow/widower)                                | ✅     | widow/widower wording follows the biodata type                     |
| Filter: age range, height range                                                                | ✅     |                                                                    |
| Filter: permanent address division → district → **upazila**                                    | ✅     | with live counts per place                                         |
| Filter: present address, living abroad by country                                              | ✅     |                                                                    |
| Filter: education method (general, English, madrasa Alia / Qawmi, technical) and minimum level | ✅     |                                                                    |
| Filter: profession, complexion, family economic status                                         | ✅     |                                                                    |
| Filter: special categories (disability, orphan, convert…)                                      | ✅     |                                                                    |
| Filter: verified only                                                                          | ✅     | NID verified                                                       |
| Search by biodata number                                                                       | ✅     | `GH-1001`, `gh1001` or `1001`                                      |
| **Religion filter (Hindu, Muslim, Christian, Buddhist, other)**                                | ➕     | all-faith platform                                                 |
| Biodata page with all public sections, contact locked                                          | ✅     | `/biodatas/GH-1001`                                                |
| Age and birth month instead of the exact date of birth                                         | ✅     |                                                                    |
| Verified badges (NID, phone, email)                                                            | ✅     |                                                                    |
| Copy biodata number, share link (phone share sheet)                                            | ✅     |                                                                    |
| Print / save biodata as PDF                                                                    | ✅     | print stylesheet                                                   |
| Profile view counter                                                                           | ✅     | one count per viewer per day                                       |
| About, FAQ, guide, contact pages                                                               | ✅     |                                                                    |
| Contact form (no account needed)                                                               | ✅     | goes to Admin › Contact inbox and support email                    |
| Downloads (printable banners / forms)                                                          | ✅     | `/resources`, managed in Admin › Downloads                         |
| Child safety policy                                                                            | ✅     | `/child-safety`; "possible minor" reports hide the biodata at once |
| Privacy, terms and refund policies                                                             | ✅     | drafts — legal review required ⚙️                                  |
| Floating chat button (WhatsApp / Messenger)                                                    | ✅     | link set in Admin › Site settings                                  |
| Announcement bar                                                                               | ➕     | Admin › Site settings                                              |
| Mobile app-style bottom navigation                                                             | ✅     |                                                                    |
| Installable on the phone home screen (PWA manifest)                                            | ➕     |                                                                    |
| SEO: server-rendered pages, sitemap, robots, canonical URLs                                    | ✅     |                                                                    |

## Accounts

| Feature                                       | Ghotok | Notes                             |
| --------------------------------------------- | ------ | --------------------------------- |
| Register / log in with mobile number or email | ✅     | `+880` and Bangla digits accepted |
| Continue with Google                          | ✅ ⚙️  | needs `GOOGLE_CLIENT_ID`          |
| Phone verification by SMS code                | ✅ ⚙️  | needs an SMS gateway              |
| Email verification                            | ➕ ⚙️  | needs SMTP                        |
| Forgot password by SMS code or email link     | ✅     |                                   |
| Change password, sign out of all devices      | ✅     |                                   |
| Delete account                                | ✅     |                                   |

## Biodata

| Feature                                                                                                                                                             | Ghotok                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Multi-step form that saves as you go                                                                                                                                | ✅ 12 steps                        |
| General, address, education (with history), family, personal, occupation, marriage, expected partner, contact, pledge                                               | ✅                                 |
| Religion-specific questions (prayer, madhhab, hijab/beard for Muslims; gotra and worship for Hindus; denomination and church for Christians; worship for Buddhists) | ✅ adapts to the selected religion |
| Gendered questions (e.g. "Will you allow your wife to work?" vs "Do you want to work?")                                                                             | ✅                                 |
| Guardian contact required; own number refused                                                                                                                       | ✅                                 |
| Legal minimum age (bride 18, groom 21)                                                                                                                              | ✅                                 |
| Submit for review; approved / not approved / corrections needed with reviewer note                                                                                  | ✅                                 |
| Editing an approved biodata sends it back to review                                                                                                                 | ✅                                 |
| Hide / show with a reason                                                                                                                                           | ✅                                 |
| Delete and ask for restore                                                                                                                                          | ✅                                 |
| Private photo (visible only after unlock or an accepted proposal)                                                                                                   | ➕                                 |
| NID upload for the verified badge                                                                                                                                   | ✅                                 |

## User dashboard

| Feature                                                              | Ghotok |
| -------------------------------------------------------------------- | ------ |
| Biodata status and quick actions                                     | ✅     |
| Connection balance with buy button, used count, last purchase        | ✅     |
| Profile visits: today, 7 days, 30 days                               | ✅     |
| Shortlist (favourites), ignore list (hidden from my search)          | ✅     |
| Who shortlisted my biodata                                           | ✅     |
| Purchased / unlocked contacts with the guardian details              | ✅     |
| Proposals sent and received; accepting shares both contacts for free | ✅     |
| Connection history (ledger), payments, refund requests               | ✅     |
| Report a biodata, with a refund request                              | ✅     |
| Notifications (bell with unread count) + email for important events  | ✅     |
| Support tickets                                                      | ✅     |

## Payments

| Feature                                                       | Ghotok                           |
| ------------------------------------------------------------- | -------------------------------- |
| Packages (3 for ৳300, 5 for ৳500 — editable)                  | ✅                               |
| bKash, Nagad, Rocket by Send Money + TrxID, verified by staff | ✅                               |
| Online bKash checkout (connections added automatically)       | ✅ ⚙️ needs merchant credentials |
| Duplicate TrxID protection                                    | ✅                               |

## Admin panel

| Feature                                                                       | Ghotok |
| ----------------------------------------------------------------------------- | ------ |
| Roles: support/reviewer, admin, super admin                                   | ✅     |
| Overview with work queues and 14-day sign-up / revenue charts                 | ✅     |
| Biodata review with full private details; edit any section                    | ✅     |
| NID verification                                                              | ✅     |
| Payments: approve / reject, search by TrxID or sender, date range, CSV export | ✅     |
| Refund requests                                                               | ✅     |
| Manual connection grant / revoke / refund with audited reason                 | ✅     |
| Reports and complaints (urgent first)                                         | ✅     |
| Restore (soft-delete recovery) queue                                          | ✅     |
| Support tickets and the contact inbox (reply by email)                        | ✅     |
| Users: search, roles, suspend / reactivate, mark phone/email verified         | ✅     |
| Packages, site settings, downloads                                            | ✅     |
| Audit log of every staff action                                               | ✅     |

## Deliberately different

- **All faiths.** Ordhekdeen is built around Islamic practice. Ghotok asks religion first and adapts the faith section, and never assumes a religion in its wording.
- **Photos** are optional and private (shown only after an unlock or an accepted proposal), because many families prefer that.
- **No public phone numbers anywhere**, including in the HTML sent to visitors; the contact block only leaves the API for people allowed to see it.
