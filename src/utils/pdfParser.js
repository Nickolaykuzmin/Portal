import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ─── PDF extraction ───────────────────────────────────────────────────────────

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items.map((item) => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
      })),
    );
  }
  return pages;
}

// ─── Bank detection ───────────────────────────────────────────────────────────

function detectBank(text) {
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

// Handles: 7,833.33 | 50.09 | 1.234,56 | 207,31
function parseAmount(str) {
  if (!str) return null;
  const s = str.trim().replace(/\s/g, '');
  if (!s) return null;

  // Romanian thousands: 7,833.33 (already dot-decimal with comma thousands)
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

export function autoCategory(description, type) {
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
//
// From debug output we know the exact layout:
//   Date items:   x ≈ 28
//   Desc items:   x ≈ 90
//   Debit items:  x ≈ 452  (expense)
//   Credit items: x ≈ 545  (income)
//
// Key insight: date, description, and amount are SEPARATE items on the SAME Y line.
// Multi-line descriptions continue on lower Y values with x ≈ 90, no date.

function parseBT(pages) {
  const transactions = [];
  let lastKnownBalance = null;

  for (const pageItems of pages) {
    if (!pageItems.length) continue;

    // ── Step 1: detect column X positions from "Debit / Credit" header ──────
    let DEBIT_X = 452;
    let CREDIT_X = 545;

    // Group items by Y (tolerance ±2px)
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

    const COL_TOL = 40; // px tolerance for column matching

    // ── Step 2: build logical rows ───────────────────────────────────────────
    // Each row = all items at the same Y (±2px)
    const rows = yGroups.map((items) => {
      const sorted = items.sort((a, b) => a.x - b.x);

      // Separate date, description text, and amount columns
      const dateItems   = sorted.filter((i) => i.x < 80 && /^\d{2}\/\d{2}\/\d{4}$/.test(i.text));
      const descItems   = sorted.filter((i) => i.x >= 80 && i.x < 420 && i.text.length > 0);
      const debitItems  = sorted.filter((i) => Math.abs(i.x - DEBIT_X) <= COL_TOL);
      const creditItems = sorted.filter((i) => Math.abs(i.x - CREDIT_X) <= COL_TOL);

      const debitAmt  = debitItems.reduce((v, i) => v ?? parseAmount(i.text), null);
      const creditAmt = creditItems.reduce((v, i) => v ?? parseAmount(i.text), null);

      return {
        y: items[0].y,
        date: dateItems[0]?.text ?? null,
        desc: descItems.map((i) => i.text).join(' ').trim(),
        debit: debitAmt,
        credit: creditAmt,
      };
    }).filter((r) => r.desc || r.date || r.debit || r.credit);

    // Sort top-to-bottom (higher Y = higher on page)
    rows.sort((a, b) => b.y - a.y);

    // ── Step 3: merge rows into transaction blocks ───────────────────────────
    // A new block starts when:
    //   a) a row has a date (new day or same day new entry)
    //   b) a row starts with a known transaction type keyword (new sub-tx within same day)
    const blocks = [];
    let cur = null;
    let curDate = null; // track last seen date

    for (const row of rows) {
      if (isBoilerplate(row.desc)) continue;

      const isTxStart = isTxTypeStart(row.desc);

      if (row.date) {
        // Row has a date — always start a new block
        if (cur) blocks.push(cur);
        curDate = btDateToISO(row.date);
        cur = {
          date: curDate,
          lines: row.desc ? [row.desc] : [],
          debit: row.debit,
          credit: row.credit,
        };
      } else if (isTxStart && cur) {
        // New transaction type keyword on a continuation line — split into new block
        if (cur) blocks.push(cur);
        cur = {
          date: curDate, // inherit last known date
          lines: [row.desc],
          debit: row.debit,
          credit: row.credit,
        };
      } else if (cur) {
        // Continuation of current block
        if (row.desc) cur.lines.push(row.desc);
        if (row.debit  !== null && cur.debit  === null) cur.debit  = row.debit;
        if (row.credit !== null && cur.credit === null) cur.credit = row.credit;
      }
    }
    if (cur) blocks.push(cur);

    // ── Step 4: extract bank balance from SOLD FINAL CONT ───────────────────
    for (const row of rows) {
      if (/SOLD FINAL CONT/i.test(row.desc)) {
        // The balance amount is in the credit column (rightmost)
        const balAmt = row.credit ?? row.debit;
        if (balAmt && balAmt > 0) lastKnownBalance = balAmt;
      }
    }

    // ── Step 5: convert blocks to transactions ───────────────────────────────
    for (const block of blocks) {
      const fullDesc = block.lines.join(' ');

      // Skip summary lines
      if (/^(RULAJ|SOLD|TOTAL DISPONIBIL|Fonduri proprii|Credit neutilizat)/i.test(fullDesc)) continue;
      if (!block.debit && !block.credit) continue;

      // Skip Round Up blocks (BT savings feature)
      if (/^Round Up/i.test(fullDesc)) continue;

      const amount = block.credit ?? block.debit;
      if (!amount || amount <= 0) continue;

      const type = block.credit ? 'income' : 'expense';
      const description = buildDescription(fullDesc, type);

      transactions.push({
        date: block.date,
        description,
        amount,
        type,
        category: autoCategory(description, type),
        bank: 'BT',
        currency: 'RON',
        source: 'pdf',
      });
    }
  }

  // Attach the last known bank balance to the most recent transaction
  if (lastKnownBalance !== null && transactions.length > 0) {
    const sorted = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    sorted[0].bankBalance = lastKnownBalance;
  }

  // Deduplicate
  const seen = new Set();
  return transactions.filter((tx) => {
    const key = `${tx.date}|${tx.amount}|${tx.description.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByY(items, tolerance = 2) {
  const groups = [];
  const used = new Set();

  const sorted = [...items].sort((a, b) => b.y - a.y);

  for (const item of sorted) {
    if (used.has(item)) continue;
    const group = [item];
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

// Transaction type keywords that signal the START of a new transaction entry
const TX_START_RE = /^(Plata la POS(?:\s+non-BT cu card VISA)?|Incasare OP|Retragere de numerar|Rovinieta|Taxa interogare|365\b|Round Up)/i;

function isTxTypeStart(desc) {
  if (!desc) return false;
  return TX_START_RE.test(desc.trim());
}

const BOILERPLATE = [
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
  /^-\s*\d+[\.,]\d+\s*RON\s+aferenta/i,
  /^\d+\s*\/\s*\d+$/, // page numbers like "1 / 1"
  /^$/, // empty
];

function isBoilerplate(text) {
  if (!text) return true;
  return BOILERPLATE.some((re) => re.test(text.trim()));
}

function btDateToISO(str) {
  // DD/MM/YYYY → YYYY-MM-DD
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}

function buildDescription(raw, type) {
  // ATM
  if (/Retragere de numerar/i.test(raw)) return 'Retragere numerar ATM';

  // Rovinieta
  if (/Rovinieta/i.test(raw)) {
    const car = raw.match(/Numar masina\s+(\S+)/i);
    return car ? `Rovinieta ${car[1]}` : 'Rovinieta';
  }

  // Taxa interogare
  if (/Taxa interogare/i.test(raw)) return 'Taxa interogare sold';

  // BT 365 subscription
  if (/^365\b/i.test(raw) || /Abonament lunar PF/i.test(raw)) return 'Abonament BT 365';

  // Incasare OP — extract purpose from semicolon-separated fields
  if (/Incasare OP/i.test(raw)) {
    // Format: "C.I.F.:XXXXX;PURPOSE;NUMBER;COMPANY;..."
    const cifMatch = raw.match(/C\.I\.F\.[^;]*;([^;]+);/i);
    if (cifMatch) return cifMatch[1].trim().slice(0, 80);
    return raw.replace(/Incasare OP.*?canal electronic\s*/i, '').trim().slice(0, 80);
  }

  // POS payment — extract merchant name
  if (/Plata la POS/i.test(raw)) {
    // "POS DD/MM/YYYY TID:XXXXX MERCHANT CITY RO/ROM digits"
    const m = raw.match(/(?:EPOS|POS)\s+\S+\s+(?:TID[:\s]\S+\s+)?(.+?)\s+(?:RO|ROM)\s+\d/i);
    if (m) return cleanMerchant(m[1]);
    // Fallback: everything after "Plata la POS" up to first technical token
    const after = raw.replace(/Plata la POS(?:\s+non-BT cu card VISA)?/i, '').trim();
    const firstTech = after.search(/\b(POS|EPOS|TID|RRN|REF|comision|valoare)\b/i);
    if (firstTech > 0) return cleanMerchant(after.slice(0, firstTech));
    return cleanMerchant(after).slice(0, 60);
  }

  // Generic cleanup
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

function cleanMerchant(name) {
  return name
    .replace(/\s+(SRL|SA|S\.R\.L\.|S\.A\.|DISCOUNT|ROMANIA)\b/gi, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 60);
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function parseGeneric(pages) {
  const transactions = [];
  const text = pages.map((p) => p.map((i) => i.text).join(' ')).join('\n');
  for (const line of text.split('\n')) {
    const m = line.match(/(\d{2}[.\-/]\d{2}[.\-/]\d{4})\s+(.+?)\s+([\d.,]+)\s*(?:RON|EUR)?/i);
    if (!m) continue;
    const amount = parseAmount(m[3]);
    if (!amount || amount <= 0) continue;
    const description = m[2].trim();
    transactions.push({
      date: normalizeDate(m[1]),
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

function normalizeDate(str) {
  const dmy = str.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return str;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function parseStatement(file) {
  const pages = await extractTextFromPDF(file);
  const fullText = pages.map((p) => p.map((i) => i.text).join(' ')).join('\n');
  const bank = detectBank(fullText);

  let transactions = bank === 'BT' ? parseBT(pages) : parseGeneric(pages);

  console.log(`[Parser] bank=${bank}, found=${transactions.length}`);

  // Final dedup
  const seen = new Set();
  transactions = transactions.filter((tx) => {
    const key = `${tx.date}|${tx.amount}|${tx.description.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { bank, transactions, rawText: fullText, parsedAt: new Date().toISOString() };
}
