import { useState, useEffect } from 'react';
import { DeviceService, type Device } from '../../services/device.service';

export function DevicesList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadDevices = async () => {
    setLoading(true);
    try {
      // Super Admin can see all devices, or they can filter by school. 
      // For now we load all devices (since the user is Super Admin)
      const data = await DeviceService.getDevicesBySchool(null);
      setDevices(data);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du chargement des appareils.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDevices(); }, []);

  const handleToggleRevoke = async (device: Device) => {
    const action = device.is_revoked ? 'réactiver' : 'révoquer';
    if (!confirm(`Voulez-vous vraiment ${action} cet appareil (${device.name}) ?`)) return;

    setRevoking(device.id);
    try {
      await DeviceService.setRevocationStatus(device.id, !device.is_revoked);
      await loadDevices();
    } catch (err) {
      console.error(err);
      alert(`Erreur lors de la tentative de ${action}.`);
    } finally {
      setRevoking(null);
    }
  };

  if (loading) return <div>Chargement des appareils...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>📱 Gestion des Appareils</h1>
        <button onClick={loadDevices} style={{ padding: '0.5rem 1rem', background: '#ecf0f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          🔄 Rafraîchir
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Nom / ID</th>
              <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Statut</th>
              <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Dernière Activité</th>
              <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Dernière Sync</th>
              <th style={{ padding: '1rem', borderBottom: '2px solid #eee', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(device => (
              <tr key={device.id} style={{ borderBottom: '1px solid #eee', opacity: device.is_revoked ? 0.6 : 1 }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{device.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', fontFamily: 'monospace' }}>{device.id}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  {device.is_revoked ? (
                    <span style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', background: '#c0392b22', color: '#c0392b', fontSize: '0.85rem', fontWeight: 600 }}>
                      ⛔ Révoqué
                    </span>
                  ) : (
                    <span style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', background: '#27ae6022', color: '#27ae60', fontSize: '0.85rem', fontWeight: 600 }}>
                      ✅ Actif
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  {new Date(device.last_active_at).toLocaleString('fr-FR')}
                </td>
                <td style={{ padding: '1rem' }}>
                  {device.last_sync_at ? new Date(device.last_sync_at).toLocaleString('fr-FR') : 'Jamais'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button
                    onClick={() => handleToggleRevoke(device)}
                    disabled={revoking === device.id}
                    style={{
                      padding: '0.4rem 0.8rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: device.is_revoked ? '#27ae60' : '#c0392b',
                      color: 'white',
                      cursor: revoking === device.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {revoking === device.id ? '...' : (device.is_revoked ? 'Réactiver' : 'Révoquer')}
                  </button>
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  Aucun appareil enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
