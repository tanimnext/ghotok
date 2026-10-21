# syntax=docker/dockerfile:1
# Ghotok API. Build from the repository root:  docker build -f apps/api/Dockerfile -t ghotok-api .

FROM node:22-alpine AS deps
WORKDIR /app
# Every workspace manifest is needed so npm can validate the lockfile.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
RUN npm ci --omit=dev --workspace @ghotok/api --include-workspace-root=false --no-audit --no-fund

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=5000 \
    UPLOAD_DIR=/app/uploads
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "apps/api/src/server.js"]
