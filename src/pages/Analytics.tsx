import { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency, calcTotals, groupByMonth, groupByCategory, isNeutralCash } from '../utils/formatters';
import { resolveCategory } from '../utils/categoryHelpers';
import TopBar from '../components/TopBar';
import s from './Analytics.module.scss';

interface PeriodOption {
  key: string;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: 'month', label: 'Цей місяць' },
  { key: 'all', label: 'Весь час' },
  { key: '12m', label: '12 міс.' },
  { key: '6m',  label: '6 міс.' },
  { key: '3m',  label: '3 міс.' },
];

interface PieEntry {
  id: string;
  name: string;
  icon: string;
  value: number;
  color: string;
  count: number;
}

interface AnalyticsProps {
  onMenuClick?: () => void;
}

// ─── Monthly savings calculation helper ───────────────────────────────────────

interface MonthlySavingsData {
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthBalance: number;
  avgMonthlyExpenses: number;
  avgMonthlyIncome: number;
  regularIncome: number;        // salary / recurring income this month
  dividendIncome: number;       // dividend income this month
  avgQuarterlyDividends: number; // average quarterly dividend (amortized monthly)
  recommendedSavings: number;
  savingsPercent: number;
  monthsAnalyzed: number;
  currentMonthLabel: string;
  daysElapsed: number;
  daysInMonth: number;
  projectedExpenses: number;
}

/** Check if a transaction looks like dividend income */
function isDividendIncome(tx: { description: string; type: string; category?: string }): boolean {
  if (tx.type !== 'income') return false;
  const d = (tx.description || '').toLowerCase();
  return /dividend/.test(d);
}

function useMonthlySavings(transactions: ReturnType<typeof useTransactions>['transactions']): MonthlySavingsData {
  return useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysElapsed = now.getDate();

    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const currentMonthLabel = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(now);

    // Current month transactions
    const currentMonthTxs = transactions.filter((tx) => (tx.date ?? '').startsWith(currentMonthKey));
    const currentTotals = calcTotals(currentMonthTxs);

    // Split current month income into regular vs dividends
    const currentMonthIncomeTxs = currentMonthTxs.filter((tx) => tx.type === 'income');
    const dividendIncome = currentMonthIncomeTxs
      .filter(isDividendIncome)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const regularIncome = currentTotals.income - dividendIncome;

    // Historical months (exclude current month for averages)
    const monthGroups = groupByMonth(transactions);
    const historicalMonths = Object.entries(monthGroups)
      .filter(([key]) => key < currentMonthKey && key !== 'unknown')
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12); // last 12 complete months for better dividend detection

    let avgMonthlyExpenses = 0;
    let avgMonthlyRegularIncome = 0;
    let totalDividends = 0;
    let monthsWithData = 0;

    if (historicalMonths.length > 0) {
      // Use last 6 months for expense/income averages
      const recentMonths = historicalMonths.slice(0, 6);
      const totals = recentMonths.map(([, txs]) => calcTotals(txs));
      avgMonthlyExpenses = totals.reduce((sum, t) => sum + t.expenses, 0) / totals.length;

      // Calculate regular income (excluding dividends) average
      for (const [, txs] of recentMonths) {
        const monthIncome = txs.filter((tx) => tx.type === 'income');
        const monthDividends = monthIncome.filter(isDividendIncome).reduce((s, tx) => s + (tx.amount || 0), 0);
        const monthRegular = calcTotals(txs).income - monthDividends;
        avgMonthlyRegularIncome += monthRegular;
      }
      avgMonthlyRegularIncome /= recentMonths.length;

      // Calculate average quarterly dividends from all available history (up to 12 months)
      monthsWithData = historicalMonths.length;
      for (const [, txs] of historicalMonths) {
        const monthDivs = txs.filter(isDividendIncome).reduce((s, tx) => s + (tx.amount || 0), 0);
        totalDividends += monthDivs;
      }
    }

    // Amortize dividends: total dividends over N months → monthly equivalent
    // This gives a fair monthly "dividend contribution" to savings
    const avgQuarterlyDividends = monthsWithData > 0 ? totalDividends / monthsWithData : 0;

    // Total average monthly income = regular + amortized dividends
    const avgMonthlyIncome = avgMonthlyRegularIncome + avgQuarterlyDividends;

    // Project current month expenses based on daily rate
    const dailyExpenseRate = daysElapsed > 0 ? currentTotals.expenses / daysElapsed : 0;
    const projectedExpenses = dailyExpenseRate * daysInMonth;

    // ── Recommended savings calculation ──────────────────────────────────────
    // Use the higher of: projected expenses or average historical expenses
    const expectedExpenses = Math.max(projectedExpenses, avgMonthlyExpenses);

    // Income base: current month regular income + amortized dividend portion
    // If current month has actual dividends, use them; otherwise use amortized average
    const effectiveDividendContribution = dividendIncome > 0
      ? dividendIncome / 3  // spread this quarter's dividends over 3 months
      : avgQuarterlyDividends;

    const incomeBase = (regularIncome > 0 ? regularIncome : avgMonthlyRegularIncome)
      + effectiveDividendContribution;

    const rawSavings = incomeBase - expectedExpenses;
    // Apply 10% safety buffer (keep 10% extra for unexpected expenses)
    const recommendedSavings = Math.max(0, rawSavings * 0.9);

    const savingsPercent = incomeBase > 0 ? (recommendedSavings / incomeBase) * 100 : 0;

    return {
      currentMonthIncome: currentTotals.income,
      currentMonthExpenses: currentTotals.expenses,
      currentMonthBalance: currentTotals.income - currentTotals.expenses,
      avgMonthlyExpenses,
      avgMonthlyIncome,
      regularIncome,
      dividendIncome,
      avgQuarterlyDividends,
      recommendedSavings,
      savingsPercent,
      monthsAnalyzed: Math.min(historicalMonths.length, 6),
      currentMonthLabel,
      daysElapsed,
      daysInMonth,
      projectedExpenses,
    };
  }, [transactions]);
}

