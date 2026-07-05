import { createContext, useCallback, useContext, useState, useRef } from 'react';
import s from './ToastContext.module.scss';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  duration?: number; // ms, default 5000
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const showToast = useCallback((payload: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const duration = payload.duration ?? 5000;

    setToasts((prev) => {
      // Deduplicate by title to avoid flooding on rapid re-renders
      if (prev.some((t) => t.title === payload.title)) return prev;
      return [...prev.slice(-4), { ...payload, id }]; // keep last 5
    });

    const timer = setTimeout(() => dismissToast(id), duration);
    timers.current.set(id, timer);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ─── Toast container ──────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, string> = {
  info:    'info',
  success: 'check_circle',
  warning: 'warning',
  error:   'error',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className={s.container} role="region" aria-live="polite" aria-label="Сповіщення">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${s.toast} ${s[toast.variant]}`}
          role="alert"
        >
          <div className={s.iconWrap}>
            <span className={`material-symbols-outlined ${s.icon}`}>
              {ICONS[toast.variant]}
            </span>
          </div>
          <div className={s.body}>
            <span className={s.title}>{toast.title}</span>
            {toast.message && <span className={s.message}>{toast.message}</span>}
          </div>
          <button
            className={s.closeBtn}
            onClick={() => onDismiss(toast.id)}
            aria-label="Закрити"
          >
            <span className={`material-symbols-outlined ${s.closeIcon}`}>close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
