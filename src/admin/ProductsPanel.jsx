import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { useStore, useSyncEffect } from '../lib/store.jsx';
import { CollectionSelect, Confirm, Field, FormError, Modal, useDelayed } from './ui.jsx';
import AddProducts from './AddProducts.jsx';

const PAGE = 30;

export default function ProductsPanel({ overview, reload, query, addOpen, setAddOpen }) {
  const { signalChange, toast } = useStore();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterCollection, setFilterCollection] = useState(null);
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const q = useDelayed(query, 260);
  const adminCollections = overview?.collections?.filter((c) => !c.deleted) ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE) });
      if (q.trim()) params.set('q', q.trim());
      if (filterCollection) params.set('collection', String(filterCollection));
      const data = await api.get(`/admin/products?${params}`);
      setRows(data.products);
      setMeta({ total: data.total, pages: data.pages });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, q, filterCollection, toast]);

  // Reloads on filter change and on any live-sync revision bump.
  useSyncEffect(() => { load(); }, [page, q, filterCollection]);
  useEffect(() => { setPage(1); }, [q, filterCollection]);

  // A search that is exactly a 6-digit code and matches one row: jump straight in.
  useEffect(() => {
    if (/^\d{6}$/.test(q.trim()) && rows.length === 1 && rows[0].code === q.trim()) {
      setEdit({ ...rows[0], price: rows[0].price.base ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const saveEdit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.patch(`/admin/products/${edit.id}`, {
        price: edit.price === '' ? null : Number(edit.price),
        collectionId: edit.collectionId,
        title: edit.title || null,
        description: edit.description || null,
      });
      signalChange(res.revision);
      load();
      reload();
      setEdit(null);
      toast('Product updated.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      const res = await api.del(`/admin/products/${confirm.id}`);
      signalChange(res.revision);
      load();
      reload();
      setConfirm(null);
      toast('Moved to Deleted Items.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="panel">
        <div className="panel__head">
          <h2>Products</h2>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{meta.total} total</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 190 }}>
              <CollectionSelect collections={adminCollections} value={filterCollection} onChange={setFilterCollection} allowRoot />
            </div>
            <button className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
              <Plus size={15} /> Add products
            </button>
          </div>
        </div>

        {loading ? (
          <div className="adm-empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : rows.length === 0 ? (
          <div className="adm-empty">
            <h3 className="display">{q ? 'No matches' : 'No products yet'}</h3>
            <p>{q ? `Nothing matched “${q}”. Try a piece number or a different word.` : 'Use “Add products” to upload photographs in bulk.'}</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 58 }}>Image</th>
                  <th>Code</th>
                  <th>Collection</th>
                  <th>Price</th>
                  <th style={{ width: 110 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.images[0] ? (
                        <img className="tbl__thumb" src={p.images[0].url} alt="" loading="lazy" />
                      ) : (
                        <span className="tbl__thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}>
                          <ImageOff size={15} />
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="tbl__code">{p.code}</span>
                      {p.images.length > 1 && (
                        <span style={{ marginLeft: 7, fontSize: 10.5, color: 'var(--ink-4)' }}>{p.images.length} photos</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--ink-2)' }}>{p.path.map((x) => x.name).join(' › ') || '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {p.price.base != null ? money(p.price.base) : <span style={{ color: 'var(--ink-4)' }}>On request</span>}
                      {p.price.discountPercent > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--rose)' }}>-{p.price.discountPercent}%</span>
                      )}
                    </td>
                    <td>
                      <div className="tbl__acts">
                        <Link className="icon-btn" to={`/product/${p.code}`} target="_blank" aria-label={`View ${p.code} on the site`} title="View on site">
                          <ExternalLink size={14} />
                        </Link>
                        <button
                          className="icon-btn"
                          onClick={() => setEdit({ ...p, price: p.price.base ?? '' })}
                          aria-label={`Edit ${p.code}`}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          onClick={() => setConfirm(p)}
                          aria-label={`Delete ${p.code}`}
                          title="Delete"
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
        )}

        {meta.pages > 1 && (
          <div className="pager">
            <button className="btn btn--ghost btn--sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Previous</button>
            <span style={{ color: 'var(--ink-3)' }}>Page {page} of {meta.pages}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => setPage((p) => p + 1)} disabled={page >= meta.pages}>Next</button>
          </div>
        )}
      </div>

      <AddProducts
        open={addOpen}
        onClose={() => setAddOpen(false)}
        overview={overview}
        reload={() => { load(); reload(); }}
        defaultCollectionId={filterCollection}
      />

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `Piece No. ${edit.code}` : ''}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setEdit(null)} disabled={busy}>Cancel</button>
            <button className="btn btn--primary" onClick={saveEdit} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </>
        }
      >
        {edit && (
          <>
            <FormError message={error} />
            {edit.images.length > 0 && (
              <div className="previews" style={{ marginBottom: 16 }}>
                {edit.images.map((img, i) => (
                  <div className="preview" key={i}><img src={img.url} alt={`Photograph ${i + 1}`} /></div>
                ))}
              </div>
            )}
            <Field label="Title" id="eptitle">
              <input id="eptitle" className="input" value={edit.title || ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </Field>
            <div className="row">
              <Field label="Price" id="epprice" hint="Blank means “price on request”.">
                <input id="epprice" className="input" type="number" min="0" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
              </Field>
              <Field label="Collection" id="epcol">
                <CollectionSelect id="epcol" collections={adminCollections} value={edit.collectionId} onChange={(v) => setEdit({ ...edit, collectionId: v })} />
              </Field>
            </div>
            <Field label="Description" id="epdesc" hint="Shown on the product page and used for search.">
              <textarea id="epdesc" className="textarea" value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
          </>
        )}
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doDelete}
        busy={busy}
        title="Delete this product?"
        confirmLabel="Move to Deleted Items"
        message={
          <>Piece <strong>No. {confirm?.code}</strong> will be removed from the customer website and moved to Deleted Items, where it can be restored later.</>
        }
      />
    </>
  );
}
