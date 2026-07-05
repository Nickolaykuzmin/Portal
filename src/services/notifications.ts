/**
 * Notification service for Finio Finance.
 *
 * Responsibilities:
 *  1. Request/check browser Notification permission
 *  2. Show native browser/OS notifications (Web Notifications API)
 *  3. FCM push token management (for background / iOS PWA push)
 */

import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ─── Permission ───────────────────────────────────────────────────────────────

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unavailable';

export function getNotifPermission(): NotifPermission {
  if (!('Notification' in window)) return 'unavailable';
  return Notification.permission as NotifPermission;
}

export async function requestNotifPermission(): Promise<NotifPermission> {
  if (!('Notification' in window)) return 'unavailable';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result as NotifPermission;
}

// ─── Native browser notification ──────────────────────────────────────────────

export interface NotifPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

export function showNativeNotif(payload: NotifPayload): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag,
  };

  // Use service-worker show when available (required for iOS PWA push)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(payload.title, options))
      .catch(() => new Notification(payload.title, options));
  } else {
    new Notification(payload.title, options);
  }
}

// ─── FCM push token ───────────────────────────────────────────────────────────

/**
 * Initialise Firebase Cloud Messaging, get the FCM token and
 * persist it to Firestore under users/{uid}/fcmTokens/{token}.
 *
 * Requires VITE_FIREBASE_VAPID_KEY in .env.
 * Returns the token string, or null if not available/denied.
 */
export async function registerFCMToken(userId: string): Promise<string | null> {
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey) {
      console.warn('[FCM] VITE_FIREBASE_VAPID_KEY is not set — push disabled');
      return null;
    }

    // Dynamic import keeps FCM out of the main bundle
    const { getMessaging, getToken } = await import('firebase/messaging');
    const { default: app } = await import('../firebase');

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey });

    if (token) {
      // Persist to Firestore so the server can send targeted pushes
      await setDoc(
        doc(db, 'users', userId, 'fcmTokens', token),
        { token, createdAt: serverTimestamp(), platform: getPlatformLabel() },
        { merge: true },
      );
    }

    return token || null;
  } catch (err) {
    console.warn('[FCM] Could not get token:', err);
    return null;
  }
}

function getPlatformLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios-pwa';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}

// ─── Budget alert helpers ─────────────────────────────────────────────────────

export function showBudgetExceededNotif(categoryName: string, spent: number, limit: number): void {
  showNativeNotif({
    title: `⚠️ Бюджет перевищено — ${categoryName}`,
    body: `Витрачено ${formatAmount(spent)} із ${formatAmount(limit)}`,
    tag: `budget-exceeded-${categoryName}`,
  });
}

export function showBudgetWarningNotif(categoryName: string, spent: number, limit: number): void {
  showNativeNotif({
    title: `🔔 Бюджет майже вичерпано — ${categoryName}`,
    body: `Витрачено ${formatAmount(spent)} із ${formatAmount(limit)} (${Math.round((spent / limit) * 100)}%)`,
    tag: `budget-warning-${categoryName}`,
  });
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
