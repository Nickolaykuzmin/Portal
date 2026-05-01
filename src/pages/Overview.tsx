import { useMemo, useState } from 'react';
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
import s from './Overview.module.scss';

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

  // ── All months that have data, sorted newest first ─────────────────────────
  // Always include the current calendar month so the navigator starts there.
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthKey); // always present so user starts on current month
    transactions.forEach((t) => {
      const m = t.date?.slice(0, 7);
      if (m) set.add(m);
    });
    return [...set].sort((a, b) => b.localeCompare(a)); // newest first
  }, [transactions, currentMonthKey]);

  // Default: current calendar month. User can navigate to months with data.
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Resolve the active month: always use selectedMonth (it's always valid
  // because currentMonthKey is always in availableMonths).
  const activeMonthKey = selectedMonth || currentMonthKey;

  // Which months actually have transactions (for dot indicators)
  const monthsWithData = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      const m = t.date?.slice(0, 7);
      if (m) set.add(m);
    });
    return set;
  }, [transactions]);

  const activeMonthLabel = useMemo(() => {
    return new Date(activeMonthKey + '-01').toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  }, [activeMonthKey]);

  const activeMonthIdx = availableMonths.indexOf(activeMonthKey);

  const goToPrev = () => {
    const next = availableMonths[activeMonthIdx + 1];
    if (next) setSelectedMonth(next);
  };
  const goToNext = () => {
    const next = availableMonths[activeMonthIdx - 1];
    if (next) setSelectedMonth(next);
  };

  // ── Transactions for the selected month ────────────────────────────────────
  const monthTxs = useMemo(
    () => transactions.filter((t) => t.date?.startsWith(activeMonthKey)),
    [transactions, activeMonthKey],
  );

  const monthIncome = useMemo(
    () => monthTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0),
    [monthTxs, convertAmount],
  );

  const monthExpenses = useMemo(
    () => monthTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0),
    [monthTxs, convertAmount],
  );

  const categorySpend = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxs.filter((t) => t.type === 'expense').forEach((tx) => {
      const cat = tx.category || 'other';
      map[cat] = (map[cat] || 0) + convertAmount(tx.amount || 0, (tx.currency || 'RON') as Currency);
    });
    return map;
  }, [monthTxs, convertAmount]);

  const monthlyChartData = useMemo(() => {
    const groups = groupByMonth(transactions);
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, txs]) => {
        const income  = txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0);
        const expense = txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0);
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
        <div className={s.loading}>Завантаження...</div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Огляд" onMenuClick={onMenuClick} />
      <div className={`page-content ${s.page}`}>

        {/* Month navigator */}
        {availableMonths.length > 0 && (
          <div className={s.monthNav}>
            <button
              className={s.monthNavBtn}
              onClick={goToPrev}
              disabled={activeMonthIdx >= availableMonths.length - 1}
              title="Попередній місяць"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className={s.monthNavLabel}>{activeMonthLabel}</span>
            <button
              className={s.monthNavBtn}
              onClick={goToNext}
              disabled={activeMonthIdx <= 0}
              title="Наступний місяць"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            {availableMonths.length > 1 && (
              <div className={s.monthDots}>
                {availableMonths.map((m) => (
                  <button
                    key={m}
                    className={`${s.monthDot}${m === activeMonthKey ? ` ${s.active}` : ''}${!monthsWithData.has(m) ? ` ${s.empty}` : ''}`}
                    onClick={() => setSelectedMonth(m)}
                    title={new Date(m + '-01').toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stat cards */}
        <div className={s.statsGrid}>
          <StatCard
            label="Баланс рахунку"
            value={fmt(bankBalance)}
            icon="account_balance_wallet"
            color="var(--primary)"
          />
          <StatCard
            label="Дохід"
            value={fmt(monthIncome)}
            icon="trending_up"
            color="var(--secondary)"
          />
          <StatCard
            label="Витрати"
            value={fmt(monthExpenses)}
            icon="trending_down"
            color="var(--tertiary)"
          />
          <StatCard
            label="Транзакцій"
            value={monthTxs.length}
            icon="receipt_long"
            color="#7c3aed"
          />
        </div>

        {/* Charts row */}
        <div className={s.chartsGrid}>
          {/* Bar chart */}
          <div className={`whisper-shadow ${s.chartCard}`}>
            <h2>Останні 6 місяців</h2>
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
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
              <div className={s.chartEmpty}>Немає даних</div>
            )}
          </div>

          {/* Top categories */}
          <div className={`whisper-shadow ${s.topCatCard}`}>
            <h2>Топ витрат</h2>
            {topCategories.length === 0 ? (
              <p className={s.topCatEmpty}>Немає витрат за {activeMonthLabel}</p>
            ) : (
              <div className={s.topCatList}>
                {topCategories.map((cat) => (
                  <div key={cat.id} className={s.topCatItem}>
                    <div
                      className={s.catIcon}
                      style={{ background: (cat.color || '#737686') + '20' }}
                    >
                      <span
                        className={`material-symbols-outlined ${s.icon}`}
                        style={{ color: cat.color || '#737686' }}
                      >
                        {cat.icon || 'category'}
                      </span>
                    </div>
                    <div className={s.catInfo}>
                      <div className={s.catRow}>
                        <span className={s.name}>{cat.name}</span>
                        <span className={s.value}>{fmt(cat.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className={`whisper-shadow ${s.recentCard}`}>
          <div className={s.recentHeader}>
            <h2>Останні транзакції</h2>
            <Link to="/transactions">Всі →</Link>
          </div>
          {recentTxs.length === 0 ? (
            <div className={s.recentEmpty}>
              <span className={`material-symbols-outlined ${s.icon}`}>receipt_long</span>
              <p>
                Немає транзакцій.{' '}
                <Link to="/upload">Завантажте PDF</Link>
              </p>
            </div>
          ) : (
            <table className={s.recentTable}>
              <tbody>
                {recentTxs.map((tx) => {
                  const cat = resolveCategory(tx.category, categories);
                  const amt = convertAmount(tx.amount || 0, (tx.currency || 'RON') as Currency);
                  return (
                    <tr key={tx.id} className={s.recentRow}>
                      <td className={s.recentTd}>
                        <div className={s.recentDesc}>
                          <div
                            className={s.recentIcon}
                            style={{ background: (cat.color || '#737686') + '15' }}
                          >
                            <span
                              className={`material-symbols-outlined ${s.icon}`}
                              style={{ color: cat.color || '#737686' }}
                            >
                              {cat.icon || 'category'}
                            </span>
                          </div>
                          <div className={s.recentInfo}>
                            <div className={s.name}>{tx.description?.slice(0, 40) || '—'}</div>
                            <div className={s.date}>{formatDate(tx.date)}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`${s.recentAmount} ${tx.type === 'income' ? s.income : s.expense}`}>
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
