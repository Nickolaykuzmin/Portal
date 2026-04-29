import { useState, useEffect } from 'react';
import { useCategories } from '../hooks/useCategories';

export default function EditTransactionModal({ transaction, onSave, onClose }) {
  const { categories } = useCategories();
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: '',
    type: 'expense',
    category: 'other',
    currency: 'RON',
  });

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description || '',
        amount: transaction.amount || '',
        date: transaction.date || '',
        type: transaction.type || 'expense',
        category: transaction.category || 'other',
        currency: transaction.currency || 'RON',
      });
    }
  }, [transaction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, amount: parseFloat(form.amount) });
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--outline-variant)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--on-surface)',
    background: 'white',
    outline: 'none',
    fontFamily: 'Inter',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--on-surface-variant)',
    marginBottom: 6,
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(19,27,46,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 16,
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="whisper-shadow" style={{
        background: 'white',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 480,
        border: '1px solid var(--outline-variant)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: 'Manrope', fontSize: 20, fontWeight: 700, color: 'var(--on-surface)' }}>
            {transaction?.id ? 'Редагувати транзакцію' : 'Нова транзакція'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type toggle */}
          <div>
            <label style={labelStyle}>Тип</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: form.type === t
                      ? (t === 'income' ? 'var(--secondary)' : 'var(--tertiary)')
                      : 'var(--outline-variant)',
                    background: form.type === t
                      ? (t === 'income' ? '#dcfce7' : '#fee2e2')
                      : 'white',
                    color: form.type === t
                      ? (t === 'income' ? 'var(--secondary)' : 'var(--tertiary)')
                      : 'var(--on-surface-variant)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {t === 'income' ? '↑ Дохід' : '↓ Витрата'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Опис</label>
            <input
              style={inputStyle}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Назва транзакції"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Сума</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Валюта</label>
              <select
                style={inputStyle}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Дата</label>
            <input
              style={inputStyle}
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Категорія</label>
            <select
              style={inputStyle}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {categories
                .filter((c) => form.type === 'income' ? c.type === 'income' : c.type === 'expense')
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                border: '1px solid var(--outline-variant)',
                background: 'white',
                color: 'var(--on-surface)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Скасувати
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--primary)',
                color: 'white',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Зберегти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
