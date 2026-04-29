/**
 * Format a number as currency
 */
export function formatCurrency(amount, currency = 'RON') {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string to readable format
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('uk-UA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Format a date to short format
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('uk-UA', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Get month name
 */
export function getMonthName(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Group transactions by month
 */
export function groupByMonth(transactions) {
  const groups = {};
  transactions.forEach((tx) => {
    const key = tx.date ? tx.date.slice(0, 7) : 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  return groups;
}

/**
 * Calculate totals from transactions
 */
export function calcTotals(transactions) {
  return transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'income') {
        acc.income += tx.amount || 0;
      } else {
        acc.expenses += tx.amount || 0;
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );
}

/**
 * Group transactions by category and sum amounts
 */
export function groupByCategory(transactions) {
  const groups = {};
  transactions.forEach((tx) => {
    const cat = tx.category || 'other';
    if (!groups[cat]) groups[cat] = { total: 0, count: 0, transactions: [] };
    groups[cat].total += tx.amount || 0;
    groups[cat].count += 1;
    groups[cat].transactions.push(tx);
  });
  return groups;
}
