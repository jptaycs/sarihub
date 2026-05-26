// Screen components for the SariHub interactive prototype.

// ---------- Device frame ----------
const DeviceFrame = ({ children }) => (
  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
    <div style={{
      width: 390, height: 844,
      borderRadius: 44,
      background: '#0E0D0B',
      padding: 12,
      boxShadow: '0 30px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 32,
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg)',
      }}>
        {children}
        {/* Faux notch / pill */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          width: 110, height: 28, borderRadius: 14, background: '#0E0D0B', zIndex: 1,
        }}/>
      </div>
    </div>
  </div>
);

// ---------- OTP Phone Entry ----------
const OtpPhone = ({ phone, setPhone, onSubmit }) => (
  <div className="sh" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <StatusBar/>
    <div style={{ padding: '40px 24px 0', flex: 1 }}>
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
          <span style={{
            width: 18, height: 12,
            background: 'linear-gradient(to bottom, #0038A8 50%, #CE1126 50%)',
            borderRadius: 2, position: 'relative', overflow: 'hidden',
          }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, background: '#FFFFFF', clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}/>
          </span>
          +63
        </div>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="inp" style={{ height: 56, flex: 1, font: '500 18px Inter', letterSpacing: '0.02em' }}
          inputMode="numeric"
        />
      </div>

      <button onClick={onSubmit} className="btn btn-primary btn-block" style={{ marginTop: 24, height: 56 }}>
        Magpadala ng code
      </button>

      <p style={{ marginTop: 32, font: '400 13px/1.5 Inter', color: 'var(--ink-2)', textAlign: 'center' }}>
        May problema po? Tawagan: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>0917-555-0188</span>
      </p>
    </div>
    <HomeBar/>
  </div>
);

// ---------- OTP Code Entry ----------
const OtpCode = ({ phone, code, error, onDigit, onDelete, onBack }) => {
  const digits = Array.from({ length: 6 }, (_, i) => code[i] || '');
  const activeIdx = code.length;
  return (
    <div className="sh" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '24px 24px 0' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="chevron-left" size={20}/>
        </button>
      </div>
      <div style={{ padding: '32px 24px 0', flex: 1 }}>
        <h1 style={{ margin: 0, font: '500 28px/1.15 Inter', letterSpacing: '-0.015em' }}>
          Ipasok po ang code
        </h1>
        <p style={{ margin: '12px 0 0', font: '400 15px/1.5 Inter', color: 'var(--ink-2)' }}>
          Pinadalhan namin ang <span style={{ color: 'var(--ink)', fontWeight: 500 }}>+63 {phone}</span> ng 6-digit code.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'space-between' }}>
          {digits.map((d, i) => {
            const isActive = i === activeIdx;
            return (
              <div key={i} style={{
                flex: 1, height: 60, borderRadius: 10,
                background: '#fff',
                border: `1px solid ${error ? 'var(--danger)' : isActive ? 'var(--action)' : 'var(--hair-strong)'}`,
                boxShadow: isActive && !error ? '0 0 0 3px rgba(216,90,48,0.15)' : error ? '0 0 0 3px rgba(180,51,42,0.1)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: '500 26px Inter', fontVariantNumeric: 'tabular-nums',
                color: 'var(--ink)',
                transition: 'border-color .15s, box-shadow .15s',
              }}>
                {d}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, font: '400 12px Inter', color: 'var(--ink-3)', textAlign: 'center' }}>
          Tip: pindutin "111111" para makapasok
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ font: '400 13px Inter', color: 'var(--ink-2)' }}>
            <Icon name="clock" size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-3px' }}/>
            Mag-resend after 0:47
          </span>
          <button style={{ background: 'transparent', border: 0, font: '500 14px Inter', color: 'var(--ink-3)', cursor: 'pointer' }}>
            Resend code
          </button>
        </div>

        {/* Numpad */}
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
            if (k === '') return <div key={i}/>;
            const isDel = k === '⌫';
            return (
              <button key={i}
                onClick={() => isDel ? onDelete() : onDigit(k)}
                style={{
                  height: 56, borderRadius: 12,
                  background: isDel ? 'transparent' : '#fff',
                  border: isDel ? 'none' : '1px solid var(--hair)',
                  font: '500 22px Inter',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {isDel ? <Icon name="chevron-left" size={22}/> : k}
              </button>
            );
          })}
        </div>
      </div>
      <HomeBar/>
    </div>
  );
};

