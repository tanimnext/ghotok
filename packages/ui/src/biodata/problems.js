/** Human-readable messages for submissionProblems() codes, e.g. 'general.dateOfBirth:underage'. */
import { sectionByKey, fieldLabel, fieldErrorMessage } from '@ghotok/shared';
import { uiText } from '../i18n.js';

export function describeProblem(code, lang, type) {
  const [path, reason] = code.split(':');
  const [sectionKey, fieldKey] = path.split('.');
  const section = sectionByKey[sectionKey];
  const field = section?.fields.find((f) => f.key === fieldKey);
  const name = path === 'type' ? uiText(lang).biodataType : field ? fieldLabel(field, lang, type) : path;
  return {
    code,
    section: path === 'type' ? 'general' : sectionKey,
    field: path,
    message: reason ? `${name}: ${fieldErrorMessage(reason, lang)}` : name,
  };
}

/** Group problems by section key. */
export function problemsBySection(codes = [], lang, type) {
  const out = {};
  for (const c of codes) {
    const p = describeProblem(c, lang, type);
    (out[p.section] ||= []).push(p);
  }
  return out;
}

/** Field error messages for a form: { 'section.field': message }. */
export function problemFieldErrors(codes = [], lang, type) {
  return Object.fromEntries(
    codes.map((c) => {
      const p = describeProblem(c, lang, type);
      const reason = c.split(':')[1];
      return [p.field, reason ? fieldErrorMessage(reason, lang) : fieldErrorMessage('required', lang)];
    })
  );
}
