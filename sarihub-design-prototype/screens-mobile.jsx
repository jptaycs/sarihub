// Mobile screens 1–6 + edge case variants

// Shared mock product data
const PRODUCTS = [
  { tag: 'Sibuyas pula', en: 'Red onion', src: 'Dalahican mkt', t: '4:42 AM',
    dir: 'up', delta: '₱8 today', units: [['1 pc','₱14'],['1 kg','₱128'],['5 kg','₱610']], qty: 2, qtyU: 1, ph: 'sibuyas' },
  { tag: 'Bawang', en: 'Garlic', src: 'Dalahican mkt', t: '4:48 AM',
    dir: 'down', delta: '₱3 today', units: [['1 pc','₱4'],['¼ kg','₱58'],['1 kg','₱220']], qty: 1, qtyU: 2, ph: 'bawang' },
  { tag: 'Itlog · medium', en: 'Eggs', src: 'San Pablo farm', t: '5:10 AM',
    dir: 'flat', delta: 'Stable', units: [['1 pc','₱8'],['1 dz','₱92'],['1 tray','₱260']], qty: 1, qtyU: 2, ph: 'itlog' },
  { tag: 'Kamatis', en: 'Tomatoes', src: 'Dalahican mkt', t: '4:55 AM',
    dir: 'up', delta: '₱5 today', units: [['¼ kg','₱22'],['1 kg','₱80'],['5 kg','₱380']], qty: 0, qtyU: 1, ph: 'kamatis' },
  { tag: 'Tilapia · live', en: 'Live tilapia', src: 'Lucena port', t: '5:24 AM',
    dir: 'flat', delta: 'Stable', units: [['1 kg','₱160'],['3 kg','₱465'],['5 kg','₱760']], qty: 0, qtyU: 0, ph: 'tilapia' },
];

const CATS = ['Sariwa', 'Pampalasa', 'De lata', 'Pansit', "Kape't gatas", 'Sangkap'];

