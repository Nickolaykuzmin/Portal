import { useState, useEffect } from 'react';
import {
  getNotifPermission,
  requestNotifPermission,
  registerFCMToken,
  type NotifPermission,
} from '../services/notifications';
import { useAuth } from '../hooks/useAuth';
import s from './NotificationSettings.module.scss';

/**
 * Small settings panel (inline, not a modal) that allows the user to
 * grant notification permissions and enable push (FCM).
 */
export default function NotificationSettings() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotifPermission>(() => getNotifPermission());
  const [fcmStatus, setFcmStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  useEffect(() => {
    setPermission(getNotifPermission());
  }, []);

  const handleEnable = async () => {
    const result = await requestNotifPermission();
    setPermission(result);

    if (result === 'granted' && user) {
      setFcmStatus('loading');
      const token = await registerFCMToken(user.uid);
      setFcmStatus(token ? 'ok' : 'error');
    }
  };

  if (permission === 'unavailable') return null;

  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <div className={s.left}>
          <div className={s.iconWrap}>
            <span className={`material-symbols-outlined ${s.icon}`}>
              {permission === 'granted' ? 'notifications_active' : 'notifications_off'}
            </span>
          </div>
          <div className={s.text}>
            <span className={s.label}>Push-сповіщення</span>
            <span className={s.desc}>
              {permission === 'granted'
                ? fcmStatus === 'ok'
                  ? 'Увімкнено — ти отримуватимеш сповіщення про бюджет'
                  : 'Дозвіл надано'
                : permission === 'denied'
                  ? 'Заблоковано у налаштуваннях браузера'
                  : 'Отримуй сповіщення коли перевищиш ліміт'}
            </span>
          </div>
        </div>

        {permission === 'default' && (
          <button className={s.enableBtn} onClick={handleEnable}>
            Увімкнути
          </button>
        )}

        {permission === 'granted' && (
          <div className={s.statusBadge}>
            {fcmStatus === 'loading' && (
              <span className={`material-symbols-outlined ${s.spin}`}>hourglass_top</span>
            )}
            {fcmStatus === 'ok' && (
              <span className={`material-symbols-outlined ${s.ok}`}>check_circle</span>
            )}
            {(fcmStatus === 'idle' || fcmStatus === 'error') && (
              <span className={`material-symbols-outlined ${s.granted}`}>notifications_active</span>
            )}
          </div>
        )}

        {permission === 'denied' && (
          <span className={`material-symbols-outlined ${s.denied}`}>block</span>
        )}
      </div>

      {permission === 'denied' && (
        <p className={s.deniedHint}>
          Щоб увімкнути сповіщення — відкрий налаштування сайту в браузері та дозволь «Сповіщення».
        </p>
      )}
    </div>
  );
}
