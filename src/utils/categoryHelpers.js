import { DEFAULT_CATEGORIES } from '../utils/defaultCategories';

// Icon fallbacks per category id — covers any id that might come from the parser
const ICON_MAP = {
  income:        { icon: 'payments',       color: '#006c49' },
  salary:        { icon: 'work',           color: '#006c49' },
  food:          { icon: 'restaurant',     color: '#ea580c' },
  transport:     { icon: 'commute',        color: '#2563eb' },
  shopping:      { icon: 'shopping_bag',   color: '#7c3aed' },
  utilities:     { icon: 'bolt',           color: '#d97706' },
  health:        { icon: 'local_hospital', color: '#dc2626' },
  entertainment: { icon: 'movie',          color: '#db2777' },
  travel:        { icon: 'flight',         color: '#0891b2' },
  education:     { icon: 'school',         color: '#059669' },
  cash:          { icon: 'payments',       color: '#64748b' },
  other:         { icon: 'category',       color: '#737686' },
};

const FALLBACK = { icon: 'category', color: '#737686', name: 'Інше' };

/**
 * Find a category by id from the live categories list.
 * Falls back to ICON_MAP, then DEFAULT_CATEGORIES, then FALLBACK.
 * Never returns undefined.
 */
export function resolveCategory(id, categories = []) {
  if (!id) return FALLBACK;

  // 1. Live Firestore categories (user may have renamed/recolored)
  const live = categories.find((c) => c.id === id);
  if (live) return live;

  // 2. Static DEFAULT_CATEGORIES (in case Firestore hasn't loaded yet)
  const def = DEFAULT_CATEGORIES.find((c) => c.id === id);
  if (def) return def;

  // 3. Icon map only (no name)
  const mapped = ICON_MAP[id];
  if (mapped) return { id, name: id, ...mapped };

  // 4. Hard fallback
  return { id, name: id, ...FALLBACK };
}
