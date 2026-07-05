import { useState, useEffect } from 'react';
import s from './InstallPWABanner.module.scss';

/**
 * Shows an install prompt banner:
 *  - On iOS/iPadOS Safari: manual guide (share → Add to Home Screen)
 *  - On Chrome/Edge/Android: uses the native beforeinstallprompt event
 *
 * The banner is suppressed once the user dismisses it (localStorage flag)
 * or if the app is already running in standalone mode.
 */

// Type for the deferred install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

const DISMISSED_KEY = 'finio_install_banner_dismissed';

export default function InstallPWABanner() {
  const [showIOS,   setShowIOS]   = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed or user dismissed
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      setShowIOS(true);
      return;
    }

    // Chrome / Edge / Android — listen for native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShowIOS(false);
    setDeferredPrompt(null);
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
    else setDeferredPrompt(null);
  };

  // ── iOS guide ──────────────────────────────────────────────────────────────
  if (showIOS) {
    return (
      <div className={s.banner} role="complementary" aria-label="Встановити Finio">
        <div className={s.iconWrap}>
          <img src="/icons/icon-192.png" alt="Finio" className={s.appIcon} />
        </div>
        <div className={s.text}>
          <span className={s.title}>Встанови Finio на iPhone</span>
          <span className={s.desc}>
            Натисни{' '}
            <span className={s.shareIcon} aria-hidden>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>ios_share</span>
            </span>
            {' '}→ <strong>«На екран «Додому»</strong>
          </span>
        </div>
        <button className={s.closeBtn} onClick={dismiss} aria-label="Закрити">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
      </div>
    );
  }

  // ── Native install prompt (Chrome/Android) ─────────────────────────────────
  if (deferredPrompt) {
    return (
      <div className={s.banner} role="complementary" aria-label="Встановити Finio">
        <div className={s.iconWrap}>
          <img src="/icons/icon-192.png" alt="Finio" className={s.appIcon} />
        </div>
        <div className={s.text}>
          <span className={s.title}>Встановити Finio</span>
          <span className={s.desc}>Додай застосунок на головний екран</span>
        </div>
        <button className={s.installBtn} onClick={handleNativeInstall}>
          Встановити
        </button>
        <button className={s.closeBtn} onClick={dismiss} aria-label="Закрити">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
      </div>
    );
  }

  return null;
}
