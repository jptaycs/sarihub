// Driver route view (mobile) + admin screens (tablet / desktop)

// ============================================================
// 7 — Driver route view (mobile)
// ============================================================
const DriverScreen = ({ podMode = false }) => {
  const stops = [
    { n: 1, store: 'Aling Bebang', addr: 'Brgy. Talao-talao', items: 6, total: 480, paid: 'suki', done: true },
    { n: 2, store: 'Mang Boyet Tindahan', addr: 'Brgy. Talao-talao', items: 4, total: 320, paid: 'cash', done: true },
    { n: 3, store: 'Tindahan ni Lola Pining', addr: 'Tagbac Sur', items: 9, total: 1180, paid: 'gcash', done: true },
    { n: 4, store: 'JM Variety Store', addr: 'Tagbac Sur', items: 5, total: 540, paid: 'suki', done: true },
    { n: 5, store: 'Aling Marisa\'s Store', addr: 'Tagbac Norte', items: 5, total: 640, paid: 'suki', current: true },
    { n: 6, store: 'Sari-sari ni Ate Liza', addr: 'Tagbac Norte', items: 7, total: 820, paid: 'cash' },
    { n: 7, store: 'Pinoy Mart Mini', addr: 'Brgy. Iyam', items: 12, total: 1640, paid: 'suki' },
  ];

  return (
    <div className="sh">
      <StatusBar/>

      {/* Map area */}
      <div style={{
        height: 280, position: 'relative',
        background: '#E9EEEA', overflow: 'hidden',
      }}>
        {/* "Map" — abstract Mapbox-style: roads + blocks */}
        <svg width="390" height="280" viewBox="0 0 390 280" style={{ position: 'absolute', inset: 0 }}>
          <rect width="390" height="280" fill="#EEF1EB"/>
          {/* blocks */}
          {[
            [10,20,80,55], [110,15,90,60], [220,20,70,50], [310,18,70,60],
            [10,95,110,50], [140,100,80,45], [240,95,70,55], [330,100,70,55],
            [10,170,70,60], [100,175,90,50], [220,170,90,60], [330,175,70,60],
          ].map(([x,y,w,h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="#DDE4DA" rx="2"/>
          ))}
          {/* roads */}
          <path d="M0 80 L390 80 M0 160 L390 160 M0 240 L390 240" stroke="#F5F0E5" strokeWidth="14"/>
          <path d="M95 0 L95 280 M210 0 L210 280 M305 0 L305 280" stroke="#F5F0E5" strokeWidth="14"/>
          {/* route line */}
          <path d="M30 250 Q 110 240 130 200 T 220 150 T 280 80 T 360 50" fill="none" stroke="#D85A30" strokeWidth="3" strokeDasharray="0" strokeLinecap="round"/>
          {/* completed stops */}
          {[[30,250],[110,225],[155,180],[195,150]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r="6" fill="#1D9E75" stroke="#fff" strokeWidth="2"/>
          ))}
          {/* current */}
          <circle cx="220" cy="150" r="14" fill="rgba(216,90,48,0.18)"/>
          <circle cx="220" cy="150" r="9" fill="#D85A30" stroke="#fff" strokeWidth="2.5"/>
          {/* upcoming */}
          {[[280,80],[360,50]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r="6" fill="#fff" stroke="#5F5E5A" strokeWidth="2"/>
          ))}
        </svg>

        {/* Top floating chip */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Pill tone="dark" dot style={{ backdropFilter: 'blur(8px)' }}>
            Stop 5 of 18 · 3.2 km
          </Pill>
          <button style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mapPin" size={18}/>
          </button>
        </div>
      </div>

      {/* Current stop card */}
      <div style={{ padding: '14px 16px 8px' }}>
        <div className="card" style={{
          padding: '14px 14px 12px',
          borderColor: 'var(--action)',
          background: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="tnum" style={{ font: '500 12px Inter', color: 'var(--action)' }}>STOP 5</span>
                <Pill tone="action">Current</Pill>
              </div>
              <div style={{ font: '500 18px/1.15 Inter', letterSpacing: '-0.01em' }}>
                Aling Marisa's Store
              </div>
              <div style={{ font: '400 13px/1.3 Inter', color: 'var(--ink-2)', marginTop: 4 }}>
                Tagbac Norte, beside the basketball court
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tnum sh-display" style={{ font: '500 22px Inter' }}>₱640</div>
              <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>5 items</div>
              <div style={{ marginTop: 4 }}>
                <Pill tone="warning" dot>Suki</Pill>
              </div>
            </div>
          </div>

          {/* CTA row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-secondary" style={{ flex: 1, height: 52 }}>
              <Icon name="phone" size={20}/> Tawagan
            </button>
            <button className="btn btn-primary" style={{ flex: 1.4, height: 52 }}>
              <Icon name="check" size={20}/> Na-deliver na
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming stops list */}
      <div style={{
        height: 220, overflow: 'hidden',
        padding: '4px 16px 0',
      }}>
        <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '8px 4px' }}>
          Susunod na hintuan
        </div>
        {stops.slice(5).map(s => (
          <div key={s.n} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 4px', borderBottom: '1px solid var(--hair)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 999,
              background: '#F1ECE2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              font: '500 12px Inter', color: 'var(--ink-2)',
              fontVariantNumeric: 'tabular-nums',
            }}>{s.n}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '500 14px Inter', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.store}</div>
              <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>{s.addr} · {s.items} items</div>
            </div>
            <div className="tnum" style={{ font: '500 13px Inter', color: 'var(--ink-2)' }}>₱{s.total.toLocaleString()}</div>
            <Pill tone={s.paid === 'suki' ? 'warning' : s.paid === 'gcash' ? 'action' : 'neutral'}>
              {s.paid === 'suki' ? 'Suki' : s.paid === 'gcash' ? 'GCash' : 'Cash'}
            </Pill>
          </div>
        ))}
      </div>

      {/* POD overlay */}
      {podMode && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,16,0.6)' }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: 'var(--bg)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: '14px 20px 32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--hair-strong)' }}/>
            </div>
            <div style={{ font: '500 18px Inter' }}>Proof of delivery</div>
            <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
              Aling Marisa's Store · Order #1287 · ₱640 suki
            </div>

            <div className="ph" style={{ height: 180, borderRadius: 12, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <Icon name="camera" size={28} color="#8A8068"/>
              <span style={{ font: '400 12px Inter', color: '#8A8068' }}>Tap to take a photo</span>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ font: '500 13px Inter', marginBottom: 6 }}>Lagda · Aling Marisa</div>
              <div style={{
                height: 110, border: '1px dashed var(--hair-strong)', borderRadius: 10,
                background: '#fff', position: 'relative',
              }}>
                <svg width="100%" height="100%" viewBox="0 0 350 110" preserveAspectRatio="none">
                  <path d="M20 80 Q 50 30, 80 70 T 140 60 T 200 80 Q 240 40, 270 70 T 330 60"
                    fill="none" stroke="#1A1815" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                <button style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 0, font: '500 12px Inter', color: 'var(--ink-2)' }}>Burahin</button>
              </div>
            </div>

            <button className="btn btn-success btn-block" style={{ height: 52, marginTop: 14 }}>
              <Icon name="check" size={20}/> Tapusin ang stop 5
            </button>
          </div>
        </div>
      )}

      <HomeBar/>
    </div>
  );
};

