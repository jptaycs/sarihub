// Component inventory + bilingual microcopy notes + flow diagrams

// ============================================================
// Component inventory
// ============================================================
const ComponentInventory = () => (
  <div style={{
    width: 1280, padding: 56, background: 'var(--bg)',
    fontFamily: 'Inter, sans-serif',
    display: 'flex', flexDirection: 'column', gap: 36,
  }}>
    <div>
      <div style={{ font: '500 11px Inter', color: 'var(--ink-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Component inventory</div>
      <h1 style={{ margin: '4px 0 0', font: '500 32px Inter', letterSpacing: '-0.02em' }}>Primitives</h1>
    </div>

    {/* Buttons */}
    <Section title="Buttons" sub="48px touch height for primary actions; 40px for secondary in dense surfaces.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Cell label="Primary">
          <button className="btn btn-primary" style={{ height: 48 }}>Place order · ₱640</button>
          <button className="btn btn-primary" style={{ height: 40 }}>Magbayad</button>
        </Cell>
        <Cell label="Secondary">
          <button className="btn btn-secondary" style={{ height: 48 }}>Tingnan ang history</button>
          <button className="btn btn-secondary" style={{ height: 40 }}>Tawagan</button>
        </Cell>
        <Cell label="Destructive">
          <button className="btn btn-danger" style={{ height: 48 }}>Tanggalin ang item</button>
          <button className="btn btn-warning" style={{ height: 40 }}>Lumagpas sa suki limit</button>
        </Cell>
        <Cell label="Ghost / inline">
          <button className="btn btn-ghost" style={{ height: 48, color: 'var(--ink-2)' }}>Skip muna</button>
          <button style={{ height: 40, background: 'transparent', border: 0, font: '500 14px Inter', color: 'var(--action)' }}>Resend code</button>
        </Cell>
      </div>
    </Section>

    {/* Input states */}
    <Section title="Inputs">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Cell label="Empty">
          <input className="inp" placeholder="Mobile number"/>
        </Cell>
        <Cell label="Focused">
          <input className="inp" defaultValue="917 845 2310" style={{ borderColor: 'var(--action)', boxShadow: '0 0 0 3px rgba(216,90,48,0.15)' }}/>
        </Cell>
        <Cell label="Filled">
          <input className="inp" defaultValue="Aling Marisa's Store"/>
        </Cell>
        <Cell label="Error">
          <input className="inp" defaultValue="917 84" style={{ borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(180,51,42,0.1)' }}/>
          <div style={{ font: '400 12px Inter', color: 'var(--danger)' }}>Kulang po ang numero — 10 digits ang kailangan.</div>
        </Cell>
      </div>
    </Section>

    {/* Status pills */}
    <Section title="Status pills">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Pill tone="action" dot>Sent</Pill>
        <Pill tone="warning" dot>Packed</Pill>
        <Pill tone="action" dot>On the way</Pill>
        <Pill tone="success" dot>Delivered</Pill>
        <Pill tone="neutral" dot>Settled</Pill>
        <Pill tone="warning" dot>Suki</Pill>
        <Pill tone="action" dot>GCash</Pill>
        <Pill tone="neutral" dot>Cash</Pill>
        <Pill tone="dark" dot>Cutoff na po</Pill>
        <Pill tone="success" dot>248 stores online</Pill>
      </div>
    </Section>

    {/* Product card */}
    <Section title="Product card" sub="The most critical component — appears on Home, Cart, History, Admin.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 1000 }}>
        <Cell label="Default · stable">
          <SampleProductCardVar dir="flat" delta="Stable"/>
        </Cell>
        <Cell label="Up · selected">
          <SampleProductCardVar dir="up" delta="₱8 today" selected/>
        </Cell>
        <Cell label="Down · in cart">
          <SampleProductCardVar dir="down" delta="₱3 today" qty={3}/>
        </Cell>
      </div>
    </Section>

    {/* Suki ledger row */}
    <Section title="Suki ledger row" sub="Bank-statement model. Description left, signed amount + running balance right.">
      <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 12, maxWidth: 600 }}>
        {[
          { desc: 'Order #1287', d: 'Today', amt: -640, bal: 3040 },
          { desc: 'Bayad · GCash', d: 'Lunes', amt: 1200, bal: 3680 },
          { desc: 'Order #1273', d: 'Lunes', amt: -1180, bal: 4880 },
        ].map((r, i, a) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px',
            borderBottom: i === a.length - 1 ? 'none' : '1px solid var(--hair)',
          }}>
            <div>
              <div style={{ font: '500 13px Inter' }}>{r.desc}</div>
              <div style={{ font: '400 11px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{r.d}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tnum" style={{ font: '500 14px Inter', color: r.amt > 0 ? 'var(--success)' : 'var(--ink)' }}>
                {r.amt > 0 ? '+' : '−'}₱{Math.abs(r.amt).toLocaleString()}
              </div>
              <div className="tnum" style={{ font: '400 11px Inter', color: 'var(--ink-2)' }}>
                ₱{r.bal.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>

    {/* Microcopy */}
    <Section title="Bilingual microcopy" sub="Tagalog lead, English in parens. Po-forms when addressing the user; not in system labels.">
      <div style={{
        background: '#fff', border: '1px solid var(--hair)', borderRadius: 12,
        display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden',
      }}>
        {[
          ['Magandang gabi po', 'Good evening (greeting)'],
          ['Tapos na po!', 'All done!'],
          ['Place order · 3 items', 'Order CTA — kept English, mental model is well-known'],
          ['Mag-order ulit', 'Reorder'],
          ['Tingnan ang history', 'View history'],
          ['Magbayad', 'Pay / settle'],
          ['Lumagpas sa suki limit · magbayad muna', 'Over credit limit · pay first'],
          ['Cutoff na po — bukas na, Miyerkules', 'Cutoff passed — next, Wednesday'],
          ['Wala na po, hindi sisingilin', 'Out of stock — will not be charged'],
          ['Pending — magpa-sync kapag may signal', 'Pending — will sync when online'],
          ['Wala pa pong order. Magsimula sa Sariwa.', 'No orders yet. Start with Fresh.'],
          ['Wala pa pong utang. Salamat po!', 'No outstanding credit. Thank you!'],
          ['Na-deliver na', 'Delivered (driver action)'],
          ['Tawagan', 'Call'],
          ['Mga presyong nakalock hanggang 11:00 PM', 'Prices locked until 11:00 PM'],
          ['May problema po? Tawagan 0917-555-0188', 'Need help? Call (number is a real human)'],
        ].map(([tl, en], i) => (
          <div key={i} style={{
            padding: '10px 14px',
            borderBottom: i < 14 ? '1px solid var(--hair)' : 'none',
            borderRight: i % 2 === 0 ? '1px solid var(--hair)' : 'none',
          }}>
            <div style={{ font: '500 14px Inter' }}>{tl}</div>
            <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 2 }}>{en}</div>
          </div>
        ))}
      </div>
    </Section>

    {/* Spacing + grid */}
    <Section title="Spacing & touch targets">
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
        {[
          [4, 'xs'], [8, 'sm'], [12, 'md'], [16, 'lg'], [24, 'xl'], [32, '2xl'], [48, '3xl · tap min'],
        ].map(([n, l]) => (
          <div key={n} style={{ textAlign: 'center' }}>
            <div style={{ width: n, height: n, background: 'var(--action)', margin: '0 auto', borderRadius: 2 }}/>
            <div className="tnum" style={{ font: '500 12px Inter', marginTop: 6 }}>{n}px</div>
            <div style={{ font: '400 10px Inter', color: 'var(--ink-2)' }}>{l}</div>
          </div>
        ))}
      </div>
    </Section>
  </div>
);

const Section = ({ title, sub, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
      <h2 style={{ margin: 0, font: '500 20px Inter', letterSpacing: '-0.01em' }}>{title}</h2>
      {sub && <span style={{ font: '400 13px Inter', color: 'var(--ink-2)' }}>{sub}</span>}
    </div>
    {children}
  </div>
);

const Cell = ({ label, children }) => (
  <div>
    <div style={{ font: '400 11px Inter', color: 'var(--ink-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
  </div>
);

const SampleProductCardVar = ({ dir = 'flat', delta = 'Stable', selected = false, qty = 0 }) => {
  const dirColor = dir === 'up' ? 'var(--warning)' : dir === 'down' ? 'var(--success)' : 'var(--ink-3)';
  const dirIcon = dir === 'up' ? 'arrow-up' : dir === 'down' ? 'arrow-down' : 'minus';
  return (
    <div className="card" style={{ padding: 14, background: '#fff' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <PhotoPH size={48} label="img"/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="lbl-tag">Sibuyas pula</div>
              <div className="lbl-en">Red onion</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: dirColor, font: '500 12px Inter', fontVariantNumeric: 'tabular-nums' }}>
              <Icon name={dirIcon} size={12} color={dirColor}/> {delta}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, font: '400 11px Inter', color: 'var(--ink-2)' }}>
            <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--success)' }}/>
            Dalahican · 4:42 AM
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button className="unit-btn">1 pc · ₱14</button>
        <button className={`unit-btn${selected || qty ? ' active' : ''}`}>
          {qty > 0 && <span className="tnum" style={{ background: '#fff', color: 'var(--ink)', borderRadius: 4, padding: '1px 5px', font: '500 11px Inter', marginRight: 2 }}>{qty}×</span>}
          1 kg · ₱128
        </button>
        <button className="unit-btn">5 kg · ₱610</button>
      </div>
    </div>
  );
};

// ============================================================
// Flow diagrams
// ============================================================
const FlowDiagrams = () => (
  <div style={{
    width: 1280, padding: 56, background: 'var(--bg)',
    fontFamily: 'Inter, sans-serif',
    display: 'flex', flexDirection: 'column', gap: 40,
  }}>
    <div>
      <div style={{ font: '500 11px Inter', color: 'var(--ink-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Flow diagrams</div>
      <h1 style={{ margin: '4px 0 0', font: '500 32px Inter', letterSpacing: '-0.02em' }}>Two critical journeys</h1>
    </div>

    {/* Flow 1 */}
    <Flow title="Store owner places her first order"
      subtitle="Target: under 90 seconds, no help, in dim light, holding a baby."
      steps={[
        { t: 'SMS landing', d: 'Driver hands her a flyer with download QR. App installs.', ic: 'phone' },
        { t: 'Enter phone', d: '+63 locked. Big input. Help number visible.', ic: 'phone' },
        { t: 'OTP code', d: '6-digit auto-paste. Resend after 0:47.', ic: 'check' },
        { t: 'Pick category', d: 'Sariwa is preselected. 24 items ready.', ic: 'list' },
        { t: 'Tap units', d: 'Three preset units per item. Tap selects, tap again opens stepper.', ic: 'plus' },
        { t: 'Place order', d: 'Sticky CTA shows item count + total. One tap.', ic: 'cart' },
        { t: 'Bottom sheet', d: 'Review locked prices. Toggle payment. Confirm.', ic: 'wallet' },
        { t: 'Tapos na po!', d: 'Confirmation. Reorder or view history.', ic: 'check' },
      ]}
      highlights={['No checkout flow', 'Payment is a setting', 'Cart survives offline', 'Confirmation is two buttons, not five']}
    />

    {/* Flow 2 */}
    <Flow title="Driver completes a stop with suki signature"
      subtitle="One-handed, gloves on, engine running. Should take under 30 seconds per stop."
      steps={[
        { t: 'Arrive at stop', d: 'Current stop card is highlighted in orange. Map shows 0 km away.', ic: 'mapPin' },
        { t: 'Tap Tawagan (optional)', d: 'Phone dialer opens with store owner number. Returns to app on hangup.', ic: 'phone' },
        { t: 'Tap Na-deliver na', d: 'Big primary button, lower-right thumb zone.', ic: 'check' },
        { t: 'Camera opens', d: 'Snap one photo of goods unloaded. Retake or accept.', ic: 'camera' },
        { t: 'Signature pad', d: 'Suki orders only. Cash/GCash skip this.', ic: 'signature' },
        { t: 'Auto-advance', d: 'Map re-centers on stop 6. Sheet dismisses.', ic: 'truck' },
      ]}
      highlights={['POD required for suki only', 'Cash collected? Mark in stop card before advancing', 'Signature pad clears on undo']}
    />
  </div>
);

const Flow = ({ title, subtitle, steps, highlights }) => (
  <div>
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ margin: 0, font: '500 22px Inter', letterSpacing: '-0.01em' }}>{title}</h2>
      <p style={{ margin: '4px 0 0', font: '400 13px Inter', color: 'var(--ink-2)' }}>{subtitle}</p>
    </div>

    {/* Steps */}
    <div style={{
      background: '#fff', border: '1px solid var(--hair)', borderRadius: 14,
      padding: 24, position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflow: 'hidden' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 6px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: i === 0 ? 'var(--ink)' : 'var(--bg)',
                color: i === 0 ? '#fff' : 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: i === 0 ? 'none' : '1px solid var(--hair)',
              }}>
                <Icon name={s.ic} size={20}/>
              </div>
              <div className="tnum" style={{ font: '500 11px Inter', color: 'var(--ink-3)', marginTop: 8 }}>0{i + 1}</div>
              <div style={{ font: '500 13px Inter', marginTop: 2, lineHeight: 1.2 }}>{s.t}</div>
              <div style={{ font: '400 11px/1.4 Inter', color: 'var(--ink-2)', marginTop: 4 }}>{s.d}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: '0 0 16px', display: 'flex', alignItems: 'flex-start', paddingTop: 18, color: 'var(--ink-3)' }}>
                <Icon name="chevron-right" size={20} color="var(--ink-3)"/>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>

    {/* Highlights */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
      {highlights.map(h => (
        <span key={h} style={{
          padding: '6px 12px', borderRadius: 999,
          background: 'transparent', border: '1px dashed var(--hair-strong)',
          font: '400 12px Inter', color: 'var(--ink-2)',
        }}>{h}</span>
      ))}
    </div>
  </div>
);

Object.assign(window, { ComponentInventory, FlowDiagrams });
