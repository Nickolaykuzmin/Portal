import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency } from '../utils/formatters';
import type { CashSplitItem, TransactionType, Currency } from '../types';

interface CashSplitModalProps {
  totalAmount: number;
  currency: Currency;
  date: string;
  onSave: (items: CashSplitItem[]) => void;
  onClose: () => void;
}

const EMPTY_ITEM = (): CashSplitItem => ({
  description: '',
  amount: 0,
  category: 'other',
  type: 'expense',
});

export default function CashSplitModal({
  totalAmount,
  currency,
  date,
  onSave,
  onClose,
}: CashSplitModalProps) {
  const { categories } = useCategories();
  const [items, setItems] = useState<CashSplitItem[]>([EMPTY_ITEM()]);

  const allocated = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const remaining = Math.round((totalAmount - allocated) * 100) / 100;
  const isValid = items.every((i) => i.description.trim() && Number(i.amount) > 0) && Math.abs(remaining) < 0.01;

  const addItem = () => setItems((prev) => [...prev, EMPTY_ITEM()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = <K extends keyof CashSplitItem>(idx: number, key: K, value: CashSplitItem[K]) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  };

  // Auto-fill remaining amount into last item
  const fillRemaining = (idx: number) => {
    const otherSum = items.reduce((s, item, i) => i === idx ? s : s + (Number(item.amount) || 0), 0);
    const fill = Math.round((totalAmount - otherSum) * 100) / 100;
    if (fill > 0) updateItem(idx, 'amount', fill);
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    border: '1px solid var(--outline-variant)',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--on-surface)',
    background: 'white',
    outline: 'none',
    fontFamily: 'Inter',
    width: '100%',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(19,27,46,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="whisper-shadow" style={{
        background: 'white', borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 560,
        border: '1px solid var(--outline-variant)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontFamily: 'Manrope', fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>
              Розбити готівку
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--on-surface-variant)' }}>
              Зняття {formatCurrency(totalAmount, currency)} · {date}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>close</span>
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              Розподілено: {formatCurrency(allocated, currency)}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: remaining < 0 ? 'var(--error)' : remaining === 0 ? 'var(--secondary)' : 'var(--on-surface-variant)',
            }}>
              {remaining === 0 ? '✓ Повністю' : remaining < 0 ? `Перевищено на ${formatCurrency(-remaining, currency)}` : `Залишок: ${formatCurrency(remaining, currency)}`}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((allocated / totalAmount) * 100, 100)}%`,
              background: remaining < 0 ? 'var(--error)' : remaining === 0 ? 'var(--secondary)' : 'var(--primary)',
              borderRadius: 3,
              transition: 'width 0.2s ease',
            }} />
          </div>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{
              background: 'var(--surface-container-low)',
              borderRadius: 12, padding: 14,
              border: '1px solid var(--outline-variant)',
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {/* Type toggle */}
                <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--outline-variant)', flexShrink: 0 }}>
                  {(['expense', 'income'] as TransactionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateItem(idx, 'type', t)}
                      style={{
                        padding: '6px 10px', border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700,
                        background: item.type === t
                          ? (t === 'income' ? '#dcfce7' : '#fee2e2')
                          : 'white',
                        color: item.type === t
                          ? (t === 'income' ? 'var(--secondary)' : 'var(--tertiary)')
                          : 'var(--on-surface-variant)',
                      }}
                    >
                      {t === 'income' ? '↑ Дохід' : '↓ Витрата'}
                    </button>
                  ))}
                </div>

                {/* Remove */}
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      cursor: 'pointer', padding: 4, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--error)' }}>delete</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end' }}>
                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: 4 }}>
                    Опис
                  </label>
                  <input
                    style={inputStyle}
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Напр. Оренда квартири"
                  />
                </div>

                {/* Amount */}
                <div style={{ width: 110 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: 4 }}>
                    Сума
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{ ...inputStyle, paddingRight: 28 }}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount || ''}
                      onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    {remaining > 0 && (
                      <button
                        type="button"
                        title="Заповнити залишок"
                        onClick={() => fillRemaining(idx)}
                        style={{
                          position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--primary)' }}>arrow_downward</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div style={{ width: 130 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: 4 }}>
                    Категорія
                  </label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={item.category}
                    onChange={(e) => updateItem(idx, 'category', e.target.value)}
                  >
                    {categories
                      .filter((c) => c.type === item.type)
                      .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add item */}
        <button
          type="button"
          onClick={addItem}
          style={{
            width: '100%', padding: '10px', borderRadius: 10,
            border: '1.5px dashed var(--outline-variant)',
            background: 'transparent', color: 'var(--primary)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginBottom: 20,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Додати статтю
        </button>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1px solid var(--outline-variant)', background: 'white',
              color: 'var(--on-surface)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={() => isValid && onSave(items)}
            disabled={!isValid}
            style={{
              flex: 2, padding: '11px', borderRadius: 10, border: 'none',
              background: isValid ? 'var(--primary)' : 'var(--outline-variant)',
              color: 'white', fontWeight: 600, fontSize: 14,
              cursor: isValid ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call_split</span>
            Замінити зняттям готівки
          </button>
        </div>
      </div>
    </div>
  );
}
