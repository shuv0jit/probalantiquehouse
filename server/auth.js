import crypto from 'node:crypto';

/**
 * Admin auth.
 *
 * - Password never reaches the browser bundle. The browser POSTs a password to
 *   /api/admin/login; the server compares it against ADMIN_PASSWORD_HASH.
 * - On success the server sets an httpOnly, SameSite=Lax, Secure cookie holding
 *   a signed JWT. JS on the page cannot read it, so XSS cannot steal the session.
 * - Every /api/admin/* route re-verifies the token server-side. There is no
 *   client-side "isAdmin" flag anywhere.
 */

export const COOKIE_NAME = 'pah_session';
export const SESSION_DAYS = 365;

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (str) =>
  Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signToken(payload, days = SESSION_DAYS) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + days * 86400 };
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = `${head}.${b64url(JSON.stringify(body))}`;
  const sig = b64url(crypto.createHmac('sha256', secret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', secret()).update(data).digest();
  const given = fromB64url(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  let payload;
  try {
    payload = JSON.parse(fromB64url(parts[1]).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/**
 * Verify a password against ADMIN_PASSWORD_HASH.
 * Supported formats (auto-detected):
 *   scrypt$<saltHex>$<hashHex>   — recommended, produced by `npm run hash`
 *   sha256$<hashHex>
 *   <64 hex chars>               — bare sha256
 */
export function verifyPassword(password) {
  const stored = process.env.ADMIN_PASSWORD_HASH || '';
  if (!stored) return false;

  const safeEq = (a, b) => {
    const A = Buffer.from(a, 'hex');
    const B = Buffer.from(b, 'hex');
    return A.length === B.length && crypto.timingSafeEqual(A, B);
  };

  try {
   if (/^scrypt[$:]/.test(stored)) {
  const [, saltHex, hashHex] = stored.split(/[$:]/);
      const derived = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 32).toString('hex');
      return safeEq(derived, hashHex);
    }
    const hashHex = stored.startsWith('sha256$') ? stored.slice(7) : stored;
    if (!/^[0-9a-f]{64}$/i.test(hashHex)) return false;
    const derived = crypto.createHash('sha256').update(password).digest('hex');
    return safeEq(derived, hashHex);
  } catch {
    return false;
  }
}

export function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Your admin session has expired. Please sign in again.' });
  }
  req.admin = payload;
  next();
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400 * 1000,
  };
}
