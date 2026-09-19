import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Gem } from 'lucide-react';

/**
 * Recursive, keyboard-accessible collection tree with animated expand.
 * Height is measured and animated so nesting never "jumps" — and it collapses
 * back to 0 smoothly, which a plain `display:none` cannot do.
 */
function Branch({ node, depth, activeId, activePath, onPick, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(defaultOpen ? 'auto' : 0);

  // Auto-open the branch that contains the current selection.
  useEffect(() => {
    if (activePath.includes(node.id)) setOpen(true);
  }, [activePath, node.id]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      setHeight(el.scrollHeight);
      const id = setTimeout(() => setHeight('auto'), 300);
      return () => clearTimeout(id);
    }
    setHeight(el.scrollHeight);
    requestAnimationFrame(() => setHeight(0));
  }, [open, node.children.length]);

  const hasKids = node.children.length > 0;
  const isActive = activeId === node.id;

  return (
    <li>
      <div className={`tree__row${isActive ? ' is-on' : ''}`}>
        {hasKids ? (
          <button
            className={`tree__toggle${open ? ' is-open' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}
          >
            <ChevronRight size={14} />
          </button>
        ) : (
          <span className="tree__spacer" />
        )}
        <button
          className="tree__link"
          onClick={() => onPick(node.id)}
          aria-current={isActive ? 'true' : undefined}
        >
          <span className="tree__label">{node.name}</span>
          <span className="tree__count">{node.count}</span>
        </button>
      </div>

      {hasKids && (
        <div
          ref={bodyRef}
          style={{
            height: height === 'auto' ? 'auto' : `${height}px`,
            overflow: 'hidden',
            transition: 'height 280ms cubic-bezier(0.22,1,0.36,1)',
          }}
          aria-hidden={!open}
        >
          <ul className="tree tree--nested">
            {node.children.map((child) => (
              <Branch
                key={child.id}
                node={child}
                depth={depth + 1}
                activeId={activeId}
                activePath={activePath}
                onPick={onPick}
                defaultOpen={false}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export default function CollectionTree({ roots, activeId, activePath, onPick, totalProducts }) {
  return (
    <>
      <div className={`tree__row${!activeId ? ' is-on' : ''}`}>
        <span className="tree__spacer" />
        <button className="tree__link" onClick={() => onPick(null)} aria-current={!activeId ? 'true' : undefined}>
          <Gem size={13} style={{ flex: 'none', opacity: 0.65 }} />
          <span className="tree__label">All pieces</span>
          <span className="tree__count">{totalProducts}</span>
        </button>
      </div>
      <ul className="tree">
        {roots.map((node) => (
          <Branch
            key={node.id}
            node={node}
            depth={0}
            activeId={activeId}
            activePath={activePath}
            onPick={onPick}
            defaultOpen={roots.length <= 3}
          />
        ))}
      </ul>
    </>
  );
}
