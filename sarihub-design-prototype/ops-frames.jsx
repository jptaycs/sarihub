// Small shared frames + page header used across the role-specific prototypes.

const PageHeader = ({ eyebrow, title, sub, right }) => (
  <div style={{
    maxWidth: 1480, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, gap: 24,
  }}>
    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--action)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        font: '500 17px/1 Inter', letterSpacing: '-0.02em', flexShrink: 0,
      }}>S</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: '500 15px Inter', color: 'var(--ink)' }}>{title}</div>
        <div style={{ font: '400 12px Inter', color: 'var(--ink-2)', marginTop: 1 }}>{eyebrow}</div>
      </div>
    </div>
    {right}
  </div>
);

const RoleNav = ({ current }) => {
  const roles = [
    { id: 'owner', label: 'Store owner', icon: 'home',    file: 'SariHub Store Owner.html' },
    { id: 'admin', label: 'Admin',       icon: 'list',    file: 'SariHub Admin.html' },
    { id: 'crew',  label: 'Truck crew',  icon: 'truck',   file: 'SariHub Truck Crew.html' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 4, background: '#fff', border: '1px solid var(--hair)',
      borderRadius: 12, padding: 4, flexShrink: 0,
    }}>
      {roles.map(r => {
        const active = current === r.id;
        return (
          <a key={r.id} href={r.file}
            style={{
              height: 40, padding: '0 16px', borderRadius: 8,
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? '#fff' : 'var(--ink-2)',
              border: 0, font: '500 13px Inter',
              cursor: 'pointer', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <Icon name={r.icon} size={16} color={active ? '#fff' : 'var(--ink-2)'}/>
            {r.label}
          </a>
        );
      })}
    </div>
  );
};

const DesktopWindow = ({ children, height = 820 }) => (
  <div style={{
    background: '#fff', borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid var(--hair)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
    height,
    display: 'flex', flexDirection: 'column',
  }}>
    <div style={{
      height: 36, background: '#F4F0E8',
      borderBottom: '1px solid var(--hair)',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ width: 11, height: 11, borderRadius: 6, background: '#F26B5F' }}/>
        <span style={{ width: 11, height: 11, borderRadius: 6, background: '#F5BE4F' }}/>
        <span style={{ width: 11, height: 11, borderRadius: 6, background: '#62C455' }}/>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', font: '400 12px Inter', color: 'var(--ink-3)' }}>
        admin.sarihub.ph
      </div>
      <div style={{ width: 70 }}/>
    </div>
    <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
  </div>
);

const CenteredPhone = ({ children }) => (
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
        borderRadius: 32, overflow: 'hidden',
        position: 'relative', background: 'var(--bg)',
      }}>
        {children}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          width: 110, height: 28, borderRadius: 14, background: '#0E0D0B', zIndex: 1,
        }}/>
      </div>
    </div>
  </div>
);

const PageShell = ({ children }) => (
  <div style={{
    minHeight: '100vh', width: '100%',
    background: '#DCD7CB',
    backgroundImage: 'radial-gradient(circle at center top, rgba(0,0,0,0.04), transparent 50%)',
    padding: '20px 24px 40px',
    fontFamily: 'Inter, sans-serif',
  }}>
    {children}
  </div>
);

Object.assign(window, { PageHeader, RoleNav, DesktopWindow, CenteredPhone, PageShell });
