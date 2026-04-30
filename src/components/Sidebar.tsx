import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/',             icon: 'grid_view',    label: 'Огляд' },
  { to: '/transactions', icon: 'receipt_long', label: 'Транзакції' },
  { to: '/upload',       icon: 'upload_file',  label: 'Завантажити' },
  { to: '/categories',   icon: 'sell',         label: 'Категорії' },
  { to: '/analytics',    icon: 'insights',     label: 'Аналітика' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        style={{
          display: 'none',
          position: 'fixed', inset: 0,
          background: 'rgba(19,27,46,0.4)',
          zIndex: 99,
          backdropFilter: 'blur(2px)',
        }}
        className="sidebar-overlay"
      />

      <aside
        className={`sidebar${open ? ' open' : ''}`}
        style={{
          position: 'fixed', left: 0, top: 0,
          height: '100vh', width: 240,
          background: 'white',
          borderRight: '1px solid var(--outline-variant)',
          display: 'flex', flexDirection: 'column',
          padding: '20px 12px',
          zIndex: 100,
        }}
      >
        {/* Logo + mobile close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '4px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #004ac6 0%, #2563eb 100%)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,74,198,0.3)',
            }}>
              <span className="material-symbols-outlined" style={{
                color: '#fff', fontSize: 20,
                fontVariationSettings: "'FILL' 1, 'wght' 500",
              }}>
                account_balance_wallet
              </span>
            </div>
            <div>
              <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 16, color: 'var(--on-surface)', letterSpacing: '-0.4px', lineHeight: 1.1 }}>
                Finio
              </div>
              <div style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 11, color: 'var(--outline)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Finance
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'none',
              background: 'var(--surface-container)',
              border: 'none', cursor: 'pointer',
              width: 32, height: 32, borderRadius: 8,
              alignItems: 'center', justifyContent: 'center',
            }}
            className="sidebar-close-btn"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>close</span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                textDecoration: 'none',
                fontFamily: 'Inter', fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
                background: isActive ? 'var(--surface-container-low)' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isActive ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 18,
                      color: isActive ? 'white' : 'var(--on-surface-variant)',
                      fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    }}>
                      {item.icon}
                    </span>
                  </div>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 16, padding: '16px 8px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--surface-container-low)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #006c49, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white', fontVariationSettings: "'FILL' 1" }}>
                person
              </span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>Особисті фінанси</div>
              <div style={{ fontSize: 11, color: 'var(--outline)' }}>🇷🇴 Romania</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
