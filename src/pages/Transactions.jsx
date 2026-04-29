import { useState, useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAppContext } from '../context/AppContext';
import TransactionRow from '../components/TransactionRow';
import EditTransactionModal from '../components/EditTransactionModal';
import TopBar from '../components/TopBar';
import { formatCurrency } from '../utils/formatters';

function getMonthLabel(key) {
  // key = "YYYY-MM"
  try {
    return new Date(key + '-01').toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  } catch {
    return key;
  }
}

export default function Transactions() {
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { displayCurrency, convertAmount } = useAppContext();
  const fmt = (amount) => formatCurrency(amount, displayCurrency);
  const conv = (tx) => convertAmount(tx.amount || 0, tx.currency || 'RON');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editTx, setEditTx] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState({});

  // Filter
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = !search || tx.description?.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || tx.type === filterType;
      const matchCat = filterCategory === 'all' || tx.category === filterCategory;
      return matchSearch && matchType && matchCat;
    });
  }, [transactions, search, filterType, filterCategory]);

  // Group by month
  const grouped = useMemo(() => {
    const map = {};
    for (const tx of filtered) {
      const key = tx.date ? tx.date.slice(0, 7) : 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    }
    // Sort months descending
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const totalIncome  = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + convertAmount(t.amount || 0, t.currency || 'RON'), 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + convertAmount(t.amount || 0, t.currency || 'RON'), 0);

  const toggleMonth = (key) =>
    setCollapsedMonths((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleEdit = (tx) => { setEditTx(tx); setShowModal(true); };
  const handleNew  = () => { setEditTx({ date: new Date().toISOString().split('T')[0] }); setShowModal(true); };

  const handleSave = async (data) => {
    if (editTx?.id) await updateTransaction(editTx.id, data);
    else await addTransaction(data);
    setShowModal(false);
    setEditTx(null);
  };

  const handleDelete = async (tx) => {
    if (window.confirm(`Видалити "${tx.description}"?`)) await deleteTransaction(tx.id);
  };

  return (
    <>
      <TopBar title="Транзакції" onSearch={setSearch} />
      <div style={{ padding: '80px 32px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Summary bar */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
          <div style={{
            flex: 1, background: 'white', borderRadius: 12, padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            border: '1px solid var(--outline-variant)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Показано: {filtered.length} транзакцій
            </span>
            <div style={{ display: 'flex', gap: 24 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--secondary)' }}>+{fmt(totalIncome)}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tertiary)' }}>−{fmt(totalExpense)}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                ={fmt(totalIncome - totalExpense)}
              </span>
            </div>
          </div>
          <button
            onClick={handleNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 12,
              background: 'var(--primary)', color: 'white',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Нова
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', 'income', 'expense'].map((t) => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: '7px 16px', borderRadius: 20, border: '1px solid',
              borderColor: filterType === t ? 'var(--primary)' : 'var(--outline-variant)',
              background: filterType === t ? 'var(--primary)' : 'white',
              color: filterType === t ? 'white' : 'var(--on-surface-variant)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              {t === 'all' ? 'Всі' : t === 'income' ? '↑ Доходи' : '↓ Витрати'}
            </button>
          ))}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 20,
              border: '1px solid var(--outline-variant)',
              background: 'white', color: 'var(--on-surface)',
              fontSize: 13, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="all">Всі категорії</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Monthly groups */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)' }}>Завантаження...</div>
        ) : filtered.length === 0 ? (
          <div className="whisper-shadow" style={{ background: 'white', borderRadius: 16, padding: 60, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--outline-variant)', display: 'block', marginBottom: 12 }}>receipt_long</span>
            <p style={{ color: 'var(--on-surface-variant)', margin: 0 }}>
              {transactions.length === 0 ? 'Немає транзакцій. Завантажте PDF statement.' : 'Нічого не знайдено.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {grouped.map(([monthKey, txs]) => {
              const isCollapsed = collapsedMonths[monthKey];
              const monthIncome  = txs.filter((t) => t.type === 'income').reduce((s, t) => s + convertAmount(t.amount || 0, t.currency || 'RON'), 0);
              const monthExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + convertAmount(t.amount || 0, t.currency || 'RON'), 0);
              const net = monthIncome - monthExpense;

              return (
                <div key={monthKey} className="whisper-shadow" style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
                  {/* Month header */}
                  <div
                    onClick={() => toggleMonth(monthKey)}
                    style={{
                      padding: '14px 20px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', userSelect: 'none',
                      background: 'var(--surface-container-low)',
                      borderBottom: isCollapsed ? 'none' : '1px solid var(--outline-variant)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--outline)', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                      <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, color: 'var(--on-surface)', textTransform: 'capitalize' }}>
                        {getMonthLabel(monthKey)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--outline)', fontWeight: 500 }}>
                        {txs.length} транзакцій
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                      {monthIncome > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--secondary)' }}>
                          +{fmt(monthIncome)}
                        </span>
                      )}
                      {monthExpense > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tertiary)' }}>
                          −{fmt(monthExpense)}
                        </span>
                      )}
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: net >= 0 ? 'var(--secondary)' : 'var(--tertiary)',
                        paddingLeft: 12, borderLeft: '1px solid var(--outline-variant)',
                      }}>
                        {net >= 0 ? '+' : ''}{fmt(net)}
                      </span>
                    </div>
                  </div>

                  {/* Transactions table */}
                  {!isCollapsed && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                          {['Транзакція', 'Дата', 'Категорія', 'Сума', ''].map((h) => (
                            <th key={h} style={{
                              padding: '10px 16px',
                              textAlign: h === 'Сума' ? 'right' : 'left',
                              fontSize: 11, fontWeight: 600,
                              textTransform: 'uppercase', letterSpacing: '0.05em',
                              color: 'var(--on-surface-variant)',
                            }}>{h}</th>
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
