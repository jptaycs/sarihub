// Combined truck-crew app — covers BOTH packing (pre-departure) and delivery (on route).
// Mode toggle at the top: Packing → Delivery. Single source of truth for which orders are packed.

const { useState: cUseState } = React;

const CrewApp = () => {
  // Single shared queue of stops/orders. Each entry tracks lifecycle:
  //   pack: pending | packed | delivered
  // Pre-departure: helper packs orders into the truck.
  // Post-departure: same helper navigates + completes deliveries from the passenger seat.
  const [orders, setOrders] = cUseState(() =>
    STOPS_TAGBAC.map(s => ({
      ...s,
      pack: 'pending', // pending → packed → delivered
    }))
  );
  // Per-order packing checklist state, keyed by `${orderN}-${itemIdx}`
  const [checked, setChecked] = cUseState({});

  // Pick mode based on packing state by default; user can flip manually.
  const allPacked = orders.every(o => o.pack !== 'pending');
  const [mode, setMode] = cUseState('pack'); // pack | deliver

  // When all are packed, nudge user to switch — but only if they're still on pack mode and haven't manually picked.
  React.useEffect(() => {
    if (allPacked && mode === 'pack' && orders.every(o => o.pack === 'packed')) {
      // Suggest switching by setting a tiny ribbon (handled via banner)
    }
  }, [allPacked, mode, orders]);

  // -------- shared helpers --------
  const setOrder = (n, patch) => {
    setOrders(prev => prev.map(o => o.n === n ? { ...o, ...patch } : o));
  };

  // Counts
  const packedCount = orders.filter(o => o.pack !== 'pending').length;
  const deliveredCount = orders.filter(o => o.pack === 'delivered').length;
  const total = orders.length;

  // Truck weight (everything packed adds to it; delivered items stay loaded mentally for the demo)
  const truckKg = orders.filter(o => o.pack !== 'pending').reduce((s, o) => s + o.kg, 0);
  const truckPct = Math.min(100, (truckKg / 1000) * 100);

  return (
    <div className="sh" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <CrewHeader
        mode={mode} setMode={setMode}
        packedCount={packedCount} deliveredCount={deliveredCount} total={total}
        truckKg={truckKg} truckPct={truckPct}
        allPacked={allPacked}
      />

      {mode === 'pack' ? (
        <PackingMode orders={orders} setOrder={setOrder} checked={checked} setChecked={setChecked} truckKg={truckKg}/>
      ) : (
        <DeliveryMode orders={orders} setOrder={setOrder} truckKg={truckKg}/>
      )}

      <HomeBar/>
    </div>
  );
};

