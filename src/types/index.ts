// ─── Domain types ─────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';
export type Currency = 'RON' | 'EUR' | 'USD';

export interface Transaction {
  id: string;
  date: string;           // ISO date string YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  currency: Currency;
  bank?: string;
  source?: string;
  bankBalance?: number;
  createdAt?: unknown;    // Firestore ServerTimestamp
}

/** Transaction without the Firestore `id` — used when creating */
export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isDefault?: boolean;
  createdAt?: unknown;
}

export type NewCategory = Omit<Category, 'id' | 'isDefault' | 'createdAt'>;

// ─── PDF parser types ─────────────────────────────────────────────────────────

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
}

export type PdfPage = PdfTextItem[];

export interface ParseResult {
  bank: string;
  transactions: NewTransaction[];
  rawText: string;
  parsedAt: string;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export interface MergeResult {
  added: number;
  skipped: number;
}

export interface Totals {
  income: number;
  expenses: number;
}
