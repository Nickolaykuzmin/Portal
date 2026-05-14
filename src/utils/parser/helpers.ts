import type { PdfTextItem } from './types';

// ─── Group PDF text items by Y coordinate (same line) ─────────────────────────

export function groupByY(items: PdfTextItem[], tolerance = 2): PdfTextItem[][] {
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

// ─── Amount parser ────────────────────────────────────────────────────────────
// Handles Romanian (7,833.33), European (1.234,56), simple (50.09 / 50,09)

export function parseAmount(str: string | null | undefined): number | null {
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

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Convert BT date format (DD/MM/YYYY) to ISO (YYYY-MM-DD) */
export function btDateToISO(str: string): string {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}

/** Normalize any DD.MM.YYYY or DD/MM/YYYY to ISO */
export function normalizeDate(str: string): string {
  const dmy = str.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return str;
}

// ─── Merchant name cleaner ────────────────────────────────────────────────────

export function cleanMerchant(name: string): string {
  return name
    .replace(/\s+(SRL|SA|S\.R\.L\.|S\.A\.|DISCOUNT|ROMANIA)\b/gi, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 60);
}
