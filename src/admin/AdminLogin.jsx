import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { api } from '../lib/api.js';
import { Field, FormError } from './ui.jsx';

export default function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.post('/admin/login', { email, password });
      onSignedIn(data.admin);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__mark" aria-hidden="true">P</div>
        <h1 className="display">Staff sign in</h1>
        <p className="login__sub">Probal Antique House — catalogue management</p>

        <FormError message={error} />

        <Field label="Email address" id="email">
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </Field>

        <Field label="Password" id="password">
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              className="input"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <button className="btn btn--primary btn--block" type="submit" disabled={busy} style={{ marginTop: 6 }}>
          {busy ? 'Signing in…' : <><LogIn size={16} /> Sign in</>}
        </button>

        <p className="hint" style={{ textAlign: 'center', marginTop: 12 }}>
          This device stays signed in for one year.
        </p>
        <Link className="login__back" to="/">← Back to the showroom</Link>
      </form>
    </div>
  );
}
