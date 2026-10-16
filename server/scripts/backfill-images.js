import fs from 'node:fs';
import { parseEnv } from 'node:util';
import sharp from 'sharp';
import { all, run } from '../d1.js';
import { presignUpload } from '../storage.js';

Object.assign(process.env, parseEnv(fs.readFileSync('.env', 'utf8')));

async function compressBuffer(buf, maxDim, quality) {
  return sharp(buf)
    .rotate() // respects the photo's EXIF orientation
    .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
}

async function uploadBuffer(buf) {
  const { uploadUrl, url, key } = (await presignUpload({ contentType: 'image/jpeg', size: buf.length }));
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: buf });
  if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
  return { url, key };
}

const rows = await all(
  `SELECT id, product_id, url, width, height FROM product_images
   WHERE thumb_url IS NULL ORDER BY id ASC`
);

console.log(`${rows.length} image(s) need compressing.`);
let done = 0, failed = 0;

for (const row of rows) {
  try {
    const original = await fetch(row.url);
    if (!original.ok) throw new Error(`fetch HTTP ${original.status}`);
    const originalBuf = Buffer.from(await original.arrayBuffer());

    const [full, thumb] = await Promise.all([
      compressBuffer(originalBuf, 1600, 82),
      compressBuffer(originalBuf, 480, 75),
    ]);

    // Skip if the "compressed" full version isn't actually smaller — no point re-uploading.
    const fullStored = full.data.length < originalBuf.length
      ? await uploadBuffer(full.data)
      : { url: row.url };
    const thumbStored = await uploadBuffer(thumb.data);

    await run(
      `UPDATE product_images SET url = ?1, thumb_url = ?2, width = ?3, height = ?4 WHERE id = ?5`,
      [fullStored.url, thumbStored.url, full.info.width, full.info.height, row.id]
    );

    done++;
    console.log(`[${done}/${rows.length}] image ${row.id} (product ${row.product_id}): ${(originalBuf.length / 1024).toFixed(0)}KB -> full ${(full.data.length / 1024).toFixed(0)}KB, thumb ${(thumb.data.length / 1024).toFixed(0)}KB`);
  } catch (err) {
    failed++;
    console.log(`[FAILED] image ${row.id} (product ${row.product_id}): ${err.message}`);
  }
}

console.log(`\nDone. Compressed ${done}, failed ${failed}, out of ${rows.length}.`);
if (failed) console.log('Failed rows were left untouched — safe to re-run this script, it only processes rows where thumb_url is still empty.');