import { useState } from 'react';
import { Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useStore } from '../lib/store.jsx';
import { Confirm, Field, FormError, Modal, SalePill } from './ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const blank = () => ({
  name: '',
  discountPercent: 5,
  startsAt: today(),
  endsAt: plusDays(14),
  active: true,
  collectionIds: [],
});

export default function SalesPanel({ overview, sales, reloadSales }) {
  const { signalChange, toast } = useStore();
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const collections = overview?.collections?.filter((c) => !c.deleted) ?? [];
  const byId = new Map(collections.map((c) => [c.id, c]));
  const trailOf = (c) => {
    const parts = [];
    let cur = c;
    while (cur) { parts.unshift(cur.name); cur = cur.parentId ? byId.get(cur.parentId) : null; }
    return parts.join(' › ');
  };

  const toggleTarget = (id) =>
    setForm((f) => ({
      ...f,
      collectionIds: f.collectionIds.includes(id)
        ? f.collectionIds.filter((x) => x !== id)
        : [...f.collectionIds, id],
    }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        discountPercent: Number(form.discountPercent),
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        active: form.active,
        collectionIds: form.collectionIds,
      };
      const res = form.id
        ? await api.patch(`/admin/sales/${form.id}`, body)
        : await api.post('/admin/sales', body);
      signalChange(res.revision);
      reloadSales();
      setForm(null);
      toast(form.id ? 'Sale updated.' : 'Sale created.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (sale) => {
    try {
      const res = await api.patch(`/admin/sales/${sale.id}`, { active: !sale.active });
      signalChange(res.revision);
      reloadSales();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api.del(`/admin/sales/${confirm.id}`);
      signalChange(res.revision);
      reloadSales();
      setConfirm(null);
      toast('Sale deleted.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const groups = [
    { key: 'live', label: 'Running now' },
    { key: 'upcoming', label: 'Scheduled' },
    { key: 'inactive', label: 'Paused' },
    { key: 'expired', label: 'Finished' },
  ];

  return (
    <>
      <div className="panel">
        <div className="panel__head">
          <h2>Sales</h2>
          <button className="btn btn--primary btn--sm" onClick={() => setForm(blank())}>
            <Plus size={15} /> Create sale
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="adm-empty">
            <h3 className="display">No sales yet</h3>
            <p>A sale discounts every piece in the collections you pick, including their sub-collections.</p>
          </div>
        ) : (
          <div className="panel__body" style={{ display: 'grid', gap: 20 }}>
            {groups.map(({ key, label }) => {
              const list = sales.filter((s) => s.status === key);
              if (!list.length) return null;
              return (
                <div key={key}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr><th>Name</th><th>Discount</th><th>Dates</th><th>Applies to</th><th>Status</th><th style={{ width: 110 }} /></tr>
                      </thead>
                      <tbody>
                        {list.map((sale) => (
                          <tr key={sale.id}>
                            <td style={{ fontWeight: 500 }}>{sale.name}</td>
                            <td>{sale.discountPercent}%</td>
                            <td style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{sale.startsAt} → {sale.endsAt}</td>
                            <td style={{ color: 'var(--ink-2)', fontSize: 12 }}>
                              {sale.collectionIds.map((id) => byId.get(id)?.name).filter(Boolean).join(', ') || '—'}
                            </td>
                            <td><SalePill status={sale.status} /></td>
                            <td>
                              <div className="tbl__acts">
                                <button
                                  className={`icon-btn ${sale.active ? '' : 'icon-btn--good'}`}
                                  onClick={() => toggleActive(sale)}
                                  aria-label={sale.active ? 'Pause this sale' : 'Activate this sale'}
                                  title={sale.active ? 'Pause' : 'Activate'}
                                >
                                  {sale.active ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <button className="icon-btn" onClick={() => setForm({ ...sale })} aria-label="Edit sale" title="Edit">
                                  <Pencil size={14} />
                                </button>
                                <button className="icon-btn icon-btn--danger" onClick={() => setConfirm(sale)} aria-label="Delete sale" title="Delete">
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
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        wide
        title={form?.id ? 'Edit sale' : 'New sale'}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
            <button className="btn btn--primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save sale'}</button>
          </>
        }
      >
        {form && (
          <>
            <FormError message={error} />
            <Field label="Sale name" id="sname" hint="Shown on the storefront banner, e.g. “Durga Puja Special Sale”.">
              <input id="sname" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>

            <div className="row">
              <Field label="Discount %" id="sdisc" hint="Customers pay exactly this much less.">
                <input id="sdisc" className="input" type="number" min="1" max="90" step="0.5"
                       value={form.discountPercent}
                       onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
              </Field>
              <Field label="Starts" id="sstart">
                <input id="sstart" className="input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </Field>
              <Field label="Ends" id="send">
                <input id="send" className="input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </Field>
            </div>

            <Field
              label={`Applies to (${form.collectionIds.length} selected)`}
              hint="Selecting a parent automatically includes every collection nested inside it."
            >
              <div className="checks">
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`check${form.collectionIds.includes(c.id) ? ' is-on' : ''}`}
                    onClick={() => toggleTarget(c.id)}
                    aria-pressed={form.collectionIds.includes(c.id)}
                    title={trailOf(c)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </Field>

            <label className="check" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active — show this sale on the storefront during its dates
            </label>
          </>
        )}
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete this sale?"
        confirmLabel="Delete permanently"
        message={
          <>
            <strong>“{confirm?.name}”</strong> will be removed completely. Product prices return to normal immediately.
            Product data is not affected.
          </>
        }
      />
    </>
  );
}