// ============================================================
// 1a — OTP enter phone
// ============================================================
const OtpPhoneScreen = () => (
  <div className="sh">
    <StatusBar/>
    <div style={{ padding: '24px 24px 0' }}>
      <button style={{ width: 40, height: 40, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevron-left" size={20}/>
      </button>
    </div>
    <div style={{ padding: '40px 24px 0' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'var(--action)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        font: '500 28px/1 Inter', letterSpacing: '-0.02em', marginBottom: 28,
      }}>S</div>
      <h1 style={{ margin: 0, font: '500 28px/1.15 Inter', letterSpacing: '-0.015em' }}>
        Magpasok po ng<br/>numero ninyo
      </h1>
      <p style={{ margin: '12px 0 0', font: '400 15px/1.5 Inter', color: 'var(--ink-2)' }}>
        Padadalhan namin kayo ng 6-digit na code via SMS.
      </p>

      <label style={{ display: 'block', marginTop: 36, font: '400 12px Inter', color: 'var(--ink-2)', marginBottom: 8 }}>
        Mobile number
      </label>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{
          width: 76, height: 56, borderRadius: 10, background: '#F1ECE2',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          font: '500 16px Inter', color: 'var(--ink)',
        }}>
          <span style={{ width: 18, height: 12, background: 'linear-gradient(to bottom, #0038A8 50%, #CE1126 50%)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, background: '#FFFFFF', clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}/>
          </span>
          +63
        </div>
        <input className="inp" style={{ height: 56, flex: 1, font: '500 18px Inter', letterSpacing: '0.02em' }} defaultValue="917 845 2310"/>
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 24, height: 56 }}>
        Magpadala ng code
      </button>

      <p style={{ marginTop: 32, font: '400 13px/1.5 Inter', color: 'var(--ink-2)', textAlign: 'center' }}>
        May problema po? Tawagan: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>0917-555-0188</span>
      </p>
    </div>
    <HomeBar/>
  </div>
);

// ============================================================
// 1b — OTP enter code
// ============================================================
const OtpCodeScreen = () => {
  const digits = ['4','8','2','7','','' ];
  return (
    <div className="sh">
      <StatusBar/>
      <div style={{ padding: '24px 24px 0' }}>
        <button style={{ width: 40, height: 40, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-left" size={20}/>
        </button>
      </div>
      <div style={{ padding: '40px 24px 0' }}>
        <h1 style={{ margin: 0, font: '500 28px/1.15 Inter', letterSpacing: '-0.015em' }}>
          Ipasok po ang code
        </h1>
        <p style={{ margin: '12px 0 0', font: '400 15px/1.5 Inter', color: 'var(--ink-2)' }}>
          Pinadalhan namin ang <span style={{ color: 'var(--ink)', fontWeight: 500 }}>+63 917 845 2310</span> ng 6-digit code.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 36, justifyContent: 'space-between' }}>
          {digits.map((d, i) => (
            <div key={i} style={{
              flex: 1, height: 64, borderRadius: 10,
              background: '#fff',
              border: `1px solid ${i === 4 ? 'var(--action)' : 'var(--hair-strong)'}`,
              boxShadow: i === 4 ? '0 0 0 3px rgba(216,90,48,0.15)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              font: '500 28px Inter', fontVariantNumeric: 'tabular-nums',
              color: 'var(--ink)',
            }}>
              {d}
              {i === 4 && <div style={{ width: 2, height: 28, background: 'var(--action)', animation: 'none' }}/>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ font: '400 13px Inter', color: 'var(--ink-2)' }}>
            <Icon name="clock" size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-3px' }}/>
            Mag-resend after 0:47
          </span>
          <button style={{ background: 'transparent', border: 0, font: '500 14px Inter', color: 'var(--ink-3)' }}>
            Resend code
          </button>
        </div>

        <p style={{ marginTop: 32, font: '400 13px/1.5 Inter', color: 'var(--ink-2)', textAlign: 'center' }}>
          May problema po? Tawagan: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>0917-555-0188</span>
        </p>
      </div>
      <HomeBar/>
    </div>
  );
};

// ============================================================
// 2 — Home / Today's palengke run
// ============================================================
const HomeScreen = ({ cutoffPassed = false, sukiExceeded = false, offline = false }) => {
  const totalItems = 3;
  const totalPrice = 640;
  return (
    <div className="sh">
      <StatusBar offline={offline}/>

      {/* Header — context, never primary action */}
      <div style={{ padding: '8px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ font: '400 12px Inter', color: 'var(--ink-2)' }}>Magandang gabi po,</div>
            <div style={{ font: '500 22px/1.15 Inter', letterSpacing: '-0.01em', marginTop: 2 }}>
              Aling Marisa's Store
            </div>
          </div>
          <button style={{ width: 40, height: 40, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon name="bell" size={18}/>
            <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, background: 'var(--action)' }}/>
          </button>
        </div>

        {/* Cutoff pill */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {cutoffPassed ? (
            <Pill tone="dark" dot>Cutoff na po · bukas na, Miyerkules</Pill>
          ) : (
            <Pill tone="warning" dot>9:23 PM · 1h 37m bago cutoff</Pill>
          )}
        </div>

        {/* Delivery context banner */}
        <div style={{
          marginTop: 12, background: '#fff', border: '1px solid var(--hair)',
          borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: 'var(--success-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="truck" size={18} color="var(--success)"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: '500 13px/1.2 Inter' }}>
              {cutoffPassed ? 'Miyerkules 6:30 AM' : 'Bukas, 6:30 AM'} · Tagbac route
            </div>
            <div style={{ font: '400 12px/1.2 Inter', color: 'var(--ink-2)', marginTop: 3 }}>
              Stop 7 of 18 · Driver: Mang Renz
            </div>
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div style={{
        padding: '0 20px', display: 'flex', gap: 8, overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {CATS.map((c, i) => (
          <button key={c} style={{
            flex: '0 0 auto',
            height: 36, padding: '0 14px',
            borderRadius: 999,
            background: i === 0 ? 'var(--ink)' : '#fff',
            color: i === 0 ? '#fff' : 'var(--ink)',
            border: i === 0 ? '1px solid var(--ink)' : '1px solid var(--hair-strong)',
            font: '500 13px Inter',
            whiteSpace: 'nowrap',
          }}>
            {c}
            {i === 0 && <span style={{ marginLeft: 8, font: '400 11px Inter', opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>24</span>}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div style={{
        marginTop: 16,
        height: 380, overflow: 'hidden',
        padding: '0 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {PRODUCTS.slice(0, 4).map((p, i) => (
          <ProductCard key={p.tag} p={p}/>
        ))}
      </div>

      {/* Offline pill (floats above sticky bar) */}
      {offline && (
        <div style={{
          position: 'absolute', bottom: 154, left: 20, right: 20,
          background: '#1F1D1A', color: '#fff', borderRadius: 10,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          font: '500 12px Inter',
        }}>
          <Icon name="wifi-off" size={16}/>
          <span style={{ flex: 1 }}>Offline · magpa-sync kapag may signal</span>
          <span style={{ font: '400 11px Inter', opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>3 changes</span>
        </div>
      )}

      {/* Sticky bottom */}
      <Sticky>
        {/* Suki bar */}
        <div style={{
          background: '#fff', border: '1px solid var(--hair)',
          borderRadius: 12, padding: '10px 14px',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ font: '500 12px Inter', color: 'var(--ink)' }}>Suki credit</span>
            <span className="tnum" style={{ font: '400 12px Inter', color: sukiExceeded ? 'var(--warning)' : 'var(--ink-2)' }}>
              {sukiExceeded ? '₱5,180 / ₱5,000' : '₱2,400 / ₱5,000 used'}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: '#F1ECE2', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: sukiExceeded ? '100%' : '48%',
              background: sukiExceeded ? 'var(--warning)' : 'var(--success)',
            }}/>
          </div>
        </div>

        {/* CTA */}
        {cutoffPassed ? (
          <button className="btn btn-secondary btn-block" style={{ height: 56 }}>
            <Icon name="cart" size={20}/>
            <span style={{ flex: 1, textAlign: 'left', marginLeft: 4 }}>Mag-order para sa Miyerkules</span>
            <Icon name="chevron-right" size={20}/>
          </button>
        ) : sukiExceeded ? (
          <button className="btn btn-block" style={{ height: 56, background: 'var(--warning)', color: '#fff' }}>
            <span style={{ flex: 1, textAlign: 'left' }}>Lumagpas sa suki limit · magbayad muna</span>
            <Icon name="chevron-right" size={20}/>
          </button>
        ) : (
          <button className="btn btn-primary btn-block" style={{ height: 56 }}>
            <Icon name="cart" size={20}/>
            <span className="tnum" style={{ flex: 1, textAlign: 'left', marginLeft: 4 }}>
              Place order · {totalItems} items · ₱{totalPrice}
            </span>
            <Icon name="chevron-right" size={20}/>
          </button>
        )}
      </Sticky>

      <HomeBar/>
    </div>
  );
};

const ProductCard = ({ p }) => {
  const dirColor = p.dir === 'up' ? 'var(--warning)' : p.dir === 'down' ? 'var(--success)' : 'var(--ink-3)';
  const dirIcon = p.dir === 'up' ? 'arrow-up' : p.dir === 'down' ? 'arrow-down' : 'minus';
  const dirLabel = p.dir === 'flat' ? 'Stable' : p.delta;
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <PhotoPH size={48} label={p.ph}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div className="lbl-tag" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.tag}</div>
              <div className="lbl-en">{p.en}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: dirColor, font: '500 12px Inter', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              <Icon name={dirIcon} size={12} color={dirColor}/> {dirLabel}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, font: '400 11px Inter', color: 'var(--ink-2)' }}>
            <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--success)' }}/>
            {p.src} · {p.t}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {p.units.map(([u, pr], i) => {
          const active = i === p.qtyU && p.qty > 0;
          return (
            <button key={u} className={`unit-btn${active ? ' active' : ''}`}>
              {active && <span className="tnum" style={{ background: '#fff', color: 'var(--ink)', borderRadius: 4, padding: '1px 5px', font: '500 11px Inter', marginRight: 2 }}>{p.qty}×</span>}
              {u} · {pr}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// 3 — Cart bottom sheet (drawn over Home)
// ============================================================
const CartSheetScreen = () => {
  const items = [
    { tag: 'Sibuyas pula', en: 'Red onion · 2 kg', price: 256 },
    { tag: 'Bawang', en: 'Garlic · ¼ kg', price: 58 },
    { tag: 'Itlog · medium', en: 'Eggs · 1 dz', price: 92 },
    { tag: 'Kamatis', en: 'Tomatoes · 1 kg', price: 80 },
    { tag: 'Galunggong', en: 'Round scad · 1 kg', price: 154 },
  ];
  const total = items.reduce((s, i) => s + i.price, 0);
  return (
    <div className="sh">
      <StatusBar/>
      {/* Faded home behind */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,16,0.45)' }}/>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--bg)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: 30,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--hair-strong)' }}/>
        </div>

        <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ font: '500 18px/1 Inter', letterSpacing: '-0.01em' }}>Order review</div>
          <div className="tnum" style={{ font: '400 13px Inter', color: 'var(--ink-2)' }}>5 items</div>
        </div>
        <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', padding: '4px 20px 0' }}>
          Mga presyong nakalock hanggang 11:00 PM cutoff.
        </div>

        {/* Items */}
        <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column' }}>
          {items.map((it, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--hair)',
            }}>
              <PhotoPH size={40} style={{ flex: '0 0 40px' }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lbl-tag" style={{ fontSize: 14 }}>{it.tag}</div>
                <div className="lbl-en">{it.en}</div>
              </div>
              <span className="tnum" style={{ font: '500 14px Inter' }}>₱{it.price}</span>
              <button style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
                <Icon name="x" size={16}/>
              </button>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--hair)' }}>
          <span style={{ font: '500 14px Inter' }}>Kabuuan</span>
          <span className="tnum sh-display" style={{ font: '500 22px Inter', letterSpacing: '-0.01em' }}>₱640.00</span>
        </div>

        {/* Payment toggle */}
        <div style={{ padding: '6px 20px 0' }}>
          <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginBottom: 8 }}>Bayad</div>
          <div style={{ display: 'flex', gap: 6, background: '#F1ECE2', padding: 4, borderRadius: 10 }}>
            {[
              ['Suki credit', true, 'wallet'],
              ['Cash on delivery', false, 'cash'],
              ['GCash', false, 'gcash'],
            ].map(([t, active, ic]) => (
              <button key={t} style={{
                flex: 1, height: 40, borderRadius: 7,
                background: active ? '#fff' : 'transparent',
                border: 0,
                font: `${active ? 500 : 400} 12px Inter`,
                color: active ? 'var(--ink)' : 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <Icon name={ic} size={14}/> {t}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm */}
        <div style={{ padding: '16px 20px 0' }}>
          <button className="btn btn-primary btn-block" style={{ height: 56 }}>
            <span style={{ flex: 1, textAlign: 'left' }}>Place order</span>
            <span className="tnum">₱640.00</span>
            <Icon name="chevron-right" size={20}/>
          </button>
          <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', textAlign: 'center', marginTop: 10 }}>
            Delivery bukas 6:30 AM · Tagbac route, stop 7
          </div>
        </div>
      </div>

      <HomeBar/>
    </div>
  );
};

// ============================================================
// 4 — Order placed confirmation
// ============================================================
const ConfirmScreen = () => {
  const items = [
    'Sibuyas pula · 2 kg',
    'Bawang · ¼ kg',
    'Itlog medium · 1 dz',
    'Kamatis · 1 kg',
    'Galunggong · 1 kg',
  ];
  return (
    <div className="sh">
      <StatusBar/>
      <div style={{ padding: '60px 24px 0' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 999, background: 'var(--success-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={36} color="var(--success)" strokeWidth={2.2}/>
        </div>
        <h1 style={{ margin: '24px 0 0', font: '500 32px/1.1 Inter', letterSpacing: '-0.02em' }}>
          Tapos na po!
        </h1>
        <p style={{ margin: '8px 0 0', font: '400 16px/1.5 Inter', color: 'var(--ink-2)' }}>
          Delivery bukas, <span style={{ color: 'var(--ink)', fontWeight: 500 }}>6:30 AM</span>.<br/>
          Tagbac route · stop 7 of 18.
        </p>

        {/* Summary */}
        <div className="card" style={{ marginTop: 28, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ font: '500 13px Inter', color: 'var(--ink-2)' }}>Order #1287</span>
            <Pill tone="success" dot>Sent</Pill>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', font: '400 14px/1.4 Inter' }}>
                <span style={{ color: 'var(--ink)' }}>{s}</span>
                <span className="tnum" style={{ color: 'var(--ink-2)' }}>
                  {[256, 58, 92, 80, 154][i] ? `₱${[256, 58, 92, 80, 154][i]}` : ''}
                </span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--hair)', marginTop: 12, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ font: '500 15px Inter' }}>Kabuuan</span>
            <span className="tnum sh-display" style={{ font: '500 18px Inter' }}>₱640.00</span>
          </div>
          <div style={{ marginTop: 8, font: '400 12px Inter', color: 'var(--ink-2)' }}>
            Bayad: Suki credit · ₱3,040 / ₱5,000 used after this
          </div>
        </div>
      </div>

      {/* Stacked CTAs */}
      <Sticky>
        <button className="btn btn-primary btn-block" style={{ height: 52, marginBottom: 10 }}>
          Mag-order ulit
        </button>
        <button className="btn btn-secondary btn-block" style={{ height: 52 }}>
          Tingnan ang history
        </button>
      </Sticky>
      <HomeBar/>
    </div>
  );
};

// ============================================================
// 5 — Order history
// ============================================================
const HistoryScreen = ({ withItemOut = false }) => {
  const orders = [
    { id: 1287, when: 'Today · 9:47 PM', count: 5, total: 640, status: 'Sent', tone: 'action', expanded: true },
    { id: 1273, when: 'Lunes · 9:12 PM', count: 7, total: 1180, status: 'Delivered', tone: 'success' },
    { id: 1260, when: 'Sabado · 8:34 PM', count: 4, total: 420, status: 'Settled', tone: 'neutral' },
    { id: 1245, when: 'Huwebes · 10:02 PM', count: 9, total: 1450, status: 'Settled', tone: 'neutral' },
    { id: 1232, when: 'Lunes prev · 9:30 PM', count: 6, total: 720, status: 'Settled', tone: 'neutral' },
  ];
  return (
    <div className="sh">
      <StatusBar/>
      <div style={{ padding: '12px 20px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, font: '500 22px/1 Inter', letterSpacing: '-0.01em' }}>Mga order</h1>
        <button style={{ width: 40, height: 40, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="filter" size={18}/>
        </button>
      </div>

      <div style={{ padding: '0 20px 100px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', maxHeight: 720 }}>
        {orders.map((o, i) => (
          <div key={o.id} className="card" style={{ padding: '14px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div className="tnum" style={{ font: '500 15px Inter' }}>Order #{o.id}</div>
                <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 2 }}>
                  {o.when} · {o.count} items
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="tnum sh-display" style={{ font: '500 16px Inter' }}>₱{o.total.toLocaleString()}</div>
                <div style={{ marginTop: 4 }}>
                  <Pill tone={o.tone} dot>{o.status}</Pill>
                </div>
              </div>
            </div>

            {/* Expanded inline detail */}
            {o.expanded && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--hair)' }}>
                {[
                  ['Sibuyas pula · 2 kg', 256, false],
                  ['Bawang · ¼ kg', 58, false],
                  ['Itlog medium · 1 dz', 92, false],
                  withItemOut ? ['Kamatis · 1 kg', 80, true] : ['Kamatis · 1 kg', 80, false],
                  ['Galunggong · 1 kg', 154, false],
                ].map(([n, pr, gone], idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', font: '400 13px Inter' }}>
                    <span style={{ textDecoration: gone ? 'line-through' : 'none', color: gone ? 'var(--ink-3)' : 'var(--ink)' }}>{n}</span>
                    <span className="tnum" style={{ textDecoration: gone ? 'line-through' : 'none', color: gone ? 'var(--ink-3)' : 'var(--ink)' }}>₱{pr}</span>
                  </div>
                ))}
                {withItemOut && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--warning-soft)', borderRadius: 8, font: '400 12px/1.4 Inter', color: '#8D5712' }}>
                    Kamatis: wala na po, hindi sisingilin. Bagong total ₱560.
                  </div>
                )}
                <button style={{ marginTop: 12, height: 36, padding: '0 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--hair-strong)', font: '500 13px Inter', color: 'var(--ink)' }}>
                  Mag-order ulit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <HomeBar/>
    </div>
  );
};

// ============================================================
// 6 — Suki ledger
// ============================================================
const SukiScreen = () => {
  const rows = [
    { d: 'Today',     desc: 'Order #1287',          amt: -640,  bal: 3040 },
    { d: 'Lunes',     desc: 'Bayad · GCash',         amt: 1200, bal: 3680 },
    { d: 'Lunes',     desc: 'Order #1273',          amt: -1180, bal: 4880 },
    { d: 'Sabado',    desc: 'Order #1260',          amt: -420,  bal: 3700 },
    { d: 'Biyernes',  desc: 'Bayad · cash sa driver', amt: 800,  bal: 3280 },
    { d: 'Huwebes',   desc: 'Order #1245',          amt: -1450, bal: 4080 },
    { d: 'Miyerkules', desc: 'Order #1238',         amt: -320,  bal: 2630 },
  ];
  return (
    <div className="sh">
      <StatusBar/>
      <div style={{ padding: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, font: '500 22px/1 Inter', letterSpacing: '-0.01em' }}>Suki ledger</h1>
        <button style={{ background: 'transparent', border: 0, color: 'var(--ink-2)', font: '500 13px Inter' }}>
          History
        </button>
      </div>

      {/* Balance header card */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          background: 'var(--ink)', color: '#fff',
          borderRadius: 14, padding: '18px 18px 16px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ font: '400 12px Inter', color: 'rgba(255,255,255,0.65)' }}>Kasalukuyang balanse</div>
          <div className="tnum sh-display" style={{ font: '500 40px/1 Inter', letterSpacing: '-0.025em', marginTop: 6 }}>
            ₱3,040<span style={{ font: '400 20px Inter', color: 'rgba(255,255,255,0.5)' }}>.00</span>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: '400 12px Inter', color: 'rgba(255,255,255,0.65)' }}>Credit limit</span>
            <span className="tnum" style={{ font: '500 13px Inter' }}>₱5,000</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', background: 'var(--success)' }}/>
          </div>
          <div style={{ marginTop: 8, font: '400 11px Inter', color: 'rgba(255,255,255,0.6)' }}>
            ₱1,960 pa po ang puwedeng gamitin. Good standing.
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', paddingBottom: 8 }}>
          <span>Transaction</span>
          <span>Halaga · Balanse</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
          {rows.map((r, i) => {
            const isPay = r.amt > 0;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px',
                borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--hair)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: '500 13px Inter', color: 'var(--ink)' }}>{r.desc}</div>
                  <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{r.d}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tnum" style={{ font: '500 14px Inter', color: isPay ? 'var(--success)' : 'var(--ink)' }}>
                    {isPay ? '+' : '−'}₱{Math.abs(r.amt).toLocaleString()}
                  </div>
                  <div className="tnum" style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>
                    ₱{r.bal.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Sticky>
        <button className="btn btn-primary btn-block" style={{ height: 52 }}>
          Magbayad
        </button>
      </Sticky>
      <HomeBar/>
    </div>
  );
};

Object.assign(window, {
  OtpPhoneScreen, OtpCodeScreen, HomeScreen, CartSheetScreen,
  ConfirmScreen, HistoryScreen, SukiScreen,
});
