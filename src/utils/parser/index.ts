import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { PdfPage, ParseResult, NewTransaction } from '../../types';
import type { BankId } from './types';
import { normalizeDate, parseAmount } from './helpers';
import { autoCategory } from './autoCategory';
import { parseBT } from './parseBT';
import { parseBT_SRL } from './parseBT_SRL';

// Re-export for external use
export { autoCategory } from './autoCategory';
export type { BankId } from './types';

// ─── PDF.js worker setup ──────────────────────────────────────────────────────

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ─── PDF text extraction ──────────────────────────────────────────────────────

export async function extractTextFromPDF(file: File): Promise<PdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .filter((item): item is TextItem => 'str' in item)
        .map((item) => ({
          text: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
        })),
    );
  }
  return pages;
}

// ─── Bank detection ───────────────────────────────────────────────────────────

function detectBank(text: string): BankId {
  const t = text.toLowerCase();
  if (
    (t.includes('banca transilvania') || t.includes('btrlro22')) &&
    (t.includes(' srl') || t.includes(' s.r.l') || t.includes(' sa ') || t.includes(' s.a.'))
  ) return 'BT_SRL';
  if (t.includes('banca transilvania') || t.includes('btrlro22')) return 'BT';
  if (t.includes('bcr') || t.includes('banca comerciala romana')) return 'BCR';
  if (t.includes('brd') || t.includes('groupe societe generale')) return 'BRD';
  if (t.includes('ing bank')) return 'ING';
  if (t.includes('raiffeisen')) return 'Raiffeisen';
  if (t.includes('unicredit')) return 'UniCredit';
  return 'Unknown';
}

// ─── Generic fallback parser ──────────────────────────────────────────────────

function parseGeneric(pages: PdfPage[]): NewTransaction[] {
  const transactions: NewTransaction[] = [];
  const text = pages.map((p) => p.map((i) => i.text).join(' ')).join('\n');
  for (const line of text.split('\n')) {
    const m = line.match(/(\d{2}[.\-/]\d{2}[.\-/]\d{4})\s+(.+?)\s+([\d.,]+)\s*(?:RON|EUR)?/i);
    if (!m) continue;
    const amount = parseAmount(m[3]);
    if (!amount || amount <= 0) continue;
    const description = (m[2] ?? '').trim();
    transactions.push({
      date: normalizeDate(m[1] ?? ''),
      description,
      amount,
      type: 'expense',
      category: autoCategory(description, 'expense'),
      bank: 'Unknown',
      currency: 'RON',
      source: 'pdf',
    });
  }
  return transactions;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function parseStatement(file: File): Promise<ParseResult> {
  const pages = await extractTextFromPDF(file);
  const fullText = pages.map((p) => p.map((i) => i.text).join(' ')).join('\n');
  const bank = detectBank(fullText);

  let transactions: NewTransaction[];
  if (bank === 'BT_SRL') {
    transactions = parseBT_SRL(pages);
  } else if (bank === 'BT') {
    transactions = parseBT(pages);
  } else {
    transactions = parseGeneric(pages);
  }

  console.log(`[Parser] bank=${bank}, found=${transactions.length}`);

  // Final deduplication
  const seen = new Map<string, number>();
  transactions = transactions.filter((tx) => {
    const key = `${tx.date}|${tx.amount}|${tx.type}|${tx.description.slice(0, 30)}`;
    if (seen.has(key)) return false;
    seen.set(key, 1);
    return true;
  });

  return { bank, transactions, rawText: fullText, parsedAt: new Date().toISOString() };
}
