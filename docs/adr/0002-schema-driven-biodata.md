# 0002 — Schema-driven biodata

**Status:** Accepted · 2026-10

## Context

A biodata has ~90 fields in 11 sections. Each field appeared in at least six places: the Mongoose model, the update whitelist, the submission rules, the public projection, the website form, the website view and the admin view. Adding the faith questions (different for Hindu, Muslim, Christian and Buddhist users) would have meant editing all of them.

## Decision

Describe every field once in `packages/shared/src/biodata/schema.js` and derive everything else:

- `fieldDef()` builds the Mongoose sub-schemas.
- `sanitizeBiodataInput()` whitelists and coerces input; unknown keys are ignored.
- `submissionProblems()` checks required fields (honouring `showIf`) and cross-field rules (legal age, guardian ≠ own number, ranges, location consistency).
- `publicFields()` decides what is public.
- `SectionForm` / `BiodataView` in `packages/ui` render forms and views.

Conditional questions use `showIf(biodata)`. Gendered wording uses `label: { groom, bride }`. The location cascade uses `dependsOn`.

## Consequences

- Adding a field is a one-file change plus tests (see architecture.md).
- Field rules are pure functions, unit-tested without a database.
- Inactive conditional fields are ignored by validation and hidden from the public, even if old data is still stored.
- The trade-off is indirection: to find where a field is rendered you look at the schema, not a JSX file.