// ---------- App Shell + Bottom Nav ----------
const AppShell = ({ tab, setTab, cartCount, banner, children }) => (
  <div className="sh" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <StatusBar offline={banner === 'offline'}/>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
    {/* Bottom tab bar */}
    <BottomNav tab={tab} setTab={setTab} cartCount={cartCount}/>
    <HomeBar/>
  </div>
);

const BottomNav = ({ tab, setTab, cartCount }) => {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'orders', icon: 'list', label: 'Orders' },
    { id: 'suki', icon: 'wallet', label: 'Suki' },
    { id: 'account', icon: 'user', label: 'Account' },
  ];
  return (
    <div style={{
      borderTop: '1px solid var(--hair)',
      background: '#fff',
      paddingBottom: 22,
      display: 'flex',
    }}>
      {tabs.map(t => {
        const active = t.id === tab;
        return (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, height: 60,
              background: 'transparent', border: 0, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              position: 'relative',
              paddingTop: 4,
            }}
          >
            <Icon name={t.icon} size={22} color={active ? 'var(--ink)' : 'var(--ink-3)'} strokeWidth={active ? 2 : 1.6}/>
            <span style={{ font: `${active ? 500 : 400} 11px Inter` }}>{t.label}</span>
            {active && <span style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', width: 28, height: 2.5, background: 'var(--action)', borderRadius: 2 }}/>}
          </button>
        );
      })}
    </div>
  );
};

