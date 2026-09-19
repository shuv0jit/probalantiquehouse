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

      <footer className="foot" id="visit">
        <div className="foot__in">
          <div className="foot__col foot__col--brand">
            <div className="foot__brand display">Probal Antique House</div>
            <p className="foot__note">
              Send us the picture of the product you liked and we will let you know the availability and help you ordering it.
            </p>
            <div className="foot__social">
              <a
                href="https://www.facebook.com/profile.php?id=100092842602796"
                target="_blank"
                rel="noopener noreferrer"
                className="foot__icon"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
                </svg>
              </a>
              <a
                href="https://m.me/100092842602796"
                target="_blank"
                rel="noopener noreferrer"
                className="foot__icon"
                aria-label="Messenger"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.15 2 11.25c0 2.9 1.45 5.49 3.72 7.19V22l3.4-1.87c.91.25 1.87.38 2.88.38 5.52 0 10-4.15 10-9.26C22 6.15 17.52 2 12 2Zm.98 12.47-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.92-2.72-5.48 5.82Z" />
                </svg>
              </a>
              <a
                href="https://wa.me/8801788663766"
                target="_blank"
                rel="noopener noreferrer"
                className="foot__icon"
                aria-label="WhatsApp"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.33-1.93 1.4-.5.07-1.09.1-1.75-.11-.4-.13-.92-.3-1.58-.6-2.78-1.2-4.6-4-4.74-4.18-.14-.19-1.13-1.5-1.13-2.86s.72-2.03.97-2.31c.25-.28.55-.35.73-.35h.53c.17 0 .4-.06.62.48.24.58.82 2 .89 2.15.07.15.11.32.02.51-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.28.36-.23.6-.14.24.09 1.53.72 1.79.85.26.14.44.2.5.31.07.12.07.68-.17 1.36Z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="foot__col">
            <div className="foot__heading">Visit the Showroom</div>
            <address className="foot__address">
              Sonarpotti, Joypurhat Sadar<br />
              Rajshahi, Bangladesh
            </address>
          </div>

          <div className="foot__col">
            <div className="foot__heading">Get in Touch</div>
            <a href="tel:01788663766" className="foot__link">📞 01788663766</a>
            <a
              href="https://wa.me/8801788663766"
              target="_blank"
              rel="noopener noreferrer"
              className="foot__whatsapp-btn"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.33-1.93 1.4-.5.07-1.09.1-1.75-.11-.4-.13-.92-.3-1.58-.6-2.78-1.2-4.6-4-4.74-4.18-.14-.19-1.13-1.5-1.13-2.86s.72-2.03.97-2.31c.25-.28.55-.35.73-.35h.53c.17 0 .4-.06.62.48.24.58.82 2 .89 2.15.07.15.11.32.02.51-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.28.36-.23.6-.14.24.09 1.53.72 1.79.85.26.14.44.2.5.31.07.12.07.68-.17 1.36Z" />
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <div className="foot__bottom">
          <span>© {new Date().getFullYear()} Probal Antique House</span>
          <span className="foot__made">Fine Jewellery &amp; Antiques</span>
        </div>
      </footer>

      <BackToTop />
      <WhatsAppFloat number="8801819310816" />
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