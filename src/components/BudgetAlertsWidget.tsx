import type { BudgetAlert } from '../hooks/useBudgetAlerts';
import { formatCurrency } from '../utils/formatters';
import s from './BudgetAlertsWidget.module.scss';

interface BudgetAlertsWidgetProps {
  alerts: BudgetAlert[];
}

/**
 * Shows a card with per-category budget progress bars.
 * Only renders when at least one category has a budget limit set.
 */
export default function BudgetAlertsWidget({ alerts }: BudgetAlertsWidgetProps) {
  if (alerts.length === 0) return null;

  const exceeded = alerts.filter((a) => a.exceeded);
  const warning  = alerts.filter((a) => a.warning && !a.exceeded);

  const headerIcon    = exceeded.length > 0 ? 'warning' : warning.length > 0 ? 'notifications_active' : 'check_circle';
  const subtitleText  = exceeded.length > 0
    ? `${exceeded.length} категор${exceeded.length === 1 ? 'ія' : 'ії'} перевищили ліміт цього місяця`
    : warning.length > 0
      ? `${warning.length} категор${warning.length === 1 ? 'ія' : 'ії'} наближаються до ліміту`
      : 'Всі категорії в межах бюджету';

  return (
    <div className={s.card}>
      <div className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.headerIcon}>
            <span className={`material-symbols-outlined ${s.icon}`}>
              {headerIcon}
            </span>
          </div>
          <div>
            <h2 className={s.title}>Ліміти бюджету</h2>
            <p className={s.subtitle}>{subtitleText}</p>
          </div>
        </div>
      </div>

      <div className={s.list}>
        {alerts.map((alert) => {
          const pct = Math.min(alert.ratio * 100, 100);
          const statusClass = alert.exceeded ? s.exceeded : alert.warning ? s.warning : s.ok;

          return (
            <div key={alert.categoryId} className={s.row}>
              {/* Icon */}
              <div
                className={s.catIcon}
                style={{ background: alert.categoryColor + '20' }}
              >
                <span
                  className={`material-symbols-outlined ${s.icon}`}
                  style={{ color: alert.categoryColor }}
                >
                  {alert.categoryIcon || 'category'}
                </span>
              </div>

              {/* Name + bar */}
              <div className={s.barWrap}>
                <div className={s.barHeader}>
                  <span className={s.catName}>{alert.categoryName}</span>
                  <span className={`${s.pct} ${statusClass}`}>
                    {formatCurrency(alert.spent)} / {formatCurrency(alert.limit)}
                  </span>
                </div>
                <div className={s.track}>
                  <div
                    className={`${s.fill} ${statusClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Badge */}
              <div className={`${s.badge} ${statusClass}`}>
                {Math.round(alert.ratio * 100)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
