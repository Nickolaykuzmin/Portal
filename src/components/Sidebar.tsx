import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
  const { user, accounts, activeAccount, setActiveAccount, logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const handleAccountSwitch = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (account) setActiveAccount(account);
    setAccountMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
  };

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

        {/* Account switcher */}
        <div className={s.accountSwitcher}>
          <button
            className={s.accountBtn}
            onClick={() => setAccountMenuOpen((v) => !v)}
          >
            <span className={`material-symbols-outlined ${s.accountIcon} ${activeAccount.type === 'srl' ? s.srl : s.personal}`}>
              {activeAccount.type === 'srl' ? 'business' : 'person'}
            </span>
            <div className={s.accountInfo}>
              <div className={s.accountLabel}>{activeAccount.label}</div>
              <div className={s.accountType}>
                {activeAccount.type === 'srl' ? 'Компанія' : 'Особистий'}
              </div>
            </div>
            <span className={`material-symbols-outlined ${s.chevron}${accountMenuOpen ? ` ${s.open}` : ''}`}>
              expand_more
            </span>
          </button>

          {accountMenuOpen && (
            <div className={s.accountMenu}>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  className={`${s.accountMenuItem}${activeAccount.id === account.id ? ` ${s.active}` : ''}`}
                  onClick={() => handleAccountSwitch(account.id)}
                >
                  <span className={`material-symbols-outlined ${s.menuIcon}`}>
                    {account.type === 'srl' ? 'business' : 'person'}
                  </span>
                  <div>
                    <div className={s.menuLabel}>{account.label}</div>
                    <div className={s.menuSub}>
                      {account.type === 'srl' ? 'SRL / SA рахунок' : 'Особистий рахунок'}
                    </div>
                  </div>
                  {activeAccount.id === account.id && (
                    <span className={`material-symbols-outlined ${s.checkIcon}`}>check</span>
                  )}
                </button>
              ))}
            </div>
          )}
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

        {/* Footer — user info + logout */}
        <div className={s.footer}>
          <div className={s.footerCard}>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? 'User'}
                className={s.avatarImg}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={s.avatar}>
                <span className={`material-symbols-outlined ${s.icon}`}>person</span>
              </div>
            )}
            <div className={s.footerInfo}>
              <div className={s.title}>
                {user?.displayName ?? 'Користувач'}
              </div>
              <div className={s.sub}>
                {user?.email ?? ''}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={s.logoutBtn}
              title="Вийти"
            >
              <span className={`material-symbols-outlined ${s.icon}`}>logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
