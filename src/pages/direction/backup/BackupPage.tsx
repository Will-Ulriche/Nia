import { useState, useEffect } from 'react';
import { BackupService } from '../../../services/backup.service';
import { useSchool } from '../../../hooks/useModules';

export function BackupPage() {
  const { school } = useSchool();
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  
  const [cloudStatus, setCloudStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [checkingCloud, setCheckingCloud] = useState(false);

  useEffect(() => {
    if (school) {
      handleCheckCloud();
    }
  }, [school]);

  const handleManualBackup = async () => {
    setLoadingLocal(true);
    try {
      await BackupService.createManualBackup();
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('Attention : La restauration écrasera toutes vos données locales actuelles non synchronisées. Voulez-vous continuer ?')) {
      return;
    }
    setLoadingRestore(true);
    try {
      await BackupService.restoreBackup();
    } finally {
      setLoadingRestore(false);
    }
  };

  const handleCheckCloud = async () => {
    if (!school) return;
    setCheckingCloud(true);
    try {
      const status = await BackupService.checkCloudBackup(school.id);
      setCloudStatus(status);
    } finally {
      setCheckingCloud(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', marginBottom: '0.5rem' }}>Sauvegarde et Restauration</h1>
      <p style={{ color: '#7f8c8d', marginBottom: '2.5rem', lineHeight: 1.5 }}>
        Gérez la sécurité de vos données en créant des sauvegardes locales sur ce poste (clé USB, disque dur) et vérifiez la synchronisation avec le cloud.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* SECTION: SAUVEGARDE LOCALE */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>💾</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#34495e' }}>Sauvegarde Locale</h2>
              <p style={{ margin: '0.2rem 0 0', color: '#95a5a6', fontSize: '0.9rem' }}>Fichier SQLite physique</p>
            </div>
          </div>
          <p style={{ fontSize: '0.95rem', color: '#555', marginBottom: '2rem', lineHeight: 1.5 }}>
            Créez une copie de sécurité de la base de données actuelle. En cas de panne matérielle de cet ordinateur sans accès internet, ce fichier vous permettra de récupérer vos données.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={handleManualBackup}
              disabled={loadingLocal}
              style={{
                padding: '0.8rem 1.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', 
                fontSize: '1rem', fontWeight: 600, cursor: loadingLocal ? 'wait' : 'pointer', transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {loadingLocal ? 'Création en cours...' : '📥 Télécharger une sauvegarde'}
            </button>
            
            <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '1rem 0' }} />
            
            <button
              onClick={handleRestore}
              disabled={loadingRestore}
              style={{
                padding: '0.8rem 1.5rem', background: 'transparent', color: '#e74c3c', border: '2px solid #e74c3c', borderRadius: '8px', 
                fontSize: '1rem', fontWeight: 600, cursor: loadingRestore ? 'wait' : 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {loadingRestore ? 'Restauration...' : '🔄 Restaurer un fichier .db'}
            </button>
          </div>
        </div>

        {/* SECTION: SAUVEGARDE CLOUD */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>☁️</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#34495e' }}>Sauvegarde Cloud</h2>
              <p style={{ margin: '0.2rem 0 0', color: '#95a5a6', fontSize: '0.9rem' }}>Synchronisation réseau</p>
            </div>
          </div>
          <p style={{ fontSize: '0.95rem', color: '#555', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Vérifiez que toutes vos données locales ont bien été transmises au serveur central Kamitia.
          </p>

          <div style={{ 
            padding: '1.2rem', 
            borderRadius: '8px', 
            background: checkingCloud ? '#f8f9fa' : (cloudStatus?.success ? '#e8f8f5' : '#fdedec'),
            borderLeft: `4px solid ${checkingCloud ? '#bdc3c7' : (cloudStatus?.success ? '#2ecc71' : '#e74c3c')}`,
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#2c3e50' }}>
              {checkingCloud ? 'Vérification en cours...' : (cloudStatus?.success ? 'Cloud à jour' : 'Données en attente')}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
              {checkingCloud ? 'Veuillez patienter...' : cloudStatus?.message}
            </p>
          </div>

          <button
            onClick={handleCheckCloud}
            disabled={checkingCloud}
            style={{
              width: '100%', padding: '0.8rem 1.5rem', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', 
              fontSize: '1rem', fontWeight: 600, cursor: checkingCloud ? 'wait' : 'pointer', transition: 'background 0.2s',
            }}
          >
            {checkingCloud ? 'Synchronisation...' : 'Forcer la synchronisation'}
          </button>

          <p style={{ fontSize: '0.8rem', color: '#95a5a6', marginTop: '1.5rem', textAlign: 'center' }}>
            L'application effectue également une sauvegarde locale automatique à chaque fermeture.
          </p>
        </div>
      </div>
    </div>
  );
}
