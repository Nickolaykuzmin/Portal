import { useMemo } from 'react';
import type { Transaction, Category } from '../types';

export interface BudgetAlert {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  limit: number;
  /** 0–1+ ratio of spent/limit */
  ratio: number;
  /** true when ratio >= 1.0 */
  exceeded: boolean;
  /** true when ratio >= 0.8 */
  warning: boolean;
}

/**
 * Returns budget alerts for the current calendar month.
 * Only categories with a budgetLimit set are included.
 */
export function useBudgetAlerts(
  transactions: Transaction[],
  categories: Category[],
): BudgetAlert[] {
  return useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Filter to current-month expense transactions
    const monthExpenses = transactions.filter(
      (tx) => tx.type === 'expense' && (tx.date ?? '').startsWith(monthKey),
    );

    // Sum by category
    const spentByCategory = new Map<string, number>();
    for (const tx of monthExpenses) {
      const prev = spentByCategory.get(tx.category) ?? 0;
      spentByCategory.set(tx.category, prev + tx.amount);
    }

    const alerts: BudgetAlert[] = [];

    for (const cat of categories) {
      if (!cat.budgetLimit || cat.budgetLimit <= 0) continue;
      if (cat.type !== 'expense') continue;

      const spent = spentByCategory.get(cat.id) ?? 0;
      const ratio = spent / cat.budgetLimit;

      alerts.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        spent,
        limit: cat.budgetLimit,
        ratio,
        exceeded: ratio >= 1.0,
        warning: ratio >= 0.8,
      });
    }

    return alerts.sort((a, b) => b.ratio - a.ratio);
  }, [transactions, categories]);
}
