// Shared SariHub UI primitives — phone chrome, pills, icons, buttons.
// Tabler-style outline icons, hand-drawn as inline SVG at 20px.

const Icon = ({ name, size = 20, color = 'currentColor', strokeWidth = 1.75, style }) => {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'block', ...style },
  };
  switch (name) {
    case 'cart':
      return (<svg {...props}><path d="M4 4h2l2 12h11l2-8H7"/><circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/></svg>);
    case 'chevron-right':
      return (<svg {...props}><path d="M9 6l6 6-6 6"/></svg>);
    case 'chevron-left':
      return (<svg {...props}><path d="M15 6l-6 6 6 6"/></svg>);
    case 'chevron-down':
      return (<svg {...props}><path d="M6 9l6 6 6-6"/></svg>);
    case 'chevron-up':
      return (<svg {...props}><path d="M6 15l6-6 6 6"/></svg>);
    case 'arrow-up':
      return (<svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>);
    case 'arrow-down':
      return (<svg {...props}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>);
    case 'check':
      return (<svg {...props}><path d="M5 12l5 5L20 7"/></svg>);
    case 'x':
      return (<svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>);
    case 'minus':
      return (<svg {...props}><path d="M5 12h14"/></svg>);
    case 'plus':
      return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case 'home':
      return (<svg {...props}><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></svg>);
    case 'list':
      return (<svg {...props}><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/></svg>);
    case 'wallet':
      return (<svg {...props}><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2zm0 0a2 2 0 0 1 2-2h11"/><circle cx="17" cy="13" r="1"/></svg>);
    case 'user':
      return (<svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>);
    case 'clock':
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case 'truck':
      return (<svg {...props}><path d="M3 17V6h11v11M14 10h4l3 4v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>);
    case 'phone':
      return (<svg {...props}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>);
    case 'mapPin':
      return (<svg {...props}><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>);
    case 'camera':
      return (<svg {...props}><path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>);
    case 'signature':
      return (<svg {...props}><path d="M3 17c2-1 3-6 5-6s2 6 4 6 3-9 5-9 1 5 4 5"/><path d="M3 21h18"/></svg>);
    case 'search':
      return (<svg {...props}><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></svg>);
    case 'wifi':
      return (<svg {...props}><path d="M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/></svg>);
    case 'wifi-off':
      return (<svg {...props}><path d="M3 3l18 18M8.5 15.5a5 5 0 0 1 7 0M5 12a10 10 0 0 1 4-2.5"/></svg>);
    case 'reload':
      return (<svg {...props}><path d="M4 12a8 8 0 0 1 14-5l2-2v6h-6l2.5-2.5"/><path d="M20 12a8 8 0 0 1-14 5l-2 2v-6h6l-2.5 2.5"/></svg>);
    case 'package':
      return (<svg {...props}><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zM3 8l9 5 9-5M12 13v9"/></svg>);
    case 'grip':
      return (<svg {...props}><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>);
    case 'filter':
      return (<svg {...props}><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>);
    case 'gcash':
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M14 8a5 5 0 1 0 0 8h1v-4h-3"/></svg>);
    case 'cash':
      return (<svg {...props}><rect x="3" y="7" width="18" height="10" rx="1"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/></svg>);
    case 'bell':
      return (<svg {...props}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>);
    case 'menu':
      return (<svg {...props}><path d="M4 7h16M4 12h16M4 17h16"/></svg>);
    case 'edit':
      return (<svg {...props}><path d="M4 20h4l11-11-4-4L4 16z"/></svg>);
    default:
      return <svg {...props}/>;
  }
};

// Neutral status bar (reads as Android-ish; no carrier text)
const StatusBar = ({ time = '6:42', dark = false, offline = false }) => (
  <div className="sh-statusbar" style={{ color: dark ? '#fff' : 'var(--ink)' }}>
    <span className="tnum">{time}</span>
    <div className="sb-right">
      {offline ? <Icon name="wifi-off" size={14}/> : <Icon name="wifi" size={14}/>}
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
        <rect x="0.5" y="3" width="2" height="6" rx="0.5" fill="currentColor"/>
        <rect x="4" y="2" width="2" height="7" rx="0.5" fill="currentColor"/>
        <rect x="7.5" y="1" width="2" height="8" rx="0.5" fill="currentColor"/>
        <rect x="11" y="0" width="2" height="9" rx="0.5" fill="currentColor"/>
      </svg>
      <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
        <rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor" fill="none"/>
        <rect x="20" y="3.5" width="1.5" height="4" rx="0.4" fill="currentColor"/>
        <rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/>
      </svg>
    </div>
  </div>
);

const HomeBar = ({ dark = false }) => (
  <div className="sh-homebar">
    <div style={{
      width: 134, height: 5, borderRadius: 3,
      background: dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
    }}/>
  </div>
);

// Pills
const Pill = ({ tone = 'neutral', children, dot = false, style }) => {
  const tones = {
    neutral: { bg: '#F1ECE2', fg: '#5F5E5A', d: '#8A8880' },
    success: { bg: 'var(--success-soft)', fg: '#127555', d: '#1D9E75' },
    warning: { bg: 'var(--warning-soft)', fg: '#8D5712', d: '#BA7517' },
    action:  { bg: '#FBE5DC', fg: '#A8421E', d: '#D85A30' },
    dark:    { bg: '#1F1D1A', fg: '#FFFFFF', d: '#FAF7F2' },
    ghost:   { bg: 'transparent', fg: '#5F5E5A', d: '#8A8880' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span className="pill" style={{ background: t.bg, color: t.fg, ...style }}>
      {dot && <span className="pill-dot" style={{ background: t.d }}/>}
      {children}
    </span>
  );
};

// Placeholder photo (striped) — used everywhere product imagery would go
const PhotoPH = ({ size = 48, label, style }) => (
  <div className="ph" style={{ width: size, height: size, borderRadius: 8, ...style }}>
    {label && <span className="ph-label">{label}</span>}
  </div>
);

// Sticky bottom area helper
const Sticky = ({ children, style }) => (
  <div style={{
    position: 'absolute', left: 0, right: 0, bottom: 22,
    padding: '12px 16px 4px',
    background: 'linear-gradient(to top, var(--bg) 70%, rgba(250,247,242,0))',
    ...style,
  }}>{children}</div>
);

Object.assign(window, { Icon, StatusBar, HomeBar, Pill, PhotoPH, Sticky });
