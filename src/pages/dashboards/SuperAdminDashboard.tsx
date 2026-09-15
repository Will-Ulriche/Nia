import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminService } from '../../services/admin.service';
import { LicenseService, type LicenseAdminRow } from '../../services/license.service';
import type { AdminStats } from '../../types/app';

interface ExpiringLicense extends LicenseAdminRow {
  daysLeft: number;
}

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [expiringLicenses, setExpiringLicenses] = useState<ExpiringLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [statsData, licensesData] = await Promise.all([
          AdminService.getStats(),
          LicenseService.listLicenses(),
        ]);

        if (!mounted) return;
        setStats(statsData);

        const now = Date.now();
        const expiring = licensesData
          .filter(l => l.status === 'active' && l.valid_until)
          .map(l => ({
            ...l,
            daysLeft: Math.ceil((new Date(l.valid_until!).getTime() - now) / (1000 * 60 * 60 * 24)),
          }))
          .filter(l => l.daysLeft <= 60)
          .sort((a, b) => a.daysLeft - b.daysLeft);

        setExpiringLicenses(expiring);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <>
      <div style={{ margin: '28px 0 20px' }}>
        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 600 }}>{greeting}, Super Admin</h2>
        <p style={{ margin: '6px 0 0', fontSize: '16px', color: 'var(--text-secondary)' }}>Vue d'ensemble de la plateforme Kemitia</p>
      </div>

      {error && (
        <div style={{ background: 'var(--bg-danger)', border: '1px solid var(--text-danger)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '24px', color: 'var(--text-danger)', fontSize: '15px' }}>
          <i className="ti ti-alert-triangle" style={{ marginRight: '8px' }} aria-hidden="true"></i>
          {error}
        </div>
      )}

      {/* 4 Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', borderTop: '4px solid var(--fill-accent)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' }}>Établissements</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-accent)', color: 'var(--text-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><i className="ti ti-building" aria-hidden="true"></i></span>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: '36px', fontWeight: 600 }}>{loading ? '...' : stats?.total_schools ?? 0}</p>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>actifs</p>
        </div>
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', borderTop: '4px solid var(--fill-pro)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' }}>Utilisateurs</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-pro)', color: 'var(--text-pro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><i className="ti ti-users" aria-hidden="true"></i></span>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: '36px', fontWeight: 600 }}>{loading ? '...' : stats?.total_users ?? 0}</p>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>comptes créés</p>
        </div>
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', borderTop: '4px solid var(--fill-success)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' }}>Appareils</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-success)', color: 'var(--text-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><i className="ti ti-device-mobile" aria-hidden="true"></i></span>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: '36px', fontWeight: 600 }}>{loading ? '...' : stats?.total_devices ?? 0}</p>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>non révoqués</p>
        </div>
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', borderTop: '4px solid var(--fill-warning)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' }}>Licences</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-warning)', color: 'var(--text-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}><i className="ti ti-key" aria-hidden="true"></i></span>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: '36px', fontWeight: 600 }}>{loading ? '...' : expiringLicenses.length}</p>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>&lt; 60 jours</p>
        </div>
      </div>

      {/* 2 Bottom Blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: '20px', marginTop: '24px' }}>
        
        {/* Licences block */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '17px', fontWeight: 600 }}>
              Licences à renouveler
            </span>
            <Link to="/admin/licenses" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-accent)', textDecoration: 'none' }}>Tout voir</Link>
          </div>
          
          {loading ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '32px 16px', background: 'var(--surface-1)', borderRadius: 'var(--radius)' }}>
               <span className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--text-accent)', width: '24px', height: '24px' }}></span>
               <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>Chargement...</p>
             </div>
          ) : expiringLicenses.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '32px 16px', background: 'var(--bg-success)', borderRadius: 'var(--radius)' }}>
              <i className="ti ti-shield-check" style={{ fontSize: '36px', color: 'var(--text-success)' }} aria-hidden="true"></i>
              <p style={{ margin: 0, fontSize: '16px', color: 'var(--text-success)', textAlign: 'center', lineHeight: '1.5' }}>
                Toutes les licences sont valides<br />pour plus de 60 jours.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {expiringLicenses.slice(0, 4).map(lic => (
                <div key={lic.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface-1)', borderRadius: 'var(--radius)', borderLeft: `4px solid ${lic.daysLeft <= 15 ? 'var(--text-danger)' : 'var(--text-warning)'}` }}>
                   <div style={{ minWidth: 0 }}>
                     <div style={{ fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lic.school_name || 'École inconnue'}</div>
                     <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{lic.license_key.substring(0, 8)}...</div>
                   </div>
                   <span style={{ fontSize: '16px', fontWeight: 700, color: lic.daysLeft <= 15 ? 'var(--text-danger)' : 'var(--text-warning)' }}>
                     {lic.daysLeft <= 0 ? 'Expiré' : `${lic.daysLeft}j`}
                   </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accès rapides */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: '16px' }}>
            Accès rapides
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Link to="/admin/schools" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border-accent)', background: 'var(--bg-accent-muted)', textDecoration: 'none' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bg-accent)', color: 'var(--text-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}><i className="ti ti-building" aria-hidden="true"></i></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Gérer les établissements</span><span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Créer ou modifier une école</span></span>
              <i className="ti ti-chevron-right" style={{ fontSize: '22px', color: 'var(--text-accent)' }} aria-hidden="true"></i>
            </Link>
            <Link to="/admin/licenses" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border-warning)', textDecoration: 'none' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bg-warning)', color: 'var(--text-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}><i className="ti ti-key" aria-hidden="true"></i></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Gérer les licences</span><span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Créer ou prolonger une licence</span></span>
              <i className="ti ti-chevron-right" style={{ fontSize: '22px', color: 'var(--text-warning)' }} aria-hidden="true"></i>
            </Link>
            <Link to="/admin/devices" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border-success)', textDecoration: 'none' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bg-success)', color: 'var(--text-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}><i className="ti ti-device-mobile" aria-hidden="true"></i></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Gérer les appareils</span><span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Révoquer un appareil compromis</span></span>
              <i className="ti ti-chevron-right" style={{ fontSize: '22px', color: 'var(--text-success)' }} aria-hidden="true"></i>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
