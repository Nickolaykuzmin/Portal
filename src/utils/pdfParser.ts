import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { PdfPage, PdfTextItem, ParseResult, NewTransaction } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ─── PDF extraction ───────────────────────────────────────────────────────────

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

function detectBank(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('banca transilvania') || t.includes('btrlro22')) return 'BT';
  if (t.includes('bcr') || t.includes('banca comerciala romana')) return 'BCR';
  if (t.includes('brd') || t.includes('groupe societe generale')) return 'BRD';
  if (t.includes('ing bank')) return 'ING';
  if (t.includes('raiffeisen')) return 'Raiffeisen';
  if (t.includes('unicredit')) return 'UniCredit';
  return 'Unknown';
}

// ─── Amount parser ────────────────────────────────────────────────────────────

function parseAmount(str: string | null | undefined): number | null {
  if (!str) return null;
  const s = str.trim().replace(/\s/g, '');
  if (!s) return null;

  // Romanian thousands: 7,833.33
  if (/^\d{1,3}(,\d{3})+\.\d{2}$/.test(s)) {
    return parseFloat(s.replace(/,/g, ''));
  }
  // European thousands: 1.234,56
  if (/^\d{1,3}(\.\d{3})+(,\d{2})$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  // Simple dot decimal: 50.09
  if (/^\d+\.\d{2}$/.test(s)) return parseFloat(s);
  // Simple comma decimal: 50,09
  if (/^\d+,\d{2}$/.test(s)) return parseFloat(s.replace(',', '.'));
  // Integer
  if (/^\d+$/.test(s)) return parseFloat(s);

  return null;
}

// ─── Auto-categorization ──────────────────────────────────────────────────────

export function autoCategory(description: string, type: string): string {
  if (type === 'income') {
    const d = description.toLowerCase();
    if (/salar|salary|wage/.test(d)) return 'salary';
    return 'income';
  }
  const d = description.toLowerCase();
  if (/lidl|kaufland|carrefour|mega.?image|auchan|penny|profi|aliment|food|cicken|restaurant|cafe|coffee|mcdonald|kfc|pizza|burger|sushi|ko.asia|berezka|stefysia|nicoland|ice srl/.test(d)) return 'food';
  if (/uber|bolt|taxi|metro|tram|bus|cfr|tarom|wizz|ryanair|mol |rompetrol|omv|petrol|benzin|rovinieta|parking|parcare|auto.clean|metropolitan.self/.test(d)) return 'transport';
  if (/amazon|emag|altex|flanco|zara|h&m|sinsay|lc.waikiki|set.colosseum|fashion|shop|mall|ikea|rituals|premium.vaping|vaping|mihaela.flowers|flowers/.test(d)) return 'shopping';
  if (/enel|electrica|gaz|apa|canal|internet|telekom|orange|vodafone|digi|utilit|365|abonament/.test(d)) return 'utilities';
  if (/farmacie|pharmacy|doctor|spital|hospital|medical|sanatate/.test(d)) return 'health';
  if (/netflix|spotify|cinema|theater|gaming|beauty.salon|salon|spa/.test(d)) return 'entertainment';
  if (/hotel|airbnb|booking|flight|zbor|vacanta|travel|turism/.test(d)) return 'travel';
  if (/scoala|school|universitate|university|curs|course/.test(d)) return 'education';
  if (/taxa|comision|interogare/.test(d)) return 'utilities';
  if (/atm|retragere|numerar/.test(d)) return 'cash';
  return 'other';
}

// ─── BT Parser ────────────────────────────────────────────────────────────────

interface BtRow {
  y: number;
  date: string | null;
  desc: string;
  debit: number | null;
  credit: number | null;
}

interface BtBlock {
  date: string | null;
  lines: string[];
  debit: number | null;
  credit: number | null;
}

function parseBT(pages: PdfPage[]): NewTransaction[] {
  const transactions: (NewTransaction & { bankBalance?: number })[] = [];
  let lastKnownBalance: number | null = null;

  for (const pageItems of pages) {
    if (!pageItems.length) continue;

    let DEBIT_X = 452;
    let CREDIT_X = 545;

    const yGroups = groupByY(pageItems, 2);

    for (const group of yGroups) {
      const texts = group.map((i) => i.text);
      if (texts.includes('Debit') && texts.includes('Credit')) {
        const debitItem = group.find((i) => i.text === 'Debit');
        const creditItem = group.find((i) => i.text === 'Credit');
        if (debitItem) DEBIT_X = debitItem.x;
        if (creditItem) CREDIT_X = creditItem.x;
        break;
      }
    }

    const COL_TOL = 40;

    const rows: BtRow[] = yGroups
      .map((items) => {
        const sorted = [...items].sort((a, b) => a.x - b.x);

        const dateItems   = sorted.filter((i) => i.x < 80 && /^\d{2}\/\d{2}\/\d{4}$/.test(i.text));
        const descItems   = sorted.filter((i) => i.x >= 80 && i.x < 420 && i.text.length > 0);
        const debitItems  = sorted.filter((i) => Math.abs(i.x - DEBIT_X) <= COL_TOL);
        const creditItems = sorted.filter((i) => Math.abs(i.x - CREDIT_X) <= COL_TOL);

        const debitAmt  = debitItems.reduce<number | null>((v, i) => v ?? parseAmount(i.text), null);
        const creditAmt = creditItems.reduce<number | null>((v, i) => v ?? parseAmount(i.text), null);

        return {
          y: items[0]?.y ?? 0,
          date: dateItems[0]?.text ?? null,
          desc: descItems.map((i) => i.text).join(' ').trim(),
          debit: debitAmt,
          credit: creditAmt,
        };
      })
      .filter((r) => r.desc || r.date || r.debit !== null || r.credit !== null);

    rows.sort((a, b) => b.y - a.y);

    const blocks: BtBlock[] = [];
    let cur: BtBlock | null = null;
    let curDate: string | null = null;

    for (const row of rows) {
      if (isBoilerplate(row.desc)) continue;

      const isTxStart = isTxTypeStart(row.desc);

      if (row.date) {
        if (cur) blocks.push(cur);
        curDate = btDateToISO(row.date);
        cur = {
          date: curDate,
          lines: row.desc ? [row.desc] : [],
          debit: row.debit,
          credit: row.credit,
        };
      } else if (isTxStart && cur) {
        blocks.push(cur);
        cur = {
          date: curDate,
          lines: [row.desc],
          debit: row.debit,
          credit: row.credit,
        };
      } else if (cur) {
        if (row.desc) cur.lines.push(row.desc);
        if (row.debit  !== null && cur.debit  === null) cur.debit  = row.debit;
        if (row.credit !== null && cur.credit === null) cur.credit = row.credit;
      }
    }
    if (cur) blocks.push(cur);

    // Extract bank balance from SOLD FINAL CONT
    for (const row of rows) {
      if (/SOLD FINAL CONT/i.test(row.desc)) {
        const balAmt = row.credit ?? row.debit;
        if (balAmt && balAmt > 0) lastKnownBalance = balAmt;
      }
    }

    for (const block of blocks) {
      const fullDesc = block.lines.join(' ');

      if (/^(RULAJ|SOLD|TOTAL DISPONIBIL|Fonduri proprii|Credit neutilizat)/i.test(fullDesc)) continue;
      if (!block.debit && !block.credit) continue;
      if (/^Round Up/i.test(fullDesc)) continue;

      const amount = block.credit ?? block.debit;
      if (!amount || amount <= 0) continue;

      const type = block.credit ? 'income' : 'expense';
      const description = buildDescription(fullDesc, type);
      const isCashWithdrawal = /Retragere de numerar/i.test(fullDesc);

      transactions.push({
        date: block.date ?? '',
        description,
        amount,
        type,
        category: autoCategory(description, type),
        bank: 'BT',
        currency: 'RON',
        source: 'pdf',
        ...(isCashWithdrawal && { isCashWithdrawal: true }),
      });
    }
  }

  if (lastKnownBalance !== null && transactions.length > 0) {
    const sorted = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (sorted[0]) sorted[0].bankBalance = lastKnownBalance;
  }

  const seen = new Set<string>();
  return transactions.filter((tx) => {
    const key = `${tx.date}|${tx.amount}|${tx.description.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByY(items: PdfTextItem[], tolerance = 2): PdfTextItem[][] {
  const groups: PdfTextItem[][] = [];
  const used = new Set<PdfTextItem>();
  const sorted = [...items].sort((a, b) => b.y - a.y);

  for (const item of sorted) {
    if (used.has(item)) continue;
    const group: PdfTextItem[] = [item];
    used.add(item);
    for (const other of sorted) {
      if (!used.has(other) && Math.abs(other.y - item.y) <= tolerance) {
        group.push(other);
        used.add(other);
      }
    }
    groups.push(group);
  }

  return groups;
}

const TX_START_RE = /^(Plata la POS(?:\s+non-BT cu card VISA)?|Incasare OP|Retragere de numerar|Rovinieta|Taxa interogare|365\b|Round Up)/i;

function isTxTypeStart(desc: string): boolean {
  if (!desc) return false;
  return TX_START_RE.test(desc.trim());
}

const BOILERPLATE: RegExp[] = [
  /^(BANCA TRANSILVANIA|Info clienti|Solicitant|Tiparit|Capitalul social)/i,
  /^(Registrul|R\.B\.|C\.U\.I\.|SWIFT|Tel\.|www\.|ro\/garantarea)/i,
  /^(Fondurile|Garantare a Depozitelor|Mai multe|311\/2015)/i,
  /^(Acest extras|24\/7|din aplicatiile)/i,
  /^(KUZMIN|Client:|Informatii noi)/i,
  /^(EXTRAS CONT|CONT 548|Valuta|Cod IBAN)/i,
  /^(Data\s+Descriere|Debit\s+Credit|Data$)/i,
  /^(SOLD ANTERIOR|SOLD FINAL|RULAJ ZI|RULAJ TOTAL|TOTAL DISPONIBIL)/i,
  /^(din care|Fonduri proprii|Credit neutilizat|SUME BLOCATE)/i,
  /^(La data curenta|aferenta tranzactiei)/i,
  /^-\s*\d+[.,]\d+\s*RON\s+aferenta/i,
  /^\d+\s*\/\s*\d+$/,
  /^$/,
];

function isBoilerplate(text: string): boolean {
  if (!text) return true;
  return BOILERPLATE.some((re) => re.test(text.trim()));
}

function btDateToISO(str: string): string {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}

function buildDescription(raw: string, type: string): string {
  if (/Retragere de numerar/i.test(raw)) return 'Retragere numerar ATM';

  if (/Rovinieta/i.test(raw)) {
    const car = raw.match(/Numar masina\s+(\S+)/i);
    return car ? `Rovinieta ${car[1]}` : 'Rovinieta';
  }

  if (/Taxa interogare/i.test(raw)) return 'Taxa interogare sold';

  if (/^365\b/i.test(raw) || /Abonament lunar PF/i.test(raw)) return 'Abonament BT 365';

  if (/Incasare OP/i.test(raw)) {
    const cifMatch = raw.match(/C\.I\.F\.[^;]*;([^;]+);/i);
    if (cifMatch) return (cifMatch[1] ?? '').trim().slice(0, 80);
    return raw.replace(/Incasare OP.*?canal electronic\s*/i, '').trim().slice(0, 80);
  }

  if (/Plata la POS/i.test(raw)) {
    const m = raw.match(/(?:EPOS|POS)\s+\S+\s+(?:TID[:\s]\S+\s+)?(.+?)\s+(?:RO|ROM)\s+\d/i);
    if (m) return cleanMerchant(m[1] ?? '');
    const after = raw.replace(/Plata la POS(?:\s+non-BT cu card VISA)?/i, '').trim();
    const firstTech = after.search(/\b(POS|EPOS|TID|RRN|REF|comision|valoare)\b/i);
    if (firstTech > 0) return cleanMerchant(after.slice(0, firstTech));
    return cleanMerchant(after).slice(0, 60);
  }

  // Suppress unused-param warning — type used for future bank-specific logic
  void type;

  return raw
    .replace(/REF:\s*\S+/gi, '')
    .replace(/RRN:\s*\S+/gi, '')
    .replace(/TID[:\s]\S+/gi, '')
    .replace(/comision tranzactie[\d\s.,RON]+/gi, '')
    .replace(/valoare tranzactie[\d\s.,RON]+/gi, '')
    .replace(/C\.I\.F\.[^;]+;/gi, '')
    .replace(/RO\d{2}BTR\S+/gi, '')
    .replace(/BTRLRO22/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 80);
}

function cleanMerchant(name: string): string {
  return name
    .replace(/\s+(SRL|SA|S\.R\.L\.|S\.A\.|DISCOUNT|ROMANIA)\b/gi, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 60);
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

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

function normalizeDate(str: string): string {
  const dmy = str.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return str;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function parseStatement(file: File): Promise<ParseResult> {
  const pages = await extractTextFromPDF(file);
  const fullText = pages.map((p) => p.map((i) => i.text).join(' ')).join('\n');
  const bank = detectBank(fullText);

  let transactions: NewTransaction[] = bank === 'BT' ? parseBT(pages) : parseGeneric(pages);

  console.log(`[Parser] bank=${bank}, found=${transactions.length}`);

  const seen = new Set<string>();
  transactions = transactions.filter((tx) => {
    const key = `${tx.date}|${tx.amount}|${tx.description.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { bank, transactions, rawText: fullText, parsedAt: new Date().toISOString() };
}
