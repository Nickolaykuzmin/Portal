import { useState, useEffect } from 'react';
import { useCategories } from '../hooks/useCategories';
import CashSplitModal from './CashSplitModal';
import type { Transaction, TransactionType, Currency, CashMode, CashSplitItem } from '../types';
import s from './EditTransactionModal.module.scss';

interface FormState {
  description: string;
  amount: string;
  date: string;
  type: TransactionType;
  category: string;
  currency: Currency;
  cashMode: CashMode;
}

interface EditTransactionModalProps {
  transaction: Partial<Transaction> | null;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onSplit?: (items: CashSplitItem[]) => void;
  onClose: () => void;
}

export default function EditTransactionModal({ transaction, onSave, onSplit, onClose }: EditTransactionModalProps) {
  const { categories } = useCategories();
  const [form, setForm] = useState<FormState>({
    description: '',
    amount: '',
    date: '',
    type: 'expense',
    category: 'other',
    currency: 'RON',
    cashMode: 'expense',
  });
  const [showSplitModal, setShowSplitModal] = useState(false);

  const isAtm = transaction?.isCashWithdrawal === true;

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description || '',
        amount: transaction.amount != null ? String(transaction.amount) : '',
        date: transaction.date || '',
        type: transaction.type || 'expense',
        category: transaction.category || 'other',
        currency: transaction.currency || 'RON',
        cashMode: transaction.cashMode || 'expense',
      });
    }
  }, [transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAtm && form.cashMode === 'split') {
      setShowSplitModal(true);
      return;
    }
    onSave({
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      type: form.type,
      category: form.cashMode === 'neutral' ? '' : form.category,
      currency: form.currency,
      isCashWithdrawal: transaction?.isCashWithdrawal,
      cashMode: isAtm ? form.cashMode : undefined,
    });
  };

  const handleSplitSave = (items: CashSplitItem[]) => {
    setShowSplitModal(false);
    onSplit?.(items);
    onClose();
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const filteredCategories = categories.filter((c) =>
    form.type === 'income' ? c.type === 'income' : c.type === 'expense',
  );

  return (
    <>
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
            {/* Cash mode selector — only for ATM withdrawals */}
            {isAtm && (
              <div className={s.field}>
                <label className={s.label}>Режим обробки готівки</label>
                <div className={s.cashModeToggle}>
                  {([
                    { key: 'expense' as CashMode, label: '↓ Витрата', title: 'Вказати категорію витрати' },
                    { key: 'neutral' as CashMode, label: '⇄ Нейтрально', title: 'Не враховувати у витратах' },
                    { key: 'split'   as CashMode, label: '⊕ Розбити', title: 'Розбити на кілька статей' },
                  ]).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      title={m.title}
                      onClick={() => setForm((f) => ({ ...f, cashMode: m.key }))}
                      className={`${s.cashModeBtn} ${form.cashMode === m.key ? s[m.key] : ''}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type toggle — hidden for ATM in neutral/split mode */}
            {(!isAtm || form.cashMode === 'expense') && (
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
            )}

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

            {/* Category — hidden for neutral ATM */}
            {(!isAtm || form.cashMode === 'expense') && (
              <div className={s.field}>
                <label className={s.label}>Категорія</label>
                <select
                  className={s.select}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {(isAtm ? expenseCategories : filteredCategories).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Neutral hint */}
            {isAtm && form.cashMode === 'neutral' && (
              <p className={s.neutralHint}>
                Транзакція буде збережена як переміщення коштів і не враховуватиметься у витратах.
              </p>
            )}

            <div className={s.footer}>
              <button type="button" onClick={onClose} className={s.cancelBtn}>
                Скасувати
              </button>
              <button type="submit" className={s.saveBtn}>
                {isAtm && form.cashMode === 'split' ? 'Розбити...' : 'Зберегти'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showSplitModal && transaction && (
        <CashSplitModal
          totalAmount={parseFloat(form.amount) || transaction.amount || 0}
          currency={form.currency}
          date={form.date || transaction.date || ''}
          onSave={handleSplitSave}
          onClose={() => setShowSplitModal(false)}
        />
      )}
    </>
  );
}
