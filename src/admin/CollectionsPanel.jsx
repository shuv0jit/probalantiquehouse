import { useMemo, useState } from 'react';
import { ChevronRight, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useStore } from '../lib/store.jsx';
import { CollectionSelect, Confirm, Field, FormError, Modal } from './ui.jsx';

function Node({ node, depth, counts, onAddChild, onEdit, onDelete }) {
  const [open, setOpen] = useState(depth < 1);
  const hasKids = node.children.length > 0;
  return (
    <li>
      <div className="ctree__row">
        {hasKids ? (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse' : 'Expand'}
            style={{ color: 'var(--ink-4)', display: 'grid', placeItems: 'center' }}
          >
            <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 240ms var(--ease)' }} />
          </button>
        ) : (
          <span style={{ width: 14 }} />
        )}
        <span className="ctree__name">{node.name}</span>
        <span className="ctree__meta">{counts.get(node.id) ?? 0} pieces</span>
        <div className="ctree__acts">
          <button className="icon-btn" onClick={() => onAddChild(node)} aria-label={`Add a sub-collection under ${node.name}`} title="Add sub-collection">
            <Plus size={14} />
          </button>
          <button className="icon-btn" onClick={() => onEdit(node)} aria-label={`Edit ${node.name}`} title="Edit">
            <Pencil size={14} />
          </button>
          <button className="icon-btn icon-btn--danger" onClick={() => onDelete(node)} aria-label={`Delete ${node.name}`} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {hasKids && open && (
        <ul className="ctree ctree__kids">
          {node.children.map((child) => (
            <Node
              key={child.id}
              node={child}
              depth={depth + 1}
              counts={counts}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CollectionsPanel({ overview, reload }) {
  const { tree, collections, signalChange, toast } = useStore();
  const [form, setForm] = useState(null);   // { mode:'create'|'edit', id, name, parentId }
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const counts = useMemo(() => new Map(collections.map((c) => [c.id, c.count])), [collections]);
  const adminCollections = overview?.collections?.filter((c) => !c.deleted) ?? [];

  const openCreate = (parent) =>
    setForm({ mode: 'create', name: '', parentId: parent?.id ?? null });

  const openEdit = (node) =>
    setForm({ mode: 'edit', id: node.id, name: node.name, parentId: node.parentId ?? null });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { name: form.name.trim(), parentId: form.parentId };
      const res =
        form.mode === 'create'
          ? await api.post('/admin/collections', body)
          : await api.patch(`/admin/collections/${form.id}`, body);
      signalChange(res.revision);
      reload();
      setForm(null);
      toast(form.mode === 'create' ? 'Collection created.' : 'Collection updated.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const askDelete = async (node) => {
    try {
      const impact = await api.get(`/admin/collections/${node.id}/impact`);
      setConfirm({ node, impact });
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      const res = await api.del(`/admin/collections/${confirm.node.id}`);
      signalChange(res.revision);
      reload();
      setConfirm(null);
      toast('Moved to Deleted Items. You can restore it there.', 'success');
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
          <h2>Collection hierarchy</h2>
          <button className="btn btn--primary btn--sm" onClick={() => openCreate(null)}>
            <FolderPlus size={15} /> Add collection
          </button>
        </div>
        <div className="panel__body">
          {tree.roots.length === 0 ? (
            <div className="adm-empty">
              <h3 className="display">No collections yet</h3>
              <p>Start with a top-level collection such as “Jewellery”, then nest sub-collections inside it.</p>
            </div>
          ) : (
            <ul className="ctree">
              {tree.roots.map((node) => (
                <Node
                  key={node.id}
                  node={node}
                  depth={0}
                  counts={counts}
                  onAddChild={openCreate}
                  onEdit={openEdit}
                  onDelete={askDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.mode === 'create' ? 'New collection' : 'Edit collection'}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
            <button className="btn btn--primary" onClick={save} disabled={busy || !form?.name.trim()}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {form && (
          <>
            <FormError message={error} />
            <Field label="Collection name" id="cname" hint="For example: Jewellery, Necklace, or Gold Necklace.">
              <input
                id="cname"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter' && form.name.trim()) save(); }}
                autoFocus
              />
            </Field>
            <Field label="Sits inside" id="cparent" hint="Leave at top level to create a main collection. Nesting has no depth limit.">
              <CollectionSelect
                id="cparent"
                collections={adminCollections}
                value={form.parentId}
                onChange={(v) => setForm({ ...form, parentId: v })}
                allowRoot
                excludeIds={form.mode === 'edit' ? [form.id] : []}
              />
            </Field>
          </>
        )}
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doDelete}
        busy={busy}
        title={`Delete “${confirm?.node.name}”?`}
        confirmLabel="Move to Deleted Items"
        message={
          confirm ? (
            <>
              This collection contains <strong>{confirm.impact.products} product{confirm.impact.products === 1 ? '' : 's'}</strong>
              {confirm.impact.collections > 0 && <> and <strong>{confirm.impact.collections} sub-collection{confirm.impact.collections === 1 ? '' : 's'}</strong></>}.
              Deleting it removes those items from the customer website and moves everything to Deleted Items,
              where it can be restored.
            </>
          ) : ''
        }
      />
    </>
  );
}
