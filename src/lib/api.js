/**
 * Tiny fetch wrapper. Every call returns parsed JSON or throws an Error whose
 * `message` is already customer-safe (the server writes those messages).
 */
export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('You appear to be offline. Check your connection and try again.', 0);
  }

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError('The server sent an unexpected response.', res.status);
  }

  if (!res.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status, data.detail);
  return data;
}

export const api = {
  get: (p, o) => request(p, o),
  post: (p, body, o) => request(p, { ...o, method: 'POST', body: body ?? {} }),
  patch: (p, body, o) => request(p, { ...o, method: 'PATCH', body: body ?? {} }),
  del: (p, o) => request(p, { ...o, method: 'DELETE' }),
};

/** Upload one file straight to B2 with progress. Resolves to {url, key, width, height}. */
export function uploadToStorage(file, presigned, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presigned.uploadUrl, true);
    xhr.setRequestHeader('Content-Type', presigned.contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve({ url: presigned.url, key: presigned.key });
      else reject(new Error(`Upload failed for ${file.name} (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error(`Upload failed for ${file.name}. Check the bucket CORS rules.`));
    xhr.send(file);
  });
}

/** Read natural dimensions so the grid can reserve space and avoid layout shift. */
export function readDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, preview: url });
    };
    img.onerror = () => resolve({ width: null, height: null, preview: url });
    img.src = url;
  });
}

/**
 * Downscale + re-encode an image in the browser before upload. Jewellery
 * photos from phone cameras are often 3000px+ and several MB — this caps the
 * long edge and re-encodes as JPEG, which is the single biggest lever for
 * fast product-image loading on the storefront (nothing to download server-
 * side, nothing extra to store, no DB writes).
 */
export function compressImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return resolve({ file, width: img.naturalWidth, height: img.naturalHeight, preview: url });
          const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
          resolve({ file: compressed, width: w, height: h, preview: URL.createObjectURL(compressed) });
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve({ file, width: null, height: null, preview: url });
    img.src = url;
  });
}
