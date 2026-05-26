// Truck helper prototype — packing flow. Mobile, gloves-friendly.
// Helper picks an order from queue → checks off each item as packed → confirms load weight → moves to next.

const { useState: hUseState } = React;

const HelperApp = () => {
  const [queue, setQueue] = hUseState(PACKING_QUEUE);
  const [activeId, setActiveId] = hUseState(PACKING_QUEUE[0]?.id);
  const [checked, setChecked] = hUseState({});
  const [packed, setPacked] = hUseState([]); // ids
  const [showConfirm, setShowConfirm] = hUseState(false);

  const active = queue.find(o => o.id === activeId);
  const items = active ? (STOP_ITEMS[active.stop] || [
    { tag: 'Line item 1', en: 'See manifest', kg: 1, price: 100 },
    { tag: 'Line item 2', en: 'See manifest', kg: 1, price: 100 },
    { tag: 'Line item 3', en: 'See manifest', kg: 1, price: 100 },
  ]) : [];
  const checkedCount = active ? items.filter((_, i) => checked[`${active.id}-${i}`]).length : 0;
  const allChecked = active && checkedCount === items.length && items.length > 0;

  // Aggregate load — look up against the original constant since packed orders are removed from queue
  const truckKg = packed.reduce((s, id) => s + (PACKING_QUEUE.find(o => o.id === id)?.kg || 0), 0);
  const truckCap = 1000;
  const truckPct = Math.min(100, (truckKg / truckCap) * 100);

  const toggleItem = (idx) => {
    if (!active) return;
    setChecked(prev => ({ ...prev, [`${active.id}-${idx}`]: !prev[`${active.id}-${idx}`] }));
  };

  const confirmPack = () => {
    if (!allChecked) return;
    setShowConfirm(true);
  };

  const finalizePack = () => {
    setPacked([...packed, active.id]);
    setQueue(queue.filter(o => o.id !== active.id));
    setShowConfirm(false);
    // Move to next unpacked
    const remaining = queue.filter(o => o.id !== active.id);
    setActiveId(remaining[0]?.id);
  };

  // Filter for current route only — most realistic context for helper
  const tagbacQueue = queue.filter(o => o.route === 'Tagbac');
  const tagbacPacked = packed.filter(id => PACKING_QUEUE.find(o => o.id === id)?.route === 'Tagbac').length;
  const tagbacTotal = PACKING_QUEUE.filter(o => o.route === 'Tagbac').length;

  if (!active) {
    return (
      <div className="sh" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <StatusBar/>
        <HelperHeader truckKg={truckKg} truckPct={truckPct} packed={tagbacPacked} total={tagbacTotal}/>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={36} color="var(--success)" strokeWidth={2.4}/>
          </div>
          <div style={{ font: '500 22px Inter', marginTop: 18 }}>Tapos na lahat!</div>
          <div style={{ font: '400 14px Inter', color: 'var(--ink-2)', marginTop: 6, maxWidth: 280 }}>
            {tagbacPacked} order na nai-pack sa Tagbac route. Pwede nang umalis si Mang Renz.
          </div>
        </div>
        <HomeBar/>
      </div>
    );
  }

  return (
    <div className="sh" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <StatusBar/>
      <HelperHeader truckKg={truckKg} truckPct={truckPct} packed={tagbacPacked} total={tagbacTotal}/>

      {/* Queue strip */}
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {tagbacQueue.map(o => {
          const isActive = o.id === activeId;
          return (
            <button key={o.id}
              onClick={() => setActiveId(o.id)}
              style={{
                flex: '0 0 auto', height: 56, padding: '0 14px',
                borderRadius: 12,
                background: isActive ? 'var(--ink)' : '#fff',
                color: isActive ? '#fff' : 'var(--ink)',
                border: isActive ? 'none' : '1px solid var(--hair)',
                font: '500 13px Inter',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                textAlign: 'left',
              }}
            >
              <span className="tnum" style={{ font: '500 11px Inter', opacity: 0.7 }}>Stop {o.stop} · #{o.id}</span>
              <span style={{ font: '500 13px Inter' }}>{o.store.split(' ').slice(0, 2).join(' ')}</span>
            </button>
          );
        })}
      </div>

      {/* Active order */}
      <div style={{ padding: '16px 16px 0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Stop {active.stop} · #{active.id}
            </div>
            <div style={{ font: '500 19px/1.15 Inter', marginTop: 2, letterSpacing: '-0.01em' }}>{active.store}</div>
            <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
              {active.items} items · {active.kg} kg · {active.pay === 'suki' ? 'Suki' : active.pay === 'gcash' ? 'GCash' : 'Cash'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tnum sh-display" style={{ font: '500 22px Inter' }}>{peso2(active.total)}</div>
            <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{checkedCount}/{items.length} checked</div>
          </div>
        </div>

        {/* Item checklist */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((it, i) => {
              const isChecked = checked[`${active.id}-${i}`];
              return (
                <button key={i}
                  onClick={() => toggleItem(i)}
                  style={{
                    background: isChecked ? 'var(--success-soft)' : '#fff',
                    border: `1px solid ${isChecked ? '#B5DECC' : 'var(--hair)'}`,
                    borderRadius: 12,
                    padding: '14px 14px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background .15s, border-color .15s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: isChecked ? 'var(--success)' : '#fff',
                    border: isChecked ? '2px solid var(--success)' : '2px solid var(--hair-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
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

          {/* Inline ledger of weight running total */}
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#fff', border: '1px solid var(--hair)', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: '500 12px Inter', color: 'var(--ink-2)' }}>Estimated weight</span>
              <span className="tnum" style={{ font: '500 14px Inter' }}>{active.kg} kg</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>Konpirmahin sa timbangan bago i-load</span>
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 22, padding: '12px 16px', background: 'linear-gradient(to top, var(--bg) 70%, rgba(250,247,242,0))' }}>
          <button
            onClick={confirmPack}
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
          truckPct={Math.min(100, ((truckKg + active.kg) / truckCap) * 100)}
          onConfirm={finalizePack}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <HomeBar/>
    </div>
  );
};

const HelperHeader = ({ truckKg, truckPct, packed, total }) => {
  const tone = truckPct > 100 ? 'danger' : truckPct > 85 ? 'warning' : 'success';
  const barColor = tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ padding: '8px 16px 12px', background: '#fff', borderBottom: '1px solid var(--hair)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ font: '500 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Packing · Tagbac route
          </div>
          <div style={{ font: '500 16px Inter', marginTop: 2 }}>
            Mang Ariel · helper
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tnum sh-display" style={{ font: '500 18px Inter' }}>{packed}/{total}</div>
          <div style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>na order</div>
        </div>
      </div>

      {/* Truck capacity bar */}
      <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="truck" size={14} color="var(--ink-2)"/>
            <span style={{ font: '500 12px Inter' }}>Tamaraw 01 load</span>
          </div>
          <span className="tnum" style={{ font: '500 13px Inter', color: barColor }}>
            {truckKg.toFixed(1)} / 1000 kg
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: '#F1ECE2', marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${truckPct}%`, height: '100%', background: barColor, transition: 'width .3s' }}/>
        </div>
      </div>
    </div>
  );
};

const HelperConfirmModal = ({ order, truckKg, truckPct, onConfirm, onCancel }) => {
  const willOverflow = truckKg > 1000;
  return (
    <div onClick={onCancel} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(20,18,16,0.5)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--bg)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '14px 20px 32px',
        animation: 'slideUp .2s cubic-bezier(0.2,0.7,0.3,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--hair-strong)' }}/>
        </div>
        <div style={{ font: '500 18px Inter' }}>Tapos na po ang pag-pack?</div>
        <div style={{ font: '400 13px Inter', color: 'var(--ink-2)', marginTop: 4 }}>
          Order #{order.id} para sa {order.store}
        </div>

        <div className="card" style={{ marginTop: 14, padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 13px Inter', color: 'var(--ink-2)' }}>
            <span>Order weight</span>
            <span className="tnum" style={{ color: 'var(--ink)', fontWeight: 500 }}>{order.kg} kg</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 13px Inter', color: 'var(--ink-2)', marginTop: 6 }}>
            <span>Truck load after this</span>
            <span className="tnum" style={{ color: willOverflow ? 'var(--danger)' : 'var(--ink)', fontWeight: 500 }}>
              {truckKg.toFixed(1)} kg / 1000 kg
            </span>
          </div>
          {willOverflow && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(180,51,42,0.08)', borderRadius: 8, font: '400 12px/1.4 Inter', color: 'var(--danger)' }}>
              Lalampas sa kapasidad ng Tamaraw. Tawagan ang admin para mag-split.
            </div>
          )}
        </div>

        <button onClick={onConfirm} className="btn btn-success btn-block" style={{ height: 54, marginTop: 16, cursor: 'pointer' }}>
          <Icon name="check" size={20}/> I-load sa truck
        </button>
        <button onClick={onCancel} className="btn btn-ghost btn-block" style={{ height: 44, marginTop: 4, color: 'var(--ink-2)', cursor: 'pointer' }}>
          Sandali pa
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { HelperApp, HelperConfirmModal });