export default function Analytics({ onMenuClick }: AnalyticsProps) {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const [period, setPeriod] = useState('month');

  const filtered = useMemo(() => {
    if (period === 'all') return transactions;
    if (period === 'month') {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return transactions.filter((t) => (t.date ?? '').startsWith(monthKey));
    }
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const cutoff = new Date(new Date().getFullYear(), new Date().getMonth() - months, 1)
      .toISOString().split('T')[0];
    return transactions.filter((t) => (t.date ?? '') >= cutoff);
  }, [transactions, period]);

  const totals = useMemo(() => calcTotals(filtered), [filtered]);

  const savings = useMonthlySavings(transactions);

  const monthlyData = useMemo(() => {
    const groups = groupByMonth(filtered);
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, txs]) => {
        const t = calcTotals(txs);
        return {
          month: new Date(month + '-01').toLocaleDateString('uk-UA', { month: 'short', year: '2-digit' }),
          Дохід: Math.round(t.income),
          Витрати: Math.round(t.expenses),
        };
      });
  }, [filtered]);

  const expensePie = useMemo((): PieEntry[] => {
    const groups = groupByCategory(
      filtered.filter((t) => t.type === 'expense' && !isNeutralCash(t)),
    );
    return Object.entries(groups)
      .map(([id, data]) => {
        const cat = resolveCategory(id, categories);
        return { id, name: cat.name, icon: cat.icon, value: Math.round(data.total), color: cat.color, count: data.count };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filtered, categories]);

  const incomePie = useMemo((): PieEntry[] => {
    const groups = groupByCategory(filtered.filter((t) => t.type === 'income'));
    return Object.entries(groups)
      .map(([id, data]) => {
        const cat = resolveCategory(id, categories);
        return { id, name: cat.name, icon: cat.icon, value: Math.round(data.total), color: cat.color, count: data.count };
      })
      .sort((a, b) => b.value - a.value);
  }, [filtered, categories]);

  const savingsRate = totals.income > 0
    ? (((totals.income - totals.expenses) / totals.income) * 100).toFixed(1)
    : '0';

  const kpis = [
    { label: 'Загальний дохід',  value: formatCurrency(totals.income),                  color: '#006c49', icon: 'trending_up' },
    { label: 'Загальні витрати', value: formatCurrency(totals.expenses),                 color: '#ac0031', icon: 'trending_down' },
    { label: 'Чистий баланс',    value: formatCurrency(totals.income - totals.expenses), color: '#004ac6', icon: 'account_balance_wallet' },
    { label: 'Норма заощаджень', value: `${savingsRate}%`, color: Number(savingsRate) > 20 ? '#006c49' : '#ac0031', icon: 'savings' },
  ];

  return (
    <>
      <TopBar title="Аналітика" onMenuClick={onMenuClick} />
      <div className={s.page}>

        {/* Period pills */}
        <div className={s.periods}>
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`${s.periodBtn}${period === p.key ? ` ${s.active}` : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPI cards */}
        <div className={s.kpiGrid}>
          {kpis.map((kpi) => (
            <div key={kpi.label} className={s.kpiCard}>
              <div className={s.kpiAccent} style={{ background: kpi.color }} />
              <div className={s.kpiHeader}>
                <span className={s.kpiLabel}>{kpi.label}</span>
                <div
                  className={s.kpiIcon}
                  style={{ background: kpi.color, boxShadow: `0 3px 8px ${kpi.color}40` }}
                >
                  <span className={`material-symbols-outlined ${s.icon}`}>{kpi.icon}</span>
                </div>
              </div>
              <div className={s.kpiValue}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Monthly savings widget */}
        <SavingsWidget data={savings} />

        {/* Area chart */}
        <div className={s.areaCard}>
          <h2>Динаміка по місяцях</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#006c49" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#006c49" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ac0031" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#ac0031" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--outline-variant)', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(v) => formatCurrency(v as number)}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Area type="monotone" dataKey="Дохід"   stroke="#006c49" strokeWidth={2.5} fill="url(#gIncome)"  dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Витрати" stroke="#ac0031" strokeWidth={2.5} fill="url(#gExpense)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Pie charts */}
        <div className={s.pieGrid}>
          <PieCard title="Витрати за категоріями" data={expensePie} total={totals.expenses} />
          <PieCard title="Доходи за категоріями"  data={incomePie}  total={totals.income} />
        </div>
      </div>
    </>
  );
}

interface PieCardProps {
  title: string;
  data: PieEntry[];
  total: number;
}

function PieCard({ title, data, total }: PieCardProps) {
  return (
    <div className={s.pieCard}>
      <h2>{title}</h2>
      {data.length > 0 ? (
        <>
          {/* Donut chart with total in center */}
          <div className={s.donutWrap}>
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  dataKey="value"
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v as number)}
                  contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid var(--outline-variant)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className={s.donutCenter}>
              <span className={s.donutTotal}>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Category list */}
          <div className={s.catList}>
            {data.map((item) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
              return (
                <div key={item.id} className={s.catListItem}>
                  <div className={s.catListIcon} style={{ background: item.color + '18' }}>
                    <span
                      className={`material-symbols-outlined ${s.icon}`}
                      style={{ color: item.color }}
                    >
                      {item.icon || 'category'}
                    </span>
                  </div>
                  <div className={s.catListInfo}>
                    <span className={s.catListName}>{item.name}</span>
                    <span className={s.catListCount}>{item.count} транзакцій</span>
                  </div>
                  <div className={s.catListRight}>
                    <span className={s.catListAmount}>{formatCurrency(item.value)}</span>
                    <span className={s.catListPct}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : <EmptyChart />}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className={s.emptyChart}>
      <span className={`material-symbols-outlined ${s.icon}`}>bar_chart</span>
      <p>Немає даних</p>
    </div>
  );
}

// ─── Savings Widget ───────────────────────────────────────────────────────────

interface SavingsWidgetProps {
  data: MonthlySavingsData;
}

function SavingsWidget({ data }: SavingsWidgetProps) {
  const progressPercent = data.daysInMonth > 0
    ? Math.min(100, (data.daysElapsed / data.daysInMonth) * 100)
    : 0;

  const expenseProgress = data.avgMonthlyExpenses > 0
    ? Math.min(100, (data.currentMonthExpenses / data.avgMonthlyExpenses) * 100)
    : 0;

  const expenseStatus: 'good' | 'warning' | 'over' =
    expenseProgress <= 75 ? 'good' : expenseProgress <= 100 ? 'warning' : 'over';

  return (
    <div className={s.savingsCard}>
      <div className={s.savingsHeader}>
        <div className={s.savingsTitle}>
          <div className={s.savingsIconWrap}>
            <span className={`material-symbols-outlined ${s.icon}`}>savings</span>
          </div>
          <div>
            <h2>Бюджет на місяць</h2>
            <span className={s.savingsSubtitle}>{data.currentMonthLabel} · день {data.daysElapsed}/{data.daysInMonth}</span>
          </div>
        </div>
      </div>

      {/* Month progress bar */}
      <div className={s.monthProgress}>
        <div className={s.monthProgressBar}>
          <div className={s.monthProgressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className={s.savingsStats}>
        <div className={s.savingsStat}>
          <span className={s.savingsStatLabel}>Зарплата</span>
          <span className={`${s.savingsStatValue} ${s.income}`}>
            {formatCurrency(data.regularIncome)}
          </span>
        </div>
        <div className={s.savingsStat}>
          <span className={s.savingsStatLabel}>Дивіденди</span>
          <span className={`${s.savingsStatValue} ${s.income}`}>
            {data.dividendIncome > 0
              ? formatCurrency(data.dividendIncome)
              : data.avgQuarterlyDividends > 0
                ? `~${formatCurrency(data.avgQuarterlyDividends)}/міс.`
                : '—'}
          </span>
          {data.dividendIncome > 0 && (
            <span className={s.savingsStatHint}>÷3 = {formatCurrency(data.dividendIncome / 3)}/міс.</span>
          )}
        </div>
        <div className={s.savingsStat}>
          <span className={s.savingsStatLabel}>Витрати цього місяця</span>
          <span className={`${s.savingsStatValue} ${s.expense}`}>
            {formatCurrency(data.currentMonthExpenses)}
          </span>
        </div>
        <div className={s.savingsStat}>
          <span className={s.savingsStatLabel}>Сер. витрати/міс.</span>
          <span className={s.savingsStatValue}>
            {data.monthsAnalyzed > 0 ? formatCurrency(data.avgMonthlyExpenses) : '—'}
          </span>
        </div>
      </div>

      {/* Expense vs average bar */}
      {data.monthsAnalyzed > 0 && (
        <div className={s.expenseBar}>
          <div className={s.expenseBarHeader}>
            <span className={s.expenseBarLabel}>Витрати vs середнє</span>
            <span className={`${s.expenseBarPct} ${s[expenseStatus]}`}>
              {Math.round(expenseProgress)}%
            </span>
          </div>
          <div className={s.expenseBarTrack}>
            <div
              className={`${s.expenseBarFill} ${s[expenseStatus]}`}
              style={{ width: `${Math.min(expenseProgress, 100)}%` }}
            />
            {expenseProgress > 100 && (
              <div
                className={`${s.expenseBarFill} ${s.overExtra}`}
                style={{ width: `${Math.min(expenseProgress - 100, 30)}%`, left: '100%' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Savings recommendation */}
      <div className={s.savingsRecommendation}>
        <div className={s.savingsRecommendIcon}>
          <span className={`material-symbols-outlined ${s.icon}`}>
            {data.recommendedSavings > 0 ? 'trending_up' : 'warning'}
          </span>
        </div>
        <div className={s.savingsRecommendBody}>
          <span className={s.savingsRecommendLabel}>
            Можна відкласти «на чорний день»
          </span>
          <span className={`${s.savingsRecommendValue} ${data.recommendedSavings > 0 ? s.positive : s.zero}`}>
            {data.recommendedSavings > 0
              ? `~${formatCurrency(data.recommendedSavings)}`
              : 'Поки що 0 — витрати перевищують дохід'}
          </span>
          {data.recommendedSavings > 0 && data.savingsPercent > 0 && (
            <span className={s.savingsRecommendHint}>
              ≈ {data.savingsPercent.toFixed(0)}% від доходу · з урахуванням 10% буфера
              {data.dividendIncome > 0 && ' · дивіденди розподілені на 3 міс.'}
              {data.dividendIncome === 0 && data.avgQuarterlyDividends > 0 && ' · включає амортизовані дивіденди'}
            </span>
          )}
          {data.monthsAnalyzed === 0 && (
            <span className={s.savingsRecommendHint}>
              Потрібна історія хоча б за 1 місяць для точного розрахунку
            </span>
          )}
        </div>
      </div>

      {/* Projected expenses */}
      {data.daysElapsed > 0 && data.daysElapsed < data.daysInMonth && (
        <div className={s.projectedRow}>
          <span className={`material-symbols-outlined ${s.icon}`}>schedule</span>
          <span>
            Прогноз витрат до кінця місяця: <strong>{formatCurrency(data.projectedExpenses)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
