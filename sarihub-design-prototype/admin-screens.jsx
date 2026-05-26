// Admin role screens — desktop (1440-wide canvas, but renders inside a fluid window).
// State-driven: price entry table is fully editable, dispatch kanban is drag-or-tap to advance.

const { useState: aUseState, useMemo: aUseMemo } = React;

// ---------- Admin Shell ----------
const AdminShell = ({ adminTab, setAdminTab, children }) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    height: '100%', width: '100%',
    background: 'var(--bg)',
  }}>
    {/* Top bar */}
    <div className="hair-b" style={{ height: 56, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, background: '#fff', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--action)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 15px Inter' }}>S</div>
        <span style={{ font: '500 14px Inter' }}>SariHub Admin</span>
      </div>
      <div style={{ width: 1, height: 22, background: 'var(--hair)' }}/>
      <nav style={{ display: 'flex', gap: 4 }}>
        {[
          { id: 'dispatch', label: "Today's dispatch" },
          { id: 'prices', label: "Today's prices" },
        ].map(t => (
          <button key={t.id}
            onClick={() => setAdminTab(t.id)}
            style={{
              height: 34, padding: '0 14px', borderRadius: 8,
              background: adminTab === t.id ? 'var(--ink)' : 'transparent',
              color: adminTab === t.id ? '#fff' : 'var(--ink-2)',
              border: 0, font: '500 13px Inter', cursor: 'pointer',
            }}>{t.label}</button>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, font: '400 12px Inter', color: 'var(--ink-2)' }}>
        <Pill tone="success" dot>248 stores online</Pill>
        <span className="tnum">Wed · May 22 · 5:48 AM</span>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--success-soft)', color: 'var(--success)', font: '500 12px Inter', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>JA</div>
      </div>
    </div>

    <div style={{ flex: 1, overflow: 'auto' }}>
      {children}
    </div>
  </div>
);

