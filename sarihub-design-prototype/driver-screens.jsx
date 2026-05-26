// Driver + Truck helper screens — both mobile.
// Driver: route map → current stop → mark delivered → POD (photo + sig for suki) → next stop.
// Helper: packing list per route → load truck → confirm load → handoff to driver.

const { useState: dUseState, useEffect: dUseEffect } = React;

// ============================================================
// Driver Prototype
// ============================================================
const DriverApp = () => {
  const [stops, setStops] = dUseState(STOPS_TAGBAC.map(s => ({ ...s, status: s.n < 5 ? 'done' : s.n === 5 ? 'current' : 'upcoming' })));
  const [view, setView] = dUseState('route'); // route | stop | pod-photo | pod-sig | done
  const [activeStopN, setActiveStopN] = dUseState(5);
  const [podPhoto, setPodPhoto] = dUseState(false);
  const [signed, setSigned] = dUseState(false);
  const [callOpen, setCallOpen] = dUseState(false);

  const stop = stops.find(s => s.n === activeStopN);
  const completed = stops.filter(s => s.status === 'done').length;
  const total = stops.length;
  const progress = Math.round((completed / total) * 100);

  const collectedCash = stops.filter(s => s.status === 'done' && s.pay === 'cash').reduce((s, x) => s + x.total, 0);

  const deliverCurrent = () => {
    if (stop.pay === 'suki') {
      // POD required
      setView('pod-photo');
      setPodPhoto(false);
      setSigned(false);
    } else {
      // Cash or GCash — just confirm
      finalizeDelivery();
    }
  };

  const finalizeDelivery = () => {
    setStops(prev => {
      const next = prev.map(s =>
        s.n === activeStopN ? { ...s, status: 'done' } :
        s.n === activeStopN + 1 ? { ...s, status: 'current' } : s
      );
      return next;
    });
    setView('done');
    setTimeout(() => {
      if (activeStopN + 1 <= total) {
        setActiveStopN(activeStopN + 1);
      }
      setView('route');
    }, 1400);
  };

  return (
    <div className="sh" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>

      {/* Always-visible header */}
      <DriverHeader completed={completed} total={total} progress={progress} cash={collectedCash}/>

      {view === 'route' && (
        <DriverRouteView
          stops={stops}
          activeStopN={activeStopN}
          onSelect={(n) => { setActiveStopN(n); setView('stop'); }}
          onDeliver={() => { setView('stop'); }}
          onCall={() => setCallOpen(true)}
        />
      )}

      {view === 'stop' && stop && (
        <DriverStopDetail
          stop={stop}
          onBack={() => setView('route')}
          onDeliver={deliverCurrent}
          onCall={() => setCallOpen(true)}
        />
      )}

      {view === 'pod-photo' && stop && (
        <PodPhotoStep stop={stop}
          captured={podPhoto}
          onCapture={() => setPodPhoto(true)}
          onRetake={() => setPodPhoto(false)}
          onNext={() => setView('pod-sig')}
          onBack={() => setView('stop')}
        />
      )}

      {view === 'pod-sig' && stop && (
        <PodSigStep stop={stop}
          signed={signed}
          onSign={() => setSigned(true)}
          onClear={() => setSigned(false)}
          onFinalize={finalizeDelivery}
          onBack={() => setView('pod-photo')}
        />
      )}

      {view === 'done' && stop && (
        <DriverDoneFlash stop={stop} next={activeStopN + 1 <= total ? stops.find(s => s.n === activeStopN + 1) : null}/>
      )}

      {callOpen && stop && (
        <CallSheet stop={stop} onClose={() => setCallOpen(false)}/>
      )}

      <HomeBar/>
    </div>
  );
};