// ============================================================
// Header — top of every screen. Mode toggle + truck-load bar.
// ============================================================
const CrewHeader = ({ mode, setMode, packedCount, deliveredCount, total, truckKg, truckPct, allPacked }) => {
  const tone = truckPct > 100 ? 'danger' : truckPct > 85 ? 'warning' : 'success';
  const barColor = tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid var(--hair)', flexShrink: 0 }}>
      {/* Title + person */}
      <div style={{ padding: '6px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Tagbac route · May 22
          </div>
          <div style={{ font: '500 15px Inter', marginTop: 2 }}>
            Mang Ariel · kasama · Tamaraw 01
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {mode === 'pack' ? (
            <>
              <div className="tnum sh-display" style={{ font: '500 17px Inter' }}>{packedCount}/{total}</div>
              <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>na-pack</div>
            </>
          ) : (
            <>
              <div className="tnum sh-display" style={{ font: '500 17px Inter' }}>{deliveredCount}/{total}</div>
              <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>na-deliver</div>
            </>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4 }}>
          {[
            { id: 'pack',    label: 'Pack-an',    icon: 'package' },
            { id: 'deliver', label: 'I-deliver',  icon: 'truck' },
          ].map(t => {
            const active = mode === t.id;
            const nudge = !active && t.id === 'deliver' && allPacked;
            return (
              <button key={t.id} onClick={() => setMode(t.id)}
                style={{
                  flex: 1, height: 38, borderRadius: 7,
                  background: active ? '#fff' : 'transparent',
                  border: 0, cursor: 'pointer',
                  font: `${active ? 500 : 400} 13px Inter`,
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  position: 'relative',
                }}>
                <Icon name={t.icon} size={15} color={active ? 'var(--ink)' : 'var(--ink-2)'}/>
                {t.label}
                {nudge && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--action)', marginLeft: 2 }}/>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Truck capacity bar */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="truck" size={13} color="var(--ink-2)"/>
              <span style={{ font: '500 11px Inter' }}>Truck load</span>
            </div>
            <span className="tnum" style={{ font: '500 12px Inter', color: barColor }}>
              {truckKg.toFixed(1)} / 1000 kg
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: '#F1ECE2', marginTop: 5, overflow: 'hidden' }}>
            <div style={{ width: `${truckPct}%`, height: '100%', background: barColor, transition: 'width .3s' }}/>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PACKING MODE — checklist per pending order
// ============================================================
const PackingMode = ({ orders, setOrder, checked, setChecked, truckKg }) => {
  const pending = orders.filter(o => o.pack === 'pending');
  const [activeN, setActiveN] = cUseState(pending[0]?.n);
  const [showConfirm, setShowConfirm] = cUseState(false);

  // Track active across changes — when current is removed, move to next pending
  React.useEffect(() => {
    if (!activeN || !pending.find(p => p.n === activeN)) {
      setActiveN(pending[0]?.n);
    }
  }, [pending.length]);

  const active = orders.find(o => o.n === activeN);
  const items = active ? (STOP_ITEMS[active.n] || [
    { tag: 'Line item 1', en: 'See manifest', kg: 1, price: 100 },
    { tag: 'Line item 2', en: 'See manifest', kg: 1, price: 100 },
    { tag: 'Line item 3', en: 'See manifest', kg: 1, price: 100 },
  ]) : [];
  const checkedCount = active ? items.filter((_, i) => checked[`${active.n}-${i}`]).length : 0;
  const allChecked = active && checkedCount === items.length && items.length > 0;

  const toggle = (i) => {
    if (!active) return;
    setChecked(prev => ({ ...prev, [`${active.n}-${i}`]: !prev[`${active.n}-${i}`] }));
  };

  const finalizePack = () => {
    if (!active) return;
    setOrder(active.n, { pack: 'packed' });
    setShowConfirm(false);
  };

  if (!active) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={36} color="var(--success)" strokeWidth={2.4}/>
        </div>
        <div style={{ font: '500 22px Inter', marginTop: 18 }}>Tapos na ang pag-pack!</div>
        <div style={{ font: '400 14px Inter', color: 'var(--ink-2)', marginTop: 6, maxWidth: 280 }}>
          Pwede na umalis. Pumunta sa <span style={{ color: 'var(--ink)', fontWeight: 500 }}>I-deliver</span> tab para sa route.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Queue strip */}
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {pending.map(o => {
          const isActive = o.n === activeN;
          return (
            <button key={o.n}
              onClick={() => setActiveN(o.n)}
              style={{
                flex: '0 0 auto', height: 52, padding: '0 12px',
                borderRadius: 10,
                background: isActive ? 'var(--ink)' : '#fff',
                color: isActive ? '#fff' : 'var(--ink)',
                border: isActive ? 'none' : '1px solid var(--hair)',
                font: '500 12px Inter',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                textAlign: 'left',
              }}
            >
              <span className="tnum" style={{ font: '500 10px Inter', opacity: 0.7 }}>Stop {o.n}</span>
              <span style={{ font: '500 12px Inter' }}>{o.store.split(' ').slice(0, 2).join(' ')}</span>
            </button>
          );
        })}
      </div>

      {/* Active order */}
      <div style={{ padding: '14px 16px 0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Stop {active.n}
            </div>
            <div style={{ font: '500 18px/1.15 Inter', marginTop: 2, letterSpacing: '-0.01em' }}>{active.store}</div>
            <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
              {active.items} items · {active.kg} kg · {active.pay === 'suki' ? 'Suki' : active.pay === 'gcash' ? 'GCash' : 'Cash'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tnum sh-display" style={{ font: '500 20px Inter' }}>{peso2(active.total)}</div>
            <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{checkedCount}/{items.length}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 92 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((it, i) => {
              const isChecked = checked[`${active.n}-${i}`];
              return (
                <button key={i}
                  onClick={() => toggle(i)}
                  style={{
                    background: isChecked ? 'var(--success-soft)' : '#fff',
                    border: `1px solid ${isChecked ? '#B5DECC' : 'var(--hair)'}`,
                    borderRadius: 12, padding: '14px 14px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background .15s, border-color .15s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: isChecked ? 'var(--success)' : '#fff',
                    border: isChecked ? '2px solid var(--success)' : '2px solid var(--hair-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    transition: 'background .15s, border-color .15s',
                  }}>
                    {isChecked && <Icon name="check" size={18} color="#fff" strokeWidth={3}/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '500 15px Inter', color: 'var(--ink)', textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.7 : 1 }}>
                      {it.tag}
                    </div>
                    <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 2 }}>
                      {it.en} · {it.kg} kg
                    </div>
                  </div>
                  <PhotoPH size={40} style={{ borderRadius: 6, flex: '0 0 40px', opacity: isChecked ? 0.5 : 1 }}/>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky CTA — sits above the homebar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 22, padding: '12px 16px', background: 'linear-gradient(to top, var(--bg) 70%, rgba(250,247,242,0))' }}>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!allChecked}
            className="btn btn-primary btn-block"
            style={{ height: 54, cursor: allChecked ? 'pointer' : 'not-allowed', opacity: allChecked ? 1 : 0.45 }}
          >
            <Icon name="package" size={20}/>
            <span style={{ flex: 1, textAlign: 'left' }}>
              {allChecked ? 'Konpirmahin · i-load sa truck' : `Kulang pa · ${items.length - checkedCount} item`}
            </span>
            {allChecked && <Icon name="chevron-right" size={20}/>}
          </button>
        </div>
      </div>

      {showConfirm && (
        <HelperConfirmModal
          order={active}
          truckKg={truckKg + active.kg}
          truckPct={Math.min(100, ((truckKg + active.kg) / 1000) * 100)}
          onConfirm={finalizePack}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

// ============================================================
// DELIVERY MODE — route, stop detail, POD, signature
// ============================================================
const DeliveryMode = ({ orders, setOrder, truckKg }) => {
  // Find next packed-but-not-delivered stop. Move down the route in stop-number order.
  const route = orders.map(o => ({
    ...o,
    status: o.pack === 'delivered' ? 'done' :
            o.pack === 'pending' ? 'unpacked' :
            'packed', // available for delivery
  }));

  // The "current" stop = first non-delivered, non-pending in route order
  const firstAvailable = route.find(o => o.status === 'packed');
  const [activeN, setActiveN] = cUseState(firstAvailable?.n);
  const [view, setView] = cUseState('route'); // route | stop | pod-photo | pod-sig | done
  const [podPhoto, setPodPhoto] = cUseState(false);
  const [signed, setSigned] = cUseState(false);
  const [callOpen, setCallOpen] = cUseState(false);

  React.useEffect(() => {
    // If active becomes invalid, pick next available
    if (!activeN || !route.find(o => o.n === activeN && o.status !== 'done')) {
      const next = route.find(o => o.status === 'packed');
      if (next) setActiveN(next.n);
    }
  }, [orders]);

  const stop = orders.find(o => o.n === activeN);

  const collectedCash = orders.filter(o => o.pack === 'delivered' && o.pay === 'cash').reduce((s, x) => s + x.total, 0);

  const deliverCurrent = () => {
    if (!stop) return;
    if (stop.pay === 'suki') {
      setView('pod-photo');
      setPodPhoto(false);
      setSigned(false);
    } else {
      finalizeDelivery();
    }
  };

  const finalizeDelivery = () => {
    setOrder(stop.n, { pack: 'delivered' });
    setView('done');
    setTimeout(() => {
      // Advance to next packed
      const next = orders
        .filter(o => o.n !== stop.n && o.pack === 'packed')
        .sort((a, b) => a.n - b.n)[0];
      if (next) setActiveN(next.n);
      setView('route');
    }, 1400);
  };

  // If no packed-undelivered stop AND there are still pending orders, prompt to pack
  const hasAnyPacked = orders.some(o => o.pack === 'packed');
  const hasPending = orders.some(o => o.pack === 'pending');
  const allDelivered = orders.every(o => o.pack === 'delivered');

  if (allDelivered) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: 999, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={48} color="var(--success)" strokeWidth={2.4}/>
        </div>
        <div style={{ font: '500 24px/1.1 Inter', letterSpacing: '-0.02em', marginTop: 18 }}>
          Tapos na lahat
        </div>
        <div style={{ font: '400 14px/1.4 Inter', color: 'var(--ink-2)', marginTop: 6, maxWidth: 280 }}>
          {orders.length} stops na-deliver. Cash collected: {peso2(collectedCash)}.
        </div>
      </div>
    );
  }

  if (!hasAnyPacked && hasPending) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="package" size={36} color="var(--warning)"/>
        </div>
        <div style={{ font: '500 20px Inter', marginTop: 18 }}>Walang naipak na order</div>
        <div style={{ font: '400 13px/1.4 Inter', color: 'var(--ink-2)', marginTop: 6, maxWidth: 280 }}>
          Bumalik sa <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Pack-an</span> tab muna.
        </div>
      </div>
    );
  }

  if (!stop) return null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Cash on hand pill — only when there's cash collected */}
      {collectedCash > 0 && view === 'route' && (
        <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
          <div style={{ padding: '6px 10px', background: 'var(--success-soft)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="cash" size={14} color="var(--success)"/>
            <span style={{ font: '500 12px Inter', color: '#127555' }}>Cash on hand:</span>
            <span className="tnum" style={{ font: '500 13px Inter', color: '#127555' }}>{peso2(collectedCash)}</span>
          </div>
        </div>
      )}

      {view === 'route' && (
        <DeliveryRouteView
          orders={orders}
          activeStopN={activeN}
          onSelect={(n) => { setActiveN(n); setView('stop'); }}
          onOpenStop={() => { setView('stop'); }}
          onCall={() => setCallOpen(true)}
        />
      )}

      {view === 'stop' && (
        <DriverStopDetail
          stop={stop}
          onBack={() => setView('route')}
          onDeliver={deliverCurrent}
          onCall={() => setCallOpen(true)}
        />
      )}

      {view === 'pod-photo' && (
        <PodPhotoStep stop={stop}
          captured={podPhoto}
          onCapture={() => setPodPhoto(true)}
          onRetake={() => setPodPhoto(false)}
          onNext={() => setView('pod-sig')}
          onBack={() => setView('stop')}
        />
      )}

      {view === 'pod-sig' && (
        <PodSigStep stop={stop}
          signed={signed}
          onSign={() => setSigned(true)}
          onClear={() => setSigned(false)}
          onFinalize={finalizeDelivery}
          onBack={() => setView('pod-photo')}
        />
      )}

      {view === 'done' && (
        <DriverDoneFlash stop={stop} next={orders.filter(o => o.n !== stop.n && o.pack === 'packed').sort((a,b) => a.n - b.n)[0]}/>
      )}

      {callOpen && <CallSheet stop={stop} onClose={() => setCallOpen(false)}/>}
    </div>
  );
};

// Route view variant that uses the unified `orders` shape
const DeliveryRouteView = ({ orders, activeStopN, onSelect, onOpenStop, onCall }) => {
  const current = orders.find(o => o.n === activeStopN);
  const done = orders.filter(o => o.pack === 'delivered');
  const upcoming = orders.filter(o => o.pack === 'packed' && o.n !== activeStopN).sort((a, b) => a.n - b.n);
  const unpacked = orders.filter(o => o.pack === 'pending');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Map */}
      <div style={{ height: 180, position: 'relative', background: '#EEF1EB', flexShrink: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 390 180" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
          <rect width="390" height="180" fill="#EEF1EB"/>
          {[[10,12,80,42],[110,8,90,46],[220,15,70,38],[310,12,70,46],
            [10,68,110,42],[140,72,80,38],[240,68,70,46],[330,72,70,46],
            [10,128,70,46],[100,132,90,38],[220,128,90,46],[330,132,70,46]].map(([x,y,w,h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="#DDE4DA" rx="2"/>
          ))}
          <path d="M0 60 L390 60 M0 118 L390 118 M0 172 L390 172" stroke="#F5F0E5" strokeWidth="10"/>
          <path d="M95 0 L95 180 M210 0 L210 180 M305 0 L305 180" stroke="#F5F0E5" strokeWidth="10"/>
          <path d="M20 160 Q 80 155 110 135 T 170 105 T 220 80 T 280 50 T 360 22"
            fill="none" stroke="#D85A30" strokeWidth="2.5" strokeDasharray="0" strokeLinecap="round" opacity="0.5"/>
          {/* Animate dot at current */}
          <circle cx="200" cy="88" r="14" fill="rgba(216,90,48,0.18)">
            <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="200" cy="88" r="8" fill="#D85A30" stroke="#fff" strokeWidth="2.5"/>
        </svg>
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Pill tone="dark" dot>Susunod · 3.2 km · 8 min</Pill>
          <button style={{ width: 32, height: 32, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="mapPin" size={16}/>
          </button>
        </div>
      </div>

      {/* Current stop card */}
      {current && current.pack === 'packed' && (
        <div style={{ padding: '12px 16px 6px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '12px 12px 10px', borderColor: 'var(--action)', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="tnum" style={{ font: '500 11px Inter', color: 'var(--action)' }}>STOP {current.n}</span>
                  <Pill tone="action">Current</Pill>
                </div>
                <div style={{ font: '500 16px/1.2 Inter', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {current.store}
                </div>
                <div style={{ font: '400 12px/1.3 Inter', color: 'var(--ink-2)', marginTop: 2 }}>
                  {current.addr.split(',')[0]}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                <div className="tnum sh-display" style={{ font: '500 18px Inter' }}>{peso2(current.total)}</div>
                <div style={{ marginTop: 4 }}>
                  <Pill tone={current.pay === 'suki' ? 'warning' : current.pay === 'gcash' ? 'action' : 'neutral'} dot>
                    {current.pay === 'suki' ? 'Suki' : current.pay === 'gcash' ? 'GCash' : 'Cash'}
                  </Pill>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={onCall} className="btn btn-secondary" style={{ flex: 1, height: 46, cursor: 'pointer' }}>
                <Icon name="phone" size={18}/> Tawag
              </button>
              <button onClick={onOpenStop} className="btn btn-primary" style={{ flex: 1.4, height: 46, cursor: 'pointer' }}>
                <Icon name="check" size={18}/> Buksan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming + done list */}
      <div style={{ padding: '4px 16px 24px', flex: 1, overflowY: 'auto' }}>
        {upcoming.length > 0 && (
          <>
            <div style={{ font: '500 10px Inter', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '8px 4px 4px' }}>
              Susunod ({upcoming.length})
            </div>
            {upcoming.map(s => <StopRow key={s.n} s={s} onClick={() => onSelect(s.n)}/>)}
          </>
        )}
        {unpacked.length > 0 && (
          <>
            <div style={{ font: '500 10px Inter', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '12px 4px 4px' }}>
              Hindi pa naipak ({unpacked.length})
            </div>
            {unpacked.map(s => <StopRow key={s.n} s={s} disabled/>)}
          </>
        )}
        {done.length > 0 && (
          <>
            <div style={{ font: '500 10px Inter', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '12px 4px 4px' }}>
              Tapos na ({done.length})
            </div>
            {done.map(s => <StopRow key={s.n} s={s} done/>)}
          </>
        )}
      </div>
    </div>
  );
};

const StopRow = ({ s, onClick, disabled, done }) => (
  <div onClick={onClick && !disabled ? onClick : undefined}
    style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 4px', borderBottom: '1px solid var(--hair)',
      cursor: onClick && !disabled ? 'pointer' : 'default',
      opacity: disabled ? 0.55 : 1,
    }}>
    <div style={{
      width: 26, height: 26, borderRadius: 999,
      background: done ? 'var(--success)' : '#F1ECE2',
      color: done ? '#fff' : 'var(--ink-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      font: '500 11px Inter', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
    }}>
      {done ? <Icon name="check" size={14} color="#fff" strokeWidth={2.8}/> : s.n}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ font: '500 13px Inter', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: done ? 'line-through' : 'none' }}>{s.store}</div>
      <div style={{ font: '400 10px Inter', color: 'var(--ink-2)' }}>{s.items} items · {s.kg} kg</div>
    </div>
    <span className="tnum" style={{ font: '500 12px Inter', color: 'var(--ink-2)' }}>{peso2(s.total)}</span>
    <Pill tone={s.pay === 'suki' ? 'warning' : s.pay === 'gcash' ? 'action' : 'neutral'}>
      {s.pay === 'suki' ? 'Suki' : s.pay === 'gcash' ? 'GCash' : 'Cash'}
    </Pill>
  </div>
);

window.CrewApp = CrewApp;
