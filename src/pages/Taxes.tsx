import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area,
} from 'recharts';
import { useTransactions } from '../hooks/useTransactions';
import { useAppContext } from '../hooks/useAppContext';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, groupByMonth } from '../utils/formatters';
import TopBar from '../components/TopBar';
import type { Currency, Transaction } from '../types';
import s from './Taxes.module.scss';

// ── Romanian SRL Micro-enterprise tax constants (2026) ────────────────────────
// Based on real payslip: NICKONIX TECH S.R.L., salariu de bază = 4,050 RON
//
// Monthly salary obligations (fixed, from minimum wage 4,050 RON):
//   CAS  (pension)       = 25%  × 4,050 = 1,013 RON
//   CASS (health)        = 10%  × 4,050 =   405 RON
//   Impozit pe venit     ≈ 10%  × (4,050 - 1,013 - 405 - 0) = 263 RON
//   CAM  (employer)      = 2.25% × 4,050 =  91 RON
//   ─────────────────────────────────────────────────
//   Total salary taxes/month             = 1,772 RON
//
// Micro-enterprise tax = 1% of turnover (revenue)
// Dividend tax         = 16% (since 2025 fiscal code update)

const SALARY_BASE = 4_050;
const CAS_RATE = 0.25;
const CASS_RATE = 0.10;
const INCOME_TAX_RATE = 0.10;
const CAM_RATE = 0.0225;
const MICRO_TAX_RATE = 0.01;
const DIVIDEND_TAX_RATE = 0.16;

const MONTHLY_CAS = Math.round(SALARY_BASE * CAS_RATE);
const MONTHLY_CASS = Math.round(SALARY_BASE * CASS_RATE);
const MONTHLY_INCOME_TAX = Math.round(
  (SALARY_BASE - MONTHLY_CAS - MONTHLY_CASS) * INCOME_TAX_RATE,
);
const MONTHLY_CAM = Math.round(SALARY_BASE * CAM_RATE);
const MONTHLY_SALARY_TAXES = MONTHLY_CAS + MONTHLY_CASS + MONTHLY_INCOME_TAX + MONTHLY_CAM;

interface TaxesProps {
  onMenuClick?: () => void;
}

