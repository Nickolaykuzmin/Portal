import { useState, useRef } from 'react';
import { parseStatement, autoCategory } from '../utils/pdfParser';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency, formatDate } from '../utils/formatters';
import TopBar from '../components/TopBar';

const STEPS = ['upload', 'preview', 'done'];

export default function Upload() {
  const { addTransactions, mergeTransactions } = useTransactions();
  const { categories } = useCategories();
  const [step, setStep] = useState('upload');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [mergeResult, setMergeResult] = useState(null); // { added, skipped }
  const [saveMode, setSaveMode] = useState('merge'); // 'merge' | 'all'
  const fileRef = useRef();

  const handleFile = async (file) => {
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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
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
      setError('Помилка збереження: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (i) => {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const updateCategory = (i, catId) => {
    setParseResult((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx, idx) =>
        idx === i ? { ...tx, category: catId } : tx
      ),
    }));
  };

  const updateType = (i, type) => {
    setParseResult((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx, idx) =>
        idx === i ? { ...tx, type } : tx
      ),
    }));
  };

  return (
    <>
      <TopBar title="Завантажити Statement" />
      <div style={{ padding: '80px 32px 32px', maxWidth: 900, margin: '0 auto' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          {[
            { key: 'upload', label: '1. Файл' },
            { key: 'preview', label: '2. Перегляд' },
            { key: 'done', label: '3. Готово' },
          ].map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step === s.key ? 'var(--primary)' :
                  STEPS.indexOf(step) > i ? 'var(--secondary)' : 'var(--surface-container)',
                color: STEPS.indexOf(step) >= i ? 'white' : 'var(--on-surface-variant)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}>
                {STEPS.indexOf(step) > i
                  ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                  : i + 1}
              </div>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: step === s.key ? 'var(--primary)' : 'var(--on-surface-variant)',
              }}>
                {s.label}
              </span>
              {i < 2 && <span style={{ color: 'var(--outline-variant)', margin: '0 4px' }}>→</span>}
            </div>
          ))}
        </div>

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--outline-variant)'}`,
                borderRadius: 20,
                padding: '60px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? 'var(--surface-container-low)' : 'white',
                transition: 'all 0.2s',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {parsing ? (
                <div>
                  <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--primary)', display: 'block', marginBottom: 16 }}>
                    hourglass_top
                  </span>
                  <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--on-surface)', margin: '0 0 8px' }}>
                    Обробка PDF...
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', margin: 0 }}>
                    Витягуємо транзакції з документу
                  </p>
                </div>
              ) : (
                <div>
                  <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--primary)', display: 'block', marginBottom: 16 }}>
                    upload_file
                  </span>
                  <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--on-surface)', margin: '0 0 8px' }}>
                    Перетягніть PDF або натисніть для вибору
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', margin: '0 0 24px' }}>
                    Підтримуються виписки BCR, BRD, ING, Raiffeisen, Banca Transilvania
                  </p>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', borderRadius: 12,
                    background: 'var(--primary)', color: 'white',
                    fontWeight: 600, fontSize: 14,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>folder_open</span>
                    Вибрати файл
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 10,
                background: 'var(--error-container)', color: 'var(--error)',
                fontSize: 14, fontWeight: 500,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Supported banks info */}
            <div className="whisper-shadow" style={{ background: 'white', borderRadius: 16, padding: 24, marginTop: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontFamily: 'Manrope', fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>
                Підтримувані банки Румунії
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {['BCR', 'BRD', 'ING Bank', 'Raiffeisen', 'Banca Transilvania', 'UniCredit'].map((bank) => (
                  <div key={bank} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--surface-container-low)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>account_balance</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{bank}</span>
                  </div>
                ))}
              </div>
              <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--outline)' }}>
                💡 Якщо ваш банк не розпізнається автоматично — транзакції все одно будуть витягнуті за загальним алгоритмом.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === 'preview' && parseResult && (
          <div>
            {/* Info bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'white', borderRadius: 12, padding: '14px 20px',
              border: '1px solid var(--outline-variant)', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Банк
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>{parseResult.bank}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Знайдено
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>
                    {parseResult.transactions.length} транзакцій
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Вибрано
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{selected.length}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setSelected(parseResult.transactions.map((_, i) => i))}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--outline-variant)',
                    background: 'white', color: 'var(--on-surface)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Вибрати всі
                </button>
                <button
                  onClick={() => setSelected([])}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--outline-variant)',
                    background: 'white', color: 'var(--on-surface)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Зняти всі
                </button>
              </div>
            </div>

            {parseResult.transactions.length === 0 ? (
              <div style={{
                background: 'white', borderRadius: 16, padding: 48, textAlign: 'center',
                border: '1px solid var(--outline-variant)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--outline-variant)', display: 'block', marginBottom: 12 }}>
                  search_off
                </span>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', margin: '0 0 8px' }}>
                  Транзакції не знайдено
                </p>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', margin: '0 0 20px' }}>
                  PDF не містить розпізнаних транзакцій. Можливо, формат не підтримується.
                </p>
                <button
                  onClick={() => setStep('upload')}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Спробувати інший файл
                </button>
              </div>
            ) : (
              <>
                <div className="whisper-shadow" style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)' }}>
                        <th style={{ padding: '10px 16px', width: 40 }}></th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Опис</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Дата</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Тип</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Категорія</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Сума</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.transactions.map((tx, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid var(--outline-variant)',
                            opacity: selected.includes(i) ? 1 : 0.4,
                            background: selected.includes(i) ? 'white' : 'var(--surface-container-low)',
                          }}
                        >
                          <td style={{ padding: '10px 16px' }}>
                            <input
                              type="checkbox"
                              checked={selected.includes(i)}
                              onChange={() => toggleSelect(i)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: 'var(--on-surface)', maxWidth: 240 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.description}
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--on-surface-variant)' }}>
                            {formatDate(tx.date)}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <select
                              value={tx.type}
                              onChange={(e) => updateType(i, e.target.value)}
                              style={{
                                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--outline-variant)',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
                                color: tx.type === 'income' ? 'var(--secondary)' : 'var(--tertiary)',
                                background: tx.type === 'income' ? '#dcfce7' : '#fee2e2',
                              }}
                            >
                              <option value="expense">Витрата</option>
                              <option value="income">Дохід</option>
                            </select>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <select
                              value={tx.category}
                              onChange={(e) => updateCategory(i, e.target.value)}
                              style={{
                                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--outline-variant)',
                                fontSize: 12, cursor: 'pointer', outline: 'none', background: 'white',
                              }}
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{
                            padding: '10px 16px', textAlign: 'right',
                            fontSize: 14, fontWeight: 700,
                            color: tx.type === 'income' ? 'var(--secondary)' : 'var(--on-surface)',
                          }}>
                            {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, tx.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {error && (
                  <div style={{
                    marginBottom: 16, padding: '12px 16px', borderRadius: 10,
                    background: 'var(--error-container)', color: 'var(--error)', fontSize: 14,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Save mode toggle */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--surface-container-low)', borderRadius: 10,
                    padding: '8px 14px', border: '1px solid var(--outline-variant)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--outline)' }}>info</span>
                    <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 500 }}>Режим:</span>
                    {[
                      { key: 'merge', label: 'Оновити (без дублів)', icon: 'merge' },
                      { key: 'all',   label: 'Додати всі',           icon: 'add_circle' },
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setSaveMode(m.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 12px', borderRadius: 8, border: '1px solid',
                          borderColor: saveMode === m.key ? 'var(--primary)' : 'var(--outline-variant)',
                          background: saveMode === m.key ? 'var(--primary)' : 'white',
                          color: saveMode === m.key ? 'white' : 'var(--on-surface-variant)',
                          fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => { setStep('upload'); setParseResult(null); }}
                      style={{
                        padding: '12px 24px', borderRadius: 12, border: '1px solid var(--outline-variant)',
                        background: 'white', color: 'var(--on-surface)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      ← Назад
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || selected.length === 0}
                      style={{
                        padding: '12px 28px', borderRadius: 12, border: 'none',
                        background: selected.length === 0 ? 'var(--outline-variant)' : 'var(--primary)',
                        color: 'white', fontWeight: 600, fontSize: 14, cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      {saving ? (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>hourglass_top</span>
                          Збереження...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            {saveMode === 'merge' ? 'merge' : 'save'}
                          </span>
                          {saveMode === 'merge' ? `Оновити (${selected.length})` : `Зберегти ${selected.length}`}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 3: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--secondary)', fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h2 style={{ fontFamily: 'Manrope', fontSize: 24, fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 12px' }}>
              Успішно збережено!
            </h2>

            {/* Merge result stats */}
            {mergeResult && (
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '0 0 24px' }}>
                <div style={{
                  padding: '14px 24px', borderRadius: 12,
                  background: '#dcfce7', border: '1px solid #bbf7d0',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--secondary)', fontFamily: 'Manrope' }}>
                    +{mergeResult.added}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginTop: 2 }}>
                    нових додано
                  </div>
                </div>
                {mergeResult.skipped > 0 && (
                  <div style={{
                    padding: '14px 24px', borderRadius: 12,
                    background: 'var(--surface-container)', border: '1px solid var(--outline-variant)',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--outline)', fontFamily: 'Manrope' }}>
                      {mergeResult.skipped}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                      вже існували
                    </div>
                  </div>
                )}
              </div>
            )}

            <p style={{ fontSize: 15, color: 'var(--on-surface-variant)', margin: '0 0 32px' }}>
              {mergeResult?.skipped > 0
                ? `${mergeResult.skipped} транзакцій пропущено — вони вже були в базі`
                : 'Всі транзакції успішно додано'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => { setStep('upload'); setParseResult(null); setSelected([]); setMergeResult(null); }}
                style={{
                  padding: '12px 24px', borderRadius: 12, border: '1px solid var(--outline-variant)',
                  background: 'white', color: 'var(--on-surface)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Завантажити ще
              </button>
              <a
                href="/transactions"
                style={{
                  padding: '12px 24px', borderRadius: 12, border: 'none',
                  background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: 14,
                  textDecoration: 'none', display: 'inline-block',
                }}
              >
                Переглянути транзакції →
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
