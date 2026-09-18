import { useState, useEffect } from 'react';
import { DeviceService } from '../services/device.service';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export function DeviceRegistrationModal() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isRevoked, setIsRevoked] = useState(false);

  useEffect(() => {
    checkDeviceStatus();
  }, [profile?.school_id]); // Re-check if profile loads/changes

  const checkDeviceStatus = async () => {
    try {
      const deviceId = await DeviceService.getDeviceId();
      const { data, error } = await supabase
        .from('devices')
        .select('device_name, is_revoked')
        .eq('id', deviceId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
         console.error('Error checking device:', error);
      }

      if (data?.is_revoked) {
          setIsRevoked(true);
          setIsOpen(true);
          setLoading(false);
          return;
      }

      // If not registered (no data), open modal to register
      if (!data) {
        // Suggest a default name
        setDeviceName(`Appareil de ${[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilisateur'}`);
        setIsOpen(true);
      } else {
        // Already registered and not revoked, update heartbeat
        DeviceService.heartbeat();
        setIsOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      setError('Veuillez entrer un nom pour cet appareil.');
      return;
    }
    
    setSaving(true);
    setError('');
    try {
      await DeviceService.registerDevice(profile?.school_id ?? null, deviceName.trim());
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de l\'appareil.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || loading) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', padding: '2.5rem', borderRadius: '16px',
        width: '100%', maxWidth: '450px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        
        {isRevoked ? (
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛔</div>
                <h2 style={{ color: '#c0392b', marginBottom: '1rem' }}>Accès Révoqué</h2>
                <p style={{ color: '#666', lineHeight: 1.5, marginBottom: '2rem' }}>
                    L'accès de cet appareil a été révoqué par l'administrateur. La synchronisation et l'accès aux données sont bloqués.
                </p>
                <p style={{ fontSize: '0.9rem', color: '#999' }}>
                    Veuillez contacter le support ou la direction pour plus d'informations.
                </p>
            </div>
        ) : (
            <>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', color: '#2c3e50' }}>Nouvel appareil détecté</h2>
                <p style={{ color: '#666', marginBottom: '2rem', lineHeight: 1.5 }}>
                  Pour des raisons de sécurité, veuillez identifier cet appareil avant de pouvoir synchroniser les données de l'établissement.
                </p>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#34495e' }}>
                    Nom de l'appareil
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="ex: PC Secrétariat 1"
                    style={{
                      width: '100%', padding: '0.8rem', borderRadius: '8px',
                      border: '1px solid #ccc', fontSize: '1rem'
                    }}
                    autoFocus
                  />
                  {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
                </div>

                <button
                  onClick={handleRegister}
                  disabled={saving || !deviceName.trim()}
                  style={{
                    width: '100%', padding: '1rem', border: 'none', borderRadius: '8px',
                    background: saving || !deviceName.trim() ? '#95a5a6' : '#27ae60',
                    color: 'white', fontSize: '1rem', fontWeight: 'bold',
                    cursor: saving || !deviceName.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer cet appareil'}
                </button>
            </>
        )}
      </div>
    </div>
  );
}
