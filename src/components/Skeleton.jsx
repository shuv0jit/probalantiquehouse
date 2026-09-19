export function CardSkeleton() {
  return (
    <div className="skel" aria-hidden="true">
      <div className="skel__box" />
      <div className="skel__lines">
        <div className="skel__line skel__line--sm" />
        <div className="skel__line skel__line--md" />
        <div className="skel__line skel__line--sm" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="loadmore">
      <div className="spinner" role="status" aria-label={label || 'Loading'} />
    </div>
  );
}
