import { useState, useRef } from 'react';
import { extractTextFromPDF } from '../utils/pdfParser';
import TopBar from '../components/TopBar';

export default function Debug() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handle = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const pages = await extractTextFromPDF(file);
      // Show first page items sorted by Y desc (top to bottom)
      const page1 = pages[0] || [];
      const sorted = [...page1].sort((a, b) => b.y - a.y);

      // Group by Y
      const lineMap = {};
      for (const item of sorted) {
        const yKey = Math.round(item.y / 3) * 3;
        if (!lineMap[yKey]) lineMap[yKey] = [];
        lineMap[yKey].push(item);
      }

      const lines = Object.entries(lineMap)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([y, items]) => ({
          y: Number(y),
          text: items.sort((a, b) => a.x - b.x).map((i) => `[x${i.x}]${i.text}`).join(' '),
        }));

      setResult({ pages: pages.length, lines, rawItems: page1.slice(0, 50) });
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar title="PDF Debug" />
      <div style={{ padding: '80px 32px 32px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={(e) => handle(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              padding: '12px 24px', borderRadius: 12, border: 'none',
              background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {loading ? 'Обробка...' : 'Вибрати PDF для debug'}
          </button>
        </div>

        {result?.error && (
          <div style={{ color: 'red', padding: 16, background: '#fee2e2', borderRadius: 8 }}>
            Error: {result.error}
          </div>
        )}

        {result && !result.error && (
          <div>
            <p style={{ fontWeight: 700 }}>Сторінок: {result.pages}</p>
            <p style={{ fontWeight: 700 }}>Рядків на стор. 1: {result.lines.length}</p>
            <div style={{
              background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 8,
              fontFamily: 'monospace', fontSize: 11, overflow: 'auto', maxHeight: 600,
              whiteSpace: 'pre-wrap',
            }}>
              {result.lines.map((l, i) => (
                <div key={i} style={{ marginBottom: 2 }}>
                  <span style={{ color: '#569cd6' }}>y={l.y}</span>  {l.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
