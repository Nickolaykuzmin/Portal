import { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency, calcTotals, groupByMonth, groupByCategory } from '../utils/formatters';
import { resolveCategory } from '../utils/categoryHelpers';
import TopBar from '../components/TopBar';

const PERIOD_OPTIONS = [
  { key: 'all', label: 'Весь час' },
  { key: '12m', label: '12 міс.' },
  { key: '6m',  label: '6 міс.' },
  { key: '3m',  label: '3 міс.' },
];

export default function Analytics() {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const [period, setPeriod] = useState('all');

  const filtered = useMemo(() => {
    if (period === 'all') return transactions;
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const cutoff = new Date(new Date().getFullYear(), new Date().getMonth() - months, 1)
      .toISOString().split('T')[0];
    return transactions.filter((t) => t.date >= cutoff);
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

  const expensePie = useMemo(() => {
    const groups = groupByCategory(filtered.filter((t) => t.type === 'expense'));
    return Object.entries(groups)
      .map(([id, data]) => {
        const cat = resolveCategory(id, categories);
        return { id, name: cat.name, icon: cat.icon, value: Math.round(data.total), color: cat.color };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filtered, categories]);

  const incomePie = useMemo(() => {
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
    : 0;

  const kpis = [
    { label: 'Загальний дохід',  value: formatCurrency(totals.income),                    color: '#006c49', icon: 'trending_up' },
    { label: 'Загальні витрати', value: formatCurrency(totals.expenses),                   color: '#ac0031', icon: 'trending_down' },
    { label: 'Чистий баланс',    value: formatCurrency(totals.income - totals.expenses),   color: '#004ac6', icon: 'account_balance_wallet' },
    { label: 'Норма заощаджень', value: `${savingsRate}%`,                                 color: Number(savingsRate) > 20 ? '#006c49' : '#ac0031', icon: 'savings' },
  ];

  return (
    <>
      <TopBar title="Аналітика" />
      <div style={{ padding: '80px 32px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Period pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {PERIOD_OPTIONS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '7px 18px', borderRadius: 20, border: '1.5px solid',
              borderColor: period === p.key ? 'var(--primary)' : 'var(--outline-variant)',
              background: period === p.key ? 'var(--primary)' : 'white',
              color: period === p.key ? 'white' : 'var(--on-surface-variant)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{
              background: 'white', borderRadius: 16, padding: '18px 20px',
              border: '1px solid var(--outline-variant)',
              boxShadow: '0 1px 3px rgba(19,27,46,0.05)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 60, height: 60,
                background: kpi.color, opacity: 0.06, borderRadius: '0 16px 0 60px',
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--on-surface-variant)' }}>
                  {kpi.label}
                </span>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 3px 8px ${kpi.color}40`,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white', fontVariationSettings: "'FILL' 1" }}>
                    {kpi.icon}
                  </span>
                </div>
              </div>
              <div style={{ fontFamily: 'Manrope', fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.3px' }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* Area chart */}
        <div style={{
          background: 'white', borderRadius: 20, padding: 28, marginBottom: 24,
          border: '1px solid var(--outline-variant)',
          boxShadow: '0 1px 3px rgba(19,27,46,0.05)',
        }}>
          <h2 style={{ margin: '0 0 20px', fontFamily: 'Manrope', fontSize: 17, fontWeight: 700, color: 'var(--on-surface)' }}>
            Динаміка по місяцях
          </h2>
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
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--outline-variant)', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(v) => formatCurrency(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Area type="monotone" dataKey="Дохід"   stroke="#006c49" strokeWidth={2.5} fill="url(#gIncome)"  dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Витрати" stroke="#ac0031" strokeWidth={2.5} fill="url(#gExpense)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Pie charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <PieCard title="Витрати за категоріями" data={expensePie} total={totals.expenses} />
          <PieCard title="Доходи за категоріями"  data={incomePie}  total={totals.income} />
        </div>
      </div>
    </>
  );
}

function PieCard({ title, data, total }) {
  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: 24,
      border: '1px solid var(--outline-variant)',
      boxShadow: '0 1px 3px rgba(19,27,46,0.05)',
    }}>
      <h2 style={{ margin: '0 0 20px', fontFamily: 'Manrope', fontSize: 17, fontWeight: 700, color: 'var(--on-surface)' }}>
        {title}
      </h2>
      {data.length > 0 ? (
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ flexShrink: 0 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={46} outerRadius={72} dataKey="value" paddingAngle={3}>
                  {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid var(--outline-variant)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {data.map((item) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
              return (
                <div key={item.id || item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: item.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: item.color, fontVariationSettings: "'FILL' 1" }}>
                      {item.icon || 'category'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface)', marginLeft: 4 }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'var(--surface-container)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 2 }} />
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
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--on-surface-variant)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline-variant)', display: 'block', marginBottom: 8 }}>
        bar_chart
      </span>
      <p style={{ margin: 0, fontSize: 13 }}>Немає даних</p>
    </div>
  );
}