export default function Taxes({ onMenuClick }: TaxesProps) {
  const { transactions } = useTransactions();
  const { displayCurrency, convertAmount } = useAppContext();
  const { activeAccount } = useAuth();
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [growthRate, setGrowthRate] = useState(5);

  const fmt = (amount: number) => formatCurrency(amount, displayCurrency);
  const monthlyGrowth = growthRate / 100;
  const isSrl = activeAccount.type === 'srl';

  // ── All hooks MUST be above any conditional return ─────────────────────────

  const taxTransactions = useMemo(
    () => transactions.filter((t) => t.category === 'taxes'),
    [transactions],
  );

  const bookkeepingTransactions = useMemo(
    () => transactions.filter((t) => t.category === 'bookkeeping'),
    [transactions],
  );

  const dividendTransactions = useMemo(
    () => transactions.filter((t) => t.category === 'dividends'),
    [transactions],
  );

  const incomeTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'income'),
    [transactions],
  );

  const monthlyData = useMemo(() => {
    const taxByMonth = groupByMonth(taxTransactions);
    const incomeByMonth = groupByMonth(incomeTransactions);
    const bookkeepingByMonth = groupByMonth(bookkeepingTransactions);

    const allMonths = new Set<string>();
    Object.keys(taxByMonth).forEach((m) => allMonths.add(m));
    Object.keys(incomeByMonth).forEach((m) => allMonths.add(m));
    Object.keys(bookkeepingByMonth).forEach((m) => allMonths.add(m));

    return [...allMonths]
      .filter((m) => m !== 'unknown')
      .sort()
      .map((month) => {
        const income = (incomeByMonth[month] || []).reduce(
          (sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0,
        );
        const bookkeeping = (bookkeepingByMonth[month] || []).reduce(
          (sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0,
        );
        const microTax = income * MICRO_TAX_RATE;
        const salaryTaxes = convertAmount(MONTHLY_SALARY_TAXES, 'RON');
        const totalObligation = microTax + salaryTaxes;
        const effectiveRate = income > 0 ? (totalObligation / income) * 100 : 0;

        return {
          month,
          label: new Date(month + '-01').toLocaleDateString('uk-UA', { month: 'short', year: '2-digit' }),
          income: Math.round(income),
          bookkeeping: Math.round(bookkeeping),
          microTax: Math.round(microTax),
          salaryTaxes: Math.round(salaryTaxes),
          totalObligation: Math.round(totalObligation),
          effectiveRate: Number(effectiveRate.toFixed(1)),
        };
      });
  }, [taxTransactions, incomeTransactions, bookkeepingTransactions, convertAmount]);

  const totalIncome = useMemo(
    () => incomeTransactions.reduce((sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0),
    [incomeTransactions, convertAmount],
  );

  const totalTaxesPaid = useMemo(
    () => taxTransactions.reduce((sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0),
    [taxTransactions, convertAmount],
  );

  const monthsWithTaxes = useMemo(() => {
    const set = new Set<string>();
    taxTransactions.forEach((t) => {
      const m = t.date?.slice(0, 7);
      if (m) set.add(m);
    });
    return set.size || 1;
  }, [taxTransactions]);

  const avgMonthlyTax = totalTaxesPaid / monthsWithTaxes;

  const avgEffectiveRate = useMemo(() => {
    if (totalIncome === 0) return 0;
    return (totalTaxesPaid / totalIncome) * 100;
  }, [totalTaxesPaid, totalIncome]);

  const monthsCount = monthlyData.filter((m) => m.income > 0).length || 1;
  const totalMicroTax = totalIncome * MICRO_TAX_RATE;

  const totalDividendsNet = useMemo(
    () => dividendTransactions.reduce(
      (sum, t) => sum + convertAmount(t.amount || 0, (t.currency || 'RON') as Currency), 0,
    ),
    [dividendTransactions, convertAmount],
  );

  const dividendsGross = totalDividendsNet / (1 - DIVIDEND_TAX_RATE);
  const dividendTax = dividendsGross * DIVIDEND_TAX_RATE;

  const compoundProjection = useMemo(() => {
    const avgMonthlyIncome = totalIncome > 0 ? totalIncome / monthsCount : convertAmount(SALARY_BASE, 'RON');
    const salaryTaxMonthly = convertAmount(MONTHLY_SALARY_TAXES, 'RON');
    const salaryBrut = convertAmount(SALARY_BASE, 'RON');
    const camMonthly = convertAmount(MONTHLY_CAM, 'RON');
    const data = [];

    let cumulativeTax = 0;
    let currentMonthlyIncome = avgMonthlyIncome;

    for (let i = 1; i <= projectionMonths; i++) {
      currentMonthlyIncome = currentMonthlyIncome * (1 + monthlyGrowth);
      const microThisMonth = currentMonthlyIncome * MICRO_TAX_RATE;
      const dividendeThisMonth = Math.max(0, currentMonthlyIncome - microThisMonth - salaryBrut - camMonthly);
      const dividendTaxThisMonth = dividendeThisMonth * DIVIDEND_TAX_RATE;
      const totalTaxThisMonth = microThisMonth + salaryTaxMonthly + dividendTaxThisMonth;
      cumulativeTax += totalTaxThisMonth;

      const flatMicro = avgMonthlyIncome * MICRO_TAX_RATE;
      const flatDividende = Math.max(0, avgMonthlyIncome - flatMicro - salaryBrut - camMonthly);
      const flatTaxPerMonth = flatMicro + salaryTaxMonthly + flatDividende * DIVIDEND_TAX_RATE;

      data.push({
        month: i,
        label: `${i} міс.`,
        flatTax: Math.round(flatTaxPerMonth * i),
        compoundTax: Math.round(cumulativeTax),
        difference: Math.round(cumulativeTax - flatTaxPerMonth * i),
      });
    }
    return data;
  }, [totalIncome, monthsCount, monthlyGrowth, projectionMonths, convertAmount]);

  const recentTaxes = useMemo(
    () => [...taxTransactions, ...bookkeepingTransactions]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 10),
    [taxTransactions, bookkeepingTransactions],
  );

  // ── SRL-only guard (after all hooks) ───────────────────────────────────────
  if (!isSrl) {
    return (
      <>
        <TopBar title="Податки SRL" onMenuClick={onMenuClick} />
        <div className={s.page}>
          <div className={s.notSrl}>
            <span className={`material-symbols-outlined ${s.notSrlIcon}`}>business</span>
            <h2>Тільки для SRL рахунку</h2>
            <p>Цей розділ доступний лише для рахунку компанії (SRL). Переключіть рахунок у бічній панелі.</p>
          </div>
        </div>
      </>
    );
  }

  // ── KPI cards ──────────────────────────────────────────────────────────────
  const kpis = [
    {
      label: 'Середній податок/міс',
      value: fmt(avgMonthlyTax),
      sub: `Реально сплачено (${monthsWithTaxes} міс.) · ${avgEffectiveRate.toFixed(1)}% від доходу`,
      icon: 'calendar_month',
      color: '#b45309',
    },
    {
      label: 'Всього сплачено',
      value: fmt(totalTaxesPaid),
      sub: `Дохід: ${fmt(totalIncome)}`,
      icon: 'account_balance',
      color: '#d97706',
    },
    {
      label: 'ЗП податки/міс',
      value: fmt(convertAmount(MONTHLY_SALARY_TAXES, 'RON')),
      sub: `CAS ${MONTHLY_CAS} + CASS ${MONTHLY_CASS} + IRPF ${MONTHLY_INCOME_TAX} + CAM ${MONTHLY_CAM}`,
      icon: 'badge',
      color: '#dc2626',
    },
    {
      label: 'Дивіденди 16%',
      value: fmt(dividendTax),
      sub: totalDividendsNet > 0
        ? `Чисті: ${fmt(totalDividendsNet)} (брутто: ${fmt(dividendsGross)})`
        : 'Категорія: «Дивіденди»',
      icon: 'savings',
      color: '#7c3aed',
    },
  ];

  return (
    <>
      <TopBar title="Податки SRL" onMenuClick={onMenuClick} />
      <div className={s.page}>

        <div className={s.infoBar}>
          <span className={`material-symbols-outlined ${s.infoIcon}`}>info</span>
          <span>
            Мікро SRL: 1% обороту + ЗП {SALARY_BASE} RON (CAS 25% + CASS 10% + IRPF 10% + CAM 2.25%) + дивіденди 16%
          </span>
        </div>

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
              {kpi.sub && <div className={s.kpiSub}>{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Compound tax from income widget */}
        <div className={s.compoundCard}>
          <div className={s.compoundHeader}>
            <div>
              <h2>Складний відсоток податків від доходу</h2>
              <p className={s.compoundDesc}>
                Проекція: як зростає загальне податкове навантаження при зростанні доходу (мікро 1% + ЗП + дивіденди 16%)
              </p>
            </div>
            <div className={s.compoundControls}>
              <label className={s.controlLabel}>
                Зростання %/міс
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={growthRate}
                  onChange={(e) => setGrowthRate(Number(e.target.value))}
                  className={s.controlInput}
                />
              </label>
              <label className={s.controlLabel}>
                Місяців
                <input
                  type="number"
                  min={3}
                  max={60}
                  step={1}
                  value={projectionMonths}
                  onChange={(e) => setProjectionMonths(Number(e.target.value))}
                  className={s.controlInput}
                />
              </label>
            </div>
          </div>

          <div className={s.compoundSummary}>
            <div className={s.summaryItem}>
              <span className={s.summaryLabel}>Без зростання (flat)</span>
              <span className={s.summaryValue}>
                {fmt(compoundProjection[compoundProjection.length - 1]?.flatTax || 0)}
              </span>
            </div>
            <div className={s.summaryItem}>
              <span className={s.summaryLabel}>З compound зростанням</span>
              <span className={`${s.summaryValue} ${s.accentColor}`}>
                {fmt(compoundProjection[compoundProjection.length - 1]?.compoundTax || 0)}
              </span>
            </div>
            <div className={s.summaryItem}>
              <span className={s.summaryLabel}>Різниця (compound ефект)</span>
              <span className={`${s.summaryValue} ${s.danger}`}>
                +{fmt(compoundProjection[compoundProjection.length - 1]?.difference || 0)}
              </span>
            </div>
          </div>

          {compoundProjection.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={compoundProjection} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gCompound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b45309" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--outline-variant)', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(v) => fmt(v as number)}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="flatTax" name="Flat дохід" stroke="#64748b" strokeWidth={2} fill="url(#gBase)" dot={false} />
                <Area type="monotone" dataKey="compoundTax" name="Compound зростання" stroke="#b45309" strokeWidth={2.5} fill="url(#gCompound)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly tax breakdown chart */}
        <div className={s.monthlyCard}>
          <h2>Податкове навантаження по місяцях</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
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
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="microTax" name="Мікро 1%" fill="#d97706" radius={[4, 4, 0, 0]} stackId="taxes" />
                <Bar dataKey="salaryTaxes" name="ЗП податки" fill="#b45309" radius={[4, 4, 0, 0]} stackId="taxes" />
                <Bar dataKey="bookkeeping" name="Бухгалтерія" fill="#6d28d9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={s.emptyChart}>
              <span className={`material-symbols-outlined ${s.icon}`}>bar_chart</span>
              <p>Немає даних про доходи</p>
            </div>
          )}
        </div>

        {/* Tax summary table */}
        <div className={s.summaryCard}>
          <h2>Розрахунок податків (щомісяця)</h2>
          <table className={s.taxTable}>
            <thead>
              <tr>
                <th>Стаття</th>
                <th>Ставка</th>
                <th>База</th>
                <th>Сума</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CAS (пенсійний)</td>
                <td>25%</td>
                <td>{fmt(convertAmount(SALARY_BASE, 'RON'))}</td>
                <td className={s.amountCell}>{fmt(convertAmount(MONTHLY_CAS, 'RON'))}</td>
              </tr>
              <tr>
                <td>CASS (медичний)</td>
                <td>10%</td>
                <td>{fmt(convertAmount(SALARY_BASE, 'RON'))}</td>
                <td className={s.amountCell}>{fmt(convertAmount(MONTHLY_CASS, 'RON'))}</td>
              </tr>
              <tr>
                <td>Impozit pe venit</td>
                <td>10%</td>
                <td>{fmt(convertAmount(SALARY_BASE - MONTHLY_CAS - MONTHLY_CASS, 'RON'))}</td>
                <td className={s.amountCell}>{fmt(convertAmount(MONTHLY_INCOME_TAX, 'RON'))}</td>
              </tr>
              <tr>
                <td>CAM (роботодавець)</td>
                <td>2.25%</td>
                <td>{fmt(convertAmount(SALARY_BASE, 'RON'))}</td>
                <td className={s.amountCell}>{fmt(convertAmount(MONTHLY_CAM, 'RON'))}</td>
              </tr>
              <tr className={s.totalRow}>
                <td>Всього ЗП податки</td>
                <td></td>
                <td></td>
                <td className={s.amountCell}>{fmt(convertAmount(MONTHLY_SALARY_TAXES, 'RON'))}</td>
              </tr>
              <tr className={s.separatorRow}>
                <td colSpan={4}></td>
              </tr>
              <tr>
                <td>Мікро-податок</td>
                <td>1%</td>
                <td>Оборот</td>
                <td className={s.amountCell}>{fmt(totalMicroTax / Math.max(monthsCount, 1))}/міс</td>
              </tr>
              <tr>
                <td>Дивіденди</td>
                <td>16%</td>
                <td>Чисті виплачені: {fmt(totalDividendsNet)}</td>
                <td className={s.amountCell}>{fmt(dividendTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recent tax/bookkeeping transactions */}
        <div className={s.recentCard}>
          <h2>Останні операції (податки + бухгалтерія)</h2>
          {recentTaxes.length === 0 ? (
            <div className={s.emptyChart}>
              <span className={`material-symbols-outlined ${s.icon}`}>receipt_long</span>
              <p>Немає транзакцій у категоріях «Податки» або «Бухгалтерія»</p>
            </div>
          ) : (
            <div className={s.txList}>
              {recentTaxes.map((tx) => (
                <TaxTransactionRow key={tx.id} tx={tx} fmt={fmt} convertAmount={convertAmount} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Transaction row sub-component ─────────────────────────────────────────────

interface TaxTransactionRowProps {
  tx: Transaction;
  fmt: (amount: number) => string;
  convertAmount: (amount: number, currency?: Currency) => number;
}

function TaxTransactionRow({ tx, fmt, convertAmount }: TaxTransactionRowProps) {
  const isTax = tx.category === 'taxes';
  const color = isTax ? '#b45309' : '#6d28d9';
  const icon = isTax ? 'account_balance' : 'calculate';
  const amt = convertAmount(tx.amount || 0, (tx.currency || 'RON') as Currency);

  return (
    <div className={s.txRow}>
      <div className={s.txIcon} style={{ background: color + '15' }}>
        <span className={`material-symbols-outlined ${s.icon}`} style={{ color }}>{icon}</span>
      </div>
      <div className={s.txInfo}>
        <div className={s.txDesc}>{tx.description?.slice(0, 50) || '—'}</div>
        <div className={s.txDate}>
          {tx.date ? new Date(tx.date).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </div>
      </div>
      <div className={s.txAmount}>−{fmt(amt)}</div>
    </div>
  );
}
