import { useNavigate } from 'react-router-dom';

export function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: 'red' }}>Accès refusé</h1>
      <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      <button 
        onClick={() => navigate('/', { replace: true })}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
      >
        Retourner à l'accueil
      </button>
    </div>
  );
}
