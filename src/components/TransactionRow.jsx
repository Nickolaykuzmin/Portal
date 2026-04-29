import { useState } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { useAppContext } from '../context/AppContext';
import { resolveCategory } from '../utils/categoryHelpers';

// Clean up raw BT description for display
function cleanDisplayDesc(desc) {
  if (!desc) return '—';
  return desc
    .replace(/^cu card VISA\s+/i, '')
    .replace(/^Plata la POS(?:\s+non-BT cu card VISA)?\s*/i, '')
    .replace(/^Incasare OP\s*-?\s*canal electronic\s*/i, '')
    .replace(/POS\s+\d{2}\/\d{2}\/\d{4}\s+/gi, '')
    .replace(/EPOS\s+\d{2}\/\d{2}\/\d{4}\s+/gi, '')
    .replace(/TID[:\s]\S+\s*/gi, '')
    .replace(/RRN[:\s]\S+\s*/gi, '')
    .replace(/REF[:\s]\S+\s*/gi, '')
    .replace(/\d{8,}\s*/g, '')
    .replace(/\s+(RO|ROM)\s+\d+/gi, '')
    .replace(/comision tranzactie[\d\s.,RON]+/gi, '')
    .replace(/valoare tranzactie[\d\s.,RON]+/gi, '')
    .replace(/C\.I\.F\.[^;]+;/gi, '')
    .replace(/RO\d{2}BTR\S+/gi, '')
    .replace(/BTRLRO22/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 55);
}

export default function TransactionRow({ transaction, onEdit, onDelete }) {
  const { categories } = useCategories();
  const { displayCurrency, convertAmount } = useAppContext();
  const [hovered, setHovered] = useState(false);
  const category = resolveCategory(transaction.category, categories);
  const displayDesc = cleanDisplayDesc(transaction.description);
  const displayAmount = convertAmount(transaction.amount || 0, transaction.currency || 'RON');

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--outline-variant)',
        background: hovered ? 'var(--surface-container-low)' : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      {/* Description */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: (category.color || '#737686') + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 18,
              color: category.color || '#737686',
              fontVariationSettings: "'FILL' 1",
            }}>
              {category.icon || 'category'}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--on-surface)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: 260,
            }}>
              {displayDesc}
            </div>
            <div style={{ fontSize: 11, color: 'var(--outline)', marginTop: 1 }}>
              {transaction.bank || 'BT'}
            </div>
          </div>
        </div>
      </td>

      {/* Date */}
      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
        {formatDate(transaction.date)}
      </td>

      {/* Category chip */}
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20,
          fontSize: 11, fontWeight: 600,
          background: (category.color || '#737686') + '15',
          color: category.color || '#737686',
          whiteSpace: 'nowrap',
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 12,
            fontVariationSettings: "'FILL' 1",
          }}>
            {category.icon || 'category'}
          </span>
          {category.name || 'Інше'}
        </span>
      </td>

      {/* Amount */}
      <td style={{
        padding: '12px 16px', textAlign: 'right',
        fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
        color: transaction.type === 'income' ? 'var(--secondary)' : 'var(--on-surface)',
      }}>
        <span style={{
          padding: '3px 8px', borderRadius: 8,
          background: transaction.type === 'income' ? '#dcfce7' : 'transparent',
        }}>
          {transaction.type === 'income' ? '+' : '−'}{formatCurrency(displayAmount, displayCurrency)}
        </span>
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(transaction); }}
            title="Редагувати"
            style={{
              background: 'var(--surface-container)',
              border: 'none', cursor: 'pointer',
              padding: '5px', borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--on-surface-variant)' }}>edit</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(transaction); }}
            title="Видалити"
            style={{
              background: 'var(--error-container)',
              border: 'none', cursor: 'pointer',
              padding: '5px', borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--error)' }}>delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
