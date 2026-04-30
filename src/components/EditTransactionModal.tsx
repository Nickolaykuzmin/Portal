import { useState, useEffect } from 'react';
import { useCategories } from '../hooks/useCategories';
import type { Transaction, TransactionType, Currency } from '../types';
import s from './EditTransactionModal.module.scss';

interface FormState {
  description: string;
  amount: string;
  date: string;
  type: TransactionType;
  category: string;
  currency: Currency;
}

interface EditTransactionModalProps {
  transaction: Partial<Transaction> | null;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function EditTransactionModal({ transaction, onSave, onClose }: EditTransactionModalProps) {
  const { categories } = useCategories();
  const [form, setForm] = useState<FormState>({
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
        amount: transaction.amount != null ? String(transaction.amount) : '',
        date: transaction.date || '',
        type: transaction.type || 'expense',
        category: transaction.category || 'other',
        currency: transaction.currency || 'RON',
      });
    }
  }, [transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      type: form.type,
      category: form.category,
      currency: form.currency,
    });
  };

  return (
    <div
      className={s.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`whisper-shadow ${s.modal}`}>
        <div className={s.modalHeader}>
          <h2>{transaction?.id ? 'Редагувати транзакцію' : 'Нова транзакція'}</h2>
          <button onClick={onClose} className={s.closeBtn}>
            <span className={`material-symbols-outlined ${s.icon}`}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={s.form}>
          {/* Type toggle */}
          <div className={s.field}>
            <label className={s.label}>Тип</label>
            <div className={s.typeToggle}>
              {(['expense', 'income'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`${s.typeBtn} ${form.type === t ? s[t] : ''}`}
                >
                  {t === 'income' ? '↑ Дохід' : '↓ Витрата'}
                </button>
              ))}
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Опис</label>
            <input
              className={s.input}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Назва транзакції"
              required
            />
          </div>

          <div className={s.twoCol}>
            <div className={s.field}>
              <label className={s.label}>Сума</label>
              <input
                className={s.input}
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className={s.field}>
              <label className={s.label}>Валюта</label>
              <select
                className={s.select}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Дата</label>
            <input
              className={s.input}
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Категорія</label>
            <select
              className={s.select}
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

          <div className={s.footer}>
            <button type="button" onClick={onClose} className={s.cancelBtn}>
              Скасувати
            </button>
            <button type="submit" className={s.saveBtn}>
              Зберегти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
