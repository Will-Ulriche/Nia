import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LicenseService, type LicenseState } from '../services/license.service';

/**
 * Obturateur de licence (Phase 28 - Activation & licence).
 *
 * Bloque l'utilisation de l'application tant que l'établissement connecté
 * n'a pas une licence valide (validation serveur + cache local hors ligne).
 * Le super_admin (sans école) n'est pas concerné par l'obturateur.
 */
export function LicenseGuard() {
  const { profile } = useAuth();
  const [checking, setChecking] = useState(true);
  const [state, setState] = useState<LicenseState | null>(null);
  const [key, setKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  const schoolId = profile?.school_id ?? null;

  const checkLicense = async () => {
    if (!schoolId) return;
    setChecking(true);
    try {
      const result = await LicenseService.validate(schoolId);
      setState(result);
    } catch (e) {
      console.error('[LicenseGuard] Check failed:', e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!schoolId) {
      setChecking(false);
      setState(null);
      return;
    }
    checkLicense();
  }, [schoolId]);

  // Pas de licence requise : super_admin (pas d'école) ou profil pas encore chargé
  if (!profile || !profile.school_id) return null;

  // En cours de vérification : affiche un écran de chargement non bloquant visuellement
  if (checking) return null;

  // Licence valide : l'application reste accessible
  if (state?.valid) return null;

  const handleActivate = async () => {
    if (!key.trim()) {
      setError('Veuillez saisir la clé de licence.');
      return;
    }
    setActivating(true);
    setError('');
    try {
      const result = await LicenseService.activate(profile.school_id!, key, profile.id);
      if (result.ok && result.state) {
        setState(result.state);
        setKey('');
      } else {
        setError(result.error || 'Activation impossible.');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'activation.');
    } finally {
      setActivating(false);
    }
  };

  const statusMeta: Record<string, { title: string; emoji: string; color: string }> = {
    none:      { title: 'Licence requise',          emoji: '🔐', color: '#e67e22' },
    pending:   { title: 'Licence en attente',       emoji: '⏳', color: '#e67e22' },
    expired:   { title: 'Licence expirée',          emoji: '⏰', color: '#e74c3c' },
    cancelled: { title: 'Licence révoquée',         emoji: '⛔', color: '#c0392b' },
  };
  const meta = statusMeta[state?.status ?? 'none'] || statusMeta.none;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(44, 62, 80, 0.96)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{
        background: 'white', padding: '2.5rem', borderRadius: '16px',
        width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>{meta.emoji}</div>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', color: meta.color }}>{meta.title}</h1>

        <p style={{ color: '#666', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {state?.message || 'Pour utiliser Kemitia, cet établissement doit disposer d\'une licence active.'}
        </p>

        {state?.offline && (
          <p style={{ fontSize: '0.85rem', color: '#3498db', marginBottom: '1rem' }}>
            🔌 Mode hors ligne — les données déjà synchronisées restent disponibles.
          </p>
        )}

        {state?.status === 'none' || state?.status === 'pending' ? (
          <>
            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#34495e', fontSize: '0.85rem' }}>
                Clé de licence
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="KEM-XXXX-XXXX-XXXX-XXXX"
                style={{
                  width: '100%', padding: '0.8rem', borderRadius: '8px',
                  border: '1px solid #ccc', fontSize: '1rem',
                  fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase'
                }}
                disabled={activating || navigator.onLine === false}
                autoFocus
              />
              {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
              {!navigator.onLine && (
                <p style={{ color: '#e67e22', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  L'activation nécessite une connexion internet.
                </p>
              )}
            </div>
            <button
              onClick={handleActivate}
              disabled={activating || !navigator.onLine}
              style={{
                width: '100%', padding: '1rem', border: 'none', borderRadius: '8px',
                background: activating || !navigator.onLine ? '#95a5a6' : '#27ae60',
                color: 'white', fontSize: '1rem', fontWeight: 'bold',
                cursor: activating || !navigator.onLine ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {activating ? 'Validation en cours...' : 'Activer Kemitia'}
            </button>
          </>
        ) : (
          <button
            onClick={checkLicense}
            disabled={checking}
            style={{
              width: '100%', padding: '1rem', border: 'none', borderRadius: '8px',
              background: checking ? '#95a5a6' : '#3498db',
              color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {checking ? 'Vérification...' : 'Vérifier à nouveau'}
          </button>
        )}

        <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '1.25rem', lineHeight: 1.5 }}>
          En cas de difficulté, contactez le super administrateur de votre plateforme Kemitia.
        </p>
      </div>
    </div>
  );
}