import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';

let client;

/** Default verifier: checks a Google Identity Services ID token. */
async function googleVerifier(credential) {
  client ||= new OAuth2Client(env.googleClientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: env.googleClientId });
  const p = ticket.getPayload();
  return { sub: p.sub, email: p.email, emailVerified: Boolean(p.email_verified), name: p.name };
}

let verifier = googleVerifier;

export const googleEnabled = () => Boolean(env.googleClientId) || verifier !== googleVerifier;

/** Verify a Google ID token → { sub, email, emailVerified, name }. */
export const verifyGoogleCredential = (credential) => verifier(credential);

/** Test hook: replace the verifier (never used in production code). */
export function setGoogleVerifier(fn) {
  verifier = fn || googleVerifier;
}
