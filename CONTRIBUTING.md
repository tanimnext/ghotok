# Contributing

## Workflow

1. Create a branch from `main`: `feature/short-name` or `fix/short-name`.
2. Make the change with tests (see below).
3. Run `npm run check` (lint, format check, tests, builds). For UI changes also run `npm run test:e2e`.
4. Open a pull request. CI runs the same checks plus the end-to-end suite and Docker builds. Merge only when it is green.

Commit messages: imperative, short subject ("Add upazila filter to search"), body explaining _why_ when it is not obvious.

## Code style

- JavaScript (ES modules) everywhere. Prettier formats, ESLint catches mistakes — do not argue with either; fix or disable a rule with a comment that explains why.
- Keep business rules in `packages/shared` when the front end needs them too (labels, options, validation). Keep the API the final authority: never trust a rule that only runs in the browser.
- Names say what things are (`approvePayment`, `toPublic`), comments say why.
- User-facing text always exists in English **and** Bangla. Website strings: `apps/web/lib/i18n/{en,bn}.js` (a test checks both have the same keys). Admin: `apps/admin/src/i18n`. Biodata labels: the schema.
- No secrets in the repository. New settings go into `apps/api/src/config/env.js` (validated) and `apps/api/.env.example` (documented).

## Tests

| Change                              | Add tests in                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| Rules, options, formatting          | `packages/shared/test`                                                       |
| API behaviour                       | `apps/api/tests/<module>.test.js` (in-memory MongoDB via `tests/helpers.js`) |
| Website strings                     | covered by `apps/web/test/i18n.test.js`                                      |
| A user journey across pages or apps | `e2e/*.spec.js`                                                              |

Test the behaviour a user or an admin relies on (e.g. "a connection is spent exactly once"), not implementation details.

## Common changes

- **New biodata field:** see [docs/architecture.md › Adding a biodata field](docs/architecture.md#adding-a-biodata-field).
- **New API endpoint:** see [docs/architecture.md › Adding an endpoint](docs/architecture.md#adding-an-endpoint). It appears in `/api/docs` automatically; run `npm run openapi` to refresh the committed snapshot.
- **New option value** (e.g. a profession): add it to the list in `packages/shared/src/options.js` with both labels. Never rename or remove a stored value without a data migration.
- **New district/upazila data:** update `packages/shared/data/geo` and run `npm run geo:build`. Upazila values are `district-name` slugs; changing a slug requires migrating stored biodatas.
- **Architecture decision:** add an ADR in `docs/adr`.

## Releasing

1. Update `CHANGELOG.md`.
2. Tag: `git tag v1.x.y && git push --tags`.
3. Deploy as described in [docs/deployment.md](docs/deployment.md).
