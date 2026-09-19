import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useStore } from '../lib/store.jsx';

const ICON = { error: AlertCircle, success: CheckCircle2, info: Info };

export default function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.kind] || Info;
        return (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            <Icon size={16} style={{ marginTop: 1, flex: 'none' }} />
            <span>{t.message}</span>
            <button className="toast__x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