// ---------- Home Tab ----------
const HomeTab = ({ cat, setCat, cart, tapUnit, cartCount, cartTotal, sukiUsed, sukiExceeded, cutoffPassed, offline, onPlaceOrder, showStepperHint }) => {
  const products = CATALOG.filter(p => p.cat === cat);
  const sukiPct = Math.min(100, (sukiUsed / SUKI_LIMIT) * 100);

  return (
    <>
      {/* Combined header — store + delivery status as one quiet card */}
      <div style={{ padding: '8px 20px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ font: '500 19px/1 Inter', letterSpacing: '-0.01em' }}>
            {STORE_NAME}
          </div>
          <button style={{ width: 38, height: 38, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}>
            <Icon name="bell" size={17}/>
            <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 4, background: 'var(--action)' }}/>
          </button>
        </div>

        <div style={{
          background: '#fff', border: '1px solid var(--hair)', borderRadius: 12,
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: cutoffPassed ? '#F1ECE2' : 'var(--success-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="truck" size={18} color={cutoffPassed ? 'var(--ink-3)' : 'var(--success)'}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '500 14px/1.2 Inter' }}>
              {cutoffPassed ? 'Miyerkules 6:30 AM · Tagbac' : 'Bukas, 6:30 AM · Tagbac'}
            </div>
            <div style={{ font: '400 11px/1.3 Inter', color: 'var(--ink-2)', marginTop: 3 }}>
              {cutoffPassed
                ? 'Cutoff na po · order para sa Miyerkules'
                : <><span style={{ color: 'var(--warning)', fontWeight: 500 }}>1h 37m</span> bago cutoff · stop 7 of 18</>}
            </div>
          </div>
        </div>
      </div>

      {/* Categories — clean chips, no count badges */}
      <div style={{
        padding: '2px 20px 14px',
        display: 'flex', gap: 6, overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(c => {
          const active = c === cat;
          return (
            <button key={c}
              onClick={() => setCat(c)}
              style={{
                flex: '0 0 auto',
                height: 34, padding: '0 14px',
                borderRadius: 999,
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? '#fff' : 'var(--ink-2)',
                border: active ? '1px solid var(--ink)' : '1px solid var(--hair)',
                font: `${active ? 500 : 400} 13px Inter`,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >{c}</button>
          );
        })}
      </div>

      {/* Product list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 20px',
        display: 'flex', flexDirection: 'column', gap: 8,
        paddingBottom: cartCount > 0 ? 158 : 90,
      }}>
        {products.length === 0 ? (
          <EmptyCat name={cat}/>
        ) : (
          products.map(p => (
            <ProductCardLive key={p.id} p={p} cartEntry={cart[p.id]} onTap={(uk) => tapUnit(p.id, uk)}/>
          ))
        )}
      </div>

      {/* Sticky footer — ONE unified panel per brief (two rows: suki + CTA) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 82,
        padding: '0 16px 4px',
        pointerEvents: 'none',
      }}>
        {offline && (
          <div style={{
            pointerEvents: 'auto',
            background: '#1F1D1A', color: '#fff', borderRadius: 10,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            font: '500 12px Inter', marginBottom: 8,
          }}>
            <Icon name="wifi-off" size={16}/>
            <span style={{ flex: 1 }}>Offline · magpa-sync kapag may signal</span>
          </div>
        )}

        {cartCount > 0 && (
          <div style={{
            pointerEvents: 'auto',
            background: '#fff', borderRadius: 14, overflow: 'hidden',
            border: '1px solid var(--hair-strong)',
          }}>
            {/* Row 1 — suki credit */}
            <div style={{ padding: '10px 14px 11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ font: '500 12px Inter' }}>Suki credit</span>
                <span className="tnum" style={{ font: '400 12px Inter', color: sukiExceeded ? 'var(--warning)' : 'var(--ink-2)' }}>
                  {peso(sukiUsed)} <span style={{ color: 'var(--ink-3)' }}>/ {peso(SUKI_LIMIT)}</span>
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: '#F1ECE2', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${sukiPct}%`,
                  background: sukiExceeded ? 'var(--warning)' : 'var(--success)',
                  transition: 'width .25s',
                }}/>
              </div>
            </div>

            {/* Row 2 — CTA, flush to bottom of panel, full width */}
            {cutoffPassed ? (
              <button disabled
                style={{
                  width: '100%', height: 56, border: 0,
                  background: '#F1ECE2', color: 'var(--ink-2)',
                  font: '500 14px Inter', cursor: 'not-allowed',
                  display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
                }}>
                <Icon name="cart" size={20}/>
                <span style={{ flex: 1, textAlign: 'left' }}>Mag-order para sa Miyerkules</span>
              </button>
            ) : sukiExceeded ? (
              <button onClick={onPlaceOrder}
                style={{
                  width: '100%', height: 56, border: 0,
                  background: 'var(--warning)', color: '#fff',
                  font: '500 14px Inter', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
                }}>
                <span style={{ flex: 1, textAlign: 'left' }}>Lumagpas sa suki · magbayad muna</span>
                <Icon name="chevron-right" size={20}/>
              </button>
            ) : (
              <button onClick={onPlaceOrder}
                style={{
                  width: '100%', height: 56, border: 0,
                  background: 'var(--action)', color: '#fff',
                  font: '500 15px Inter', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
                  letterSpacing: '-0.005em',
                }}>
                <Icon name="cart" size={20}/>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  Place order · <span className="tnum">{cartCount}</span> {cartCount === 1 ? 'item' : 'items'}
                </span>
                <span className="tnum" style={{ font: '500 16px Inter' }}>{peso(cartTotal)}</span>
              </button>
            )}
          </div>
        )}

        {showStepperHint && cartCount > 0 && (
          <div style={{
            pointerEvents: 'auto',
            marginTop: 8,
            background: '#1F1D1A', color: '#fff',
            borderRadius: 8, padding: '7px 12px',
            font: '400 11px Inter',
            textAlign: 'center',
            animation: 'fadeUp .25s',
          }}>
            Pindutin ulit ang unit para baguhin ang dami
          </div>
        )}
      </div>
    </>
  );
};

const ProductCardLive = ({ p, cartEntry, onTap }) => {
  const dirColor = p.dir === 'up' ? 'var(--warning)' : p.dir === 'down' ? 'var(--success)' : 'var(--ink-3)';
  const dirIcon = p.dir === 'up' ? 'arrow-up' : p.dir === 'down' ? 'arrow-down' : 'minus';
  const dirLabel = p.dir === 'flat' ? 'Stable' : `₱${p.delta}`;
  const hasSource = p.t !== '—';

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--hair)',
      borderRadius: 12,
      padding: '12px 14px 14px',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <PhotoPH size={44} label={p.ph}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ font: '500 15px/1.15 Inter', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.tag}
              </div>
              <div style={{ font: '400 11px/1.3 Inter', color: 'var(--ink-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.en}{hasSource && <> · {p.src} · {p.t}</>}
              </div>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, color: dirColor, font: '500 12px Inter', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {p.dir !== 'flat' && <Icon name={dirIcon} size={11} color={dirColor}/>}
              {dirLabel}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {p.units.map(u => {
          const active = cartEntry?.unitKey === u.k;
          return (
            <button key={u.k}
              onClick={() => onTap(u.k)}
              className={`unit-btn${active ? ' active' : ''}`}
              style={{ cursor: 'pointer', transition: 'background .15s, color .15s, border-color .15s' }}
            >
              {active && cartEntry.qty > 0 && (
                <span className="tnum" style={{ background: '#fff', color: 'var(--ink)', borderRadius: 4, padding: '1px 5px', font: '500 11px Inter', marginRight: 2 }}>{cartEntry.qty}×</span>
              )}
              {u.label} · {peso(u.price)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const EmptyCat = ({ name }) => (
  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ink-2)' }}>
    <div style={{ font: '500 15px Inter', color: 'var(--ink)' }}>Walang produkto sa {name}</div>
    <div style={{ font: '400 13px Inter', marginTop: 6 }}>Babalik kami mamaya po.</div>
  </div>
);

// ---------- Orders Tab ----------
const OrdersTab = ({ orders, reorder }) => {
  const [expanded, setExpanded] = useState(orders[0]?.id);
  return (
    <>
      <div style={{ padding: '12px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, font: '500 22px/1 Inter', letterSpacing: '-0.01em' }}>Mga order</h1>
        <button style={{ width: 40, height: 40, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="filter" size={18}/>
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Wala pa pong order"
          subtitle="Magsimula sa Sariwa."
          ctaLabel="Mag-browse"
        />
      ) : (
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, paddingBottom: 100 }}>
          {orders.map(o => (
            <div key={o.id} className="card" style={{ padding: 14, cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div className="tnum" style={{ font: '500 15px Inter' }}>Order #{o.id}</div>
                  <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 2 }}>
                    {o.when} · {o.count} {o.count === 1 ? 'item' : 'items'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tnum sh-display" style={{ font: '500 16px Inter' }}>{peso(o.total)}</div>
                  <div style={{ marginTop: 4 }}>
                    <Pill tone={o.tone} dot>{o.status}</Pill>
                  </div>
                </div>
              </div>

              {expanded === o.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--hair)' }}>
                  {o.items.length > 0 ? o.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', font: '400 13px Inter' }}>
                      <span>{it.name}</span>
                      <span className="tnum" style={{ color: 'var(--ink-2)' }}>{peso(it.price)}</span>
                    </div>
                  )) : (
                    <div style={{ font: '400 13px Inter', color: 'var(--ink-2)' }}>Pinagsama na sa mga settled na.</div>
                  )}
                  <div style={{ marginTop: 10, font: '400 12px Inter', color: 'var(--ink-2)' }}>Bayad: {o.pay}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); reorder(o.id); }}
                    style={{ marginTop: 12, height: 36, padding: '0 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--hair-strong)', font: '500 13px Inter', color: 'var(--ink)', cursor: 'pointer' }}
                  >
                    Mag-order ulit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ---------- Suki Tab ----------
const SukiTab = ({ used, ledger }) => {
  const remaining = SUKI_LIMIT - used;
  return (
    <>
      <div style={{ padding: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, font: '500 22px/1 Inter', letterSpacing: '-0.01em' }}>Suki ledger</h1>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: 'var(--ink)', color: '#fff',
          borderRadius: 14, padding: '18px 18px 16px',
        }}>
          <div style={{ font: '400 12px Inter', color: 'rgba(255,255,255,0.65)' }}>Kasalukuyang balanse</div>
          <div className="tnum sh-display" style={{ font: '500 38px/1 Inter', letterSpacing: '-0.025em', marginTop: 6 }}>
            ₱{used.toLocaleString()}<span style={{ font: '400 18px Inter', color: 'rgba(255,255,255,0.5)' }}>.00</span>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: '400 12px Inter', color: 'rgba(255,255,255,0.65)' }}>Credit limit</span>
            <span className="tnum" style={{ font: '500 13px Inter' }}>{peso(SUKI_LIMIT)}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (used / SUKI_LIMIT) * 100)}%`, height: '100%', background: 'var(--success)', transition: 'width .25s' }}/>
          </div>
          <div style={{ marginTop: 8, font: '400 11px Inter', color: 'rgba(255,255,255,0.6)' }}>
            {peso(remaining)} pa po ang puwedeng gamitin. Good standing.
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 20px 0', flex: 1, overflowY: 'auto', paddingBottom: 110 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', paddingBottom: 8 }}>
          <span>Transaction</span>
          <span>Halaga · Balanse</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
          {ledger.map((r, i) => {
            const isPay = r.amt > 0;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px',
                borderBottom: i === ledger.length - 1 ? 'none' : '1px solid var(--hair)',
              }}>
                <div>
                  <div style={{ font: '500 13px Inter', color: 'var(--ink)' }}>{r.desc}</div>
                  <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{r.d}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tnum" style={{ font: '500 14px Inter', color: isPay ? 'var(--success)' : 'var(--ink)' }}>
                    {isPay ? '+' : '−'}{peso(Math.abs(r.amt))}
                  </div>
                  <div className="tnum" style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>
                    {peso(r.bal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: 92,
      }}>
        <button className="btn btn-primary btn-block" style={{ height: 52, cursor: 'pointer' }}>
          Magbayad
        </button>
      </div>
    </>
  );
};

// ---------- Account Tab ----------
const AccountTab = ({ offline, setOffline, cutoffPassed, setCutoffPassed, onSignOut }) => (
  <>
    <div style={{ padding: '12px 20px 14px' }}>
      <h1 style={{ margin: 0, font: '500 22px/1 Inter', letterSpacing: '-0.01em' }}>Account</h1>
    </div>

    <div style={{ padding: '0 20px', flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
      <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--action)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 18px Inter' }}>AM</div>
        <div style={{ flex: 1 }}>
          <div style={{ font: '500 15px Inter' }}>{STORE_NAME}</div>
          <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 2 }}>+63 917 845 2310 · Tagbac Norte</div>
        </div>
        <Icon name="edit" size={18} color="var(--ink-3)"/>
      </div>

      <SettingsBlock title="Mga setting ng app">
        <SettingRow icon="truck" label="Delivery route" value="Tagbac · Stop 7"/>
        <SettingRow icon="wallet" label="Default payment" value="Suki credit"/>
        <SettingRow icon="clock" label="Order cutoff" value="11:00 PM araw-araw"/>
        <SettingRow icon="phone" label="Contact buyer" value="0917-555-0188" highlight/>
      </SettingsBlock>

      <SettingsBlock title="Demo controls" subtitle="Para makita ang ibang states ng app.">
        <ToggleRow icon="wifi-off" label="Offline mode" value={offline} onChange={setOffline}/>
        <ToggleRow icon="clock" label="After cutoff" value={cutoffPassed} onChange={setCutoffPassed}/>
      </SettingsBlock>

      <button
        onClick={onSignOut}
        className="btn btn-secondary btn-block"
        style={{ marginTop: 16, height: 50, color: 'var(--danger)', borderColor: '#EBD3CF', cursor: 'pointer' }}
      >
        Mag-log out
      </button>

      <div style={{ font: '400 11px Inter', color: 'var(--ink-3)', textAlign: 'center', marginTop: 18 }}>
        SariHub v1.0 · Build 102
      </div>
    </div>
  </>
);

const SettingsBlock = ({ title, subtitle, children }) => (
  <div style={{ marginTop: 20 }}>
    <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
      {title}
    </div>
    {subtitle && <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginBottom: 8, marginTop: -4 }}>{subtitle}</div>}
    <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

const SettingRow = ({ icon, label, value, highlight }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--hair)' }}>
    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F1ECE2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
      <Icon name={icon} size={15}/>
    </div>
    <span style={{ flex: 1, font: '500 13px Inter' }}>{label}</span>
    <span style={{ font: '400 13px Inter', color: highlight ? 'var(--action)' : 'var(--ink-2)' }}>{value}</span>
    <Icon name="chevron-right" size={16} color="var(--ink-3)"/>
  </div>
);

const ToggleRow = ({ icon, label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--hair)' }}>
    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F1ECE2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
      <Icon name={icon} size={15}/>
    </div>
    <span style={{ flex: 1, font: '500 13px Inter' }}>{label}</span>
    <button onClick={() => onChange(!value)}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: value ? 'var(--action)' : '#D8D2C4',
        border: 0, position: 'relative', cursor: 'pointer',
        transition: 'background .15s',
      }}>
      <span style={{
        position: 'absolute', top: 2, left: value ? 20 : 2,
        width: 22, height: 22, borderRadius: 11, background: '#fff',
        transition: 'left .15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}/>
    </button>
  </div>
);

// ---------- Cart Sheet ----------
const CartSheet = ({ items, total, paymentMethod, setPaymentMethod, sukiExceeded, sukiUsed, onClose, onRemove, onUpdateQty, onConfirm }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    onClick={onClose}>
    {/* backdrop */}
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,16,0.45)', animation: 'fadeIn .18s' }}/>
    {/* sheet — sized to phone */}
    <div onClick={e => e.stopPropagation()}
      style={{
        position: 'relative', width: 'min(390px, 100%)',
        background: 'var(--bg)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 32,
        marginBottom: 12,
        maxHeight: '78%',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp .22s cubic-bezier(0.2,0.7,0.3,1)',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.18)',
      }}>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--hair-strong)' }}/>
      </div>

      <div style={{ padding: '14px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ font: '500 18px/1 Inter', letterSpacing: '-0.01em' }}>Order review</div>
        <div className="tnum" style={{ font: '400 13px Inter', color: 'var(--ink-2)' }}>{items.length} {items.length === 1 ? 'line' : 'lines'}</div>
      </div>
      <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', padding: '4px 20px 12px' }}>
        Mga presyong nakalock hanggang 11:00 PM cutoff.
      </div>

      {/* items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {items.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', font: '400 14px Inter', color: 'var(--ink-2)' }}>
            Walang laman ang cart.
          </div>
        ) : items.map(it => (
          <div key={it.pid} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0', borderBottom: '1px solid var(--hair)',
          }}>
            <PhotoPH size={40}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lbl-tag" style={{ fontSize: 14 }}>{it.p.tag}</div>
              <div className="lbl-en">{it.u.label} × {it.qty}</div>
            </div>
            {/* qty stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#F1ECE2', borderRadius: 8, padding: 2 }}>
              <button onClick={() => onUpdateQty(it.pid, it.qty - 1)}
                style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
                <Icon name="minus" size={14}/>
              </button>
              <span className="tnum" style={{ minWidth: 22, textAlign: 'center', font: '500 13px Inter' }}>{it.qty}</span>
              <button onClick={() => onUpdateQty(it.pid, it.qty + 1)}
                style={{ width: 28, height: 28, borderRadius: 6, background: '#fff', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
                <Icon name="plus" size={14}/>
              </button>
            </div>
            <span className="tnum" style={{ font: '500 14px Inter', minWidth: 52, textAlign: 'right' }}>{peso(it.lineTotal)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--hair)' }}>
        <span style={{ font: '500 14px Inter' }}>Kabuuan</span>
        <span className="tnum sh-display" style={{ font: '500 22px Inter', letterSpacing: '-0.01em' }}>{peso(total)}.00</span>
      </div>

      {/* Payment */}
      <div style={{ padding: '4px 20px 0' }}>
        <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginBottom: 8 }}>Bayad</div>
        <div style={{ display: 'flex', gap: 6, background: '#F1ECE2', padding: 4, borderRadius: 10 }}>
          {[
            { id: 'suki', label: 'Suki credit', icon: 'wallet' },
            { id: 'cash', label: 'Cash on delivery', icon: 'cash' },
            { id: 'gcash', label: 'GCash', icon: 'gcash' },
          ].map(opt => {
            const active = paymentMethod === opt.id;
            return (
              <button key={opt.id}
                onClick={() => setPaymentMethod(opt.id)}
                style={{
                  flex: 1, height: 38, borderRadius: 7,
                  background: active ? '#fff' : 'transparent',
                  border: 0,
                  font: `${active ? 500 : 400} 12px Inter`,
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  cursor: 'pointer',
                }}>
                <Icon name={opt.icon} size={14}/> {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm */}
      <div style={{ padding: '14px 20px 0' }}>
        {sukiExceeded && paymentMethod === 'suki' && (
          <div style={{ background: 'var(--warning-soft)', color: '#8D5712', padding: '10px 12px', borderRadius: 8, font: '400 12px/1.4 Inter', marginBottom: 10 }}>
            Lumagpas po kayo sa suki limit. Piliin ang GCash o cash, o magbayad muna.
          </div>
        )}
        <button
          onClick={onConfirm}
          disabled={items.length === 0 || (sukiExceeded && paymentMethod === 'suki')}
          className="btn btn-primary btn-block"
          style={{
            height: 54, cursor: items.length === 0 ? 'not-allowed' : 'pointer',
            opacity: (items.length === 0 || (sukiExceeded && paymentMethod === 'suki')) ? 0.5 : 1,
          }}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>Place order</span>
          <span className="tnum">{peso(total)}</span>
          <Icon name="chevron-right" size={20}/>
        </button>
        <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', textAlign: 'center', marginTop: 10 }}>
          Delivery bukas 6:30 AM · Tagbac route, stop 7
        </div>
      </div>
    </div>
  </div>
);

// ---------- Confirmation Modal ----------
const ConfirmModal = ({ order, onReorder, onHistory }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,18,16,0.45)' }}>
    <div className="sh" style={{ position: 'relative', borderRadius: 32, overflow: 'hidden', animation: 'pop .25s cubic-bezier(0.2,0.7,0.3,1)' }}>
      <StatusBar/>
      <div style={{ padding: '60px 24px 0' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 999, background: 'var(--success-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pop .35s cubic-bezier(0.2,0.7,0.3,1) .05s both',
        }}>
          <Icon name="check" size={36} color="var(--success)" strokeWidth={2.4}/>
        </div>
        <h1 style={{ margin: '24px 0 0', font: '500 32px/1.1 Inter', letterSpacing: '-0.02em' }}>
          Tapos na po!
        </h1>
        <p style={{ margin: '8px 0 0', font: '400 16px/1.5 Inter', color: 'var(--ink-2)' }}>
          Delivery bukas, <span style={{ color: 'var(--ink)', fontWeight: 500 }}>6:30 AM</span>.<br/>
          Tagbac route · stop 7 of 18.
        </p>

        <div className="card" style={{ marginTop: 26, padding: '14px 16px', maxHeight: 280, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ font: '500 13px Inter', color: 'var(--ink-2)' }}>Order #{order.id}</span>
            <Pill tone="action" dot>Sent</Pill>
          </div>
          {order.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', font: '400 14px/1.5 Inter' }}>
              <span style={{ color: 'var(--ink)' }}>{it.name}</span>
              <span className="tnum" style={{ color: 'var(--ink-2)' }}>{peso(it.price)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--hair)', marginTop: 12, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ font: '500 15px Inter' }}>Kabuuan</span>
            <span className="tnum sh-display" style={{ font: '500 18px Inter' }}>{peso(order.total)}.00</span>
          </div>
          <div style={{ marginTop: 8, font: '400 12px Inter', color: 'var(--ink-2)' }}>
            Bayad: {order.pay}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 36 }}>
        <button onClick={onReorder} className="btn btn-primary btn-block" style={{ height: 52, marginBottom: 10, cursor: 'pointer' }}>
          Mag-order ulit
        </button>
        <button onClick={onHistory} className="btn btn-secondary btn-block" style={{ height: 52, cursor: 'pointer' }}>
          Tingnan ang history
        </button>
      </div>
      <HomeBar/>
    </div>
  </div>
);

// ---------- Qty Modal (when re-tapping same unit) ----------
const QtyModal = ({ productId, cart, setQty, onClose }) => {
  const p = CATALOG.find(x => x.id === productId);
  const entry = cart[productId];
  if (!p || !entry) { onClose(); return null; }
  const u = p.units.find(x => x.k === entry.unitKey);
  const [val, setVal] = useState(entry.qty);

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(20,18,16,0.4)', animation: 'fadeIn .15s' }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          width: 'min(390px, 100%)',
          background: '#fff',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '14px 20px 28px',
          marginBottom: 12,
          animation: 'slideUp .2s cubic-bezier(0.2,0.7,0.3,1)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--hair-strong)' }}/>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ font: '500 18px Inter' }}>{p.tag}</div>
          <div style={{ font: '400 13px Inter', color: 'var(--ink-2)', marginTop: 2 }}>
            {u.label} · {peso(u.price)} bawat isa
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 24 }}>
          <button onClick={() => setVal(Math.max(0, val - 1))}
            style={{ width: 56, height: 56, borderRadius: 999, background: '#F1ECE2', border: 0, color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="minus" size={22}/>
          </button>
          <div style={{ minWidth: 80, textAlign: 'center' }}>
            <div className="tnum sh-display" style={{ font: '500 44px/1 Inter', letterSpacing: '-0.02em' }}>{val}</div>
            <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
              = {peso(val * u.price)}
            </div>
          </div>
          <button onClick={() => setVal(val + 1)}
            style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--ink)', border: 0, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={22}/>
          </button>
        </div>

        <button
          onClick={() => { setQty(productId, val); onClose(); }}
          className="btn btn-primary btn-block" style={{ height: 52, marginTop: 24, cursor: 'pointer' }}>
          {val === 0 ? 'Tanggalin sa cart' : `I-save · ${peso(val * u.price)}`}
        </button>
      </div>
    </div>
  );
};

// ---------- Empty State ----------
const EmptyState = ({ title, subtitle, ctaLabel }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
    <div style={{ width: 64, height: 64, borderRadius: 16, background: '#F1ECE2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      <Icon name="package" size={28} color="var(--ink-3)"/>
    </div>
    <div style={{ font: '500 18px Inter' }}>{title}</div>
    <div style={{ font: '400 14px Inter', color: 'var(--ink-2)', marginTop: 6 }}>{subtitle}</div>
    {ctaLabel && (
      <button className="btn btn-primary" style={{ height: 44, padding: '0 22px', marginTop: 18 }}>{ctaLabel}</button>
    )}
  </div>
);

// ---------- Toast ----------
const Toast = ({ msg }) => (
  <div style={{
    position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)',
    background: '#1F1D1A', color: '#fff', padding: '12px 18px', borderRadius: 999,
    font: '500 13px Inter', zIndex: 100,
    animation: 'slideUp .2s',
  }}>{msg}</div>
);

Object.assign(window, {
  DeviceFrame, OtpPhone, OtpCode, AppShell, BottomNav,
  HomeTab, OrdersTab, SukiTab, AccountTab,
  CartSheet, ConfirmModal, QtyModal, EmptyState, Toast,
});
