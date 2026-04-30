import { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import type { Currency } from '../types';
import s from './TopBar.module.scss';

interface TopBarProps {
  title: string;
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
}

export default function TopBar({ title, onSearch, onMenuClick }: TopBarProps) {
  const [query, setQuery] = useState('');
  const { displayCurrency, setDisplayCurrency } = useAppContext();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className={`topbar ${s.topbar}`}>
      <div className={s.left}>
        <button
          onClick={onMenuClick}
          className={`topbar-menu-btn ${s.menuBtn}`}
        >
          <span className={`material-symbols-outlined ${s.icon}`}>menu</span>
        </button>

        <h1 className={`topbar-title ${s.title}`}>{title}</h1>
      </div>

      <div className={s.right}>
        {/* Currency toggle */}
        <div className={s.currencyToggle}>
          {(['RON', 'EUR'] as Currency[]).map((cur) => (
            <button
              key={cur}
              onClick={() => setDisplayCurrency(cur)}
              className={`${s.currencyBtn}${displayCurrency === cur ? ` ${s.active}` : ''}`}
            >
              {cur === 'EUR' ? '€ EUR' : 'lei RON'}
            </button>
          ))}
        </div>

        {onSearch && (
          <div className={`topbar-search ${s.searchWrap}`}>
            <span className={`material-symbols-outlined ${s.searchIcon}`}>search</span>
            <input
              value={query}
              onChange={handleChange}
              placeholder="Пошук транзакцій..."
              className={s.searchInput}
            />
          </div>
        )}
      </div>
    </header>
  );
}