// ============================================================
// 8 — Admin: daily price entry (tablet)
// ============================================================
const AdminPricesScreen = () => {
  const rows = [
    { tag: 'Sibuyas pula', en: 'Red onion', unit: '1 kg', last: 120, today: 128, dir: 'up', stock: 'in', notes: 'Maliit na supply, expect ↑ tomorrow' },
    { tag: 'Sibuyas puti', en: 'White onion', unit: '1 kg', last: 145, today: 145, dir: 'flat', stock: 'in', notes: '' },
    { tag: 'Bawang', en: 'Garlic', unit: '1 kg', last: 240, today: 220, dir: 'down', stock: 'in', notes: 'New batch from Ilocos' },
    { tag: 'Itlog · medium', en: 'Eggs medium', unit: '1 tray', last: 260, today: 260, dir: 'flat', stock: 'in', notes: '' },
    { tag: 'Itlog · large', en: 'Eggs large', unit: '1 tray', last: 295, today: 305, dir: 'up', stock: 'low', notes: 'Konti pa, may delivery 11 AM' },
    { tag: 'Kamatis', en: 'Tomatoes', unit: '1 kg', last: 75, today: 80, dir: 'up', stock: 'in', notes: '' },
    { tag: 'Tilapia · live', en: 'Live tilapia', unit: '1 kg', last: 165, today: 160, dir: 'down', stock: 'in', notes: '' },
    { tag: 'Galunggong', en: 'Round scad', unit: '1 kg', last: 160, today: 154, dir: 'down', stock: 'in', notes: '' },
    { tag: 'Bangus · medium', en: 'Milkfish', unit: '1 kg', last: 195, today: 195, dir: 'flat', stock: 'out', notes: 'Wala sa palengke ngayon' },
  ];

  return (
    <div className="tab" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div className="hair-b" style={{ height: 60, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--action)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 16px Inter' }}>S</div>
          <span style={{ font: '500 15px Inter' }}>SariHub Admin</span>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--hair)' }}/>
        <nav style={{ display: 'flex', gap: 4 }}>
          {['Today\'s prices', 'Dispatch', 'Routes', 'Buyers', 'Reports'].map((t, i) => (
            <button key={t} style={{
              height: 36, padding: '0 14px', borderRadius: 8,
              background: i === 0 ? 'var(--ink)' : 'transparent',
              color: i === 0 ? '#fff' : 'var(--ink-2)',
              border: 0, font: '500 13px Inter', cursor: 'pointer',
            }}>{t}</button>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, font: '400 12px Inter', color: 'var(--ink-2)' }}>
          <span className="tnum">Wed · May 22 · 5:48 AM</span>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--success-soft)', color: 'var(--success)', font: '500 13px Inter', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>JA</div>
        </div>
      </div>

      {/* Page header */}
      <div style={{ padding: '20px 28px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, font: '500 26px/1.1 Inter', letterSpacing: '-0.015em' }}>Today's prices</h1>
          <div style={{ font: '400 13px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
            Buyer: Mang Tomas · Last save 5:42 AM · <span style={{ color: 'var(--success)', fontWeight: 500 }}>Auto-saved</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ height: 40 }}>
            <Icon name="reload" size={16}/> Carry over all from yesterday
          </button>
          <button className="btn btn-secondary" style={{ height: 40 }}>
            <Icon name="package" size={16}/> Mark all in-stock
          </button>
          <button className="btn btn-primary" style={{ height: 40 }}>
            Publish to app · 248 stores
          </button>
        </div>
      </div>

      {/* Search + summary */}
      <div style={{ padding: '6px 28px 16px', display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, height: 38, background: '#fff', border: '1px solid var(--hair)', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
          <Icon name="search" size={16} color="var(--ink-3)"/>
          <span style={{ font: '400 13px Inter', color: 'var(--ink-3)' }}>Hanapin ang produkto…</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            ['9', 'Up', 'var(--warning)'],
            ['12', 'Down', 'var(--success)'],
            ['18', 'Stable', 'var(--ink-3)'],
            ['2', 'Out', 'var(--danger)'],
          ].map(([n, l, c]) => (
            <div key={l} style={{ height: 38, padding: '0 12px', borderRadius: 10, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 6, font: '400 12px Inter', color: 'var(--ink-2)' }}>
              <span className="tnum" style={{ font: '500 14px Inter', color: c }}>{n}</span>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '0 28px', flex: 1, overflow: 'hidden' }}>
        <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2.3fr 0.7fr 1.0fr 1.4fr 1.5fr 2.0fr 32px',
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
            <span/>
          </div>
          {rows.map((r, i) => (
            <AdminRow key={r.tag} r={r} editing={i === 4}/>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="hair-t" style={{ height: 52, padding: '0 28px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: '400 12px Inter', color: 'var(--ink-2)' }}>
        <span>Publishing presents prices to 248 active suki stores. Hindi pa pwedeng baguhin pagka-publish.</span>
        <span className="tnum">9 changed · 39 total</span>
      </div>
    </div>
  );
};

const AdminRow = ({ r, editing }) => {
  const dirColor = r.dir === 'up' ? 'var(--warning)' : r.dir === 'down' ? 'var(--success)' : 'var(--ink-3)';
  const delta = r.today - r.last;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2.3fr 0.7fr 1.0fr 1.4fr 1.5fr 2.0fr 32px',
      padding: '12px 16px', alignItems: 'center',
      borderBottom: '1px solid var(--hair)',
      background: editing ? '#FFFBF4' : 'transparent',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <PhotoPH size={32} style={{ borderRadius: 6 }}/>
        <div>
          <div style={{ font: '500 14px Inter' }}>{r.tag}</div>
          <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>{r.en}</div>
        </div>
      </div>
      <span style={{ font: '400 13px Inter', color: 'var(--ink-2)' }}>{r.unit}</span>
      <span className="tnum" style={{ font: '400 13px Inter', color: 'var(--ink-2)', textAlign: 'right' }}>₱{r.last}</span>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end',
          height: 34, padding: '0 10px',
          borderRadius: 8,
          background: editing ? '#fff' : 'transparent',
          border: editing ? '1.5px solid var(--action)' : '1px solid transparent',
          boxShadow: editing ? '0 0 0 3px rgba(216,90,48,0.12)' : 'none',
          minWidth: 100,
        }}>
          {r.dir !== 'flat' && (
            <Icon name={r.dir === 'up' ? 'arrow-up' : 'arrow-down'} size={12} color={dirColor}/>
          )}
          <span className="tnum" style={{ font: '500 16px Inter', color: 'var(--ink)' }}>₱{r.today}</span>
          {r.dir !== 'flat' && (
            <span className="tnum" style={{ font: '400 11px Inter', color: dirColor }}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', background: '#F1ECE2', borderRadius: 8, padding: 3 }}>
        {[['in', 'In stock'], ['low', 'Low'], ['out', 'Out']].map(([k, l]) => (
          <button key={k} style={{
            flex: 1, height: 26, borderRadius: 6,
            background: r.stock === k ? '#fff' : 'transparent',
            border: 0,
            color: r.stock === k ? (k === 'out' ? 'var(--danger)' : k === 'low' ? 'var(--warning)' : 'var(--ink)') : 'var(--ink-2)',
            font: `${r.stock === k ? 500 : 400} 11px Inter`,
            boxShadow: r.stock === k ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            cursor: 'pointer',
          }}>{l}</button>
        ))}
      </div>
      <span style={{ font: '400 12px Inter', color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {r.notes || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>Add note</span>}
      </span>
      <button style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 0, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="grip" size={16}/>
      </button>
    </div>
  );
};

// ============================================================
// 9 — Admin: today's dispatch board (desktop kanban)
// ============================================================
const AdminDispatchScreen = () => {
  const cols = [
    {
      title: 'Submitted', tone: 'neutral', count: 14,
      cards: [
        { id: 1287, store: 'Aling Marisa\'s Store', route: 'Tagbac', items: 5, total: 640, pay: 'suki', when: '9:47 PM' },
        { id: 1286, store: 'Sari-sari ni Ate Liza', route: 'Tagbac', items: 7, total: 820, pay: 'cash', when: '9:42 PM' },
        { id: 1285, store: 'JM Variety Store', route: 'Tagbac', items: 5, total: 540, pay: 'suki', when: '9:38 PM' },
        { id: 1284, store: 'Tindahan ni Lola Pining', route: 'Tagbac', items: 9, total: 1180, pay: 'gcash', when: '9:30 PM' },
        { id: 1283, store: 'Mang Pol Junction Store', route: 'Iyam', items: 3, total: 280, pay: 'cash', when: '9:18 PM' },
        { id: 1282, store: 'Pinoy Mart Mini', route: 'Iyam', items: 12, total: 1640, pay: 'suki', when: '9:05 PM' },
      ],
    },
    {
      title: 'Packed', tone: 'warning', count: 8,
      cards: [
        { id: 1281, store: 'Aling Beth Sari', route: 'Tagbac', items: 6, total: 720, pay: 'suki', when: '4:40 AM' },
        { id: 1280, store: 'RJ Junior Store', route: 'Iyam', items: 4, total: 380, pay: 'cash', when: '4:35 AM' },
        { id: 1279, store: 'Nene\'s Place', route: 'Iyam', items: 8, total: 940, pay: 'suki', when: '4:28 AM' },
        { id: 1278, store: 'Mang Boyet Tindahan', route: 'Tagbac', items: 4, total: 320, pay: 'cash', when: '4:14 AM' },
      ],
    },
    {
      title: 'Out for delivery', tone: 'action', count: 6,
      cards: [
        { id: 1277, store: 'Aling Bebang', route: 'Tagbac', items: 6, total: 480, pay: 'suki', when: '5:30 AM', driver: 'Renz' },
        { id: 1276, store: 'Mang Boyet Tindahan', route: 'Tagbac', items: 4, total: 320, pay: 'cash', when: '5:30 AM', driver: 'Renz' },
        { id: 1275, store: 'Tindahan ni Lola Pining', route: 'Tagbac', items: 9, total: 1180, pay: 'gcash', when: '5:30 AM', driver: 'Renz' },
      ],
    },
  ];

  return (
    <div className="desk" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div className="hair-b" style={{ height: 60, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--action)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 16px Inter' }}>S</div>
          <span style={{ font: '500 15px Inter' }}>SariHub Admin</span>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--hair)' }}/>
        <nav style={{ display: 'flex', gap: 4 }}>
          {["Today's prices", 'Dispatch', 'Routes', 'Buyers', 'Reports'].map((t, i) => (
            <button key={t} style={{
              height: 36, padding: '0 14px', borderRadius: 8,
              background: i === 1 ? 'var(--ink)' : 'transparent',
              color: i === 1 ? '#fff' : 'var(--ink-2)',
              border: 0, font: '500 13px Inter', cursor: 'pointer',
            }}>{t}</button>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, font: '400 12px Inter', color: 'var(--ink-2)' }}>
          <Pill tone="success" dot>248 stores online</Pill>
          <span className="tnum">Wed · May 22 · 5:48 AM</span>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--success-soft)', color: 'var(--success)', font: '500 13px Inter', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>JA</div>
        </div>
      </div>

      {/* Page header */}
      <div style={{ padding: '20px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, font: '500 26px/1.1 Inter', letterSpacing: '-0.015em' }}>Today's dispatch</h1>
          <div style={{ font: '400 13px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
            28 orders · ₱24,180 GMV · 3 active routes
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ height: 38 }}>
            <Icon name="filter" size={16}/> Filter
          </button>
          <button className="btn btn-secondary" style={{ height: 38 }}>
            <Icon name="package" size={16}/> Packing slips · 14
          </button>
          <button className="btn btn-primary" style={{ height: 38 }}>
            Dispatch Tagbac route
          </button>
        </div>
      </div>

      {/* Truck-load summary panel */}
      <div style={{ padding: '0 28px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { name: 'Tagbac', truck: 'Tamaraw 01 · Mang Renz', kg: 612, cap: 1000, stops: 18, status: 'Loaded · departing 5:55 AM', tone: 'success' },
          { name: 'Iyam', truck: 'Tamaraw 02 · Mang Onyok', kg: 884, cap: 1000, stops: 14, status: 'Packing · 88% capacity', tone: 'warning' },
          { name: 'Pagbilao', truck: 'Tamaraw 03 · Mang Lito', kg: 1080, cap: 1000, stops: 16, status: 'OVER CAPACITY · split required', tone: 'danger' },
        ].map(r => (
          <div key={r.name} className="card" style={{ padding: '14px 16px', borderColor: r.tone === 'danger' ? '#EBC7C3' : 'var(--hair)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ font: '500 16px Inter' }}>{r.name} route</div>
                <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{r.truck} · {r.stops} stops</div>
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
      <div style={{ padding: '0 28px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, flex: 1, overflow: 'hidden' }}>
        {cols.map(col => (
          <div key={col.title} style={{
            background: '#F4F0E8', borderRadius: 14, padding: 12,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: col.tone === 'action' ? 'var(--action)' : col.tone === 'warning' ? 'var(--warning)' : 'var(--ink-3)' }}/>
                <span style={{ font: '500 14px Inter' }}>{col.title}</span>
                <span className="tnum" style={{ font: '400 12px Inter', color: 'var(--ink-2)' }}>{col.count}</span>
              </div>
              <button style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 0, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={14}/>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
              {col.cards.map(c => (
                <DispatchCard key={c.id} c={c}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DispatchCard = ({ c }) => {
  const payTone = c.pay === 'suki' ? 'warning' : c.pay === 'gcash' ? 'action' : 'neutral';
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 12px',
      border: '1px solid var(--hair)',
      cursor: 'grab',
    }}>
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
          {c.route} · {c.items} items{c.driver ? ` · ${c.driver}` : ''}
        </span>
        <span className="tnum sh-display" style={{ font: '500 14px Inter' }}>₱{c.total.toLocaleString()}</span>
      </div>
    </div>
  );
};

Object.assign(window, {
  DriverScreen, AdminPricesScreen, AdminDispatchScreen,
});
