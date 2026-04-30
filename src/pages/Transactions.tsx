import { useState, useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAppContext } from '../hooks/useAppContext';
import TransactionRow from '../components/TransactionRow';
import EditTransactionModal from '../components/EditTransactionModal';
import TopBar from '../components/TopBar';
import { formatCurrency } from '../utils/formatters';
import type { Transaction } from '../types';
import s from './Transactions.module.scss';

function getMonthLabel(key: string): string {
  try {
    return new Date(key + '-01').toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  } catch {
    return key;
  }
}

interface TransactionsProps {
  onMenuClick?: () => void;
}

export default function Transactions({ onMenuClick }: TransactionsProps) {
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { displayCurrency, convertAmount } = useAppContext();
  const fmt = (amount: number) => formatCurrency(amount, displayCurrency);
  const conv = (tx: Transaction) => convertAmount(tx.amount || 0, tx.currency || 'RON');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editTx, setEditTx] = useState<Partial<Transaction> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = !search || tx.description?.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || tx.type === filterType;
      const matchCat = filterCategory === 'all' || tx.category === filterCategory;
      return matchSearch && matchType && matchCat;
    });
  }, [transactions, search, filterType, filterCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const tx of filtered) {
      const key = tx.date ? tx.date.slice(0, 7) : 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const totalIncome  = filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + conv(t), 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((sum, t) => sum + conv(t), 0);

  const toggleMonth = (key: string) =>
    setCollapsedMonths((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleEdit = (tx: Transaction) => { setEditTx(tx); setShowModal(true); };
  const handleNew  = () => { setEditTx({ date: new Date().toISOString().split('T')[0] }); setShowModal(true); };

  const handleSave = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editTx?.id) await updateTransaction(editTx.id, data);
    else await addTransaction(data);
    setShowModal(false);
    setEditTx(null);
  };

  const handleDelete = async (tx: Transaction) => {
    if (window.confirm(`Видалити "${tx.description}"?`)) await deleteTransaction(tx.id);
  };

  return (
    <>
      <TopBar title="Транзакції" onSearch={setSearch} onMenuClick={onMenuClick} />
      <div className={`page-content ${s.page}`}>

        {/* Summary bar */}
        <div className={`tx-summary-bar ${s.summaryBar}`}>
          <div className={s.summaryCard}>
            <span className={s.summaryLabel}>Показано: {filtered.length} транзакцій</span>
            <div className={`tx-summary-amounts ${s.summaryAmounts}`}>
              <span className={s.income}>+{fmt(totalIncome)}</span>
              <span className={s.expense}>−{fmt(totalExpense)}</span>
              <span className={s.net}>={fmt(totalIncome - totalExpense)}</span>
            </div>
          </div>
          <button onClick={handleNew} className={s.newBtn}>
            <span className={`material-symbols-outlined ${s.icon}`}>add</span>
            Нова
          </button>
        </div>

        {/* Filters */}
        <div className={s.filters}>
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`${s.filterBtn}${filterType === t ? ` ${s.active}` : ''}`}
            >
              {t === 'all' ? 'Всі' : t === 'income' ? '↑ Доходи' : '↓ Витрати'}
            </button>
          ))}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={s.filterSelect}
          >
            <option value="all">Всі категорії</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Monthly groups */}
        {loading ? (
          <div className={s.loading}>Завантаження...</div>
        ) : filtered.length === 0 ? (
          <div className={`whisper-shadow ${s.empty}`}>
            <span className={`material-symbols-outlined ${s.icon}`}>receipt_long</span>
            <p>
              {transactions.length === 0
                ? 'Немає транзакцій. Завантажте PDF statement.'
                : 'Нічого не знайдено.'}
            </p>
          </div>
        ) : (
          <div className={s.groups}>
            {grouped.map(([monthKey, txs]) => {
              const isCollapsed = collapsedMonths[monthKey];
              const monthIncome  = txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + conv(t), 0);
              const monthExpense = txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + conv(t), 0);
              const net = monthIncome - monthExpense;

              return (
                <div key={monthKey} className={`whisper-shadow ${s.monthGroup}`}>
                  <div
                    onClick={() => toggleMonth(monthKey)}
                    className={`${s.monthHeader}${isCollapsed ? ` ${s.collapsed}` : ''}`}
                  >
                    <div className={s.monthLeft}>
                      <span className={`material-symbols-outlined ${s.expandIcon}${isCollapsed ? ` ${s.collapsed}` : ''}`}>
                        expand_more
                      </span>
                      <span className={s.monthName}>{getMonthLabel(monthKey)}</span>
                      <span className={s.monthCount}>{txs.length} транзакцій</span>
                    </div>
                    <div className={s.monthRight}>
                      {monthIncome > 0 && (
                        <span className={s.income}>+{fmt(monthIncome)}</span>
                      )}
                      {monthExpense > 0 && (
                        <span className={s.expense}>−{fmt(monthExpense)}</span>
                      )}
                      <span className={`${s.monthNet} ${net >= 0 ? s.positive : s.negative}`}>
                        {net >= 0 ? '+' : ''}{fmt(net)}
                      </span>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className={`table-scroll-wrap ${s.tableWrap}`}>
                      <table className={s.table}>
                        <thead>
                          <tr>
                            {['Транзакція', 'Дата', 'Категорія', 'Сума', ''].map((h) => (
                              <th
                                key={h}
                                className={`${s.th}${h === 'Дата' || h === 'Категорія' ? ' hide-mobile' : ''}${h === 'Сума' ? ` ${s.right}` : ''}`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {txs.map((tx) => (
                            <TransactionRow
                              key={tx.id}
                              transaction={tx}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <EditTransactionModal
          transaction={editTx}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTx(null); }}
        />
      )}
    </>
  );
}
