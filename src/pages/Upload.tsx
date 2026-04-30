import { useState, useRef } from 'react';
import { parseStatement, autoCategory } from '../utils/pdfParser';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency, formatDate } from '../utils/formatters';
import TopBar from '../components/TopBar';
import CashSplitModal from '../components/CashSplitModal';
import type { NewTransaction, MergeResult, ParseResult, CashSplitItem } from '../types';
import s from './Upload.module.scss';

const STEPS = ['upload', 'preview', 'done'] as const;
type Step = typeof STEPS[number];

interface UploadProps {
  onMenuClick?: () => void;
}

export default function Upload({ onMenuClick }: UploadProps) {
  const { addTransactions, mergeTransactions } = useTransactions();
  const { categories } = useCategories();
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [saveMode, setSaveMode] = useState<'merge' | 'all'>('merge');
  const [cashSplitIdx, setCashSplitIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null | undefined) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Будь ласка, завантажте PDF файл.');
      return;
    }
    setError(null);
    setParsing(true);
    try {
      const result = await parseStatement(file);
      setParseResult(result);
      setSelected(result.transactions.map((_, i) => i));
      setStep('preview');
    } catch (e) {
      console.error(e);
      setError('Помилка при обробці PDF. Спробуйте інший файл.');
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSave = async () => {
    if (!parseResult) return;
    setSaving(true);
    try {
      const toSave = parseResult.transactions.filter((_, i) => selected.includes(i));
      if (saveMode === 'merge') {
        const result = await mergeTransactions(toSave);
        setMergeResult(result);
      } else {
        await addTransactions(toSave);
        setMergeResult({ added: toSave.length, skipped: 0 });
      }
      setStep('done');
    } catch (e) {
      setError('Помилка збереження: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  };

  const updateCategory = (i: number, catId: string) => {
    setParseResult((prev) =>
      prev
        ? {
            ...prev,
            transactions: prev.transactions.map((tx, idx) =>
              idx === i ? { ...tx, category: catId } : tx,
            ),
          }
        : prev,
    );
  };

  const updateType = (i: number, type: NewTransaction['type']) => {
    setParseResult((prev) =>
      prev
        ? {
            ...prev,
            transactions: prev.transactions.map((tx, idx) =>
              idx === i ? { ...tx, type, category: autoCategory(tx.description, type) } : tx,
            ),
          }
        : prev,
    );
  };

  const handleCashSplit = (idx: number, items: CashSplitItem[]) => {
    if (!parseResult) return;
    const original = parseResult.transactions[idx];
    if (!original) return;

    const splitTxs: NewTransaction[] = items.map((item) => ({
      date: original.date,
      description: item.description,
      amount: item.amount,
      type: item.type,
      category: item.category,
      currency: original.currency,
      bank: original.bank,
      source: 'cash_split',
    }));

    const newTransactions = [
      ...parseResult.transactions.slice(0, idx),
      ...splitTxs,
      ...parseResult.transactions.slice(idx + 1),
    ];

    const delta = splitTxs.length - 1;
    setSelected((prev) => {
      const before = prev.filter((i) => i < idx);
      const after = prev.filter((i) => i > idx).map((i) => i + delta);
      const newIdxs = splitTxs.map((_, k) => idx + k);
      return [...before, ...newIdxs, ...after];
    });

    setParseResult({ ...parseResult, transactions: newTransactions });
    setCashSplitIdx(null);
  };

  return (
    <>
      <TopBar title="Завантажити Statement" onMenuClick={onMenuClick} />
      <div className={s.page}>

        {/* Step indicator */}
        <div className={s.steps}>
          {[
            { key: 'upload',  label: '1. Файл' },
            { key: 'preview', label: '2. Перегляд' },
            { key: 'done',    label: '3. Готово' },
          ].map((step_item, i) => {
            const stepIdx = STEPS.indexOf(step as Step);
            const isDone   = stepIdx > i;
            const isActive = step === step_item.key;
            return (
              <div key={step_item.key} className={s.stepItem}>
                <div
                  className={s.stepCircle}
                  style={{
                    background: isActive
                      ? 'var(--primary)'
                      : isDone
                      ? 'var(--secondary)'
                      : 'var(--surface-container)',
                    color: stepIdx >= i ? 'white' : 'var(--on-surface-variant)',
                  }}
                >
                  {isDone
                    ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                    : i + 1}
                </div>
                <span
                  className={s.stepLabel}
                  style={{ color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)' }}
                >
                  {step_item.label}
                </span>
                {i < 2 && <span className={s.stepArrow}>→</span>}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`${s.dropZone}${dragging ? ` ${s.dragging}` : ''}`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {parsing ? (
                <div>
                  <span className={`material-symbols-outlined ${s.dropIcon}`}>hourglass_top</span>
                  <p className={s.dropTitle}>Обробка PDF...</p>
                  <p className={s.dropSub}>Витягуємо транзакції з документу</p>
                </div>
              ) : (
                <div>
                  <span className={`material-symbols-outlined ${s.dropIcon}`}>upload_file</span>
                  <p className={s.dropTitle}>Перетягніть PDF або натисніть для вибору</p>
                  <p className={s.dropSub}>
                    Підтримуються виписки BCR, BRD, ING, Raiffeisen, Banca Transilvania
                  </p>
                  <div className={s.chooseBtn}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>folder_open</span>
                    Вибрати файл
                  </div>
                </div>
              )}
            </div>

            {error && <div className={s.error}>⚠️ {error}</div>}

            <div className={`whisper-shadow ${s.banksCard}`}>
              <h3>Підтримувані банки Румунії</h3>
              <div className={s.banksGrid}>
                {['BCR', 'BRD', 'ING Bank', 'Raiffeisen', 'Banca Transilvania', 'UniCredit'].map((bank) => (
                  <div key={bank} className={s.bankItem}>
                    <span className={`material-symbols-outlined ${s.icon}`}>account_balance</span>
                    <span>{bank}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === 'preview' && parseResult && (
          <div>
            <div className={s.previewBar}>
              <div className={s.previewStats}>
                {[
                  { label: 'Банк',     value: parseResult.bank },
                  { label: 'Знайдено', value: `${parseResult.transactions.length} транзакцій` },
                  { label: 'Вибрано',  value: String(selected.length) },
                ].map(({ label, value }) => (
                  <div key={label} className={s.previewStat}>
                    <div className={s.statLabel}>{label}</div>
                    <div className={s.statValue}>{value}</div>
                  </div>
                ))}
              </div>
              <div className={s.previewActions}>
                <button
                  onClick={() => setSelected(parseResult.transactions.map((_, i) => i))}
                  className={s.outlineBtn}
                >
                  Вибрати всі
                </button>
                <button onClick={() => setSelected([])} className={s.outlineBtn}>
                  Зняти всі
                </button>
              </div>
            </div>

            {parseResult.transactions.length === 0 ? (
              <div className={s.emptyState}>
                <span className={`material-symbols-outlined ${s.icon}`}>search_off</span>
                <p>Транзакції не знайдено</p>
                <button onClick={() => setStep('upload')}>Спробувати інший файл</button>
              </div>
            ) : (
              <>
                <div className={`whisper-shadow ${s.tableWrap}`}>
                  <table className={s.table}>
                    <thead className={s.thead}>
                      <tr>
                        {['', 'Опис', 'Дата', 'Тип', 'Категорія', 'Сума'].map((h, i) => (
                          <th key={i} className={`${s.th}${h === 'Сума' ? ` ${s.right}` : ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.transactions.map((tx, i) => {
                        const isAtm = tx.isCashWithdrawal === true;
                        const isSelected = selected.includes(i);
                        return (
                          <tr
                            key={i}
                            className={`${s.tr} ${
                              isAtm
                                ? s.atm
                                : isSelected
                                ? s.selected
                                : s.unselected
                            }${!isSelected ? ` ${s.deselected}` : ''}`}
                          >
                            <td className={s.td}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(i)}
                                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
                              />
                            </td>
                            <td className={s.td}>
                              <div className={s.descCell}>
                                {isAtm && (
                                  <span className={`material-symbols-outlined ${s.atmIcon}`}>
                                    payments
                                  </span>
                                )}
                                <div className={s.descText}>{tx.description}</div>
                              </div>
                            </td>
                            <td className={s.td}>
                              <span className={s.dateText}>{formatDate(tx.date)}</span>
                            </td>
                            <td className={s.td}>
                              {isAtm ? (
                                <span className={s.cashBadge}>Готівка</span>
                              ) : (
                                <select
                                  value={tx.type}
                                  onChange={(e) => updateType(i, e.target.value as NewTransaction['type'])}
                                  className={`${s.typeSelect} ${tx.type === 'income' ? s.income : s.expense}`}
                                >
                                  <option value="expense">Витрата</option>
                                  <option value="income">Дохід</option>
                                </select>
                              )}
                            </td>
                            <td className={s.td}>
                              {isAtm ? (
                                <button
                                  onClick={() => setCashSplitIdx(i)}
                                  className={s.splitBtn}
                                >
                                  <span className={`material-symbols-outlined ${s.icon}`}>call_split</span>
                                  Розбити
                                </button>
                              ) : (
                                <select
                                  value={tx.category}
                                  onChange={(e) => updateCategory(i, e.target.value)}
                                  className={s.categorySelect}
                                >
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className={`${s.td} ${s.amountCell} ${tx.type === 'income' ? s.income : s.expense}`}>
                              {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {error && <div className={s.error} style={{ marginBottom: 16 }}>⚠️ {error}</div>}

                <div className={s.saveBar}>
                  <div className={s.modeBar}>
                    <span className={`material-symbols-outlined ${s.infoIcon}`}>info</span>
                    <span className={s.modeLabel}>Режим:</span>
                    {([
                      { key: 'merge' as const, label: 'Оновити (без дублів)', icon: 'merge' },
                      { key: 'all'   as const, label: 'Додати всі',           icon: 'add_circle' },
                    ]).map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setSaveMode(m.key)}
                        className={`${s.modeBtn}${saveMode === m.key ? ` ${s.active}` : ''}`}
                      >
                        <span className={`material-symbols-outlined ${s.icon}`}>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className={s.saveActions}>
                    <button
                      onClick={() => { setStep('upload'); setParseResult(null); }}
                      className={s.backBtn}
                    >
                      ← Назад
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || selected.length === 0}
                      className={s.saveBtn}
                    >
                      {saving ? (
                        <>
                          <span className={`material-symbols-outlined ${s.icon}`}>hourglass_top</span>
                          Збереження...
                        </>
                      ) : (
                        <>
                          <span className={`material-symbols-outlined ${s.icon}`}>
                            {saveMode === 'merge' ? 'merge' : 'save'}
                          </span>
                          {saveMode === 'merge'
                            ? `Оновити (${selected.length})`
                            : `Зберегти ${selected.length}`}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 'done' && (
          <div className={s.doneWrap}>
            <div className={s.doneIcon}>
              <span className={`material-symbols-outlined ${s.icon}`}>check_circle</span>
            </div>
            <h2 className={s.doneTitle}>Успішно збережено!</h2>

            {mergeResult && (
              <div className={s.mergeStats}>
                <div className={`${s.mergeStat} ${s.added}`}>
                  <div className={s.count}>+{mergeResult.added}</div>
                  <div className={s.label}>нових додано</div>
                </div>
                {mergeResult.skipped > 0 && (
                  <div className={`${s.mergeStat} ${s.skipped}`}>
                    <div className={s.count}>{mergeResult.skipped}</div>
                    <div className={s.label}>вже існували</div>
                  </div>
                )}
              </div>
            )}

            <p className={s.doneSub}>
              {mergeResult?.skipped
                ? `${mergeResult.skipped} транзакцій пропущено — вони вже були в базі`
                : 'Всі транзакції успішно додано'}
            </p>

            <div className={s.doneActions}>
              <button
                onClick={() => {
                  setStep('upload');
                  setParseResult(null);
                  setSelected([]);
                  setMergeResult(null);
                }}
                className={s.doneBackBtn}
              >
                Завантажити ще
              </button>
              <a href="/transactions" className={s.doneLinkBtn}>
                Переглянути транзакції →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Cash split modal */}
      {cashSplitIdx !== null && parseResult && (() => {
        const tx = parseResult.transactions[cashSplitIdx];
        if (!tx) return null;
        return (
          <CashSplitModal
            totalAmount={tx.amount}
            currency={tx.currency}
            date={tx.date}
            onSave={(items) => handleCashSplit(cashSplitIdx, items)}
            onClose={() => setCashSplitIdx(null)}
          />
        );
      })()}
    </>
  );
}