// ---------- Dispatch Board ----------
const AdminDispatch = () => {
  // orders stored by column. Each order = { id, store, route, stop, items, kg, total, pay, driver? }
  const [board, setBoard] = aUseState({
    submitted: PACKING_QUEUE,
    packed: [
      { id: 1281, store: 'Aling Beth Sari', route: 'Tagbac', stop: 10, items: 6, kg: 6.8, total: 720, pay: 'suki' },
      { id: 1280, store: 'RJ Junior Store', route: 'Iyam', stop: 4, items: 4, kg: 4.1, total: 380, pay: 'cash' },
      { id: 1279, store: "Nene's Place", route: 'Iyam', stop: 7, items: 8, kg: 7.8, total: 940, pay: 'suki' },
      { id: 1278, store: 'Mang Boyet Tindahan', route: 'Tagbac', stop: 2, items: 4, kg: 4.0, total: 320, pay: 'cash' },
    ],
    out: [
      { id: 1277, store: 'Aling Bebang', route: 'Tagbac', stop: 1, items: 6, kg: 5.8, total: 480, pay: 'suki', driver: 'Renz' },
      { id: 1276, store: 'Mang Boyet Tindahan', route: 'Tagbac', stop: 2, items: 4, kg: 3.6, total: 320, pay: 'cash', driver: 'Renz' },
      { id: 1275, store: 'Lola Pining', route: 'Tagbac', stop: 3, items: 9, kg: 8.4, total: 1180, pay: 'gcash', driver: 'Renz' },
    ],
  });

  const [routeFilter, setRouteFilter] = aUseState('all');
  const [selected, setSelected] = aUseState(null);

  const cols = [
    { id: 'submitted', title: 'Submitted', tone: 'neutral', cta: 'Mark packed', next: 'packed' },
    { id: 'packed', title: 'Packed', tone: 'warning', cta: 'Out for delivery', next: 'out' },
    { id: 'out', title: 'Out for delivery', tone: 'action', cta: null, next: null },
  ];

  const move = (orderId, fromCol, toCol) => {
    setBoard(prev => {
      const order = prev[fromCol].find(o => o.id === orderId);
      if (!order) return prev;
      const enriched = toCol === 'out' && !order.driver ? { ...order, driver: 'Renz' } : order;
      return {
        ...prev,
        [fromCol]: prev[fromCol].filter(o => o.id !== orderId),
        [toCol]: [enriched, ...prev[toCol]],
      };
    });
  };

  const filtered = (cards) => routeFilter === 'all' ? cards : cards.filter(c => c.route === routeFilter);
  const allTotal = Object.values(board).flat().reduce((s, c) => s + c.total, 0);
  const allCount = Object.values(board).flat().length;

  return (
    <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, font: '500 24px/1.1 Inter', letterSpacing: '-0.015em' }}>Today's dispatch</h1>
          <div style={{ font: '400 13px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
            <span className="tnum">{allCount}</span> orders · <span className="tnum">{peso2(allTotal)}</span> GMV · 3 active routes
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Route filter */}
          <div style={{ display: 'flex', gap: 2, background: '#fff', border: '1px solid var(--hair)', borderRadius: 10, padding: 3 }}>
            {['all', ...ROUTES].map(r => (
              <button key={r}
                onClick={() => setRouteFilter(r)}
                style={{
                  height: 30, padding: '0 12px', borderRadius: 7,
                  background: routeFilter === r ? 'var(--ink)' : 'transparent',
                  color: routeFilter === r ? '#fff' : 'var(--ink-2)',
                  border: 0, font: '500 12px Inter', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >{r === 'all' ? 'All routes' : r}</button>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ height: 38, cursor: 'pointer' }}>
            <Icon name="package" size={16}/> Print packing slips
          </button>
          <button className="btn btn-primary" style={{ height: 38, cursor: 'pointer' }}>
            Dispatch Tagbac route
          </button>
        </div>
      </div>

      {/* Truck-load summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ROUTE_SUMMARY.map(r => (
          <div key={r.name} className="card" style={{ padding: '14px 16px', borderColor: r.tone === 'danger' ? '#EBC7C3' : 'var(--hair)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ font: '500 15px Inter' }}>{r.name} route</div>
                <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{r.truck} · {r.driver} · {r.stops} stops</div>
              </div>
              <Pill tone={r.tone === 'danger' ? 'warning' : r.tone === 'warning' ? 'warning' : 'success'} dot>
                {r.tone === 'danger' ? 'Over capacity' : r.tone === 'warning' ? 'Tight' : 'OK'}
              </Pill>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12 }}>
              <span className="tnum sh-display" style={{ font: '500 22px Inter', color: r.tone === 'danger' ? 'var(--danger)' : 'var(--ink)' }}>{r.kg} kg</span>
              <span className="tnum" style={{ font: '400 12px Inter', color: 'var(--ink-2)' }}>/ {r.cap} kg</span>
            </div>
            <div style={{ height: 4, background: '#F1ECE2', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (r.kg / r.cap) * 100)}%`, background: r.tone === 'danger' ? 'var(--danger)' : r.tone === 'warning' ? 'var(--warning)' : 'var(--success)' }}/>
            </div>
            <div style={{ font: '400 11px Inter', color: r.tone === 'danger' ? 'var(--danger)' : 'var(--ink-2)', marginTop: 8 }}>
              {r.status}
            </div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, flex: 1, minHeight: 480 }}>
        {cols.map(col => {
          const cards = filtered(board[col.id]);
          return (
            <div key={col.id} style={{
              background: '#F4F0E8', borderRadius: 14, padding: 12,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: col.tone === 'action' ? 'var(--action)' : col.tone === 'warning' ? 'var(--warning)' : 'var(--ink-3)' }}/>
                  <span style={{ font: '500 14px Inter' }}>{col.title}</span>
                  <span className="tnum" style={{ font: '400 12px Inter', color: 'var(--ink-2)' }}>{cards.length}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {cards.map(c => (
                  <DispatchCardLive key={c.id} c={c}
                    onClick={() => setSelected(c)}
                    onAdvance={col.next ? () => move(c.id, col.id, col.next) : null}
                    ctaLabel={col.cta}/>
                ))}
                {cards.length === 0 && (
                  <div style={{ padding: '20px 12px', textAlign: 'center', font: '400 12px Inter', color: 'var(--ink-3)' }}>
                    Walang order sa column na ito.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
};

const DispatchCardLive = ({ c, onClick, onAdvance, ctaLabel }) => {
  const payTone = c.pay === 'suki' ? 'warning' : c.pay === 'gcash' ? 'action' : 'neutral';
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 10, padding: '12px 12px',
      border: '1px solid var(--hair)',
      cursor: 'pointer',
      transition: 'border-color .12s, box-shadow .12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--hair-strong)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hair)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="tnum" style={{ font: '500 12px Inter', color: 'var(--ink-3)' }}>#{c.id}</div>
          <div style={{ font: '500 14px Inter', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.store}
          </div>
        </div>
        <Pill tone={payTone}>{c.pay === 'suki' ? 'Suki' : c.pay === 'gcash' ? 'GCash' : 'Cash'}</Pill>
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: '400 12px Inter', color: 'var(--ink-2)' }}>
          {c.route} · stop {c.stop} · {c.items} items · {c.kg} kg
        </span>
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="tnum sh-display" style={{ font: '500 15px Inter' }}>{peso2(c.total)}</span>
        {c.driver && <span style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>Driver: {c.driver}</span>}
      </div>
      {onAdvance && (
        <button onClick={(e) => { e.stopPropagation(); onAdvance(); }}
          style={{
            marginTop: 10, width: '100%', height: 32, borderRadius: 7,
            background: '#F1ECE2', border: 0, font: '500 12px Inter', color: 'var(--ink)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {ctaLabel} <Icon name="chevron-right" size={12}/>
        </button>
      )}
    </div>
  );
};

const OrderDetailModal = ({ order, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,18,16,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: 480, background: '#fff', borderRadius: 14,
      animation: 'pop .2s cubic-bezier(0.2,0.7,0.3,1)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
    }}>
      <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--hair)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="tnum" style={{ font: '500 12px Inter', color: 'var(--ink-3)' }}>ORDER #{order.id}</div>
          <div style={{ font: '500 18px Inter', marginTop: 4 }}>{order.store}</div>
          <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
            {order.route} route · stop {order.stop} · {order.items} items · {order.kg} kg
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: '#F1ECE2', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={16}/>
        </button>
      </div>
      <div style={{ padding: '16px 22px' }}>
        <div style={{ font: '500 12px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Line items</div>
        {(STOP_ITEMS[order.stop] || [
          { tag: 'Sample line', en: '1 kg', kg: 1, price: order.total },
        ]).map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--hair)', font: '400 13px Inter' }}>
            <span>{it.tag} <span style={{ color: 'var(--ink-2)' }}>· {it.en}</span></span>
            <span className="tnum">{peso2(it.price)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', font: '500 14px Inter' }}>
          <span>Total</span><span className="tnum sh-display">{peso2(order.total)}</span>
        </div>
      </div>
    </div>
  </div>
);

// ---------- Price Entry ----------
const AdminPrices = () => {
  const [products, setProducts] = aUseState(OPS_PRODUCTS);
  const [editing, setEditing] = aUseState(null);
  const [search, setSearch] = aUseState('');

  const filtered = products.filter(p =>
    !search || p.tag.toLowerCase().includes(search.toLowerCase()) || p.en.toLowerCase().includes(search.toLowerCase())
  );

  const changeToday = (id, val) => {
    const num = parseInt(val.replace(/\D/g, ''), 10) || 0;
    setProducts(products.map(p => p.id === id ? { ...p, today: num } : p));
  };
  const setStock = (id, stock) => {
    setProducts(products.map(p => p.id === id ? { ...p, stock } : p));
  };
  const carryOver = () => {
    setProducts(products.map(p => ({ ...p, today: p.last })));
  };
  const markAllIn = () => {
    setProducts(products.map(p => ({ ...p, stock: 'in' })));
  };

  const stats = aUseMemo(() => {
    let up = 0, down = 0, flat = 0, out = 0;
    products.forEach(p => {
      if (p.stock === 'out') { out++; return; }
      if (p.today > p.last) up++;
      else if (p.today < p.last) down++;
      else flat++;
    });
    return { up, down, flat, out };
  }, [products]);

  const changed = products.filter(p => p.today !== p.last).length;

  return (
    <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, font: '500 24px/1.1 Inter', letterSpacing: '-0.015em' }}>Today's prices</h1>
          <div style={{ font: '400 13px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
            Buyer: Mang Tomas · Last save 5:42 AM · <span style={{ color: 'var(--success)', fontWeight: 500 }}>Auto-saved</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={carryOver} className="btn btn-secondary" style={{ height: 38, cursor: 'pointer' }}>
            <Icon name="reload" size={16}/> Carry over from yesterday
          </button>
          <button onClick={markAllIn} className="btn btn-secondary" style={{ height: 38, cursor: 'pointer' }}>
            <Icon name="package" size={16}/> Mark all in-stock
          </button>
          <button className="btn btn-primary" style={{ height: 38, cursor: 'pointer' }}>
            Publish · {changed} changed
          </button>
        </div>
      </div>

      {/* Search + stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 38, background: '#fff', border: '1px solid var(--hair)', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
          <Icon name="search" size={16} color="var(--ink-3)"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hanapin ang produkto…"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent', font: '400 13px Inter', color: 'var(--ink)' }}/>
        </div>
        {[
          ['up', stats.up, 'var(--warning)'],
          ['down', stats.down, 'var(--success)'],
          ['flat', stats.flat, 'var(--ink-3)'],
          ['out', stats.out, 'var(--danger)'],
        ].map(([k, n, c]) => (
          <div key={k} style={{ height: 38, padding: '0 12px', borderRadius: 10, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 6, font: '400 12px Inter', color: 'var(--ink-2)' }}>
            <span className="tnum" style={{ font: '500 14px Inter', color: c }}>{n}</span>
            <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2.3fr 0.7fr 1.0fr 1.4fr 1.5fr 2.0fr',
            padding: '10px 16px', background: '#FBF8F2',
            font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase',
            borderBottom: '1px solid var(--hair)',
          }}>
            <span>Produkto</span>
            <span>Yunit</span>
            <span style={{ textAlign: 'right' }}>Kahapon</span>
            <span style={{ textAlign: 'right' }}>Today</span>
            <span style={{ textAlign: 'center' }}>Stock</span>
            <span>Notes</span>
          </div>
          {filtered.map(p => (
            <PriceRow key={p.id} p={p}
              editing={editing === p.id}
              onEdit={() => setEditing(p.id)}
              onBlur={() => setEditing(null)}
              onChange={(v) => changeToday(p.id, v)}
              onStock={(s) => setStock(p.id, s)}/>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', font: '400 13px Inter' }}>
              Walang nahanap.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PriceRow = ({ p, editing, onEdit, onBlur, onChange, onStock }) => {
  const delta = p.today - p.last;
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const dirColor = dir === 'up' ? 'var(--warning)' : dir === 'down' ? 'var(--success)' : 'var(--ink-3)';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2.3fr 0.7fr 1.0fr 1.4fr 1.5fr 2.0fr',
      padding: '12px 16px', alignItems: 'center',
      borderBottom: '1px solid var(--hair)',
      background: editing ? '#FFFBF4' : 'transparent',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <PhotoPH size={32} style={{ borderRadius: 6 }}/>
        <div>
          <div style={{ font: '500 14px Inter' }}>{p.tag}</div>
          <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>{p.en}</div>
        </div>
      </div>
      <span style={{ font: '400 13px Inter', color: 'var(--ink-2)' }}>{p.unit}</span>
      <span className="tnum" style={{ font: '400 13px Inter', color: 'var(--ink-2)', textAlign: 'right' }}>₱{p.last}</span>

      {/* Editable today price */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end',
          height: 34, padding: '0 10px',
          borderRadius: 8,
          background: editing ? '#fff' : 'transparent',
          border: editing ? '1.5px solid var(--action)' : '1px solid transparent',
          boxShadow: editing ? '0 0 0 3px rgba(216,90,48,0.12)' : 'none',
          minWidth: 110,
        }}>
          {dir !== 'flat' && (
            <Icon name={dir === 'up' ? 'arrow-up' : 'arrow-down'} size={12} color={dirColor}/>
          )}
          <span style={{ font: '500 16px Inter', color: 'var(--ink)' }}>₱</span>
          {editing ? (
            <input
              autoFocus
              value={p.today}
              onChange={e => onChange(e.target.value)}
              onBlur={onBlur}
              onKeyDown={e => { if (e.key === 'Enter') onBlur(); }}
              className="tnum"
              style={{
                width: 60, border: 0, outline: 0, background: 'transparent',
                font: '500 16px Inter', textAlign: 'right',
                color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
              }}/>
          ) : (
            <span
              onClick={onEdit}
              className="tnum"
              style={{ font: '500 16px Inter', cursor: 'pointer', minWidth: 36, textAlign: 'right' }}
            >{p.today}</span>
          )}
          {dir !== 'flat' && (
            <span className="tnum" style={{ font: '400 11px Inter', color: dirColor }}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>

      {/* Stock toggle */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', background: '#F1ECE2', borderRadius: 8, padding: 3 }}>
        {[['in', 'In stock'], ['low', 'Low'], ['out', 'Out']].map(([k, l]) => (
          <button key={k} onClick={() => onStock(k)} style={{
            flex: 1, height: 26, borderRadius: 6,
            background: p.stock === k ? '#fff' : 'transparent',
            border: 0, cursor: 'pointer',
            color: p.stock === k ? (k === 'out' ? 'var(--danger)' : k === 'low' ? 'var(--warning)' : 'var(--ink)') : 'var(--ink-2)',
            font: `${p.stock === k ? 500 : 400} 11px Inter`,
            boxShadow: p.stock === k ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <span style={{ font: '400 12px Inter', color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p.notes || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>Add note</span>}
      </span>
    </div>
  );
};

Object.assign(window, {
  AdminShell, AdminDispatch, AdminPrices,
});
