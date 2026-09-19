import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { buildTree } from './format.js';

/**
 * LIVE SYNC
 * ---------
 * The database keeps a single integer `revision` that is bumped by every
 * mutation. Clients learn about changes three ways, cheapest first:
 *
 *  1. Local echo — after an admin action the API response carries the new
 *     revision, so the tab that made the change updates instantly (0 ms).
 *  2. BroadcastChannel — that revision is broadcast to every other tab in the
 *     same browser, which also update instantly.
 *  3. Polling — every other device polls GET /api/revision. One tiny query,
 *     paused while the tab is hidden, and fired immediately on focus/online,
 *     so coming back to a tab always shows current data.
 *
 * Anything that needs to stay fresh calls `useSyncEffect(fn)`; it re-runs
 * whenever the revision moves.
 */

const POLL_MS = 4000;
const CHANNEL = 'pah-live-sync';

const StoreCtx = createContext(null);

let toastSeq = 0;

export function StoreProvider({ children }) {
  const [boot, setBoot] = useState({ collections: [], sales: [], totalProducts: 0 });
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [justSynced, setJustSynced] = useState(false);

  const channel = useRef(null);
  const known = useRef(0);

  /* ----------------------------------------------------------- toasts */
  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, kind = 'info', ttl = 4200) => {
    const id = ++toastSeq;
    setToasts((list) => [...list.slice(-3), { id, message, kind }]);
    if (ttl) setTimeout(() => dismissToast(id), ttl);
    return id;
  }, [dismissToast]);

  /* ------------------------------------------------------- bootstrap */
  const loadBoot = useCallback(async ({ quiet = false } = {}) => {
    try {
      const data = await api.get('/bootstrap');
      setBoot({
        collections: data.collections,
        sales: data.sales,
        totalProducts: data.totalProducts,
      });
      known.current = data.revision;
      setRevision(data.revision);
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(err.message);
      if (!quiet) setStatus('error');
    }
  }, []);

  useEffect(() => { loadBoot(); }, [loadBoot]);

  /* --------------------------------------------- revision propagation */
  const applyRevision = useCallback((next, { broadcast = false } = {}) => {
    if (!next || next <= known.current) return;
    known.current = next;
    setRevision(next);
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 1600);
    loadBoot({ quiet: true });
    if (broadcast) {
      try { channel.current?.postMessage({ revision: next }); } catch { /* channel closed */ }
    }
  }, [loadBoot]);

  /** Admin mutations call this with the revision the API returned. */
  const signalChange = useCallback((next) => {
    applyRevision(Number(next) || known.current + 1, { broadcast: true });
  }, [applyRevision]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    ch.onmessage = (e) => applyRevision(Number(e.data?.revision));
    return () => { ch.close(); channel.current = null; };
  }, [applyRevision]);

  /* ------------------------------------------------------------ poll */
  useEffect(() => {
    let timer = null;
    let stopped = false;

    const tick = async () => {
      if (stopped || document.hidden) return;
      try {
        const { revision: next } = await api.get('/revision');
        applyRevision(next);
      } catch { /* transient — the next tick retries */ }
    };

    const schedule = () => {
      clearInterval(timer);
      timer = setInterval(tick, POLL_MS);
    };

    const onWake = () => { if (!document.hidden) { tick(); schedule(); } };

    schedule();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [applyRevision]);

  /* ---------------------------------------------------------- derived */
  const tree = useMemo(() => buildTree(boot.collections), [boot.collections]);

  const saleFor = useCallback(
    (collectionId) => {
      // Mirrors the server: a sale on a parent applies to every descendant.
      const { byId } = tree;
      let best = null;
      boot.sales.forEach((sale) => {
        const hit = sale.collectionIds.some((target) => {
          let cur = byId.get(Number(collectionId));
          while (cur) {
            if (cur.id === target) return true;
            cur = cur.parentId ? byId.get(cur.parentId) : null;
          }
          return false;
        });
        if (hit && (!best || sale.discountPercent > best.discountPercent)) best = sale;
      });
      return best;
    },
    [boot.sales, tree]
  );

  const value = useMemo(
    () => ({
      ...boot,
      tree,
      revision,
      status,
      error,
      justSynced,
      reload: loadBoot,
      signalChange,
      saleFor,
      toast,
      toasts,
      dismissToast,
    }),
    [boot, tree, revision, status, error, justSynced, loadBoot, signalChange, saleFor, toast, toasts, dismissToast]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Re-run `fn` on mount and whenever anything, anywhere, changes the data. */
export function useSyncEffect(fn, deps = []) {
  const { revision } = useStore();
  useEffect(() => {
    const cleanup = fn();
    return typeof cleanup === 'function' ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, ...deps]);
}
