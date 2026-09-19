import { Boxes, Image, Layers, Tag, Trash2 } from 'lucide-react';
import { SalePill } from './ui.jsx';

export default function Dashboard({ overview, sales, onGo }) {
  const s = overview?.stats;
  const cards = [
    { k: 'Live pieces', v: s?.products ?? '—', icon: Boxes, accent: true, go: 'products' },
    { k: 'Collections', v: s?.collections ?? '—', icon: Layers, go: 'collections' },
    { k: 'Photographs', v: s?.images ?? '—', icon: Image, go: 'products' },
    { k: 'Active sales', v: s?.activeSales ?? '—', icon: Tag, go: 'sales' },
    { k: 'In deleted items', v: s?.deleted ?? '—', icon: Trash2, go: 'deleted' },
  ];

  const recent = sales.slice(0, 5);

  return (
    <>
      <div className="stats">
        {cards.map((c) => (
          <button key={c.k} className={`stat${c.accent ? ' stat--accent' : ''}`} onClick={() => onGo(c.go)} style={{ textAlign: 'left' }}>
            <span className="stat__k"><c.icon size={13} /> {c.k}</span>
            <span className="stat__v">{c.v}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2>Sales</h2>
          <button className="btn btn--ghost btn--sm" onClick={() => onGo('sales')}>Manage</button>
        </div>
        {recent.length === 0 ? (
          <div className="adm-empty">
            <h3 className="display">No sales configured</h3>
            <p>Create one to show a promotional banner on the storefront.</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Name</th><th>Discount</th><th>Window</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.name}</td>
                    <td>{sale.discountPercent}%</td>
                    <td style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{sale.startsAt} → {sale.endsAt}</td>
                    <td><SalePill status={sale.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
