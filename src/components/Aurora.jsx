/** Soft animated backdrop. Purely decorative, sits behind everything. */
export default function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora__blob aurora__blob--1" />
      <div className="aurora__blob aurora__blob--2" />
      <div className="aurora__grain" />
    </div>
  );
}
