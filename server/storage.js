import crypto from 'node:crypto';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Sufy MOS via its S3-compatible API.
 *
 * Images are uploaded browser -> Sufy directly using a short-lived presigned PUT.
 * The server never proxies the file bytes, which means:
 *   - no 4.5 MB serverless request-body ceiling,
 *   - parallel uploads with real progress bars,
 *   - much lower function time/cost on big batch uploads.
 *
 * The space needs CORS allowing PUT from your site origin (set in Sufy console).
 */

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 25 * 1024 * 1024;

let _client;
function client() {
  if (_client) return _client;
  _client = new S3Client({
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    region: process.env.SUFY_REGION,
    endpoint: process.env.SUFY_ENDPOINT,
    forcePathStyle: true, // Sufy MOS uses path-style requests (bucket/key), not virtual-hosted
    credentials: {
      accessKeyId: process.env.SUFY_ACCESS_KEY_ID,
      secretAccessKey: process.env.SUFY_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

export function storageConfigured() {
  return Boolean(process.env.SUFY_ACCESS_KEY_ID && process.env.SUFY_SECRET_ACCESS_KEY && process.env.SUFY_BUCKET);
}

export function publicUrl(key) {
  const base = (process.env.PUBLIC_IMAGE_BASE_URL || '').replace(/\/+$/, '');
  return `${base}/${key}`;
}

function extFor(type) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[type];
}

/**
 * Create a presigned PUT for one image.
 * The key embeds the date and a random id — never the user-supplied filename,
 * so a malicious name cannot traverse paths or overwrite another object.
 */
export async function presignUpload({ contentType, size }) {
  if (!ALLOWED.has(contentType)) {
    const err = new Error('Only JPG, PNG, WebP and AVIF images are supported.');
    err.status = 400;
    throw err;
  }
  if (size != null && Number(size) > MAX_BYTES) {
    const err = new Error('That image is larger than 25 MB. Please compress it first.');
    err.status = 400;
    throw err;
  }

  const day = new Date().toISOString().slice(0, 10);
  const key = `products/${day}/${crypto.randomUUID()}.${extFor(contentType)}`;

  const url = await getSignedUrl(
    client(),
        new PutObjectCommand({
      Bucket: process.env.B2_BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 600 }
  );

  return { uploadUrl: url, key, url: publicUrl(key), contentType };
}

/** Best-effort removal of objects when a product is permanently deleted. */
export async function deleteObjects(keys) {
  const list = keys.filter(Boolean);
  if (!list.length || !storageConfigured()) return { deleted: 0 };
  try {
    await client().send(
      new DeleteObjectsCommand({
        Bucket: process.env.SUFY_BUCKET,
        Delete: { Objects: list.map((Key) => ({ Key })), Quiet: true },
      })
    );
    return { deleted: list.length };
  } catch {
    // Orphaned objects are a storage-cost problem, not a data-integrity problem.
    // The database delete has already succeeded; don't fail the request.
    return { deleted: 0, warning: 'Some image files could not be removed from storage.' };
  }
}