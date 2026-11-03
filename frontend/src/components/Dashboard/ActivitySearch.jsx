import { useState } from "react";

export default function ActivitySearch({ pages, onNavigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = query.trim()
    ? pages.filter((p) => (p.label + " " + p.keywords).toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  function go(id) {
    onNavigate(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="activity-search">
      <span aria-hidden="true">⌕</span>
      <input
        type="text"
        placeholder="Search your activity..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && query.trim() && (
        <div className="search-results">
          {matches.length === 0 ? (
            <p>No pages match "{query}".</p>
          ) : (
            matches.map((p) => (
              <button key={p.id} type="button" onMouseDown={() => go(p.id)}>
                <b>{p.label}</b>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
