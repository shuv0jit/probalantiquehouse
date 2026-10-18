import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useStore, useSyncEffect } from '../lib/store.jsx';
import { Confirm } from './ui.jsx';

const GRACE_SECONDS = 5;
const CONCURRENCY = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isGone = (err) => err?.status === 404 || /not in deleted/i.test(err?.message || '');

export default function DeletedPanel({ reload }) {
  const { signalChange, toast } = useStore();
  const [data, setData] = useState({ collections: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(() => new Set()); // "kind:id" hidden while a bulk delete runs
  const [job, setJob] = useState(null); // {phase, total, done, failed, left}

  const runningRef = useRef(false);
  const cancelRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get('/admin/deleted');
      if (mountedRef.current) setData(d);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [toast]);

  useSyncEffect(() => { load(); }, []);

  const restore = async (kind, id) => {
    try {
      const res = await api.post(`/admin/${kind}/${id}/restore`);
      signalChange(res.revision);
      load();
      reload();
      toast('Restored and live on the site again.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const purge = async () => {
    setBusy(true);
    try {
      const res = await api.del(`/admin/${confirm.kind}/${confirm.id}/permanent`);
      signalChange(res.revision);
      load();
      reload();
      setConfirm(null);
      toast(res.warning || 'Permanently deleted.', res.warning ? 'info' : 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // ---- Delete all: runs in the background, one pass over a fixed snapshot ----
  const startPurgeAll = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    cancelRef.current = false;
    setConfirm(null);

    const collections = data.collections.map((c) => ['collections', c.id]);
    const products = data.products.map((p) => ['products', p.id]);
    const all = [...collections, ...products];
    const total = all.length;
    setHidden(new Set(all.map(([k, id]) => `${k}:${id}`)));

    let done = 0;
    let failed = 0;
    let lastRev = null;
    const push = (phase, left = 0) => mountedRef.current && setJob({ phase, total, done, failed, left });

    // grace period: Undo here means nothing is deleted at all
    for (let s = GRACE_SECONDS; s > 0 && !cancelRef.current; s -= 1) {
      push('countdown', s);
      await sleep(1000);
    }

    if (!cancelRef.current) {
      push('running');
      const runOne = async ([kind, id]) => {
        try {
          const res = await api.del(`/admin/${kind}/${id}/permanent`);
          if (res?.revision != null) lastRev = res.revision;
          done += 1;
        } catch (err) {
          if (isGone(err)) done += 1; // already removed along with its parent
          else failed += 1;
        }
        push('running');
      };

      // collections first (they take their products with them), one at a time
      for (const item of collections) {
        if (cancelRef.current) break;
        await runOne(item);
      }
      // then the remaining products, a few at a time
      const queue = [...products];
      const worker = async () => {
        while (queue.length && !cancelRef.current) await runOne(queue.shift());
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    }

    const stopped = cancelRef.current;
    runningRef.current = false;
    if (lastRev != null) signalChange(lastRev);
    if (mountedRef.current) {
      setJob(null);
      setHidden(new Set());
      await load();
    }
    reload();

    if (stopped) {
      toast(
        done ? `Stopped. ${done} already deleted for good, the rest are still in Deleted Items.` : 'Cancelled. Nothing was deleted.',
        'info'
      );
    } else {
      toast(
        failed ? `Deleted ${done}, ${failed} failed. They are still listed.` : `Permanently deleted ${done} item${done === 1 ? '' : 's'}.`,
        failed ? 'error' : 'success'
      );
    }
  };

  const undo = () => { cancelRef.current = true; };

  const visibleCols = data.collections.filter((c) => !hidden.has(`collections:${c.id}`));
  const visibleProds = data.products.filter((p) => !hidden.has(`products:${p.id}`));
  const total = visibleCols.length + visibleProds.length;
  const empty = !loading && !job && total === 0;
  const working = !!job;
  const pct = job ? Math.round(((job.done + job.failed) / Math.max(job.total, 1)) * 100) : 0;

  return (
    <>
      {empty && (
        <div className="panel">
          <div className="adm-empty">
            <h3 className="display">Deleted Items is empty</h3>
            <p>Anything you delete lands here first, so nothing is ever lost by accident.</p>
          </div>
        </div>
      )}

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            {total} item{total === 1 ? '' : 's'} in trash
          </span>
          <button className="btn btn--danger btn--sm" disabled={working} onClick={() => setConfirm({ kind: 'all' })}>
            <Trash2 size={14} /> Delete all
          </button>
        </div>
      )}

      {visibleCols.length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel__head"><h2>Deleted collections</h2></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Was inside</th><th>Deleted</th><th style={{ width: 110 }} /></tr></thead>
              <tbody>
                {visibleCols.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ color: 'var(--ink-3)' }}>{c.parentName || 'Top level'}</td>
                    <td style={{ color: 'var(--ink-3)' }}>{String(c.deletedAt).slice(0, 10)}</td>
                    <td>
                      <div className="tbl__acts">
                        <button className="icon-btn icon-btn--good" onClick={() => restore('collections', c.id)} title="Restore" aria-label={`Restore ${c.name}`}>
                          <RotateCcw size={14} />
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          onClick={() => setConfirm({ kind: 'collections', id: c.id, label: c.name, isCollection: true })}
                          title="Delete permanently"
                          aria-label={`Permanently delete ${c.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {visibleProds.length > 0 && (
        <div className="panel">
          <div className="panel__head"><h2>Deleted products</h2></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th style={{ width: 58 }}>Image</th><th>Code</th><th>Collection</th><th>Price</th><th>Deleted</th><th style={{ width: 110 }} /></tr></thead>
              <tbody>
                {visibleProds.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.image ? <img className="tbl__thumb" src={p.image} alt="" loading="lazy" />
                        : <span className="tbl__thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><ImageOff size={15} /></span>}
                    </td>
                    <td><span className="tbl__code">{p.code}</span></td>
                    <td style={{ color: 'var(--ink-2)' }}>{p.collectionName}</td>
                    <td>{p.price != null ? money(p.price) : '—'}</td>
                    <td style={{ color: 'var(--ink-3)' }}>{String(p.deletedAt).slice(0, 10)}</td>
                    <td>
                      <div className="tbl__acts">
                        <button className="icon-btn icon-btn--good" onClick={() => restore('products', p.id)} title="Restore" aria-label={`Restore ${p.code}`}>
                          <RotateCcw size={14} />
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          onClick={() => setConfirm({ kind: 'products', id: p.id, label: `No. ${p.code}` })}
                          title="Delete permanently"
                          aria-label={`Permanently delete ${p.code}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && !job && <div className="panel"><div className="adm-empty"><div className="spinner" style={{ margin: '0 auto' }} /></div></div>}

      {/* floating progress bar with Undo */}
      {job && (
        <div
          style={{
            position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 130,
            width: 'min(460px, calc(100vw - 24px))', padding: '12px 14px',
            background: 'var(--shell, #fff)', border: '1px solid var(--line)', borderRadius: 14,
            boxShadow: 'var(--sh-3)', display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {job.phase === 'countdown'
                ? `Deleting ${job.total} item${job.total === 1 ? '' : 's'} in ${job.left}s…`
                : `Deleting… ${job.done + job.failed} / ${job.total}`}
            </div>
            <div style={{ height: 5, borderRadius: 99, background: 'var(--ivory-2)', marginTop: 7, overflow: 'hidden' }}>
              <div style={{ width: `${job.phase === 'countdown' ? ((GRACE_SECONDS - job.left) / GRACE_SECONDS) * 100 : pct}%`, height: '100%', background: 'var(--rose)', transition: 'width .3s ease' }} />
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={undo}>
            <Undo2 size={14} /> Undo
          </button>
        </div>
      )}

      <Confirm
        open={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={confirm?.kind === 'all' ? startPurgeAll : purge}
        busy={busy}
        danger
        title={confirm?.kind === 'all' ? 'Delete everything in trash?' : 'This action is permanent'}
        confirmLabel={confirm?.kind === 'all' ? `Delete all ${total}` : 'Delete permanently'}
        message={
          confirm?.kind === 'all' ? (
            <>
              All <strong>{visibleCols.length} collection(s)</strong> and <strong>{visibleProds.length} product(s)</strong> will be
              permanently removed in the background, photos included. You get {GRACE_SECONDS} seconds to press Undo before it starts.
            </>
          ) : (
            <>
              <strong>{confirm?.label}</strong> and its data will be removed from the database, and its photographs
              will be deleted from storage.
              {confirm?.isCollection && ' Every sub-collection and product inside it will also be permanently removed.'}
              {' '}This cannot be undone. Continue?
            </>
          )
        }
      />
    </>
  );
}