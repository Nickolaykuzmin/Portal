import s from './StatCard.module.scss';

interface Badge {
  positive: boolean;
  text: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  sub?: string;
  badge?: Badge;
}

export default function StatCard({ label, value, icon, color = 'var(--primary)', sub, badge }: StatCardProps) {
  return (
    <div className={`whisper-shadow ${s.card}`}>
      {/* Decorative accent blob */}
      <div className={s.accent} style={{ background: color }} />

      <div className={s.header}>
        <span className={s.label}>{label}</span>
        <div
          className={s.iconWrap}
          style={{ background: color, boxShadow: `0 4px 12px ${color}40` }}
        >
          <span className={`material-symbols-outlined ${s.icon}`}>{icon}</span>
        </div>
      </div>

      <div className={s.body}>
        <div className={s.value}>{value}</div>
        {sub && <div className={s.sub}>{sub}</div>}
      </div>

      {badge && (
        <div className={`${s.badge} ${badge.positive ? s.positive : s.negative}`}>
          <span className={`material-symbols-outlined ${s.icon}`}>
            {badge.positive ? 'arrow_upward' : 'arrow_downward'}
          </span>
          {badge.text}
        </div>
      )}
    </div>
  );
}