const DriverHeader = ({ completed, total, progress, cash }) => (
  <div style={{ padding: '6px 16px 12px', background: '#fff', borderBottom: '1px solid var(--hair)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div>
        <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Tagbac route · May 22
        </div>
        <div style={{ font: '500 16px Inter', marginTop: 2 }}>
          Mang Renz · Tamaraw 01
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="tnum sh-display" style={{ font: '500 18px Inter' }}>{completed}/{total}</div>
        <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>na stops</div>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#F1ECE2', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--success)', transition: 'width .3s' }}/>
      </div>
      <span className="tnum" style={{ font: '500 12px Inter', color: 'var(--ink-2)' }}>{progress}%</span>
    </div>
    {cash > 0 && (
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--success-soft)', borderRadius: 8 }}>
        <Icon name="cash" size={14} color="var(--success)"/>
        <span style={{ font: '500 12px Inter', color: '#127555' }}>Cash on hand:</span>
        <span className="tnum" style={{ font: '500 13px Inter', color: '#127555' }}>{peso2(cash)}</span>
      </div>
    )}
  </div>
);

const DriverRouteView = ({ stops, activeStopN, onSelect, onDeliver, onCall }) => {
  const current = stops.find(s => s.n === activeStopN);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Map */}
      <div style={{ height: 220, position: 'relative', background: '#EEF1EB', flexShrink: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 390 220" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
          <rect width="390" height="220" fill="#EEF1EB"/>
          {[[10,15,80,50],[110,12,90,55],[220,18,70,45],[310,15,70,55],
            [10,80,110,50],[140,85,80,45],[240,80,70,55],[330,85,70,55],
            [10,150,70,55],[100,155,90,45],[220,150,90,55],[330,155,70,55]].map(([x,y,w,h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="#DDE4DA" rx="2"/>
          ))}
          <path d="M0 70 L390 70 M0 140 L390 140 M0 210 L390 210" stroke="#F5F0E5" strokeWidth="12"/>
          <path d="M95 0 L95 220 M210 0 L210 220 M305 0 L305 220" stroke="#F5F0E5" strokeWidth="12"/>
          {/* Route polyline */}
          <path d="M20 200 Q 80 195 110 165 T 170 130 T 220 100 T 280 60 T 360 30"
            fill="none" stroke="#D85A30" strokeWidth="2.5" strokeDasharray="0" strokeLinecap="round" opacity="0.5"/>
          {/* Done dots */}
          {stops.filter(s => s.status === 'done').slice(0, 4).map((s, i) => {
            const pts = [[20, 200], [80, 190], [120, 165], [165, 135]];
            const [x, y] = pts[i] || [0, 0];
            return <circle key={s.n} cx={x} cy={y} r="6" fill="#1D9E75" stroke="#fff" strokeWidth="2"/>;
          })}
          {/* Current */}
          <circle cx="200" cy="115" r="16" fill="rgba(216,90,48,0.18)">
            <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="200" cy="115" r="9" fill="#D85A30" stroke="#fff" strokeWidth="2.5"/>
          {/* Upcoming */}
          {[[260, 80], [320, 50]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="6" fill="#fff" stroke="#5F5E5A" strokeWidth="2"/>
          ))}
        </svg>

        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Pill tone="dark" dot>Susunod · 3.2 km · 8 min</Pill>
          <button style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="mapPin" size={18}/>
          </button>
        </div>
      </div>

      {/* Current stop card */}
      {current && (
        <div style={{ padding: '14px 16px 8px', flexShrink: 0 }}>
          <div className="card" style={{
            padding: '14px 14px 12px',
            borderColor: 'var(--action)',
            background: '#fff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="tnum" style={{ font: '500 12px Inter', color: 'var(--action)' }}>STOP {current.n}</span>
                  <Pill tone="action">Current</Pill>
                </div>
                <div style={{ font: '500 17px/1.2 Inter', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {current.store}
                </div>
                <div style={{ font: '400 12px/1.3 Inter', color: 'var(--ink-2)', marginTop: 2 }}>
                  {current.addr}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                <div className="tnum sh-display" style={{ font: '500 20px Inter' }}>{peso2(current.total)}</div>
                <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{current.items} items · {current.kg} kg</div>
                <div style={{ marginTop: 4 }}>
                  <Pill tone={current.pay === 'suki' ? 'warning' : current.pay === 'gcash' ? 'action' : 'neutral'} dot>
                    {current.pay === 'suki' ? 'Suki' : current.pay === 'gcash' ? 'GCash' : 'Cash'}
                  </Pill>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={onCall} className="btn btn-secondary" style={{ flex: 1, height: 50, cursor: 'pointer' }}>
                <Icon name="phone" size={20}/> Tawagan
              </button>
              <button onClick={onDeliver} className="btn btn-primary" style={{ flex: 1.4, height: 50, cursor: 'pointer' }}>
                <Icon name="check" size={20}/> Buksan ang stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming stops */}
      <div style={{ padding: '4px 16px 24px', flex: 1, overflowY: 'auto' }}>
        <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '8px 4px' }}>
          Susunod na hintuan
        </div>
        {stops.filter(s => s.status === 'upcoming').map(s => (
          <div key={s.n}
            onClick={() => onSelect(s.n)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 4px', borderBottom: '1px solid var(--hair)',
              cursor: 'pointer',
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
              <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>{s.addr.split(',')[0]} · {s.items} items</div>
            </div>
            <span className="tnum" style={{ font: '500 13px Inter', color: 'var(--ink-2)' }}>{peso2(s.total)}</span>
            <Pill tone={s.pay === 'suki' ? 'warning' : s.pay === 'gcash' ? 'action' : 'neutral'}>
              {s.pay === 'suki' ? 'Suki' : s.pay === 'gcash' ? 'GCash' : 'Cash'}
            </Pill>
          </div>
        ))}
      </div>
    </div>
  );
};

const DriverStopDetail = ({ stop, onBack, onDeliver, onCall }) => {
  const items = STOP_ITEMS[stop.n] || [];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', border: '1px solid var(--hair)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-left" size={18}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Stop {stop.n} of 18
          </div>
          <div style={{ font: '500 18px Inter', marginTop: 2 }}>{stop.store}</div>
        </div>
      </div>

      <div style={{ padding: '0 16px', flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        {/* Address card */}
        <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F1ECE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mapPin" size={16} color="var(--ink-2)"/>
          </div>
          <div style={{ flex: 1, font: '400 13px/1.3 Inter', color: 'var(--ink)' }}>
            {stop.addr}
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 8, background: 'transparent', border: '1px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="chevron-right" size={16}/>
          </button>
        </div>

        {/* Items */}
        <div style={{ marginTop: 14 }}>
          <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '0 4px 8px' }}>
            Manifest · ihatid sa kanya
          </div>
          <div className="card" style={{ padding: 0 }}>
            {items.length === 0 ? (
              <div style={{ padding: 16, font: '400 13px Inter', color: 'var(--ink-2)' }}>
                {stop.items} items packed. Walang detail sa demo na ito.
              </div>
            ) : items.map((it, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px',
                borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--hair)',
              }}>
                <PhotoPH size={36} style={{ borderRadius: 6, flex: '0 0 36px' }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '500 14px Inter' }}>{it.tag}</div>
                  <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>{it.en}</div>
                </div>
                <span className="tnum" style={{ font: '500 13px Inter' }}>{peso2(it.price)}</span>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', font: '500 14px Inter' }}>
              <span>Total</span>
              <span className="tnum sh-display">{peso2(stop.total)}</span>
            </div>
          )}
        </div>

        {/* Payment block */}
        <div style={{ marginTop: 8 }}>
          <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '0 4px 8px' }}>
            Bayad
          </div>
          <div className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ font: '500 14px Inter' }}>
                  {stop.pay === 'suki' ? 'Suki credit' : stop.pay === 'gcash' ? 'GCash · paid' : 'Cash on delivery'}
                </div>
                <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 2 }}>
                  {stop.pay === 'suki' ? 'Kailangan ng lagda + larawan' :
                   stop.pay === 'gcash' ? 'Naipasa na ang bayad bago dumating' :
                   `Kunin: ${peso2(stop.total)} sa kamay`}
                </div>
              </div>
              <Pill tone={stop.pay === 'suki' ? 'warning' : stop.pay === 'gcash' ? 'action' : 'neutral'} dot>
                {stop.pay === 'suki' ? 'Suki' : stop.pay === 'gcash' ? 'GCash' : 'Cash'}
              </Pill>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 22, padding: '12px 16px', background: 'linear-gradient(to top, var(--bg) 70%, rgba(250,247,242,0))' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCall} className="btn btn-secondary" style={{ flex: 1, height: 54, cursor: 'pointer' }}>
            <Icon name="phone" size={20}/> Tawagan
          </button>
          <button onClick={onDeliver} className="btn btn-primary" style={{ flex: 1.5, height: 54, cursor: 'pointer' }}>
            <Icon name="check" size={20}/> Na-deliver na
          </button>
        </div>
      </div>
    </div>
  );
};

