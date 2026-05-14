// ─── Boilerplate patterns ─────────────────────────────────────────────────────
// Lines matching these patterns are skipped during parsing (headers, footers, etc.)

// ── BT Personal ──────────────────────────────────────────────────────────────

const BT_BOILERPLATE: RegExp[] = [
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

export function isBtBoilerplate(text: string): boolean {
  if (!text) return true;
  return BT_BOILERPLATE.some((re) => re.test(text.trim()));
}

// ── BT SRL ───────────────────────────────────────────────────────────────────

const SRL_BOILERPLATE: RegExp[] = [
  /^(BANCA TRANSILVANIA|Info clienti|Solicitant|Tiparit|Capitalul social)/i,
  /^(Registrul|R\.B\.|C\.U\.I\.|SWIFT|Tel\.|www\.|ro\/garantarea)/i,
  /^(Fondurile|Garantare a Depozitelor|Mai multe|311\/2015)/i,
  /^(Comisioanele aplicate|comision Transfond|comision BNR)/i,
  /^(Acest extras|24\/7|din aplicatiile)/i,
  /^(EXTRAS CONT|CONT 548|Valuta|Cod IBAN)/i,
  /^(Data\s+Descriere|Debit\s+Credit|Data$)/i,
  /^(SOLD ANTERIOR|SOLD FINAL|RULAJ ZI|RULAJ TOTAL|TOTAL DISPONIBIL)/i,
  /^(din care|Fonduri proprii|Credit neutilizat|SUME BLOCATE)/i,
  /^(La data curenta|aferenta tranzactiei)/i,
  /^(Comision plata OP|Comision incasare|Comision tranzactie)\b/i,
  /^-\s*\d+[.,]\d+\s*RON\s+aferenta/i,
  /^\d+\s*\/\s*\d+$/,
  /^(Client:|CUI:|Denumire|Adresa|Localitate|Judet|Tara)/i,
  /^(Nr\. Reg\.|Capital social|Cod fiscal)/i,
  /^(NICKONIX|Numarul:)/i,
  /^•\s*Capitalul social/i,
  /^$/,
];

export function isSrlBoilerplate(text: string): boolean {
  if (!text) return true;
  return SRL_BOILERPLATE.some((re) => re.test(text.trim()));
}

// ─── Transaction start patterns ───────────────────────────────────────────────

/** BT Personal: lines that start a new transaction block */
const BT_TX_START = /^(Plata la POS(?:\s+non-BT cu card VISA)?|Incasare OP|Retragere de numerar|Rovinieta|Taxa interogare|365\b|Round Up)/i;

export function isBtTxStart(desc: string): boolean {
  if (!desc) return false;
  return BT_TX_START.test(desc.trim());
}

/** BT SRL: lines that start a new transaction block */
const SRL_TX_START = /^(Plata la POS(?:\s+non-BT cu card VISA)?|Incasare OP|Plata OP\s+intra|Plata OP\s+inter|Plata OP\b|Retragere de numerar|Rovinieta|Taxa interogare|Taxa rapoarte|Nota contabila|365\b|Dobanda|Transfer intern|Plata salarii|Incasare factura)/i;

export function isSrlTxStart(desc: string): boolean {
  if (!desc) return false;
  return SRL_TX_START.test(desc.trim());
}

// ─── Skip patterns (blocks to discard after parsing) ──────────────────────────

const SRL_SKIP = /^(Comision plata OP|Comision incasare|Comision tranzactie)\b/i;

export function shouldSkipSrlBlock(desc: string): boolean {
  return SRL_SKIP.test(desc.trim());
}
