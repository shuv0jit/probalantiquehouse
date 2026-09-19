const id = process.env.B2_ADMIN_ID;
const key = process.env.B2_ADMIN_KEY;
const bucketName = 'probalantiquehouse';
const s3Host = 'probalantiquehouse.s3.us-east-005.backblazeb2.com';

const post = async (url, token, body) =>
  (await fetch(url, { method: 'POST', headers: { Authorization: token }, body: JSON.stringify(body) })).json();

const auth = await (await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
  headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${key}`).toString('base64') },
})).json();
if (!auth.authorizationToken) { console.log('AUTH FAILED:', auth); process.exit(1); }

const { apiUrl, authorizationToken: token, accountId } = auth;
const { buckets } = await post(`${apiUrl}/b2api/v2/b2_list_buckets`, token, { accountId, bucketName });
if (!buckets?.length) { console.log('Bucket not found, or this key cannot list buckets.'); process.exit(1); }

const upd = await post(`${apiUrl}/b2api/v2/b2_update_bucket`, token, {
  accountId,
  bucketId: buckets[0].bucketId,
  corsRules: [{
    corsRuleName: 'pahUploads',
    allowedOrigins: ['*'],
    allowedOperations: ['s3_put', 's3_get', 's3_head'],
    allowedHeaders: ['*'],
    exposeHeaders: ['etag'],
    maxAgeSeconds: 3600,
  }],
});
if (!upd.corsRules) { console.log('UPDATE FAILED:', upd); process.exit(1); }
console.log('Rule saved:', JSON.stringify(upd.corsRules));

for (let i = 1; i <= 8; i++) {
  const r = await fetch(`https://${s3Host}/products/cors-test.jpg`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  const allow = r.headers.get('access-control-allow-origin');
  console.log(`preflight ${i}:`, r.status, allow ?? '(no CORS header yet)');
  if (allow) { console.log('CORS WORKS. Retry the upload now.'); process.exit(0); }
  await new Promise((s) => setTimeout(s, 10000));
}
console.log('Rule saved, but B2 still blocks the preflight. Paste this output to Claude.');