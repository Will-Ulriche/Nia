
import { useSchool } from '../../hooks/useModules';
import { InscriptionForm } from '../../components/forms/InscriptionForm';

export function InscriptionPage() {
  const { isLoading } = useSchool();

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', padding: '0', gap: '2vh' }}>
      
      {/* GAUCHE : Zone de contenu principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <InscriptionForm />
      </div>
    </div>
  );
}
