import { lazy, Suspense, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';

import Aurora from './components/Aurora.jsx';
import BackToTop from './components/BackToTop.jsx';
import Navbar from './components/Navbar.jsx';
import SaleBanner from './components/SaleBanner.jsx';
import SearchOverlay from './components/SearchOverlay.jsx';
import Toasts from './components/Toasts.jsx';
import WhatsAppFloat from './components/WhatsAppFloat.jsx';
import { Spinner } from './components/Skeleton.jsx';
import Home from './pages/Home.jsx';
import ProductPage from './pages/ProductPage.jsx';
import NotFound from './pages/NotFound.jsx';
import { useEdgeSwipe, useLocal, useMedia } from './lib/hooks.js';
import { StoreProvider } from './lib/store.jsx';

// The admin bundle is split out — customers never download it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function Storefront() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [favourites] = useLocal('pah:favourites', []);
  const navigate = useNavigate();
  const isMobile = useMedia('(max-width: 1024px)');

  useEdgeSwipe(() => setMenuOpen(true), isMobile && !searchOpen);

  const pickCollection = (id) => navigate(`/?c=${id}`);

  return (
    <>
      <a className="skip-link" href="#main">Skip to products</a>
      <SaleBanner />
      <Navbar
        onOpenSearch={() => setSearchOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        favouriteCount={favourites.length}
      />

      <Routes>
        <Route path="/" element={<Home menuOpen={menuOpen} setMenuOpen={setMenuOpen} />} />
        <Route path="/product/:code" element={<ProductPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPickCollection={pickCollection}
      />
<footer className="pf" id="visit">
  <style>{`
    .pf{--pf-bg:#0d0b09;--pf-bg2:#15120e;--pf-line:rgba(201,163,92,.22);--pf-gold:#c9a35c;--pf-gold2:#e6c98a;--pf-text:#d8cfc0;--pf-mute:#9a9082;
      position:relative;background:radial-gradient(120% 80% at 50% 0%,var(--pf-bg2),var(--pf-bg));color:var(--pf-text);margin-top:64px;
      padding-bottom:env(safe-area-inset-bottom,0);font-size:14px;line-height:1.7;overflow:hidden}
    .pf::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,transparent,var(--pf-gold),transparent)}
    .pf *{box-sizing:border-box}
    .pf a{color:inherit;text-decoration:none}
    .pf__wrap{max-width:1200px;margin:0 auto;padding:0 20px}

    /* CTA band */
    .pf__cta{display:flex;flex-direction:column;gap:18px;margin:44px auto 0;padding:26px 22px;border:1px solid var(--pf-line);border-radius:18px;
      background:linear-gradient(135deg,rgba(201,163,92,.10),rgba(201,163,92,.02))}
    .pf__cta h3{margin:0 0 4px;font-size:22px;color:var(--pf-gold2);font-family:var(--font-display,Georgia,'Times New Roman',serif);font-weight:500}
    .pf__cta p{margin:0;color:var(--pf-mute)}
    .pf__cta-btns{display:flex;flex-direction:column;gap:10px}
    .pf__btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:13px 22px;border-radius:999px;font-weight:600;font-size:14px;
      transition:transform .2s,box-shadow .2s,background .2s;border:1px solid transparent;cursor:pointer}
    .pf__btn:hover{transform:translateY(-2px)}
    .pf__btn--gold{background:linear-gradient(135deg,var(--pf-gold2),var(--pf-gold));color:#1a1408;box-shadow:0 8px 22px -8px rgba(201,163,92,.6)}
    .pf__btn--ghost{border-color:var(--pf-line);color:var(--pf-gold2);background:rgba(255,255,255,.02)}
    .pf__btn--ghost:hover{background:rgba(201,163,92,.12)}

    /* Grid */
    .pf__grid{display:grid;grid-template-columns:1fr;gap:34px;padding:46px 0 38px}
    .pf__brand{display:flex;align-items:center;gap:12px;margin-bottom:14px}
    .pf__mark{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:20px;font-weight:600;color:#1a1408;
      background:linear-gradient(135deg,var(--pf-gold2),var(--pf-gold));font-family:Georgia,serif}
    .pf__name{font-size:22px;color:#fff;font-family:var(--font-display,Georgia,'Times New Roman',serif);line-height:1.15}
    .pf__name small{display:block;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--pf-gold);margin-top:3px;font-family:inherit}
    .pf__about{color:var(--pf-mute);max-width:36ch;margin:0 0 18px}
    .pf__social{display:flex;gap:10px}
    .pf__ico{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--pf-line);color:var(--pf-gold2);transition:all .2s}
    .pf__ico:hover{background:var(--pf-gold);color:#1a1408;transform:translateY(-3px)}
    .pf__h{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--pf-gold);margin:0 0 14px;font-weight:600}
    .pf__list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
    .pf__list a{color:var(--pf-text);transition:color .2s,padding .2s;display:inline-block}
    .pf__list a:hover{color:var(--pf-gold2);padding-left:6px}
    .pf__row{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
    .pf__row svg{flex:none;margin-top:4px;color:var(--pf-gold)}
    .pf__row a:hover{color:var(--pf-gold2)}
    .pf__addr{font-style:normal}

    /* Bottom bar */
    .pf__bar{border-top:1px solid var(--pf-line);padding:18px 0 22px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;
      color:var(--pf-mute);font-size:12.5px}
    .pf__bar b{color:var(--pf-gold2);font-weight:500}
    .pf__top{background:none;border:1px solid var(--pf-line);color:var(--pf-gold2);border-radius:999px;padding:7px 16px;font-size:12px;cursor:pointer;transition:all .2s}
    .pf__top:hover{background:var(--pf-gold);color:#1a1408}

    /* Tablet */
    @media(min-width:640px){
      .pf__wrap{padding:0 32px}
      .pf__cta-btns{flex-direction:row;flex-wrap:wrap}
      .pf__grid{grid-template-columns:1fr 1fr;gap:40px}
      .pf__col--brand{grid-column:1/-1}
      .pf__bar{flex-direction:row;justify-content:space-between;text-align:left}
    }
    /* Desktop */
    @media(min-width:1024px){
      .pf__cta{flex-direction:row;align-items:center;justify-content:space-between;padding:32px 40px}
      .pf__cta h3{font-size:26px}
      .pf__grid{grid-template-columns:1.6fr 1fr 1fr 1.3fr;gap:56px;padding:64px 0 54px}
      .pf__col--brand{grid-column:auto}
    }
  `}</style>

  <div className="pf__wrap">
    {/* CTA */}
    <div className="pf__cta">
      <div>
        <h3>Found a piece you love?</h3>
        <p>Send us the photo or item code and we'll share price, availability and help you order.</p>
      </div>
      <div className="pf__cta-btns">
        <a className="pf__btn pf__btn--gold" href="https://wa.me/8801723689819" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.33-1.93 1.4-.5.07-1.09.1-1.75-.11-.4-.13-.92-.3-1.58-.6-2.78-1.2-4.6-4-4.74-4.18-.14-.19-1.13-1.5-1.13-2.86s.72-2.03.97-2.31c.25-.28.55-.35.73-.35h.53c.17 0 .4-.06.62.48.24.58.82 2 .89 2.15.07.15.11.32.02.51-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.28.36-.23.6-.14.24.09 1.53.72 1.79.85.26.14.44.2.5.31.07.12.07.68-.17 1.36Z" /></svg>
          Chat on WhatsApp
        </a>
        <a className="pf__btn pf__btn--ghost" href="https://m.me/100092842602796" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.15 2 11.25c0 2.9 1.45 5.49 3.72 7.19V22l3.4-1.87c.91.25 1.87.38 2.88.38 5.52 0 10-4.15 10-9.26C22 6.15 17.52 2 12 2Zm.98 12.47-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.92-2.72-5.48 5.82Z" /></svg>
          Message on Messenger
        </a>
      </div>
    </div>

    {/* Columns */}
    <div className="pf__grid">
      <div className="pf__col pf__col--brand">
        <div className="pf__brand">
          <span className="pf__mark" aria-hidden="true">P</span>
          <div className="pf__name">
            Probal Antique House
            <small>Fine Jewellery &amp; Antiques</small>
          </div>
        </div>
        <p className="pf__about">
          Designs you love, made to last. Timeless jewellery and antiques for your best moments.
        </p>
        <div className="pf__social">
          <a className="pf__ico" href="https://www.facebook.com/profile.php?id=100092842602796" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" /></svg>
          </a>
          <a className="pf__ico" href="https://m.me/100092842602796" target="_blank" rel="noopener noreferrer" aria-label="Messenger">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.15 2 11.25c0 2.9 1.45 5.49 3.72 7.19V22l3.4-1.87c.91.25 1.87.38 2.88.38 5.52 0 10-4.15 10-9.26C22 6.15 17.52 2 12 2Zm.98 12.47-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.92-2.72-5.48 5.82Z" /></svg>
          </a>
          <a className="pf__ico" href="https://wa.me/8801723689819" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.33-1.93 1.4-.5.07-1.09.1-1.75-.11-.4-.13-.92-.3-1.58-.6-2.78-1.2-4.6-4-4.74-4.18-.14-.19-1.13-1.5-1.13-2.86s.72-2.03.97-2.31c.25-.28.55-.35.73-.35h.53c.17 0 .4-.06.62.48.24.58.82 2 .89 2.15.07.15.11.32.02.51-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.28.36-.23.6-.14.24.09 1.53.72 1.79.85.26.14.44.2.5.31.07.12.07.68-.17 1.36Z" /></svg>
          </a>
        </div>
      </div>

      <div className="pf__col">
        <h4 className="pf__h">Explore</h4>
        <ul className="pf__list">
          <li><a href="#catalogue">Browse catalogue</a></li>
          <li><a href="/?sort=newest#catalogue">New arrivals</a></li>
          <li><a href="/?saved=1#catalogue">Saved pieces</a></li>
          <li><a href="#visit">Visit the showroom</a></li>
        </ul>
      </div>

      <div className="pf__col">
        <h4 className="pf__h">Showroom</h4>
        <div className="pf__row">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          <address className="pf__addr">
            Sonarpotti, Joypurhat Sadar<br />
            Rajshahi, Bangladesh<br />
            <a href="https://www.google.com/maps/search/?api=1&query=Sonarpotti+Joypurhat+Sadar" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pf-gold)' }}>
              Get directions →
            </a>
          </address>
        </div>
      </div>

      <div className="pf__col">
        <h4 className="pf__h">Get in touch</h4>
        <div className="pf__row">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>
          <a href="tel:01788663766">01788 663766</a>
        </div>
        <div className="pf__row">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.3A8.5 8.5 0 1 1 21 11.5Z" /></svg>
          <a href="https://wa.me/8801723689819" target="_blank" rel="noopener noreferrer">WhatsApp us anytime</a>
        </div>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="pf__bar">
      <span>© {new Date().getFullYear()} <b>Probal Antique House</b>. All rights reserved.</span>
      <button type="button" className="pf__top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        Back to top ↑
      </button>
    </div>
  </div>
</footer>

      <BackToTop />
      <WhatsAppFloat number="8801723689819" />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Aurora />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><Spinner /></div>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<Storefront />} />
      </Routes>
      <Toasts />
    </StoreProvider>
  );
}