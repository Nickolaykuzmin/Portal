import { useState, useRef } from 'react';
import { extractTextFromPDF } from '../utils/pdfParser';
import TopBar from '../components/TopBar';
import {
  getNotifPermission,
  requestNotifPermission,
  showNativeNotif,
} from '../services/notifications';
import { useToast } from '../context/ToastContext';
import type { PdfTextItem } from '../types';

interface DebugLine {
  y: number;
  text: string;
}

interface DebugResult {
  pages: number;
  lines: DebugLine[];
  rawItems: PdfTextItem[];
  error?: never;
}

interface DebugError {
  error: string;
  pages?: never;
  lines?: never;
  rawItems?: never;
}

type DebugState = DebugResult | DebugError | null;

// ── Card style helper ─────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--outline-variant)',
  borderRadius: 16,
  padding: '24px',
  marginBottom: 20,
};

const btn = (color = 'var(--primary)'): React.CSSProperties => ({
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  background: color,
  color: 'white',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
});

// ── Notification test panel ───────────────────────────────────────────────────
function NotifTestPanel() {
  const { showToast } = useToast();
  const [permission, setPermission] = useState(() => getNotifPermission());
  const [lastResult, setLastResult] = useState('');

  const requestPerm = async () => {
    const result = await requestNotifPermission();
    setPermission(result);
    setLastResult(result === 'granted' ? '✅ Дозвіл надано!' : result === 'denied' ? '❌ Заблоковано' : '⏳ Відхилено');
  };

  const sendNative = () => {
    if (permission !== 'granted') {
      setLastResult('⚠️ Спочатку надай дозвіл');
      return;
    }
    showNativeNotif({
      title: '🔔 Тестова нотіфікація — Finio',
      body: 'Нотіфікації працюють! Ти побачиш їх коли витрати перевищать ліміт.',
      tag: 'test-notification',
    });
    setLastResult('📤 Native notification відправлено');
  };

  const sendToast = () => {
    showToast({
      variant: 'warning',
      title: '⚠️ Бюджет майже вичерпано — Ресторани',
      message: 'Витрачено 2 400 RON із 3 000 RON (80%)',
      duration: 7000,
    });
    setLastResult('📥 In-app toast показано');
  };

  const sendExceeded = () => {
    showToast({
      variant: 'error',
      title: '🚨 Бюджет перевищено — Покупки',
      message: 'Витрачено 3 850 RON із 3 000 RON (128%)',
      duration: 8000,
    });
    if (permission === 'granted') {
      showNativeNotif({
        title: '🚨 Бюджет перевищено — Покупки',
        body: 'Витрачено 3 850 RON із 3 000 RON (128%)',
        tag: 'test-exceeded',
      });
    }
    setLastResult('🚨 Exceeded alert відправлено (toast' + (permission === 'granted' ? ' + native)' : ' only)'));
  };

  const permColor = permission === 'granted' ? '#006c49' : permission === 'denied' ? '#ac0031' : '#d97706';
  const permLabel = permission === 'granted' ? '✅ Granted' : permission === 'denied' ? '❌ Denied' : permission === 'unavailable' ? '🚫 Недоступно' : '⏳ Default (не надано)';

  return (
    <div style={card}>
      <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>🔔 Тест нотіфікацій</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--on-surface-variant)' }}>
        Перевір що нотіфікації працюють на твоєму пристрої
      </p>

      {/* Permission status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--surface-container-low)', borderRadius: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 2 }}>NOTIFICATION.PERMISSION</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: permColor }}>{permLabel}</div>
        </div>
        {permission !== 'granted' && permission !== 'unavailable' && (
          <button style={btn()} onClick={requestPerm}>
            Запросити дозвіл
          </button>
        )}
      </div>

      {/* macOS instruction */}
      {permission === 'denied' && (
        <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#92400e' }}>
          <strong>Як розблокувати на Mac:</strong><br />
          Safari: Налаштування → Сайти → Сповіщення → знайди localhost → «Дозволити»<br />
          Chrome: Адресний рядок → 🔒 → Сповіщення → «Дозволити»
        </div>
      )}

      {/* Test buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button style={btn('#006c49')} onClick={sendToast}>
          📥 In-app toast (warning)
        </button>
        <button style={btn('#ac0031')} onClick={sendExceeded}>
          🚨 Toast + Native (exceeded)
        </button>
        <button
          style={btn(permission === 'granted' ? 'var(--primary)' : '#94a3b8')}
          onClick={sendNative}
          disabled={permission !== 'granted'}
          title={permission !== 'granted' ? 'Потрібен дозвіл' : ''}
        >
          🔔 Native OS notification
        </button>
      </div>

      {lastResult && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface-container-low)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--on-surface-variant)' }}>
          {lastResult}
        </div>
      )}
    </div>
  );
}

export default function Debug() {
  const [result, setResult] = useState<DebugState>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File | null | undefined) => {
    if (!file) return;
    setLoading(true);
    try {
      const pages = await extractTextFromPDF(file);
      const page1 = pages[0] || [];
      const sorted = [...page1].sort((a, b) => b.y - a.y);

      const lineMap: Record<number, PdfTextItem[]> = {};
      for (const item of sorted) {
        const yKey = Math.round(item.y / 3) * 3;
        if (!lineMap[yKey]) lineMap[yKey] = [];
        lineMap[yKey].push(item);
      }

      const lines: DebugLine[] = Object.entries(lineMap)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([y, items]) => ({
          y: Number(y),
          text: items.sort((a, b) => a.x - b.x).map((i) => `[x${i.x}]${i.text}`).join(' '),
        }));

      setResult({ pages: pages.length, lines, rawItems: page1.slice(0, 50) });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar title="Debug" />
      <div style={{ padding: '80px 32px 32px', maxWidth: 1000, margin: '0 auto' }}>

        {/* ── Notification test ── */}
        <NotifTestPanel />

        {/* ── PDF debug ── */}
        <div style={card}>
          <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>📄 PDF Debug</h2>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={(e) => handle(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={btn()}
          >
            {loading ? 'Обробка...' : 'Вибрати PDF для debug'}
          </button>

          {result && 'error' in result && result.error && (
            <div style={{ marginTop: 16, color: 'red', padding: 16, background: '#fee2e2', borderRadius: 8 }}>
              Error: {result.error}
            </div>
          )}

          {result && 'lines' in result && result.lines && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 700 }}>Сторінок: {result.pages}</p>
              <p style={{ fontWeight: 700 }}>Рядків на стор. 1: {result.lines.length}</p>
              <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 11, overflow: 'auto', maxHeight: 600, whiteSpace: 'pre-wrap' }}>
                {result.lines.map((l, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    <span style={{ color: '#569cd6' }}>y={l.y}</span>  {l.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
