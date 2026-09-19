import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes, ChevronsLeft, ChevronsRight, LayoutDashboard, Layers, LogOut,
  Menu, Plus, RefreshCw, Search, Store, Tag, Trash2, X,
} from 'lucide-react';

import { api } from '../lib/api.js';
import { useEscape, useLocal, useMedia } from '../lib/hooks.js';
import { useStore, useSyncEffect } from '../lib/store.jsx';
import { useSwipe } from '../lib/useSwipe.js';

import AdminLogin from './AdminLogin.jsx';
import CollectionsPanel from './CollectionsPanel.jsx';
import Dashboard from './Dashboard.jsx';
import DeletedPanel from './DeletedPanel.jsx';
import ProductsPanel from './ProductsPanel.jsx';
import SalesPanel from './SalesPanel.jsx';
import { Spinner } from '../components/Skeleton.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'collections', label: 'Collections', icon: Layers },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'sales', label: 'Sales', icon: Tag },
];

export default function AdminApp() {
  const { justSynced, toast } = useStore();

  const [admin, setAdmin] = useState(undefined);  // undefined = checking
  const [view, setView] = useState('dashboard');
  const [mini, setMini] = useLocal('pah:admin-mini', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState([]);

  const isMobile = useMedia('(max-width: 900px)');
  useEscape(() => setMobileOpen(false), mobileOpen);

  // Swipe the admin drawer closed on touch devices.
  const sideRef = useRef(null);
  const closeDrawer = useCallback(() => setMobileOpen(false), []);
  useSwipe(sideRef, { enabled: isMobile && mobileOpen, onSwipeLeft: closeDrawer });

  /* ------------------------------------------------------ session */
  useEffect(() => {
    api.get('/admin/me')
      .then((data) => setAdmin(data.admin))
      .catch(() => setAdmin(null));
  }, []);

  const loadAll = useCallback(async () => {
    if (!admin) return;
    try {
      const [ov, sl] = await Promise.all([api.get('/admin/overview'), api.get('/admin/sales')]);
      setOverview(ov);
      setSales(sl.sales);
    } catch (err) {
      if (err.status === 401) setAdmin(null);
      else toast(err.message, 'error');
    }
  }, [admin, toast]);

  useSyncEffect(() => { loadAll(); }, [admin]);

  const reloadSales = useCallback(async () => {
    try { setSales((await api.get('/admin/sales')).sales); } catch { /* handled by the next sync */ }
  }, []);

  const signOut = async () => {
    try { await api.post('/admin/logout'); } catch { /* clearing locally regardless */ }
    setAdmin(null);
    setOverview(null);
  };

  /* -------------------------------------------------------- render */
  if (admin === undefined) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><Spinner /></div>;
  }
  if (!admin) {
    return <AdminLogin onSignedIn={(a) => { setAdmin(a); toast('Signed in. This device stays signed in for a year.', 'success'); }} />;
  }

  const go = (id) => { setView(id); setMobileOpen(false); };
  const deletedCount = overview?.stats?.deleted ?? 0;

  const titles = {
    dashboard: ['Dashboard', 'Everything at a glance'],
    collections: ['Collections', 'Build and reorganise your hierarchy'],
    products: ['Products', 'Upload, edit and remove pieces'],
    sales: ['Sales', 'Schedule promotions by collection'],
    deleted: ['Deleted Items', 'Restore or permanently remove'],
  };
  const [title, subtitle] = titles[view];

  return (
    <div className="adm">
      {isMobile && mobileOpen && <div className="scrim-adm" onClick={() => setMobileOpen(false)} />}

      <aside
        ref={sideRef}
        className={`adm__side${mini ? ' is-mini' : ''}${mobileOpen ? ' is-open' : ''}`}
        aria-label="Admin navigation"
      >
        <div className="adm__brand">
          <span className="adm__brand-mark" aria-hidden="true">P</span>
          <span className="adm__brand-txt">
            <b>Probal</b>
            <span>Admin</span>
          </span>
          {isMobile && (
            <button
              style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="adm__nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`adm__item${view === id ? ' is-on' : ''}`}
              onClick={() => go(id)}
              title={mini ? label : undefined}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}

          <div className="adm__navgap" />

          {/* Deleted Items is pinned to the bottom, as a static entry */}
          <button
            className={`adm__item${view === 'deleted' ? ' is-on' : ''}`}
            onClick={() => go('deleted')}
            title={mini ? 'Deleted Items' : undefined}
          >
            <Trash2 size={17} />
            <span>Deleted Items</span>
            {deletedCount > 0 && <span className="adm__item-pill">{deletedCount}</span>}
          </button>
        </nav>

        <div className="adm__foot">
          <span className="adm__foot-txt">{admin.email}</span>
          <Link className="adm__item" to="/" title={mini ? 'View the site' : undefined}>
            <Store size={16} /><span>View the site</span>
          </Link>
          <button className="adm__item" onClick={signOut} title={mini ? 'Sign out' : undefined}>
            <LogOut size={16} /><span>Sign out</span>
          </button>
          {!isMobile && (
            <button className="adm__item" onClick={() => setMini((m) => !m)} title={mini ? 'Expand' : 'Collapse'}>
              {mini ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
              <span>Collapse</span>
            </button>
          )}
        </div>
      </aside>

      <div className="adm__main">
        <header className="adm__top">
          {isMobile && (
            <button className="icon-btn adm__mobtoggle" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
          )}
          <div>
            <h1 className="display">{title}</h1>
            <div className="adm__top-sub">{subtitle}</div>
          </div>

          <div className="adm__top-right">
            {(view === 'products' || view === 'dashboard') && (
              <div className="adm__search">
                <Search size={15} style={{ color: 'var(--ink-3)', flex: 'none' }} />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); if (view !== 'products') setView('products'); }}
                  placeholder="Piece number or name…"
                  aria-label="Search products"
                  inputMode="search"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="Clear search" style={{ color: 'var(--ink-4)' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            <button
              className="icon-btn"
              onClick={() => { loadAll(); reloadSales(); }}
              title="Refresh"
              aria-label="Refresh data"
              style={{ color: justSynced ? 'var(--sage)' : undefined }}
            >
              <RefreshCw size={15} style={justSynced ? { animation: 'spin 700ms var(--ease)' } : undefined} />
            </button>

            <button className="btn btn--primary btn--sm" onClick={() => { setView('products'); setAddOpen(true); }}>
              <Plus size={15} /> Add products
            </button>
          </div>
        </header>

        <div className="adm__body">
          {view === 'dashboard' && <Dashboard overview={overview} sales={sales} onGo={go} />}
          {view === 'collections' && <CollectionsPanel overview={overview} reload={loadAll} />}
          {view === 'products' && (
            <ProductsPanel
              overview={overview}
              reload={loadAll}
              query={query}
              addOpen={addOpen}
              setAddOpen={setAddOpen}
            />
          )}
          {view === 'sales' && <SalesPanel overview={overview} sales={sales} reloadSales={reloadSales} />}
          {view === 'deleted' && <DeletedPanel reload={loadAll} />}
        </div>
      </div>
    </div>
  );
}
