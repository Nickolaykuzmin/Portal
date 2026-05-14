import { cleanMerchant } from './helpers';

// ─── BT Personal: description builder ────────────────────────────────────────

export function buildBtDescription(raw: string, type: string): string {
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

// ─── BT SRL: description builder ─────────────────────────────────────────────

export function buildSrlDescription(raw: string, type: string): string {
  // Tax / fiscal payments — /ROC/ or /RFB/ routing codes, or fiscal keywords
  if (/\/roc\/|\/rfb\/|asig\.?soc|fd\.?spec|bug\.|impozit|contr\..*asig|sume din contr/i.test(raw)) {
    return buildTaxDescription(raw);
  }

  // Bank fee / report charge
  if (/Nota contabila|Taxa rapoarte/i.test(raw)) {
    const detail = raw.replace(/Nota contabila individuala\s*/i, '')
                      .replace(/REF:\s*\S+/gi, '')
                      .trim();
    return detail ? `Comision bancă — ${detail.slice(0, 60)}` : 'Comision bancă';
  }

  // Salary payment (outgoing)
  if (/Plata salarii/i.test(raw)) return 'Plata salarii';

  // Intra-bank OP (same bank transfers)
  if (/Plata OP\s+intra/i.test(raw)) {
    if (/Dividende/i.test(raw)) {
      const to = raw.match(/;\s*([^;]+?)\s*;RO\d{2}BTR/i);
      return to ? `Dividende → ${(to[1] ?? '').trim()}` : 'Dividende nete';
    }
    if (/salariu/i.test(raw)) {
      const to = raw.match(/;\s*([^;]+?)\s*;RO\d{2}BTR/i);
      return to ? `Salariu → ${(to[1] ?? '').trim()}` : 'Plata salariu';
    }
    if (/imprumut|restituire/i.test(raw)) {
      const to = raw.match(/;\s*([^;]+?)\s*;RO\d{2}BTR/i);
      return to ? `Restituire împrumut → ${(to[1] ?? '').trim()}` : 'Restituire împrumut';
    }
    const body = raw.replace(/Plata OP\s+intra\s*-\s*canal electronic\s*/i, '')
                    .replace(/;RO\d{2}[A-Z]+\S+/gi, '')
                    .replace(/;BTR[A-Z0-9]+/gi, '')
                    .replace(/REF:\s*\S+/gi, '')
                    .replace(/;+/g, ' ')
                    .trim();
    return body.slice(0, 80) || 'Plata OP intra';
  }

  // Inter-bank OP (different bank)
  if (/Plata OP\s+inter/i.test(raw)) {
    if (/\/roc\/.*servicii/i.test(raw)) {
      const detail = raw.replace(/\/ROC\/[^;]*/gi, '')
                        .replace(/;[A-Z0-9]{8,};/g, ';')
                        .replace(/;RO\d{2}[A-Z]+\S+/gi, '')
                        .replace(/REF:\s*\S+/gi, '')
                        .replace(/;+/g, ' ')
                        .trim();
      return detail ? `Servicii — ${detail.slice(0, 60)}` : 'Plata servicii';
    }
    const body = raw.replace(/Plata OP\s+inter\s*-\s*canal electronic\s*/i, '')
                    .replace(/;RO\d{2}[A-Z]+\S+/gi, '')
                    .replace(/REF:\s*\S+/gi, '')
                    .replace(/;+/g, ' ')
                    .trim();
    return body.slice(0, 80) || 'Plata OP inter';
  }

  // Generic OP payment
  if (/Plata OP/i.test(raw)) {
    const beneficiary = raw.match(/(?:Beneficiar|catre)[:\s]+([^;]+)/i);
    if (beneficiary) return `Plata OP – ${(beneficiary[1] ?? '').trim().slice(0, 60)}`;
    return raw.replace(/Plata OP.*?canal electronic\s*/i, '').trim().slice(0, 80);
  }

  // OP income
  if (/Incasare OP/i.test(raw)) {
    const cifMatch = raw.match(/C\.I\.F\.[^;]*;([^;]+);/i);
    if (cifMatch) return (cifMatch[1] ?? '').trim().slice(0, 80);
    const rocMatch = raw.match(/\/ROC\/[^;]*;([^;]+);RO\d{2}/i);
    if (rocMatch) return (rocMatch[1] ?? '').trim().slice(0, 80);
    return raw.replace(/Incasare OP.*?canal electronic\s*/i, '').trim().slice(0, 80);
  }

  // Invoice collection
  if (/Incasare factura/i.test(raw)) {
    const inv = raw.match(/factura\s+(\S+)/i);
    return inv ? `Incasare factura ${inv[1]}` : 'Incasare factura';
  }

  // Fallback to shared BT description builder
  return buildBtDescription(raw, type);
}

// ─── Tax description builder ──────────────────────────────────────────────────
// Converts Romanian fiscal OP descriptions into readable labels.

function buildTaxDescription(raw: string): string {
  const cleaned = raw
    .replace(/\/ROC\/[^;]*;/gi, '')
    .replace(/\/RFB\/[^;]*/gi, '')
    .replace(/^[;/\s]+/, '')
    .trim();

  const segment = cleaned.split(';')[0]?.trim() ?? cleaned;
  const s = segment.toUpperCase();

  if (/ASIG\.?SOC/.test(s) && /FD\.?SPEC/.test(s)) {
    return `Податки — CAS + Fond Special${extractFiscalPeriod(segment)}`;
  }
  if (/CONTR\.?\s*ASIG\.?\s*(PT\.?)?\s*MUNCA/i.test(s)) {
    return `Податки — CAM (contr. asig. muncă)${extractFiscalPeriod(segment)}`;
  }
  if (/ASIG\.?SOC/.test(s)) {
    return `Податки — CAS (asig. sociale)${extractFiscalPeriod(segment)}`;
  }
  if (/FD\.?SPEC/.test(s)) {
    return `Податки — Fond Special${extractFiscalPeriod(segment)}`;
  }
  if (/IMPOZIT.SALARII/.test(s)) {
    return `Податки — Impozit salarii${extractFiscalPeriod(segment)}`;
  }
  if (/IMPOZIT.VENIT/.test(s)) {
    return `Податки — Impozit venit (micro 1%)${extractFiscalPeriod(segment)}`;
  }
  if (/IMPOZIT.PROFIT/.test(s)) {
    return `Податки — Impozit profit${extractFiscalPeriod(segment)}`;
  }
  if (/\bTVA\b/.test(s)) {
    return `Податки — TVA${extractFiscalPeriod(segment)}`;
  }
  if (/\bCASS\b/.test(s)) {
    return `Податки — CASS${extractFiscalPeriod(segment)}`;
  }
  if (/\bCAS\b/.test(s)) {
    return `Податки — CAS${extractFiscalPeriod(segment)}`;
  }
  if (/BUG\./.test(s) || /BUGET/.test(s)) {
    return `Податки — Buget stat${extractFiscalPeriod(segment)}`;
  }

  return `Податки — ${segment.slice(0, 60)}`;
}

function extractFiscalPeriod(text: string): string {
  const monthly = text.match(/\b(\d{1,2})[.\-/](\d{4})\b/);
  if (monthly) {
    const month = parseInt(monthly[1] ?? '0', 10);
    const year  = monthly[2] ?? '';
    const monthName = new Date(parseInt(year), month - 1, 1)
      .toLocaleDateString('uk-UA', { month: 'long' });
    return ` (${monthName} ${year})`;
  }
  const quarterly = text.match(/TRIM(?:ESTRU)?\s*(\d)\s+(\d{4})/i);
  if (quarterly) return ` (T${quarterly[1]} ${quarterly[2]})`;
  const year = text.match(/\b(20\d{2})\b/);
  if (year) return ` (${year[1]})`;
  return '';
}
