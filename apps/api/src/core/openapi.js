/**
 * Builds an OpenAPI 3.1 document from the route registry (see core/router.js).
 * Request schemas come from the same zod schemas that validate requests.
 */
import { z } from 'zod';
import { registry } from './router.js';

const toJson = (schema) => {
  try {
    return z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  } catch {
    return { type: 'object' };
  }
};

export function buildOpenApi({ serverUrl }) {
  const paths = {};
  for (const r of registry) {
    const path = `/api${r.path}`.replace(/:(\w+)/g, '{$1}');
    const params = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
    if (r.query) {
      const q = toJson(r.query);
      for (const [name, s] of Object.entries(q.properties || {})) {
        params.push({ name, in: 'query', required: (q.required || []).includes(name), schema: s });
      }
    }
    const op = {
      tags: [r.tag],
      summary: r.summary,
      parameters: params,
      responses: { 200: { description: 'OK' }, 400: { $ref: '#/components/responses/Error' } },
    };
    if (r.role || r.auth === 'required') {
      op.security = [{ bearer: [] }];
      op.responses[401] = { $ref: '#/components/responses/Error' };
      if (r.role) {
        op.responses[403] = { $ref: '#/components/responses/Error' };
        op.description = `Requires staff role: ${r.role} or higher.`;
      }
    } else if (r.auth === 'optional') op.security = [{}, { bearer: [] }];
    if (r.body) op.requestBody = { required: true, content: { 'application/json': { schema: toJson(r.body) } } };
    if (r.upload) {
      op.requestBody = {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { type: 'object', properties: { [r.upload]: { type: 'string', format: 'binary' } } },
          },
        },
      };
    }
    paths[path] = paths[path] || {};
    paths[path][r.method] = op;
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Ghotok API',
      version: '1.0.0',
      description:
        'REST API for ghotok.com.bd. Send `Authorization: Bearer <token>` for authenticated routes and `X-Lang: bn|en` to choose the language of error messages. Errors look like `{ error, code, fields, fieldCodes }`.',
    },
    servers: [{ url: serverUrl }],
    tags: [...new Set(registry.map((r) => r.tag))].map((name) => ({ name })),
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      responses: {
        Error: {
          description: 'Error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  code: { type: 'string' },
                  fields: { type: 'object' },
                  fieldCodes: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    paths,
  };
}

export const docsHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ghotok API</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css">
</head><body><div id="ui"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
<script src="/api/docs/init.js"></script>
</body></html>`;

/** Kept out of the HTML so the docs page works under a strict Content-Security-Policy. */
export const docsInitJs =
  "window.ui = SwaggerUIBundle({ url: '/api/docs/openapi.json', dom_id: '#ui', persistAuthorization: true });";

export const DOCS_CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');
