# 0001 — npm-workspaces monorepo

**Status:** Accepted · 2026-10

## Context

The first version had three independent folders (`server/`, `web/`, `admin/`). Option lists, formatting helpers and the biodata field list were copied into each one ("keep in sync" comments). They had already drifted: the website and the API disagreed on marital statuses and field names.

## Decision

One repository with npm workspaces:

- `packages/shared` — everything that must mean the same thing everywhere (schema, options, rules, messages). No dependencies.
- `packages/ui` — React components and styles used by both front ends.
- `apps/api`, `apps/web`, `apps/admin` — deployable apps that import the packages by name (`@ghotok/shared`).

Packages ship as source (no build step). Next.js transpiles them via `transpilePackages`; Vite handles them natively.

## Consequences

- A change to a rule or label is made once and tested once.
- One `npm install`, one lockfile, one lint/format/test command for everything.
- Docker images copy every workspace `package.json` so `npm ci` can validate the lockfile, then install only what one app needs.
- npm workspaces were chosen over pnpm/Turborepo to keep tooling minimal; switching later is straightforward if build times grow.
