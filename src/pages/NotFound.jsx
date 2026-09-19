import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="shell" style={{ padding: '80px 20px' }}>
      <div className="empty">
        <div className="empty__icon"><Compass size={24} /></div>
        <h3 className="display">That page does not exist</h3>
        <p>The link may be old, or the piece may have moved to another collection.</p>
        <Link className="btn btn--primary" style={{ marginTop: 22 }} to="/">Back to the showroom</Link>
      </div>
    </div>
  );
}
