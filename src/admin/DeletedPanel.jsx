import { useCallback, useState } from 'react';
import { FolderX, ImageOff, RotateCcw, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useStore, useSyncEffect } from '../lib/store.jsx';
import { Confirm } from './ui.jsx';

/**
 * Deleted Items. Restore puts things back exactly where they were;
 * permanent delete removes the records and asks their storage objects to be
 * cleaned up, behind a second confirmation.
 */
export default function DeletedPanel({ reload }) {
  const { signalChange, toast } = useStore();
  const [data, setData] = useState({ collections: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // {kind, id, label, extra}
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get('/admin/deleted'));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
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

  const empty = !loading && !data.collections.length && !data.products.length;

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

      {data.collections.length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel__head"><h2>Deleted collections</h2></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Was inside</th><th>Deleted</th><th style={{ width: 110 }} /></tr></thead>
              <tbody>
                {data.collections.map((c) => (
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

      {data.products.length > 0 && (
        <div className="panel">
          <div className="panel__head"><h2>Deleted products</h2></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th style={{ width: 58 }}>Image</th><th>Code</th><th>Collection</th><th>Price</th><th>Deleted</th><th style={{ width: 110 }} /></tr></thead>
              <tbody>
                {data.products.map((p) => (
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

      {loading && <div className="panel"><div className="adm-empty"><div className="spinner" style={{ margin: '0 auto' }} /></div></div>}

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={purge}
        busy={busy}
        danger
        title="This action is permanent"
        confirmLabel="Delete permanently"
        message={
          <>
            <strong>{confirm?.label}</strong> and its data will be removed from the database, and its photographs
            will be deleted from storage.
            {confirm?.isCollection && ' Every sub-collection and product inside it will also be permanently removed.'}
            {' '}This cannot be undone. Continue?
          </>
        }
      />
    </>
  );
}