const PodPhotoStep = ({ stop, captured, onCapture, onRetake, onNext, onBack }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', border: '1px solid var(--hair)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevron-left" size={18}/>
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Step 1 of 2 · Proof of delivery</div>
        <div style={{ font: '500 17px Inter', marginTop: 2 }}>Kunan ng litrato ang paninda</div>
      </div>
    </div>

    <div style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ font: '400 13px/1.4 Inter', color: 'var(--ink-2)', marginBottom: 12 }}>
        Kasama ang lahat ng items sa frame. Ipakita rin ang tindahan sa likod.
      </div>

      <div style={{
        flex: 1, borderRadius: 16,
        background: captured ? '#1A1815' : '#2C2C2A',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 260,
      }}>
        {captured ? (
          <>
            {/* Faux photo */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'repeating-linear-gradient(135deg, #6B6052 0 12px, #5A5044 12px 24px)',
              opacity: 0.85,
            }}/>
            <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%" viewBox="0 0 350 280">
              {/* Faux paper bags */}
              <rect x="60" y="120" width="80" height="100" rx="4" fill="#C9B58E" opacity="0.9"/>
              <rect x="155" y="100" width="90" height="120" rx="4" fill="#D4C29A" opacity="0.9"/>
              <ellipse cx="100" cy="240" rx="40" ry="6" fill="rgba(0,0,0,0.3)"/>
              <ellipse cx="200" cy="240" rx="45" ry="6" fill="rgba(0,0,0,0.3)"/>
            </svg>
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
              <Pill tone="dark">{stop.store}</Pill>
            </div>
            <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
              <Pill tone="success" dot>Saved</Pill>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.85)' }}>
            <Icon name="camera" size={48} color="rgba(255,255,255,0.85)"/>
            <div style={{ font: '400 13px Inter', marginTop: 12 }}>Live camera preview</div>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 0 24px', display: 'flex', justifyContent: 'center', gap: 12 }}>
        {captured ? (
          <>
            <button onClick={onRetake} className="btn btn-secondary" style={{ height: 56, padding: '0 24px', cursor: 'pointer' }}>
              Kuhanan ulit
            </button>
            <button onClick={onNext} className="btn btn-primary" style={{ flex: 1, height: 56, cursor: 'pointer' }}>
              Susunod · lagda <Icon name="chevron-right" size={18}/>
            </button>
          </>
        ) : (
          <button onClick={onCapture} style={{
            width: 72, height: 72, borderRadius: 999,
            background: '#fff', border: '4px solid var(--ink)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--action)' }}/>
          </button>
        )}
      </div>
    </div>
  </div>
);

