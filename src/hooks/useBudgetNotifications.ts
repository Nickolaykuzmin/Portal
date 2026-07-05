/**
 * Watches budget alerts and fires in-app toasts + native notifications
 * whenever a category crosses the 80% warning or 100% exceeded threshold.
 *
 * Uses a ref to track which alerts have already been fired this session
 * so the same alert isn't repeated on every re-render.
 */
import { useEffect, useRef } from 'react';
import { useBudgetAlerts } from './useBudgetAlerts';
import { useToast } from '../context/ToastContext';
import { showBudgetExceededNotif, showBudgetWarningNotif } from '../services/notifications';
import type { Transaction, Category } from '../types';
import { formatCurrency } from '../utils/formatters';

export function useBudgetNotifications(
  transactions: Transaction[],
  categories: Category[],
) {
  const alerts = useBudgetAlerts(transactions, categories);
  const { showToast } = useToast();

  // Track already-fired alerts: key = `${categoryId}:exceeded` or `${categoryId}:warning`
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const alert of alerts) {
      // ── Exceeded (≥100%) ─────────────────────────────────────────────────
      const exceededKey = `${alert.categoryId}:exceeded`;
      if (alert.exceeded && !firedRef.current.has(exceededKey)) {
        firedRef.current.add(exceededKey);

        showToast({
          variant: 'error',
          title: `⚠️ Бюджет перевищено — ${alert.categoryName}`,
          message: `Витрачено ${formatCurrency(alert.spent)} із ${formatCurrency(alert.limit)} (${Math.round(alert.ratio * 100)}%)`,
          duration: 8000,
        });

        showBudgetExceededNotif(alert.categoryName, alert.spent, alert.limit);
      }

      // ── Warning (≥80%, but not yet exceeded) ─────────────────────────────
      const warningKey = `${alert.categoryId}:warning`;
      if (alert.warning && !alert.exceeded && !firedRef.current.has(warningKey)) {
        firedRef.current.add(warningKey);

        showToast({
          variant: 'warning',
          title: `🔔 Бюджет майже вичерпано — ${alert.categoryName}`,
          message: `Витрачено ${formatCurrency(alert.spent)} із ${formatCurrency(alert.limit)} (${Math.round(alert.ratio * 100)}%)`,
          duration: 7000,
        });

        showBudgetWarningNotif(alert.categoryName, alert.spent, alert.limit);
      }

      // If ratio drops below threshold (e.g. transaction deleted), reset so
      // the warning can fire again if the limit is crossed later.
      if (!alert.exceeded) firedRef.current.delete(exceededKey);
      if (!alert.warning)  firedRef.current.delete(warningKey);
    }
  }, [alerts, showToast]);

  return alerts;
}
