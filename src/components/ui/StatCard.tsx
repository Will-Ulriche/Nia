import { Link } from 'react-router-dom';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  subtext?: string;
  to?: string;
  trend?: { value: number; label: string };
  loading?: boolean;
}

export function StatCard({ label, value, icon, color, subtext, to, trend, loading = false }: StatCardProps) {
  const card = (
    <div style={{
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      padding: 'clamp(8px, 1vw, 16px)',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)',
      border: '1px solid rgba(226, 232, 240, 0.6)',
      borderTop: `4px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 'clamp(4px, 1vh, 8px)',
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: to ? 'pointer' : 'default',
      textDecoration: 'none',
      color: 'inherit',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      minHeight: 0
    }}
    onMouseEnter={e => { if (to) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.1)'; (e.currentTarget as HTMLElement).style.border = '1px solid rgba(59, 130, 246, 0.2)'; (e.currentTarget as HTMLElement).style.borderTop = `4px solid ${color}`; } }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.05)'; (e.currentTarget as HTMLElement).style.border = '1px solid rgba(226, 232, 240, 0.6)'; (e.currentTarget as HTMLElement).style.borderTop = `4px solid ${color}`; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', color: '#64748b', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <span style={{ fontSize: 'clamp(16px, 1.5vw, 20px)', width: 'clamp(24px, 2.5vw, 36px)', height: 'clamp(24px, 2.5vw, 36px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}15`, borderRadius: '10px', flexShrink: 0 }}>{icon}</span>
      </div>
      {loading ? (
        <div style={{ height: 'clamp(20px, 3vh, 32px)', background: 'rgba(226, 232, 240, 0.5)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <span style={{ fontSize: 'clamp(16px, 2.5vw, 28px)', fontWeight: 800, color: '#1e3a5f', lineHeight: 1, letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
      )}
      {subtext && (
        <span style={{ fontSize: 'clamp(10px, 1vw, 12px)', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtext}</span>
      )}
      {trend && (
        <span style={{
          fontSize: 'clamp(10px, 1vw, 12px)',
          color: trend.value >= 0 ? '#10b981' : '#ef4444',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: trend.value >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          padding: '2px 8px',
          borderRadius: '20px',
          width: 'fit-content',
          marginTop: '4px',
          whiteSpace: 'nowrap'
        }}>
          {trend.value >= 0 ? '↗' : '↘'} {Math.abs(trend.value)}% {trend.label}
        </span>
      )}
    </div>
  );

  if (to) {
    return <Link to={to} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%', minHeight: 0 }}>{card}</Link>;
  }
  return card;
}
