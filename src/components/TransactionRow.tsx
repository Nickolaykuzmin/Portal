import { formatCurrency, formatDate } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { useAppContext } from '../hooks/useAppContext';
import { resolveCategory } from '../utils/categoryHelpers';
import type { Transaction } from '../types';
import s from './TransactionRow.module.scss';

function cleanDisplayDesc(desc: string | undefined): string {
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

interface TransactionRowProps {
  transaction: Transaction;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
}

export default function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const { categories } = useCategories();
  const { displayCurrency, convertAmount } = useAppContext();
  const category = resolveCategory(transaction.category, categories);
  const displayDesc = cleanDisplayDesc(transaction.description);
  const displayAmount = convertAmount(transaction.amount || 0, transaction.currency || 'RON');

  const catBg = (category.color || '#737686') + '15';

  return (
    <tr className={s.row}>
      {/* Description */}
      <td className={s.cell}>
        <div className={s.descWrap}>
          <div className={s.iconChip} style={{ background: catBg }}>
            <span
              className={`material-symbols-outlined ${s.icon}`}
              style={{ color: category.color || '#737686' }}
            >
              {category.icon || 'category'}
            </span>
          </div>
          <div className={s.descText}>
            <div className={s.name}>{displayDesc}</div>
            <div className={s.bank}>{transaction.bank || 'BT'}</div>
          </div>
        </div>
      </td>

      {/* Date */}
      <td className={`hide-mobile ${s.dateCell}`}>
        {formatDate(transaction.date)}
      </td>

      {/* Category chip */}
      <td className={`hide-mobile ${s.cell}`}>
        <span
          className={s.categoryChip}
          style={{
            background: catBg,
            color: category.color || '#737686',
          }}
        >
          <span className={`material-symbols-outlined ${s.icon}`}>
            {category.icon || 'category'}
          </span>
          {category.name || 'Інше'}
        </span>
      </td>

      {/* Amount */}
      <td className={`${s.amountCell} ${transaction.type === 'income' ? s.income : s.expense}`}>
        <span className={`${s.amountPill} ${transaction.type === 'income' ? s.income : ''}`}>
          {transaction.type === 'income' ? '+' : '−'}{formatCurrency(displayAmount, displayCurrency)}
        </span>
      </td>

      {/* Actions */}
      <td className={s.actionsCell}>
        <div className={s.actions}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(transaction); }}
            title="Редагувати"
            className={s.editBtn}
          >
            <span className={`material-symbols-outlined ${s.icon}`}>edit</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(transaction); }}
            title="Видалити"
            className={s.deleteBtn}
          >
            <span className={`material-symbols-outlined ${s.icon}`}>delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
