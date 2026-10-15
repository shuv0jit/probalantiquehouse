/**
 * Per-page SEO helpers — title, meta tags, canonical link, and JSON-LD
 * structured data. Used by Home.jsx (collections) and ProductPage.jsx so
 * every crawlable view gets its own title/description instead of sharing
 * the one static <title> in index.html.
 */

export function setMetaTag(key, attr, value) {
  if (!value) return;
  let el = document.head.querySelector(`meta[${key}="${attr}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(key, attr);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export function setCanonical(path) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', `${window.location.origin}${path}`);
}

/** Write or replace a JSON-LD <script> block, keyed by id so repeat calls update in place. */
export function setJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeJsonLd(id) {
  document.getElementById(id)?.remove();
}