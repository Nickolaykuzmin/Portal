import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency } from '../utils/formatters';
import type { CashSplitItem, TransactionType, Currency } from '../types';
import s from './CashSplitModal.module.scss';

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

  const allocated = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const remaining = Math.round((totalAmount - allocated) * 100) / 100;
  const isValid =
    items.every((i) => i.description.trim() && Number(i.amount) > 0) &&
    Math.abs(remaining) < 0.01;

  const addItem = () => setItems((prev) => [...prev, EMPTY_ITEM()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = <K extends keyof CashSplitItem>(idx: number, key: K, value: CashSplitItem[K]) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  };

  const fillRemaining = (idx: number) => {
    const otherSum = items.reduce((sum, item, i) => (i === idx ? sum : sum + (Number(item.amount) || 0)), 0);
    const fill = Math.round((totalAmount - otherSum) * 100) / 100;
    if (fill > 0) updateItem(idx, 'amount', fill);
  };

  // Progress bar fill color
  const progressColor =
    remaining < 0 ? 'var(--error)' : remaining === 0 ? 'var(--secondary)' : 'var(--primary)';
  const progressWidth = `${Math.min((allocated / totalAmount) * 100, 100)}%`;

  return (
    <div
      className={s.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`whisper-shadow ${s.modal}`}>
        {/* Header */}
        <div className={s.header}>
          <div>
            <h2>Розбити готівку</h2>
            <p>Зняття {formatCurrency(totalAmount, currency)} · {date}</p>
          </div>
          <button onClick={onClose} className={s.closeBtn}>
            <span className={`material-symbols-outlined ${s.icon}`}>close</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className={s.progress}>
          <div className={s.progressLabels}>
            <span className={s.allocated}>
              Розподілено: {formatCurrency(allocated, currency)}
            </span>
            <span
              className={`${s.remaining} ${
                remaining < 0 ? s.over : remaining === 0 ? s.done : ''
              }`}
            >
              {remaining === 0
                ? '✓ Повністю'
                : remaining < 0
                ? `Перевищено на ${formatCurrency(-remaining, currency)}`
                : `Залишок: ${formatCurrency(remaining, currency)}`}
            </span>
          </div>
          <div className={s.progressTrack}>
            <div
              className={s.progressFill}
              style={{ width: progressWidth, background: progressColor }}
            />
          </div>
        </div>

        {/* Items */}
        <div className={s.items}>
          {items.map((item, idx) => (
            <div key={idx} className={s.item}>
              <div className={s.itemTop}>
                {/* Type toggle */}
                <div className={s.typeToggle}>
                  {(['expense', 'income'] as TransactionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateItem(idx, 'type', t)}
                      className={`${s.typeBtn} ${item.type === t ? s[t] : ''}`}
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
                    className={s.removeBtn}
                  >
                    <span className={`material-symbols-outlined ${s.icon}`}>delete</span>
                  </button>
                )}
              </div>

              <div className={s.itemFields}>
                {/* Description */}
                <div>
                  <label className={s.fieldLabel}>Опис</label>
                  <input
                    className={s.input}
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Напр. Оренда квартири"
                  />
                </div>

                {/* Amount */}
                <div className={s.amountWrap}>
                  <label className={s.fieldLabel}>Сума</label>
                  <input
                    className={s.input}
                    style={{ paddingRight: remaining > 0 ? 28 : undefined }}
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
                      className={s.fillBtn}
                    >
                      <span className={`material-symbols-outlined ${s.icon}`}>arrow_downward</span>
                    </button>
                  )}
                </div>

                {/* Category */}
                <div className={s.categoryWrap}>
                  <label className={s.fieldLabel}>Категорія</label>
                  <select
                    className={s.select}
                    value={item.category}
                    onChange={(e) => updateItem(idx, 'category', e.target.value)}
                  >
                    {categories
                      .filter((c) => c.type === item.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add item */}
        <button type="button" onClick={addItem} className={s.addBtn}>
          <span className={`material-symbols-outlined ${s.icon}`}>add</span>
          Додати статтю
        </button>

        {/* Actions */}
        <div className={s.footer}>
          <button type="button" onClick={onClose} className={s.cancelBtn}>
            Скасувати
          </button>
          <button
            type="button"
            onClick={() => isValid && onSave(items)}
            disabled={!isValid}
            className={s.saveBtn}
          >
            <span className={`material-symbols-outlined ${s.icon}`}>call_split</span>
            Замінити зняттям готівки
          </button>
        </div>
      </div>
    </div>
  );
}
