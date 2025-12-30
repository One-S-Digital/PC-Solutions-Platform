import crypto from 'node:crypto';

export type UnsubscribeScope = 'GLOBAL' | 'LIST';

export interface UnsubscribeTokenPayload {
  email: string;
  scope: UnsubscribeScope;
  listId?: string;
  userId?: string;
  exp: number; // unix seconds
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function signUnsubscribeToken(payload: UnsubscribeTokenPayload, secret: string): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest();
  return `${body}.${base64UrlEncode(sig)}`;
}

export function verifyUnsubscribeToken(token: string, secret: string): UnsubscribeTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest();
  const expectedSigB64 = base64UrlEncode(expectedSig);
  if (!timingSafeEqual(sig, expectedSigB64)) return null;

  try {
    const decoded = base64UrlDecode(body).toString('utf8');
    const payload = JSON.parse(decoded) as UnsubscribeTokenPayload;
    if (!payload?.email || !payload?.scope || !payload?.exp) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.scope === 'LIST' && !payload.listId) return null;
    return payload;
  } catch {
    return null;
  }
}

