export const TAKA = '\u09F3';

export function money(n) {
  if (n == null) return null;
  return TAKA + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function pct(n) {
  return `${Number(n) % 1 === 0 ? Number(n) : Number(n).toFixed(1)}%`;
}

/** "Ends in 3 days" / "Ends today" — used by the sale bar. */
export function countdown(endsAt) {
  const end = new Date(`${endsAt}T23:59:59`);
  const ms = end - new Date();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `Ends in ${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return `Ends in ${hours} hour${hours === 1 ? '' : 's'}`;
  return 'Ends today';
}

export function buildTree(collections) {
  const byId = new Map(collections.map((c) => [c.id, { ...c, children: [] }]));
  const roots = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId).children.push(node);
    else roots.push(node);
  });
  return { roots, byId };
}

export function pathTo(byId, id) {
  const out = [];
  let cur = byId.get(Number(id));
  while (cur) {
    out.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return out;
}


/** "4 hours ago" / "1 day ago" — used on the newly-added product cards. */
export function timeAgo(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}