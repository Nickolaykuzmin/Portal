import type { PdfPage, NewTransaction } from '../../types';
import type { BtRow, BtBlock } from './types';
import { groupByY, parseAmount, btDateToISO } from './helpers';
import { isSrlBoilerplate, isSrlTxStart, shouldSkipSrlBlock } from './boilerplate';
import { buildSrlDescription } from './descriptions';
import { autoCategory } from './autoCategory';

// ─── BT SRL (company) account parser ─────────────────────────────────────────
// Handles multi-page BT company statements.
// Key: date carries across pages (transactions on page 2 may not repeat the date).

export function parseBT_SRL(pages: PdfPage[]): NewTransaction[] {
  const transactions: (NewTransaction & { bankBalance?: number })[] = [];
  let lastKnownBalance: number | null = null;
  let carryDate: string | null = null; // persists across pages

  for (const pageItems of pages) {
    if (!pageItems.length) continue;

    // Detect column X positions from header row
    let DEBIT_X  = 452;
    let CREDIT_X = 545;
    const yGroups = groupByY(pageItems, 2);

    for (const group of yGroups) {
      const texts = group.map((i) => i.text);
      if (texts.includes('Debit') && texts.includes('Credit')) {
        const debitItem  = group.find((i) => i.text === 'Debit');
        const creditItem = group.find((i) => i.text === 'Credit');
        if (debitItem)  DEBIT_X  = debitItem.x;
        if (creditItem) CREDIT_X = creditItem.x;
        break;
      }
    }

    const COL_TOL = 40;

    // Extract rows from Y-groups
    const rows: BtRow[] = yGroups
      .map((items) => {
        const sorted = [...items].sort((a, b) => a.x - b.x);
        const dateItems   = sorted.filter((i) => i.x < 80 && /^\d{2}\/\d{2}\/\d{4}$/.test(i.text));
        const descItems   = sorted.filter((i) => i.x >= 80 && i.x < 420 && i.text.length > 0);
        const debitItems  = sorted.filter((i) => Math.abs(i.x - DEBIT_X)  <= COL_TOL);
        const creditItems = sorted.filter((i) => Math.abs(i.x - CREDIT_X) <= COL_TOL);

        return {
          y:      items[0]?.y ?? 0,
          date:   dateItems[0]?.text ?? null,
          desc:   descItems.map((i) => i.text).join(' ').trim(),
          debit:  debitItems.reduce<number | null>((v, i) => v ?? parseAmount(i.text), null),
          credit: creditItems.reduce<number | null>((v, i) => v ?? parseAmount(i.text), null),
        };
      })
      .filter((r) => r.desc || r.date || r.debit !== null || r.credit !== null);

    rows.sort((a, b) => b.y - a.y);

    // Group rows into transaction blocks
    const blocks: BtBlock[] = [];
    let cur: BtBlock | null = null;
    let curDate: string | null = carryDate; // inherit from previous page

    for (const row of rows) {
      if (isSrlBoilerplate(row.desc)) continue;

      const isTxStart = isSrlTxStart(row.desc);

      if (row.date) {
        if (cur) blocks.push(cur);
        curDate = btDateToISO(row.date);
        cur = { date: curDate, lines: row.desc ? [row.desc] : [], debit: row.debit, credit: row.credit };
      } else if (isTxStart) {
        // Start a new block — works even if cur is null (page boundary)
        if (cur) blocks.push(cur);
        cur = { date: curDate, lines: [row.desc], debit: row.debit, credit: row.credit };
      } else if (cur) {
        if (row.desc) cur.lines.push(row.desc);
        if (row.debit  !== null && cur.debit  === null) cur.debit  = row.debit;
        if (row.credit !== null && cur.credit === null) cur.credit = row.credit;
      }
    }
    if (cur) blocks.push(cur);

    // Carry the last known date to the next page
    carryDate = curDate;

    // Extract balance
    for (const row of rows) {
      if (/SOLD FINAL CONT/i.test(row.desc)) {
        const balAmt = row.credit ?? row.debit;
        if (balAmt && balAmt > 0) lastKnownBalance = balAmt;
      }
    }

    // Convert blocks to transactions
    for (const block of blocks) {
      const fullDesc = block.lines.join(' ');

      if (/^(RULAJ|SOLD|TOTAL DISPONIBIL|Fonduri proprii|Credit neutilizat)/i.test(fullDesc)) continue;
      if (!block.debit && !block.credit) continue;
      if (/^Round Up/i.test(fullDesc)) continue;
      if (shouldSkipSrlBlock(fullDesc)) continue;

      const amount = block.credit ?? block.debit;
      if (!amount || amount <= 0) continue;

      const type        = block.credit ? 'income' : 'expense';
      const description = buildSrlDescription(fullDesc, type);
      const isCashWithdrawal = /Retragere de numerar/i.test(fullDesc);

      transactions.push({
        date:     block.date ?? '',
        description,
        amount,
        type,
        category: autoCategory(description, type),
        bank:     'BT SRL',
        currency: 'RON',
        source:   'pdf',
        ...(isCashWithdrawal && { isCashWithdrawal: true }),
      });
    }
  }

  // Attach balance to most recent transaction
  if (lastKnownBalance !== null && transactions.length > 0) {
    const sorted = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (sorted[0]) sorted[0].bankBalance = lastKnownBalance;
  }

  // Deduplicate
  const seen = new Set<string>();
  return transactions.filter((tx) => {
    const key = `${tx.date}|${tx.amount}|${tx.type}|${tx.description.slice(0, 30)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
