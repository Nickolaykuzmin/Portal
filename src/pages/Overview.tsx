import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAppContext } from '../hooks/useAppContext';
import { formatCurrency, formatDate, calcTotals, groupByMonth } from '../utils/formatters';
import { resolveCategory } from '../utils/categoryHelpers';
import StatCard from '../components/StatCard';
import TopBar from '../components/TopBar';
import type { Currency } from '../types';

interface OverviewProps {
  onMenuClick?: () => void;
}

export default function Overview({ onMenuClick }: OverviewProps) {
  const { transactions, loading } = useTransactions();
  const { categories } = useCategories();
  const { displayCurrency, convertAmount } = useAppContext();

  const fmt = (amount: number) => formatCurrency(amount, displayCurrency);

  const totals = useMemo(() => calcTotals(transactions), [transactions]);

  const bankBalance = useMemo(() => {
    const withBalance = transactions.filter((t) => t.bankBalance != null);
    if (withBalance.length > 0) {
      const latest = [...withBalance].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      return convertAmount(latest!.bankBalance!, (latest!.currency || 'RON') as Currency);
    }
    return convertAmount(totals.income - totals.expenses, 'RON');
  }, [transactions, totals, convertAmount]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTxs = useMemo(
    () => transactions.filter((t) => t.date?.startsWith(currentMonthKey)),
    [transactions, currentMonthKey],
  );

  const categorySpend = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthTxs.filter((t) => t.type === 'expense').forEach((tx) => {
      const cat = tx.category || 'other';
      map[cat] = (map[cat] || 0) + convertAmount(tx.amount || 0, tx.currency || 'RON');
    });
    return map;
  }, [currentMonthTxs, convertAmount]);

  const monthlyChartData = useMemo(() => {
    const groups = groupByMonth(transactions);
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, txs]) => {
        const income  = txs.filter((t) => t.type === 'income').reduce((s, t) => s + convertAmount(t.amount || 0, t.currency || 'RON'), 0);
        const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + convertAmount(t.amount || 0, t.currency || 'RON'), 0);
        return {
          month: new Date(month + '-01').toLocaleDateString('uk-UA', { month: 'short' }),
          Дохід: Math.round(income),
          Витрати: Math.round(expense),
        };
      });
  }, [transactions, convertAmount]);

  const topCategories = useMemo(() => {
    return Object.entries(categorySpend)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, amount]) => ({ ...resolveCategory(id, categories), amount }));
  }, [categorySpend, categories]);

  const recentTxs = useMemo(() => transactions.slice(0, 5), [transactions]);

  if (loading) {
    return (
      <>
        <TopBar title="Огляд" onMenuClick={onMenuClick} />
        <div style={{ padding: '80px 32px 32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          Завантаження...
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Огляд" onMenuClick={onMenuClick} />
      <div style={{ padding: '80px 32px 32px', maxWidth: 1200, margin: '0 auto' }} className="page-content">

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="stats-grid">
          <StatCard
            label="Баланс рахунку"
            value={fmt(bankBalance)}
            icon="account_balance_wallet"
            color="var(--primary)"
          />
          <StatCard
            label="Дохід цього місяця"
            value={fmt(convertAmount(
              currentMonthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
              'RON',
            ))}
            icon="trending_up"
            color="var(--secondary)"
          />
          <StatCard
            label="Витрати цього місяця"
            value={fmt(convertAmount(
              currentMonthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
              'RON',
            ))}
            icon="trending_down"
            color="var(--tertiary)"
          />
          <StatCard
            label="Транзакцій"
            value={transactions.length}
            icon="receipt_long"
            color="#7c3aed"
          />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }} className="charts-grid">
          {/* Bar chart */}
          <div className="whisper-shadow" style={{
            background: 'white', borderRadius: 20, padding: 28,
            border: '1px solid var(--outline-variant)',
          }}>
            <h2 style={{ margin: '0 0 20px', fontFamily: 'Manrope', fontSize: 17, fontWeight: 700, color: 'var(--on-surface)' }}>
              Останні 6 місяців
            </h2>
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--outline-variant)', fontSize: 13 }}
                    formatter={(v) => fmt(v as number)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="Дохід"   fill="#006c49" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Витрати" fill="#ac0031" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--on-surface-variant)' }}>
                Немає даних
              </div>
            )}
          </div>

          {/* Top categories */}
          <div className="whisper-shadow" style={{
            background: 'white', borderRadius: 20, padding: 24,
            border: '1px solid var(--outline-variant)',
          }}>
            <h2 style={{ margin: '0 0 16px', fontFamily: 'Manrope', fontSize: 17, fontWeight: 700, color: 'var(--on-surface)' }}>
              Топ витрат цього місяця
            </h2>
            {topCategories.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>Немає витрат цього місяця</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topCategories.map((cat) => (
                  <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: (cat.color || '#737686') + '20',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: cat.color || '#737686', fontVariationSettings: "'FILL' 1" }}>
                        {cat.icon || 'category'}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>{cat.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)' }}>{fmt(cat.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="whisper-shadow" style={{
          background: 'white', borderRadius: 20,
          border: '1px solid var(--outline-variant)', overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontFamily: 'Manrope', fontSize: 17, fontWeight: 700, color: 'var(--on-surface)' }}>
              Останні транзакції
            </h2>
            <Link to="/transactions" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
              Всі →
            </Link>
          </div>
          {recentTxs.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline-variant)', display: 'block', marginBottom: 8 }}>receipt_long</span>
              <p style={{ margin: 0, fontSize: 13 }}>Немає транзакцій. <Link to="/upload" style={{ color: 'var(--primary)' }}>Завантажте PDF</Link></p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {recentTxs.map((tx) => {
                  const cat = resolveCategory(tx.category, categories);
                  const amt = convertAmount(tx.amount || 0, tx.currency || 'RON');
                  return (
                    <tr key={tx.id} style={{ borderTop: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                            background: (cat.color || '#737686') + '15',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: cat.color || '#737686', fontVariationSettings: "'FILL' 1" }}>
                              {cat.icon || 'category'}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>
                              {tx.description?.slice(0, 40) || '—'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--outline)' }}>{formatDate(tx.date)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 14, fontWeight: 700,
                        color: tx.type === 'income' ? 'var(--secondary)' : 'var(--on-surface)' }}>
                        {tx.type === 'income' ? '+' : '−'}{fmt(amt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
