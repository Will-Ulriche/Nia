import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminService } from '../../services/admin.service';
import { LicenseService, type LicenseAdminRow } from '../../services/license.service';
import { StatCard } from '../../components/ui/StatCard';
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

        // Filtrer les licences actives expirant dans les 60 prochains jours
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
    <div style={{ padding: '1.5rem', maxWidth: '1200px' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: '#2c3e50', margin: 0, fontWeight: 700 }}>
          {greeting}, Super Admin 🛡️
        </h1>
        <p style={{ color: '#7f8c8d', margin: '0.3rem 0 0' }}>
          Vue d'ensemble de la plateforme Kemitia
        </p>
      </div>

      {error && (
        <div style={{ background: '#fdedec', border: '1px solid #e74c3c', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#e74c3c' }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard
          label="Établissements"
          value={stats?.total_schools ?? '—'}
          icon="🏫"
          color="#3498db"
          to="/admin/schools"
          loading={loading}
          subtext="actifs sur la plateforme"
        />
        <StatCard
          label="Utilisateurs"
          value={stats?.total_users ?? '—'}
          icon="👤"
          color="#8e44ad"
          loading={loading}
          subtext="comptes créés"
        />
        <StatCard
          label="Appareils actifs"
          value={stats?.total_devices ?? '—'}
          icon="📱"
          color="#16a085"
          to="/admin/devices"
          loading={loading}
          subtext="non révoqués"
        />
        <StatCard
          label="Licences à surveiller"
          value={expiringLicenses.length}
          icon={expiringLicenses.length > 0 ? '⚠️' : '✅'}
          color={expiringLicenses.length > 0 ? '#e74c3c' : '#27ae60'}
          to="/admin/licenses"
          loading={loading}
          subtext="expirent dans < 60 jours"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Licences proches de l'expiration */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', color: '#34495e', margin: 0, fontWeight: 600 }}>
              ⚠️ Licences à renouveler
            </h2>
            <Link to="/admin/licenses" style={{ fontSize: '0.85rem', color: '#3498db' }}>Tout voir →</Link>
          </div>
          {loading ? (
            <p style={{ color: '#95a5a6', fontSize: '0.9rem' }}>Chargement...</p>
          ) : expiringLicenses.length === 0 ? (
            <p style={{ color: '#27ae60', fontSize: '0.9rem' }}>✅ Toutes les licences sont valides pour plus de 60 jours.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {expiringLicenses.slice(0, 5).map(lic => (
                <div key={lic.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.8rem', borderRadius: '6px',
                  background: lic.daysLeft <= 15 ? '#fdedec' : '#fef9e7',
                  borderLeft: `3px solid ${lic.daysLeft <= 15 ? '#e74c3c' : '#f39c12'}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2c3e50' }}>{lic.school_name || 'École inconnue'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#7f8c8d', fontFamily: 'monospace' }}>{lic.license_key}</div>
                  </div>
                  <span style={{
                    fontWeight: 700, fontSize: '0.9rem',
                    color: lic.daysLeft <= 15 ? '#e74c3c' : '#f39c12',
                  }}>
                    {lic.daysLeft <= 0 ? 'Expiré' : `${lic.daysLeft}j`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accès rapides */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: '1rem', color: '#34495e', margin: '0 0 1rem', fontWeight: 600 }}>
            ⚡ Accès rapides
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { label: '🏫 Gérer les établissements', to: '/admin/schools', desc: 'Créer ou modifier une école' },
              { label: '🔑 Gérer les licences', to: '/admin/licenses', desc: 'Créer ou prolonger une licence' },
              { label: '📱 Gérer les appareils', to: '/admin/devices', desc: 'Révoquer un appareil compromis' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.8rem 1rem', background: '#f8f9fa', borderRadius: '8px',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#ecf0f1')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f8f9fa')}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2c3e50' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>{item.desc}</div>
                </div>
                <span style={{ color: '#bdc3c7' }}>›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
