import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Lock, Menu, Search } from 'lucide-react';
import { useStore } from '../lib/store.jsx';

export default function Navbar({ onOpenSearch, onOpenMenu, favouriteCount }) {
  const [scrolled, setScrolled] = useState(false);
  const { justSynced } = useStore();
  const { pathname, search } = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // ⌘K / Ctrl+K opens search from anywhere.
  useEffect(() => {
    const fn = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onOpenSearch]);

  const isSaved = search.includes('saved=1');

  return (
    <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <div className="nav__in">
        <button className="nav__icon nav__burger" onClick={onOpenMenu} aria-label="Open collections menu">
          <Menu size={19} />
        </button>

        <Link to="/" className="nav__brand" aria-label="Probal Antique House, home">
          <span className="nav__mark" aria-hidden="true">P</span>
          <span className="nav__name display">
            Probal Antique House
            
          </span>
        </Link>

        <nav className="nav__links" aria-label="Primary">
          <Link className={`nav__link${pathname === '/' && !isSaved ? ' is-on' : ''}`} to="/">Collections</Link>
          <Link className={`nav__link${isSaved ? ' is-on' : ''}`} to="/?saved=1">Saved</Link>
          <a className="nav__link" href="#visit">Visit us</a>
        </nav>

        <div className="nav__right">
          <span
            className={`nav__sync${justSynced ? ' is-live' : ''}`}
            title={justSynced ? 'Just updated' : 'Live catalogue'}
            aria-hidden="true"
          />

          <button className="nav__search" onClick={onOpenSearch} aria-label="Search the catalogue">
            <Search size={16} />
            <span>Search pieces…</span>
            <kbd>⌘K</kbd>
          </button>

          <Link
            to="/?saved=1"
            className="nav__icon"
            style={{ display: 'grid', color: favouriteCount ? 'var(--rose)' : undefined }}
            aria-label={`Saved pieces (${favouriteCount})`}
          >
            <Heart size={17} fill={favouriteCount ? 'currentColor' : 'none'} />
          </Link>

          <Link to="/admin" className="nav__admin" aria-label="Staff sign in">
            <Lock size={11} />
            <span>Staff</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
