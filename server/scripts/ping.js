import fs from 'node:fs';
import { parseEnv } from 'node:util';

Object.assign(process.env, parseEnv(fs.readFileSync('.env', 'utf8')));
const { CF_ACCOUNT_ID: a, CF_D1_DATABASE_ID: d, CF_API_TOKEN: t } = process.env;
const url = `https://api.cloudflare.com/client/v4/accounts/${a}/d1/database/${d}/query`;
console.log('token ends with:', t.slice(-4));

async function q(label) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT 1 AS ok', params: [] }),
  });
  const j = await res.json();
  console.log(label, res.status, j.success ? 'OK' : JSON.stringify(j.errors));
}

await q('single');
await Promise.all(Array.from({ length: 6 }, (_, i) => q(`parallel-${i + 1}`)));


const l = await fetch(`https://api.cloudflare.com/client/v4/accounts/${a}/d1/database`, {
  headers: { Authorization: `Bearer ${t}` },
});
console.log('list databases:', l.status);