const PodSigStep = ({ stop, signed, onSign, onClear, onFinalize, onBack }) => {
  const canvasRef = React.useRef(null);
  const drawingRef = React.useRef(false);
  const lastRef = React.useRef(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    if (!signed) {
      ctx.clearRect(0, 0, c.width, c.height);
    }
  }, [signed]);

  const getPt = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const sx = c.width / rect.width;
    const sy = c.height / rect.height;
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = getPt(e);
    if (!signed) onSign();
  };
  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = getPt(e);
    ctx.strokeStyle = '#1A1815';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };
  const end = () => { drawingRef.current = false; };

  const doClear = () => {
    const c = canvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    onClear();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', border: '1px solid var(--hair)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-left" size={18}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Step 2 of 2 · Proof of delivery</div>
          <div style={{ font: '500 17px Inter', marginTop: 2 }}>Lagda ng tindera</div>
        </div>
      </div>

      <div style={{ padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ font: '400 13px/1.4 Inter', color: 'var(--ink-2)', marginBottom: 12 }}>
          Ipalagda kay <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{stop.store.split(' ').slice(0, 3).join(' ')}</span>.
          Suki order na {peso2(stop.total)} — sisingilin sa susunod na bayaran.
        </div>

        <div style={{
          flex: 1, position: 'relative',
          background: '#fff', border: '2px dashed var(--hair-strong)', borderRadius: 14,
          overflow: 'hidden',
          touchAction: 'none',
          minHeight: 260,
        }}>
          <canvas
            ref={canvasRef}
            width="700" height="520"
            style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
            onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          />
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', pointerEvents: 'none' }}>
            <span style={{ font: '500 11px Inter', color: 'var(--ink-3)' }}>
              {signed ? 'Salamat po' : '✕———————————————'}
            </span>
            <span style={{ font: '400 10px Inter', color: 'var(--ink-3)' }}>SIGNATURE</span>
          </div>
          {signed && (
            <button onClick={doClear} style={{
              position: 'absolute', top: 10, right: 10,
              height: 30, padding: '0 12px', borderRadius: 8,
              background: '#fff', border: '1px solid var(--hair)',
              font: '500 12px Inter', color: 'var(--ink-2)', cursor: 'pointer',
            }}>Burahin</button>
          )}
        </div>

        <div style={{ padding: '14px 0 24px' }}>
          <button onClick={onFinalize} disabled={!signed}
            className="btn btn-success btn-block"
            style={{ height: 56, cursor: signed ? 'pointer' : 'not-allowed', opacity: signed ? 1 : 0.5 }}>
            <Icon name="check" size={20}/> Tapusin ang stop {stop.n}
          </button>
        </div>
      </div>
    </div>
  );
};

