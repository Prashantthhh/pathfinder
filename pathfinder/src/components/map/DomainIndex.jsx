/**
 * Every domain as a plain grouped list: the accessible, touch-friendly twin of the
 * map. Selecting an item does exactly what clicking its dot does.
 */
export default function DomainIndex({ domains, groups, selectedId, onSelect, onHover }) {
  return (
    <div className="dindex">
      {groups.map((g) => {
        const list = domains.filter((d) => d.group === g.id);
        return (
          <section key={g.id} className="dindex__group" aria-labelledby={`dg-${g.id}`}>
            <h3 id={`dg-${g.id}`} className="dindex__h">{g.label}</h3>
            <ul>
              {list.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className={d.id === selectedId ? 'dindex__btn is-selected' : 'dindex__btn'}
                    style={{ '--t': `var(--${d.primary.toLowerCase()})` }}
                    aria-pressed={d.id === selectedId}
                    onClick={() => onSelect(d.id)}
                    onMouseEnter={() => onHover?.(d.id)}
                    onMouseLeave={() => onHover?.(null)}
                  >
                    <span className="dindex__dot" aria-hidden="true" />
                    {d.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
