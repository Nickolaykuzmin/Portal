import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAppContext } from '../hooks/useAppContext';
import { formatCurrency, formatDate, calcTotals, groupByMonth } from '../utils/formatters';
import { resolveCategory } from '../utils/categoryHelpers';
import StatCard from '../components/StatCard';
import TopBar from '../components/TopBar';

export default function Overview() {
  const { transactions, loading } = useTransactions();
  const { categories } = useCategories();
  const { displayCurrency, convertAmount } = useAppContext();

  // Helper: format in display currency
  const fmt = (amount) => formatCurrency(amount, displayCurrency);

  const totals = useMemo(() => calcTotals(transactions), [transactions]);

  // Bank balance from statement metadata or fallback
  const bankBalance = useMemo(() => {
    const withBalance = transactions.filter((t) => t.bankBalance != null);
    if (withBalance.length > 0) {
      const latest = withBalance.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      return convertAmount(latest.bankBalance, latest.currency || 'RON');
    }
    return convertAmount(totals.income - totals.expenses, 'RON');
  }, [transactions, totals, convertAmount]);

  // Current month transactions for budget section
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTxs = useMemo(
    () => transactions.filter((t) => t.date?.startsWith(currentMonthKey)),
    [transactions, currentMonthKey],
  );

  // Spending per category this month (converted)
  const categorySpend = useMemo(() => {
    const map = {};
    currentMonthTxs.filter((t) => t.type === 'expense').forEach((tx) => {
      const cat = tx.category || 'other';
      map[cat] = (map[cat] || 0) + convertAmount(tx.amount || 0, tx.currency || 'RON');
    });
    return map;
  }, [currentMonthTxs, convertAmount]);

  // Top 4 expense categories this month for budget cards
  const budgetCategories = useMemo(() => {
    return Object.entries(categorySpend)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([id, spent]) => {
        const cat = resolveCategory(id, categories);
        return { ...cat, spent };
      });
  }, [categorySpend, categories]);

  // Monthly bar chart (last 6 months) — converted
  const barData = useMemo(() => {
    const groups = groupByMonth(transactions);
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, txs]) => {
        const income  = txs.filter((t) => t.type === 'income').reduce((s, t) => s + convertAmount(t.amount || 0, t.currency || 'RON'), 0);
        const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + convertAmount(t.amount || 0, t.currency || 'RON'), 0);
        return {
          month: new Date(month + '-01').toLocaleDateString('uk-UA', { month: 'short', year: '2-digit' }),
          Дохід: Math.round(income),
          Витрати: Math.round(expenses),
        };
      });
  }, [transactions, convertAmount]);

  // Daily cumulative balance line chart (last 30 days) — converted
  const lineData = useMemo(() => {
    const sorted = [...transactions].filter((t) => t.date).sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return [];
    const dayMap = {};
    for (const tx of sorted) {
      const converted = convertAmount(tx.amount || 0, tx.currency || 'RON');
      dayMap[tx.date] = (dayMap[tx.date] || 0) + (tx.type === 'income' ? converted : -converted);
    }
    let running = 0;
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, net]) => {
        running += net;
        return {
          date: new Date(date).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' }),
          Баланс: Math.round(running),
        };
      });
  }, [transactions, convertAmount]);

  // Top 5 categories all-time for right panel — converted
  const topCategories = useMemo(() => {
    const catMap = {};
    transactions.filter((t) => t.type === 'expense').forEach((tx) => {
      const cat = tx.category || 'other';
      catMap[cat] = (catMap[cat] || 0) + convertAmount(tx.amount || 0, tx.currency || 'RON');
    });
    return Object.entries(catMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, total]) => {
        const cat = resolveCategory(id, categories);
        return { ...cat, total };
      });
  }, [transactions, categories, convertAmount]);

  const recent = transactions.slice(0, 5);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)' }}>progress_activity</span>
          <p style={{ color: 'var(--on-surface-variant)', marginTop: 12 }}>Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar title="Огляд" />
      <div style={{ padding: '80px 32px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          <StatCard label="Баланс (банк)" value={fmt(bankBalance)} icon="account_balance" color="var(--primary)" />
          <StatCard label="Всього доходів" value={fmt(convertAmount(totals.income, 'RON'))} icon="trending_up" color="var(--secondary)" />
          <StatCard label="Всього витрат" value={fmt(convertAmount(totals.expenses, 'RON'))} icon="trending_down" color="var(--tertiary)" />
        </div>

        {/* ── Line chart ── */}
        <div className="whisper-shadow" style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontFamily: 'Manrope', fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>
              Динаміка балансу
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--on-surface-variant)' }}>
              Накопичений баланс за останні 30 днів
            </p>
          </div>
          {lineData.length > 1 ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid var(--outline-variant)', fontSize: 13 }}
                  formatter={(v) => [fmt(v), 'Баланс']}
                />
                <Line type="monotone" dataKey="Баланс" stroke="#004ac6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#004ac6' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="show_chart" text="Недостатньо даних для графіку" />
          )}
        </div>

        {/* ── Budgets + Recent Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, marginBottom: 20 }}>

          {/* Budgets */}
          <div className="whisper-shadow" style={{ background: 'white', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: 'Manrope', fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>
                Витрати місяця
              </h2>
              <Link to="/analytics" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                Детально
              </Link>
            </div>

            {budgetCategories.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {budgetCategories.map((cat) => {
                  // % of total expenses this month
                  const totalMonthExpenses = budgetCategories.reduce((s, c) => s + c.spent, 0);
                  const pct = totalMonthExpenses > 0 ? Math.min((cat.spent / totalMonthExpenses) * 100, 100) : 0;
                  const pctLabel = Math.round(pct);

                  // Color: green < 20%, orange 20-40%, red > 40%
                  const barColor = pct < 20 ? cat.color : pct < 40 ? '#ea580c' : '#ac0031';

                  return (
                    <div key={cat.id} className="whisper-shadow" style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '1px solid var(--outline-variant)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: cat.color + '18',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: cat.color }}>
                              {cat.icon}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{cat.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--outline)', marginTop: 1 }}>{pctLabel}% від витрат місяця</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap' }}>
                          {fmt(cat.spent)}
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: barColor,
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="pie_chart" text="Немає витрат цього місяця" />
            )}
          </div>

          {/* Recent Activity */}
          <div className="whisper-shadow" style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--outline-variant)' }}>
              <h2 style={{ margin: 0, fontFamily: 'Manrope', fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>
                Recent Activity
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/transactions" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8,
                  border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)',
                  textDecoration: 'none',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>filter_list</span>
                </Link>
              </div>
            </div>

            {/* Table header */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-low)' }}>
                  {['Транзакція', 'Дата', 'Категорія', 'Сума'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 20px',
                      textAlign: h === 'Сума' ? 'right' : 'left',
                      fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: 'var(--on-surface-variant)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length > 0 ? recent.map((tx) => {
                  const cat = resolveCategory(tx.category, categories);
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: 'var(--surface-container)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: cat.color || 'var(--outline)' }}>
                              {cat.icon || 'category'}
                            </span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>
                            {tx.description}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
                        {formatDate(tx.date)}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                          fontSize: 12, fontWeight: 600,
                          background: (cat.color || '#737686') + '18',
                          color: cat.color || '#737686',
                        }}>
                          {cat.name || 'Інше'}
                        </span>
                      </td>
                      <td style={{
                        padding: '13px 20px', textAlign: 'right',
                        fontSize: 15, fontWeight: 700,
                        color: tx.type === 'income' ? 'var(--secondary)' : 'var(--on-surface)',
                        whiteSpace: 'nowrap',
                      }}>
                        {tx.type === 'income' ? '+' : '−'}{fmt(convertAmount(tx.amount, tx.currency || 'RON'))}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                      Немає транзакцій
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-container-low)', borderTop: '1px solid var(--outline-variant)' }}>
              <Link to="/transactions" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                See All Activity
              </Link>
            </div>
          </div>
        </div>

        {/* ── Bar chart + Top categories ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          <div className="whisper-shadow" style={{ background: 'white', borderRadius: 16, padding: 24 }}>
            <h2 style={{ margin: '0 0 16px', fontFamily: 'Manrope', fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>
              Доходи та витрати по місяцях
            </h2>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid var(--outline-variant)', fontSize: 13 }}
                    formatter={(v) => fmt(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Дохід" fill="#006c49" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Витрати" fill="#ac0031" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="bar_chart" text="Немає даних" />
            )}
          </div>

          <div className="whisper-shadow" style={{ background: 'white', borderRadius: 16, padding: 24 }}>
            <h2 style={{ margin: '0 0 16px', fontFamily: 'Manrope', fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>
              Топ витрат
            </h2>
            {topCategories.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topCategories.map((cat) => {
                  const pct = totals.expenses > 0 ? (cat.total / totals.expenses) * 100 : 0;
                  return (
                    <div key={cat.id || cat.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: cat.color }}>{cat.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{cat.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(cat.total)}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon="pie_chart" text="Немає витрат" />
            )}
          </div>
        </div>

      </div>
    </>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--on-surface-variant)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline-variant)', display: 'block', marginBottom: 8 }}>{icon}</span>
      <p style={{ margin: 0, fontSize: 13 }}>{text}</p>
    </div>
  );
}
