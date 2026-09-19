import { all, scalar, run } from '../d1.js';

const cols = await all('PRAGMA table_info(sales)');
console.log('sales columns now:', cols.map((c) => c.name).join(', ') || '(table missing)');

if (cols.length) {
  const n = Number(await scalar('SELECT COUNT(*) FROM sales'));
  console.log('sales rows:', n);
  if (n > 0) {
    console.log('sales has data, so I am NOT dropping it. Paste the two lines above to Claude.');
    process.exit(0);
  }
  await run('DROP TABLE IF EXISTS sale_targets');
  await run('DROP TABLE sales');
  console.log('Dropped the empty, mismatched sales tables.');
}