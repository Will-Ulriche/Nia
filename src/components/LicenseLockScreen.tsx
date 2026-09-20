import { useEffect, useState } from 'react';
import { LicenseService, type LicenseState } from '../services/license.service';
import { useAuth } from '../hooks/useAuth';

export function LicenseLockScreen({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const [licenseState, setLicenseState] = useState<LicenseState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLicense = async () => {
      if (!profile?.school_id || profile.role === 'super_admin') {
        // Super admins are never blocked by school licenses, or users without school
        setLicenseState({ valid: true, status: 'active', message: '', expiresAt: null, licenseKey: null, lastCheckedAt: null, offline: false });
        setLoading(false);
        return;
      }

      try {
        const state = await LicenseService.validate(profile.school_id);
        setLicenseState(state);
      } catch (error) {
        console.error("Failed to check license:", error);
      } finally {
        setLoading(false);
      }
    };

    checkLicense();
  }, [profile?.school_id, profile?.role]);

  const handleRetry = async () => {
    if (!profile?.school_id) return;
    setLoading(true);
    const state = await LicenseService.validate(profile.school_id);
    setLicenseState(state);
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#ecf0f1' }}>
        <p style={{ fontSize: '1.2rem', color: '#7f8c8d' }}>Vérification de la licence en cours...</p>
      </div>
    );
  }

  // Si la licence est valide (active et non expirée), on affiche l'application
  if (licenseState?.valid) {
    return <>{children}</>;
  }

  // Sinon, on affiche l'écran de verrouillage
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#2c3e50', padding: '1rem' }}>
      <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxWidth: '500px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ color: '#e74c3c', fontSize: '1.8rem', margin: '0 0 1rem' }}>Application Verrouillée</h1>
        <p style={{ color: '#34495e', fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          {licenseState?.message || "La licence de cet établissement a expiré ou est invalide."}
        </p>
        <p style={{ color: '#7f8c8d', fontSize: '0.9rem', marginBottom: '2rem' }}>
          L'accès à Nia a été suspendu pour cet établissement. Veuillez contacter le support technique ou le super administrateur pour régulariser votre situation.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={handleRetry}
            style={{ padding: '0.8rem 2rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer' }}
          >
            Vérifier à nouveau (en ligne)
          </button>
          
          <button 
            onClick={() => signOut()}
            style={{ padding: '0.8rem 2rem', background: 'transparent', color: '#7f8c8d', border: '1px solid #bdc3c7', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer' }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
