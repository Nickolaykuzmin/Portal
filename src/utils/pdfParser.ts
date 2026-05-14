// Re-export from modular parser structure.
// See src/utils/parser/ for the implementation:
//   - index.ts       — entry point, bank detection, PDF extraction
//   - parseBT.ts     — BT personal account parser
//   - parseBT_SRL.ts — BT SRL (company) account parser
//   - autoCategory.ts — auto-categorization rules
//   - descriptions.ts — description builders (BT, SRL, tax labels)
//   - boilerplate.ts  — boilerplate/skip patterns
//   - helpers.ts      — shared utilities (groupByY, parseAmount, dates)
//   - types.ts        — internal parser types

export { parseStatement, extractTextFromPDF, autoCategory } from './parser';
export type { BankId } from './parser';
