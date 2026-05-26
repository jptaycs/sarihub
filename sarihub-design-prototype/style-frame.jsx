// SariHub — style frame / mood board.
// One large artboard establishing palette, type, sample product card.

const StyleFrame = () => {
  const Swatch = ({ name, hex, label, dark = false, big = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        width: big ? 200 : 120, height: big ? 200 : 120,
        background: hex, borderRadius: 12,
        border: hex === '#FFFFFF' ? '1px solid var(--hair)' : 'none',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute', left: 12, bottom: 10,
          font: '500 11px/1 Inter, sans-serif',
          color: dark ? '#fff' : '#2C2C2A', opacity: 0.85,
          fontVariantNumeric: 'tabular-nums',
        }}>{hex}</span>
      </div>
      <div>
        <div style={{ font: '500 13px Inter, sans-serif' }}>{name}</div>
        <div style={{ font: '400 11px Inter, sans-serif', color: 'var(--ink-2)' }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{
      width: 1280, height: 880,
      background: 'var(--bg)', color: 'var(--ink)',
      fontFamily: 'Inter, sans-serif',
      padding: 56,
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      gap: 56,
    }}>
      {/* Left: identity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        <div>
          <div style={{ font: '500 11px Inter, sans-serif', color: 'var(--ink-2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            Style frame · v1
          </div>
          <div style={{ font: '500 64px/0.95 Inter, sans-serif', letterSpacing: '-0.025em', marginBottom: 12 }}>
            SariHub
          </div>
          <div style={{ font: '400 18px/1.4 Inter, sans-serif', color: 'var(--ink-2)', maxWidth: 480 }}>
            Palengke-on-wheels, para sa tindahan mo. Daily wet-market prices, locked at order time, delivered before opening.
          </div>
        </div>

        {/* Palette */}
        <div>
          <div style={{ font: '500 13px Inter, sans-serif', color: 'var(--ink-2)', marginBottom: 16 }}>Palette</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <Swatch name="Action" hex="#D85A30" label="Produce-orange · primary CTA" dark big/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Swatch name="Background" hex="#FAF7F2" label="Warm off-white"/>
              <Swatch name="Surface" hex="#FFFFFF" label="Pure white card"/>
              <Swatch name="Success" hex="#1D9E75" label="Suki in good standing" dark/>
              <Swatch name="Warning" hex="#BA7517" label="Price up · cutoff near" dark/>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <div style={{ flex: 1, height: 44, background: '#2C2C2A', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 14px', color: '#fff', font: '500 12px Inter', fontVariantNumeric: 'tabular-nums' }}>Ink #2C2C2A</div>
            <div style={{ flex: 1, height: 44, background: '#5F5E5A', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 14px', color: '#fff', font: '500 12px Inter', fontVariantNumeric: 'tabular-nums' }}>Ink-2 #5F5E5A</div>
            <div style={{ flex: 1, height: 44, background: '#fff', border: '1px solid #E8E4DC', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 14px', color: '#5F5E5A', font: '500 12px Inter', fontVariantNumeric: 'tabular-nums' }}>Hairline #E8E4DC</div>
          </div>
        </div>

        {/* Type */}
        <div>
          <div style={{ font: '500 13px Inter, sans-serif', color: 'var(--ink-2)', marginBottom: 16 }}>Type · Inter · weights 400/500 only</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ font: '500 44px/1 Inter, sans-serif', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>₱128.00</div>
              <div style={{ font: '400 11px/1 Inter, sans-serif', color: 'var(--ink-2)', marginTop: 6 }}>Display · 500 · tabular figures</div>
            </div>
            <div>
              <div style={{ font: '500 22px/1.2 Inter, sans-serif' }}>Sibuyas pula</div>
              <div style={{ font: '400 14px/1.3 Inter, sans-serif', color: 'var(--ink-2)' }}>Red onion · ₱14 per piece</div>
              <div style={{ font: '400 11px/1 Inter, sans-serif', color: 'var(--ink-2)', marginTop: 6 }}>Heading 500 / Subhead 400</div>
            </div>
            <div>
              <div style={{ font: '400 14px/1.5 Inter, sans-serif', color: 'var(--ink)' }}>
                Ang mga presyo ay nakuha sa Dalahican market ngayong umaga at hindi na magbabago hanggang sa cutoff.
              </div>
              <div style={{ font: '400 11px/1 Inter, sans-serif', color: 'var(--ink-2)', marginTop: 6 }}>Body · 400 · sentence case · po-forms preferred</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: sample product card + principles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Phone preview frame */}
        <div style={{
          width: '100%', background: 'var(--bg)',
          border: '1px solid var(--hair)', borderRadius: 16, padding: 20,
        }}>
          <div style={{ font: '500 13px Inter', color: 'var(--ink-2)', marginBottom: 14 }}>Sample product card</div>
          <SampleProductCard/>
          <div style={{ marginTop: 16, font: '400 12px/1.5 Inter', color: 'var(--ink-2)' }}>
            48×48 photo · Tagalog lead, English support · source + capture time as trust signal · price-direction arrow · three unit choices in one tap.
          </div>
        </div>

        {/* Principles */}
        <div>
          <div style={{ font: '500 13px Inter', color: 'var(--ink-2)', marginBottom: 16 }}>Principles, ranked</div>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Thumb-first', 'Primary actions live in the lower half. Top is for status.'],
              ['Tagalog-forward', 'Tagalog leads; English supports. "Po" forms by default.'],
              ['Price is the headline', "Today's price + direction beats product photo."],
              ['Suki, not checkout', 'One button: place order. Payment is a setting.'],
              ['Offline-tolerant', 'Cart survives drops. Status pill, never a blocking modal.'],
              ['Large tap targets', '48px preferred. One decision per screen-third.'],
            ].map(([h, b], i) => (
              <li key={i} style={{ display: 'grid', gridTemplateColumns: '24px 130px 1fr', gap: 12, alignItems: 'baseline' }}>
                <span className="tnum" style={{ font: '500 12px Inter', color: 'var(--ink-3)' }}>0{i+1}</span>
                <span style={{ font: '500 14px Inter' }}>{h}</span>
                <span style={{ font: '400 13px/1.4 Inter', color: 'var(--ink-2)' }}>{b}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* What to avoid */}
        <div>
          <div style={{ font: '500 13px Inter', color: 'var(--ink-2)', marginBottom: 12 }}>What we don't do</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Drop shadows', 'Gradients', 'Hero carousels', 'Emoji as icons', 'ALL CAPS', 'Dark-by-default', 'Stacked modals', 'Receipt textures', 'Animated splash'].map(t => (
              <span key={t} style={{
                padding: '6px 12px', borderRadius: 999,
                border: '1px solid var(--hair)', background: '#fff',
                font: '400 12px Inter', color: 'var(--ink-2)',
                textDecoration: 'line-through', textDecorationColor: '#D85A30',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SampleProductCard = () => (
  <div className="card" style={{ padding: 14, background: '#fff' }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <PhotoPH size={56} label="sibuyas"/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="lbl-tag">Sibuyas pula</div>
            <div className="lbl-en">Red onion</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--warning)', font: '500 12px Inter', fontVariantNumeric: 'tabular-nums' }}>
            <Icon name="arrow-up" size={12} color="var(--warning)"/> ₱8 today
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, font: '400 11px Inter', color: 'var(--ink-2)' }}>
          <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--success)' }}/>
          Dalahican market · 4:42 AM
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
      <button className="unit-btn">1 pc · ₱14</button>
      <button className="unit-btn active">1 kg · ₱128</button>
      <button className="unit-btn">5 kg · ₱610</button>
    </div>
  </div>
);

Object.assign(window, { StyleFrame, SampleProductCard });
