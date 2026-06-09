import { useState, useEffect, useRef } from 'react';
import { Search, ClipboardList, Bug, X, Loader } from 'lucide-react';
import { searchApi } from '../api';
import { useNavigate } from 'react-router-dom';

const TYPE_META = {
  TEST_CASE: { icon: ClipboardList, color: '#58a6ff', label: 'Test Case', route: '/my-cases' },
  DEFECT:    { icon: Bug,           color: '#f85149', label: 'Defect',    route: '/defects'  },
};

const STATUS_COLOR = {
  PASSED:'#3fb950', FAILED:'#f85149', DEFECT_RAISED:'#f85149',
  ASSIGNED:'#58a6ff', IN_PROGRESS:'#00d4ff', SME_APPROVED:'#bc8cff',
  DRAFT:'#8b949e', UAT_PENDING:'#d29922', UAT_PASSED:'#3fb950',
  REDEVELOPMENT:'#f85149',
};

export default function GlobalSearchBar() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.search(query.trim());
        setResults(res.data.data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 320);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSelect = (item) => {
    const meta = TYPE_META[item.type];
    setQuery('');
    setOpen(false);
    navigate(meta?.route || '/');
  };

  const grouped = results.reduce((acc, item) => {
    acc[item.type] = acc[item.type] || [];
    acc[item.type].push(item);
    return acc;
  }, {});

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
      <div style={{ position: 'relative' }}>
        {loading
          ? <Loader size={14} style={{ position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--accent)',
              animation: 'spin 1s linear infinite' }} />
          : <Search size={14} style={{ position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        }
        <input
          id="global-search"
          name="global-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search test cases, defects… (min 2 chars)"
          style={{
            width: '100%', paddingLeft: 32, paddingRight: query ? 32 : 12,
            background: 'var(--bg-raised)', border: '1px solid var(--border2)',
            borderRadius: 8, height: 34, fontSize: 13, color: 'var(--text1)',
            outline: 'none', fontFamily: 'var(--font-body)',
            transition: 'border-color 0.12s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border2)'}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
              display: 'flex', alignItems: 'center' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border2)',
          borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          zIndex: 300, maxHeight: 400, overflowY: 'auto',
        }}>
          {Object.entries(grouped).map(([type, items]) => {
            const meta = TYPE_META[type];
            const Icon = meta?.icon;
            return (
              <div key={type}>
                <div style={{
                  padding: '8px 14px 4px',
                  fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '1px',
                  color: meta?.color || 'var(--text3)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {Icon && <Icon size={11} />} {meta?.label}s ({items.length})
                </div>
                {items.map(item => (
                  <div key={item.id} onClick={() => handleSelect(item)}
                    style={{
                      padding: '9px 14px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: 10,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      color: meta?.color, flexShrink: 0, minWidth: 64,
                    }}>{item.code}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text1)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </span>
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: STATUS_COLOR[item.status] || 'var(--text3)',
                      background: (STATUS_COLOR[item.status] || '#8b949e') + '22',
                      padding: '1px 7px', borderRadius: 8, flexShrink: 0,
                    }}>
                      {(item.status || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
          {results.length === 0 && !loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
