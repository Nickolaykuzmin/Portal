// ─── Auto-categorization ──────────────────────────────────────────────────────
// Maps transaction descriptions to category IDs.
// Order matters — first match wins.

export function autoCategory(description: string, type: string): string {
  // ── Income ────────────────────────────────────────────────────────────────
  if (type === 'income') {
    const d = description.toLowerCase();
    if (/salar|salary|wage|plata salarii/.test(d)) return 'salary';
    if (/dividend/.test(d)) return 'income';
    if (/incasare factura|incasare op/.test(d)) return 'income';
    return 'income';
  }

  const d = description.toLowerCase();

  // ── Taxes & fiscal payments (highest priority) ────────────────────────────
  if (
    /податки|asig\.?soc|fd\.?spec|impozit|tva|anaf|buget|bug\.|\/roc\/|\/rfb\/|cas\b|cass\b|contr\..*asig|sume din contr|d112|d100|d300/.test(d)
  ) return 'taxes';

  // ── SRL-specific ──────────────────────────────────────────────────────────
  if (/comision bancă|taxa rapoarte|nota contabila/.test(d)) return 'utilities';
  if (/dividende/.test(d)) return 'dividends';
  if (/salariu →|plata salariu|plata salarii/.test(d)) return 'salary';
  if (/restituire împrumut|imprumut/.test(d)) return 'other';
  if (/servicii —/.test(d)) return 'other';
  if (/keez\.ro|contabil|bookkeeping/.test(d)) return 'bookkeeping';

  // ── Food & restaurants ────────────────────────────────────────────────────
  if (/lidl|kaufland|carrefour|mega.?image|auchan|penny|profi|aliment|food|cicken|restaurant|cafe|coffee|mcdonald|kfc|pizza|burger|sushi|ko.asia|berezka|stefysia|nicoland|ice srl/.test(d)) return 'food';

  // ── Transport ─────────────────────────────────────────────────────────────
  if (/uber|bolt|taxi|metro|tram|bus|cfr|tarom|wizz|ryanair|mol |moll|rompetrol|omv|petrol|benzin|rovinieta|parking|parcare|auto.clean|metropolitan.self/.test(d)) return 'transport';

  // ── Shopping ──────────────────────────────────────────────────────────────
  if (/amazon|emag|altex|flanco|zara|h&m|sinsay|lc.waikiki|set.colosseum|fashion|shop|mall|ikea|rituals|premium.vaping|vaping|mihaela.flowers|flowers/.test(d)) return 'shopping';

  // ── Utilities & subscriptions ─────────────────────────────────────────────
  if (/enel|electrica|gaz|apa|canal|internet|telekom|orange|vodafone|digi|utilit|365|abonament/.test(d)) return 'utilities';

  // ── Health ────────────────────────────────────────────────────────────────
  if (/farmacie|pharmacy|doctor|spital|hospital|medical|sanatate/.test(d)) return 'health';

  // ── Entertainment ─────────────────────────────────────────────────────────
  if (/netflix|spotify|cinema|theater|gaming|beauty.salon|salon|spa/.test(d)) return 'entertainment';

  // ── Travel ────────────────────────────────────────────────────────────────
  if (/hotel|airbnb|booking|flight|zbor|vacanta|travel|turism/.test(d)) return 'travel';

  // ── Education ─────────────────────────────────────────────────────────────
  if (/scoala|school|universitate|university|curs|course/.test(d)) return 'education';

  // ── Bank fees ─────────────────────────────────────────────────────────────
  if (/taxa|comision|interogare/.test(d)) return 'utilities';

  // ── Cash ──────────────────────────────────────────────────────────────────
  if (/atm|retragere|numerar/.test(d)) return 'cash';

  // ── Fallback ──────────────────────────────────────────────────────────────
  if (/plata salarii/.test(d)) return 'salary';
  if (/plata op/.test(d)) return 'other';
  return 'other';
}
