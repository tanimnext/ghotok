import { validationError } from './http.js';

/** Map a zod issue to one of the shared FIELD_ERRORS codes. */
function issueCode(issue) {
  if (issue.params?.code) return issue.params.code;
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined ? 'required' : 'invalid';
    case 'too_small':
      return issue.origin === 'string' ? (issue.minimum === 1 ? 'required' : 'too_short') : 'too_small';
    case 'too_big':
      return issue.origin === 'string' ? 'too_long' : 'too_large';
    case 'invalid_format':
      return issue.format === 'email' ? 'invalid_email' : 'invalid';
    case 'invalid_value':
      return 'invalid_choice';
    default:
      return 'invalid';
  }
}

/** Parse data with a zod schema or throw a 400 VALIDATION error with per-field codes. */
export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issueCode(issue);
  }
  throw validationError(fields);
}

/** Express middleware: validate req[part] and store the result on req.valid[part]. */
export const validate = (part, schema) => (req, _res, next) => {
  try {
    req.valid = req.valid || {};
    req.valid[part] = parse(schema, req[part] ?? {});
    next();
  } catch (e) {
    next(e);
  }
};
