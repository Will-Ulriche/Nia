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
          .filter(l => l.daysLeft <= 10)
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', padding: '0', gap: '1.5vh' }}>
      {/* En-tête */}
      <div style={{ flexShrink: 0, background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)', padding: 'max(16px, 2vh) max(20px, 2vw)', borderRadius: '16px', color: 'white', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '200px', height: '200px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', filter: 'blur(20px)' }}></div>
        <h2 style={{ fontSize: 'clamp(20px, 2.5vh, 28px)', margin: 0, fontWeight: 800, letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{greeting}, Super Admin</h2>
        <p style={{ margin: '4px 0 0', fontSize: 'clamp(12px, 1.5vh, 14px)', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Vue d'ensemble de la plateforme Nia</p>
      </div>

      {error && (
        <div style={{ flexShrink: 0, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px', color: '#dc2626', fontSize: 'clamp(12px, 1.5vh, 14px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: '18px' }} aria-hidden="true"></i>
          {error}
        </div>
      )}

      {/* 4 Cards Grid */}
      <div style={{ flex: '1 1 auto', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'clamp(8px, 1.5vw, 16px)', minHeight: 0 }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', borderTop: '4px solid #3b82f6', padding: 'clamp(12px, 2vh, 24px)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)', border: '1px solid rgba(226, 232, 240, 0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: 'clamp(10px, 1.2vw, 13px)', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Établissements</span>
            <span style={{ width: 'clamp(24px, 2.5vw, 36px)', height: 'clamp(24px, 2.5vw, 36px)', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(16px, 1.5vw, 20px)', flexShrink: 0 }}><i className="ti ti-building" aria-hidden="true"></i></span>
          </div>
          <p style={{ margin: 'clamp(4px, 1vh, 14px) 0 0', fontSize: 'clamp(20px, 3.5vh, 36px)', fontWeight: 800, color: '#1e3a5f' }}>{loading ? '...' : stats?.total_schools ?? 0}</p>
          <p style={{ margin: '4px 0 0', fontSize: 'clamp(10px, 1.2vh, 12px)', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>actifs</p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', borderTop: '4px solid #8b5cf6', padding: 'clamp(12px, 2vh, 24px)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)', border: '1px solid rgba(226, 232, 240, 0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: 'clamp(10px, 1.2vw, 13px)', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Utilisateurs</span>
            <span style={{ width: 'clamp(24px, 2.5vw, 36px)', height: 'clamp(24px, 2.5vw, 36px)', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(16px, 1.5vw, 20px)', flexShrink: 0 }}><i className="ti ti-users" aria-hidden="true"></i></span>
          </div>
          <p style={{ margin: 'clamp(4px, 1vh, 14px) 0 0', fontSize: 'clamp(20px, 3.5vh, 36px)', fontWeight: 800, color: '#1e3a5f' }}>{loading ? '...' : stats?.total_users ?? 0}</p>
          <p style={{ margin: '4px 0 0', fontSize: 'clamp(10px, 1.2vh, 12px)', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>comptes créés</p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', borderTop: '4px solid #10b981', padding: 'clamp(12px, 2vh, 24px)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)', border: '1px solid rgba(226, 232, 240, 0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: 'clamp(10px, 1.2vw, 13px)', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Appareils</span>
            <span style={{ width: 'clamp(24px, 2.5vw, 36px)', height: 'clamp(24px, 2.5vw, 36px)', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(16px, 1.5vw, 20px)', flexShrink: 0 }}><i className="ti ti-device-mobile" aria-hidden="true"></i></span>
          </div>
          <p style={{ margin: 'clamp(4px, 1vh, 14px) 0 0', fontSize: 'clamp(20px, 3.5vh, 36px)', fontWeight: 800, color: '#1e3a5f' }}>{loading ? '...' : stats?.total_devices ?? 0}</p>
          <p style={{ margin: '4px 0 0', fontSize: 'clamp(10px, 1.2vh, 12px)', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>non révoqués</p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', borderTop: '4px solid #f59e0b', padding: 'clamp(12px, 2vh, 24px)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)', border: '1px solid rgba(226, 232, 240, 0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: 'clamp(10px, 1.2vw, 13px)', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Licences</span>
            <span style={{ width: 'clamp(24px, 2.5vw, 36px)', height: 'clamp(24px, 2.5vw, 36px)', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(16px, 1.5vw, 20px)', flexShrink: 0 }}><i className="ti ti-key" aria-hidden="true"></i></span>
          </div>
          <p style={{ margin: 'clamp(4px, 1vh, 14px) 0 0', fontSize: 'clamp(20px, 3.5vh, 36px)', fontWeight: 800, color: '#1e3a5f' }}>{loading ? '...' : expiringLicenses.length}</p>
          <p style={{ margin: '4px 0 0', fontSize: 'clamp(10px, 1.2vh, 12px)', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>&lt; 10 jours</p>
        </div>
      </div>

      {/* 2 Bottom Blocks */}
      <div style={{ flex: '1 1 auto', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'clamp(8px, 1.5vw, 20px)', minHeight: 0 }}>
        
        {/* Licences block */}
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226, 232, 240, 0.6)', borderRadius: '16px', padding: 'clamp(12px, 2vh, 24px)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '1vh', flexShrink: 0 }}>
            <span style={{ fontSize: 'clamp(14px, 2vh, 18px)', fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Licences à renouveler
            </span>
            <Link to="/admin/licenses" style={{ fontSize: 'clamp(12px, 1.5vh, 14px)', fontWeight: 600, color: '#3b82f6', textDecoration: 'none', flexShrink: 0 }}>Tout voir</Link>
          </div>
          
          {loading ? (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '16px' }}>
               <span className="spinner" style={{ borderColor: '#e2e8f0', borderTopColor: '#3b82f6', width: '24px', height: '24px' }}></span>
               <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Chargement...</p>
             </div>
          ) : expiringLicenses.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
              <i className="ti ti-shield-check" style={{ fontSize: 'clamp(24px, 4vh, 36px)', color: '#10b981' }} aria-hidden="true"></i>
              <p style={{ margin: 0, fontSize: 'clamp(12px, 1.8vh, 15px)', color: '#059669', textAlign: 'center', lineHeight: '1.5', fontWeight: 500 }}>
                Toutes les licences sont valides<br />pour plus de 10 jours.
              </p>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {expiringLicenses.slice(0, 4).map(lic => (
                <div key={lic.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(8px, 1.2vh, 12px)', background: '#fff', borderRadius: '10px', borderLeft: `4px solid ${lic.daysLeft <= 15 ? '#ef4444' : '#f59e0b'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', flexShrink: 0 }}>
                   <div style={{ minWidth: 0 }}>
                     <div style={{ fontSize: 'clamp(12px, 1.5vh, 14px)', fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lic.school_name || 'École inconnue'}</div>
                     <div style={{ fontSize: 'clamp(10px, 1.2vh, 12px)', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>{lic.license_key.substring(0, 8)}...</div>
                   </div>
                   <span style={{ fontSize: 'clamp(12px, 1.5vh, 14px)', fontWeight: 700, color: lic.daysLeft <= 15 ? '#ef4444' : '#f59e0b', background: lic.daysLeft <= 15 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '8px', flexShrink: 0 }}>
                     {lic.daysLeft <= 0 ? 'Expiré' : `${lic.daysLeft}j`}
                   </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accès rapides */}
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226, 232, 240, 0.6)', borderRadius: '16px', padding: 'clamp(12px, 2vh, 24px)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 'clamp(14px, 2vh, 18px)', fontWeight: 700, color: '#1e3a5f', marginBottom: '1vh', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Accès rapides
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1vh', minHeight: 0 }}>
            <Link to="/admin/schools" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: 'clamp(8px, 1.2vh, 16px)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.05)', textDecoration: 'none', transition: 'all 0.2s', minHeight: 0 }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.1)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.05)'; }}>
              <span style={{ width: 'clamp(32px, 4vh, 40px)', height: 'clamp(32px, 4vh, 40px)', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(16px, 2vh, 20px)', boxShadow: '0 4px 8px rgba(59, 130, 246, 0.2)', flexShrink: 0 }}><i className="ti ti-building" aria-hidden="true"></i></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 'clamp(12px, 1.6vh, 15px)', fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Gérer les établissements</span><span style={{ display: 'block', fontSize: 'clamp(10px, 1.2vh, 12px)', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Créer ou modifier une école</span></span>
              <i className="ti ti-chevron-right" style={{ fontSize: 'clamp(16px, 2vh, 20px)', color: '#3b82f6', flexShrink: 0 }} aria-hidden="true"></i>
            </Link>
            <Link to="/admin/licenses" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: 'clamp(8px, 1.2vh, 16px)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.05)', textDecoration: 'none', transition: 'all 0.2s', minHeight: 0 }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245, 158, 11, 0.1)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245, 158, 11, 0.05)'; }}>
              <span style={{ width: 'clamp(32px, 4vh, 40px)', height: 'clamp(32px, 4vh, 40px)', borderRadius: '10px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(16px, 2vh, 20px)', boxShadow: '0 4px 8px rgba(245, 158, 11, 0.2)', flexShrink: 0 }}><i className="ti ti-key" aria-hidden="true"></i></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 'clamp(12px, 1.6vh, 15px)', fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Gérer les licences</span><span style={{ display: 'block', fontSize: 'clamp(10px, 1.2vh, 12px)', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Créer ou prolonger une licence</span></span>
              <i className="ti ti-chevron-right" style={{ fontSize: 'clamp(16px, 2vh, 20px)', color: '#f59e0b', flexShrink: 0 }} aria-hidden="true"></i>
            </Link>
            <Link to="/admin/users" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: 'clamp(8px, 1.2vh, 16px)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.2)', background: 'rgba(139, 92, 246, 0.05)', textDecoration: 'none', transition: 'all 0.2s', minHeight: 0 }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.1)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.05)'; }}>
              <span style={{ width: 'clamp(32px, 4vh, 40px)', height: 'clamp(32px, 4vh, 40px)', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(16px, 2vh, 20px)', boxShadow: '0 4px 8px rgba(139, 92, 246, 0.2)', flexShrink: 0 }}><i className="ti ti-users" aria-hidden="true"></i></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 'clamp(12px, 1.6vh, 15px)', fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Gérer les utilisateurs</span><span style={{ display: 'block', fontSize: 'clamp(10px, 1.2vh, 12px)', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Créer des comptes pour le personnel</span></span>
              <i className="ti ti-chevron-right" style={{ fontSize: 'clamp(16px, 2vh, 20px)', color: '#8b5cf6', flexShrink: 0 }} aria-hidden="true"></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
