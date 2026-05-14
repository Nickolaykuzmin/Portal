import type { PdfTextItem } from '../../types';

// ─── Parser internal types ────────────────────────────────────────────────────

/** A row extracted from a PDF page — one horizontal line of text */
export interface BtRow {
  y: number;
  date: string | null;
  desc: string;
  debit: number | null;
  credit: number | null;
}

/** A logical transaction block — multiple rows grouped together */
export interface BtBlock {
  date: string | null;
  lines: string[];
  debit: number | null;
  credit: number | null;
}

/** Supported bank identifiers */
export type BankId = 'BT' | 'BT_SRL' | 'BCR' | 'BRD' | 'ING' | 'Raiffeisen' | 'UniCredit' | 'Unknown';

/** Re-export for convenience */
export type { PdfTextItem };
