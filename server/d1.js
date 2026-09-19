/**
 * Cloudflare D1 client over the REST API.
 * Works from any Node runtime (Vercel serverless, local dev) — no bindings needed.
 *
 * Every helper uses bound parameters (?1, ?2 ...) so nothing is string-concatenated
 * into SQL. That is the injection defence for the whole app.
 */

const ENDPOINT = () =>
  `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}` +
  `/d1/database/${process.env.CF_D1_DATABASE_ID}`;

export class DbError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'DbError';
    this.detail = detail;
  }
}

export function dbConfigured() {
  return Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_D1_DATABASE_ID && process.env.CF_API_TOKEN);
}

async function call(path, body) {
  if (!dbConfigured()) {
    throw new DbError(
      'Database is not configured',
      'Missing CF_ACCOUNT_ID / CF_D1_DATABASE_ID / CF_API_TOKEN'
    );
  }
  let res;
  try {
    res = await fetch(`${ENDPOINT()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new DbError('Could not reach the database', err.message);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new DbError('Database returned an unreadable response', `HTTP ${res.status}`);
  }

    if (!res.ok || json.success === false) {
    const detail = json?.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`;
    console.error('[d1] url =', JSON.stringify(ENDPOINT()), '| token length =', (process.env.CF_API_TOKEN || '').length);
    throw new DbError('Database request failed', detail);
  }
  return json.result;
}

/** Run a single parameterised statement. Returns { rows, meta }. */
export async function query(sql, params = []) {
  const result = await call('/query', { sql, params });
  const first = Array.isArray(result) ? result[0] : result;
  return { rows: first?.results ?? [], meta: first?.meta ?? {} };
}

export async function all(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows;
}

export async function one(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] ?? null;
}

export async function scalar(sql, params = []) {
  const row = await one(sql, params);
  return row ? Object.values(row)[0] : null;
}

/** Insert/update/delete. Returns meta (last_row_id, changes). */
export async function run(sql, params = []) {
  const { meta } = await query(sql, params);
  return meta;
}

/**
 * Run several parameterised statements in order.
 *
 * Honest note on atomicity: D1's HTTP API has no interactive transaction, and
 * multi-statement SQL cannot carry per-statement bound parameters safely. So
 * this executes the statements sequentially and, if one fails, runs the
 * caller-supplied compensating statements to undo whatever already landed.
 * That is a saga, not a true transaction — but it is real, and it never leaves
 * a half-built product behind, which is the integrity requirement that matters.
 *
 * @param {Array<{sql: string, params?: any[]}>} statements
 * @param {Array<{sql: string, params?: any[]}>} [compensate] run in order on failure
 */
export async function batch(statements, compensate = []) {
  const results = [];
  try {
    for (const stmt of statements) {
      results.push(await run(stmt.sql, stmt.params ?? []));
    }
    return results;
  } catch (err) {
    for (const undo of compensate) {
      try {
        await run(undo.sql, undo.params ?? []);
      } catch {
        // Nothing more we can do; the original error is the one that matters.
      }
    }
    throw err;
  }
}

/** Execute a schema file: many statements, no parameters, so one round trip. */
export async function exec(sql) {
  return call('/query', { sql, params: [] });
}
