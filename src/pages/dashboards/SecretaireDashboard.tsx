import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function SecretaireDashboard() {
  const { profile } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const quickLinks = [
    { icon: '👩‍🎓', label: 'Liste des élèves', to: '/direction/students', desc: 'Consulter et gérer les élèves' },
    { icon: '💰', label: 'Paiements', to: '/direction/finance/payments', desc: 'Enregistrer un paiement' },
    { icon: '🕐', label: 'Présences', to: '/direction/attendance', desc: 'Saisir les absences du jour' },
    { icon: '📋', label: 'Bulletins', to: '/direction/bulletins', desc: 'Générer les bulletins' },
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: '#2c3e50', margin: 0, fontWeight: 700 }}>
          {greeting}, {profile?.first_name || 'Secrétaire'} 📋
        </h1>
        <p style={{ color: '#7f8c8d', margin: '0.3rem 0 0' }}>
          Espace de travail — Secrétariat
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {quickLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
              padding: '1.5rem', background: 'white', borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textDecoration: 'none',
              color: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}
          >
            <span style={{ fontSize: '2rem' }}>{link.icon}</span>
            <strong style={{ fontSize: '1rem', color: '#2c3e50' }}>{link.label}</strong>
            <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>{link.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
