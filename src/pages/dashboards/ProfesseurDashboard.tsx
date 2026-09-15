import { useAuth } from '../../hooks/useAuth';

export function ProfesseurDashboard() {
  const { profile } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: '#2c3e50', margin: 0, fontWeight: 700 }}>
          {greeting}, {profile?.first_name ? `Prof. ${profile.first_name}` : 'Professeur'} 🎓
        </h1>
        <p style={{ color: '#7f8c8d', margin: '0.3rem 0 0' }}>
          Espace de travail — Enseignant
        </p>
      </div>

      <div style={{
        background: 'white', borderRadius: '12px', padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
        <h2 style={{ color: '#34495e', margin: '0 0 0.5rem' }}>Vos classes et évaluations</h2>
        <p style={{ color: '#7f8c8d', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5, fontSize: '0.95rem' }}>
          Votre tableau de bord personnel sera disponible ici avec vos classes assignées, vos évaluations à venir, et le résumé de vos saisies de notes.
        </p>
        <p style={{ color: '#bdc3c7', fontSize: '0.85rem', marginTop: '1.5rem' }}>
          Fonctionnalité complète prévue dans une prochaine version.
        </p>
      </div>
    </div>
  );
}
