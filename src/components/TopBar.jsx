import { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';

export default function TopBar({ title, onSearch }) {
  const [query, setQuery] = useState('');
  const { displayCurrency, setDisplayCurrency } = useAppContext();

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      right: 0,
      left: 240,
      height: 64,
      background: 'rgba(250,248,255,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--outline-variant)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 40,
    }}>
      <h1 style={{
        margin: 0,
        fontFamily: 'Manrope',
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--on-surface)',
        letterSpacing: '-0.3px',
      }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Currency toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--surface-container)',
          borderRadius: 20,
          padding: 3,
          border: '1px solid var(--outline-variant)',
        }}>
          {['RON', 'EUR'].map((cur) => (
            <button
              key={cur}
              onClick={() => setDisplayCurrency(cur)}
              style={{
                padding: '5px 14px',
                borderRadius: 16,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.04em',
                transition: 'all 0.18s ease',
                background: displayCurrency === cur ? 'var(--primary)' : 'transparent',
                color: displayCurrency === cur ? 'white' : 'var(--on-surface-variant)',
                boxShadow: displayCurrency === cur ? '0 2px 8px rgba(0,74,198,0.25)' : 'none',
              }}
            >
              {cur === 'EUR' ? '€ EUR' : 'lei RON'}
            </button>
          ))}
        </div>

        {onSearch && (
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 18,
              color: 'var(--outline)',
            }}>search</span>
            <input
              value={query}
              onChange={handleChange}
              placeholder="Пошук транзакцій..."
              style={{
                background: 'white',
                border: '1px solid var(--outline-variant)',
                borderRadius: 20,
                padding: '7px 16px 7px 34px',
                fontSize: 14,
                color: 'var(--on-surface)',
                outline: 'none',
                width: 240,
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}
