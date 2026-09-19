#!/usr/bin/env node
/**
 * Generate ADMIN_PASSWORD_HASH.
 *   npm run hash -- "your-password-here"
 * Paste the output into .env / Vercel environment variables.
 */
import crypto from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash -- "your-password"');
  process.exit(1);
}
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 32);
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString('hex')}$${hash.toString('hex')}`);
