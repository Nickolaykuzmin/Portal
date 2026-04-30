import { NavLink } from 'react-router-dom';
import s from './Sidebar.module.scss';

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
        className={`sidebar-overlay ${s.overlay}`}
      />

      <aside className={`sidebar ${s.sidebar}${open ? ` open ${s.open}` : ''}`}>
        {/* Logo + mobile close */}
        <div className={s.header}>
          <div className={s.logoWrap}>
            <div className={s.logoIcon}>
              <span className={`material-symbols-outlined ${s.icon}`}>
                account_balance_wallet
              </span>
            </div>
            <div className={s.logoText}>
              <div className={s.name}>Finio</div>
              <div className={s.sub}>Finance</div>
            </div>
          </div>
          <button onClick={onClose} className={`sidebar-close-btn ${s.closeBtn}`}>
            <span className={`material-symbols-outlined ${s.icon}`}>close</span>
          </button>
        </div>

        {/* Nav */}
        <nav className={s.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) => `${s.navLink}${isActive ? ` ${s.active}` : ''}`}
            >
              {({ isActive }) => (
                <>
                  <div className={`${s.navIcon}${isActive ? ` ${s.active}` : ''}`}>
                    <span className={`material-symbols-outlined ${s.icon}`}>
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
        <div className={s.footer}>
          <div className={s.footerCard}>
            <div className={s.avatar}>
              <span className={`material-symbols-outlined ${s.icon}`}>person</span>
            </div>
            <div className={s.footerInfo}>
              <div className={s.title}>Особисті фінанси</div>
              <div className={s.sub}>🇷🇴 Romania</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
