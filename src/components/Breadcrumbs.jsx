import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ trail, onPick }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <button className={`crumbs__item${trail.length === 0 ? ' is-last' : ''}`} onClick={() => onPick(null)}>
        All
      </button>
      {trail.map((node, i) => (
        <span key={node.id} style={{ display: 'contents' }}>
          <ChevronRight size={12} className="crumbs__sep" aria-hidden="true" />
          <button
            className={`crumbs__item${i === trail.length - 1 ? ' is-last' : ''}`}
            style={{ animationDelay: `${i * 40}ms` }}
            onClick={() => onPick(node.id)}
            aria-current={i === trail.length - 1 ? 'page' : undefined}
          >
            {node.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
