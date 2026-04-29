export default function StatCard({ label, value, icon, color = 'var(--primary)', sub, badge }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      boxShadow: '0 1px 3px rgba(19,27,46,0.06), 0 8px 24px rgba(19,27,46,0.04)',
      border: '1px solid var(--outline-variant)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: color,
        opacity: 0.04,
        borderRadius: '0 20px 0 80px',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--on-surface-variant)',
        }}>
          {label}
        </span>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${color}40`,
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 20, color: 'white',
            fontVariationSettings: "'FILL' 1, 'wght' 400",
          }}>
            {icon}
          </span>
        </div>
      </div>

      <div>
        <div style={{
          fontFamily: 'Manrope',
          fontSize: 26, fontWeight: 800,
          color: 'var(--on-surface)',
          letterSpacing: '-0.5px',
          lineHeight: 1.15,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: 'var(--outline)', marginTop: 4, fontWeight: 500 }}>{sub}</div>
        )}
      </div>

      {badge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 20,
          background: badge.positive ? '#dcfce7' : '#fee2e2',
          color: badge.positive ? 'var(--secondary)' : 'var(--tertiary)',
          fontSize: 11, fontWeight: 700, width: 'fit-content',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
            {badge.positive ? 'arrow_upward' : 'arrow_downward'}
          </span>
          {badge.text}
        </div>
      )}
    </div>
  );
}
