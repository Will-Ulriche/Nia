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
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: to ? 'pointer' : 'default',
      textDecoration: 'none',
      color: 'inherit',
    }}
    onMouseEnter={e => { if (to) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)'; } }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.85rem', color: '#7f8c8d', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '1.6rem' }}>{icon}</span>
      </div>
      {loading ? (
        <div style={{ height: '2rem', background: '#f0f0f0', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <span style={{ fontSize: '2rem', fontWeight: 700, color: '#2c3e50', lineHeight: 1 }}>{value}</span>
      )}
      {subtext && (
        <span style={{ fontSize: '0.8rem', color: '#95a5a6' }}>{subtext}</span>
      )}
      {trend && (
        <span style={{
          fontSize: '0.8rem',
          color: trend.value >= 0 ? '#27ae60' : '#e74c3c',
          fontWeight: 600,
        }}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </span>
      )}
    </div>
  );

  if (to) {
    return <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{card}</Link>;
  }
  return card;
}
