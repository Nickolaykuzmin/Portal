import { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency, calcTotals, groupByMonth, groupByCategory } from '../utils/formatters';
import { resolveCategory } from '../utils/categoryHelpers';
import TopBar from '../components/TopBar';
import s from './Analytics.module.scss';

interface PeriodOption {
  key: string;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
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
}

interface AnalyticsProps {
  onMenuClick?: () => void;
}

export default function Analytics({ onMenuClick }: AnalyticsProps) {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const [period, setPeriod] = useState('all');

  const filtered = useMemo(() => {
    if (period === 'all') return transactions;
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const cutoff = new Date(new Date().getFullYear(), new Date().getMonth() - months, 1)
      .toISOString().split('T')[0];
    return transactions.filter((t) => (t.date ?? '') >= cutoff);
  }, [transactions, period]);

  const totals = useMemo(() => calcTotals(filtered), [filtered]);

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
    const groups = groupByCategory(filtered.filter((t) => t.type === 'expense'));
    return Object.entries(groups)
      .map(([id, data]) => {
        const cat = resolveCategory(id, categories);
        return { id, name: cat.name, icon: cat.icon, value: Math.round(data.total), color: cat.color };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filtered, categories]);

  const incomePie = useMemo((): PieEntry[] => {
    const groups = groupByCategory(filtered.filter((t) => t.type === 'income'));
    return Object.entries(groups)
      .map(([id, data]) => {
        const cat = resolveCategory(id, categories);
        return { id, name: cat.name, icon: cat.icon, value: Math.round(data.total), color: cat.color };
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
        <div className={s.pieContent}>
          <div className={s.pieChartWrap}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={72}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v as number)}
                  contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid var(--outline-variant)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={s.pieLegend}>
            {data.map((item) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
              return (
                <div key={item.id} className={s.pieLegendItem}>
                  <div
                    className={s.pieLegendIcon}
                    style={{ background: item.color + '20' }}
                  >
                    <span
                      className={`material-symbols-outlined ${s.icon}`}
                      style={{ color: item.color }}
                    >
                      {item.icon || 'category'}
                    </span>
                  </div>
                  <div className={s.pieLegendInfo}>
                    <div className={s.pieLegendRow}>
                      <span className={s.name}>{item.name}</span>
                      <span className={s.pct}>{pct}%</span>
                    </div>
                    <div className={s.pieLegendBar}>
                      <div
                        className={s.pieLegendFill}
                        style={{ width: `${pct}%`, background: item.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
