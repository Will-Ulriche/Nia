import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
      color: '#7f8c8d',
    }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.25rem', color: '#34495e', margin: '0 0 0.5rem' }}>{title}</h3>
      {description && (
        <p style={{ fontSize: '0.95rem', color: '#95a5a6', maxWidth: '380px', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
          {description}
        </p>
      )}
      {action && (
        action.to ? (
          <Link
            to={action.to}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.2rem', background: '#3498db', color: 'white',
              borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.2rem', background: '#3498db', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