const DriverDoneFlash = ({ stop, next }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)', animation: 'fadeIn .2s' }}>
    <div style={{
      width: 96, height: 96, borderRadius: 999, background: 'var(--success-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'pop .35s cubic-bezier(0.2,0.7,0.3,1)',
    }}>
      <Icon name="check" size={48} color="var(--success)" strokeWidth={2.4}/>
    </div>
    <div style={{ font: '500 24px/1.1 Inter', letterSpacing: '-0.02em', marginTop: 18 }}>
      Tapos na ang stop {stop.n}
    </div>
    <div style={{ font: '400 14px/1.4 Inter', color: 'var(--ink-2)', marginTop: 6, textAlign: 'center', maxWidth: 280 }}>
      {next ? `Susunod: ${next.store} — ${next.kg} kg` : 'Yan na ang huling stop. Salamat po!'}
    </div>
  </div>
);

const CallSheet = ({ stop, onClose }) => (
  <div onClick={onClose}
    style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(20,18,16,0.5)', display: 'flex', alignItems: 'flex-end' }}>
    <div onClick={e => e.stopPropagation()}
      style={{
        width: '100%', background: 'var(--bg)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '14px 20px 32px',
        animation: 'slideUp .2s cubic-bezier(0.2,0.7,0.3,1)',
      }}>
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--hair-strong)' }}/>
      </div>
      <div style={{ font: '500 16px Inter' }}>Tawagan si {stop.store.split(' ').slice(0, 3).join(' ')}</div>
      <div style={{ font: '400 13px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
        {stop.phone} · Stop {stop.n} sa Tagbac route
      </div>

      <button className="btn btn-primary btn-block" style={{ height: 56, marginTop: 16, cursor: 'pointer' }}>
        <Icon name="phone" size={20}/> Tawagan ngayon
      </button>
      <button onClick={onClose} className="btn btn-ghost btn-block" style={{ height: 48, marginTop: 6, color: 'var(--ink-2)', cursor: 'pointer' }}>
        I-cancel
      </button>
    </div>
  </div>
);

Object.assign(window, {
  DriverApp,
  DriverStopDetail, PodPhotoStep, PodSigStep, DriverDoneFlash, CallSheet,
});
