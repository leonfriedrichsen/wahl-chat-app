import { createHash, randomBytes } from 'node:crypto';

/** Only the hash is stored, so a leaked database cannot confirm anyone's
 * address; the token itself exists only in the email. */
export function hashConfirmToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createConfirmToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashConfirmToken(token) };
}
