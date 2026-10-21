# @ghotok/api

REST API for Ghotok — Express 4, MongoDB (Mongoose 8), Zod.

```bash
cp .env.example .env     # every variable is documented there
npm run dev              # from the repo root: npm run dev:api
npm test                 # integration tests on an in-memory MongoDB
npm run seed -- --demo   # packages, super admin, demo biodatas
```

- Interactive docs: http://localhost:5000/api/docs
- Code map, request lifecycle and how to add an endpoint: [docs/architecture.md](../../docs/architecture.md#api)
- Conventions for clients (errors, pagination, rate limits): [docs/api.md](../../docs/api.md)
