import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useRole } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import { useAcademic } from '../context/AcademicContext';
import { SyncStatusPanel } from '../components/SyncStatusPanel';

export function DashboardLayout() {
  const { profile, originalProfile, signOut, stopImpersonating } = useAuth();
  const { isSuperAdmin, isDirection, isSecretary, isTeacher } = useRole();
  const permissions = usePermission();
  const { activeYear, selectedYear, academicYears, setSelectedYear } = useAcademic();
  const location = useLocation();
  const navigate = useNavigate();

  const isImpersonating = !!originalProfile;

  const handleStopImpersonating = () => {
    stopImpersonating();
    navigate('/admin/users');
  };

  const getNavLinks = () => {
    const links: { path: string; label: string; icon: string; color: string }[] = [];

    if (isSuperAdmin) {
      links.push({ path: '/admin', label: 'Dashboard global', icon: 'ti-layout-dashboard', color: 'var(--text-primary)' });
      links.push({ path: '/admin/schools', label: 'Établissements', icon: 'ti-building', color: 'var(--text-accent)' });
      links.push({ path: '/admin/users', label: 'Utilisateurs', icon: 'ti-users-group', color: 'var(--text-accent)' });
      links.push({ path: '/admin/devices', label: 'Appareils', icon: 'ti-device-mobile', color: 'var(--text-success)' });
      links.push({ path: '/admin/licenses', label: 'Licences', icon: 'ti-key', color: 'var(--text-warning)' });
    }

    if (isDirection) {
      links.push({ path: '/direction', label: 'Tableau de bord', icon: 'ti-layout-dashboard', color: 'var(--text-primary)' });
      links.push({ path: '/direction/inscription', label: 'Inscription des élèves', icon: 'ti-user-plus', color: 'var(--text-primary)' });
      links.push({ path: '/direction/academic', label: 'Années scolaires', icon: 'ti-calendar', color: 'var(--text-accent)' });
      links.push({ path: '/direction/teachers', label: 'Enseignants', icon: 'ti-users', color: 'var(--text-primary)' });
      links.push({ path: '/direction/students', label: 'Élèves', icon: 'ti-school', color: 'var(--text-primary)' });
      links.push({ path: '/direction/timetables', label: 'Emplois du temps', icon: 'ti-calendar-time', color: 'var(--text-warning)' });
      links.push({ path: '/direction/assessments', label: 'Évaluations & Notes', icon: 'ti-clipboard-list', color: 'var(--text-success)' });
      links.push({ path: '/direction/averages', label: 'Résultats & Classement', icon: 'ti-chart-bar', color: 'var(--text-success)' });
      links.push({ path: '/direction/bulletins', label: 'Bulletins', icon: 'ti-file-certificate', color: 'var(--text-success)' });
      links.push({ path: '/direction/attendance', label: 'Présences & Absences', icon: 'ti-clock', color: 'var(--text-warning)' });
      links.push({ path: '/direction/finance/fees', label: 'Frais & Tranches', icon: 'ti-coin', color: 'var(--text-pro)' });
      links.push({ path: '/direction/finance/payments', label: 'Paiements', icon: 'ti-cash', color: 'var(--text-pro)' });
      links.push({ path: '/direction/finance/caisse', label: 'Caisse & Dépenses', icon: 'ti-calculator', color: 'var(--text-pro)' });
      links.push({ path: '/direction/reports', label: 'Rapports & Stats', icon: 'ti-report-analytics', color: 'var(--text-primary)' });
      links.push({ path: '/direction/audit', label: "Journal d'audit", icon: 'ti-history', color: 'var(--text-secondary)' });
      links.push({ path: '/direction/conflicts', label: 'Conflits', icon: 'ti-git-compare', color: 'var(--text-warning)' });
      links.push({ path: '/direction/backup', label: 'Sauvegarde', icon: 'ti-database', color: 'var(--text-success)' });
    }

    if (isSecretary) {
      links.push({ path: '/secretaire', label: 'Tableau de bord', icon: 'ti-layout-dashboard', color: 'var(--text-primary)' });
    }

    if (isTeacher) {
      links.push({ path: '/professeur', label: 'Tableau de bord', icon: 'ti-layout-dashboard', color: 'var(--text-primary)' });
    }

    if (!isDirection && (permissions.canManageStudents || permissions.canViewAllStudents)) {
      links.push({ path: '/direction/students', label: 'Élèves', icon: 'ti-school', color: 'var(--text-primary)' });
    }

    return links;
  };

  const navLinks = getNavLinks();
  const initials = ((profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '')).toUpperCase() || 'U';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* Bandeau d'impersonation */}
      {isImpersonating && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
          padding: '10px 24px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          color: 'white', fontSize: '14px', fontWeight: 600, flexShrink: 0,
          boxShadow: '0 2px 12px rgba(124, 58, 237, 0.4)', zIndex: 100
        }}>
          <i className="ti ti-eye" style={{ fontSize: '18px' }} />
          <span>
            Vous naviguez en tant que{' '}
            <strong>{profile?.first_name} {profile?.last_name}</strong>
            {' '}({profile?.role?.replace('_', ' ')})
          </span>
          <button
            onClick={handleStopImpersonating}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
              color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.35)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; }}
          >
            <i className="ti ti-arrow-back-up" style={{ fontSize: '16px' }} />
            Quitter le mode
          </button>
        </div>
      )}

      {/* Layout principal */}
      <div style={{ display: 'flex', flex: 1, padding: '16px', boxSizing: 'border-box', overflow: 'hidden', background: '#f0f4ff', gap: '16px' }}>

        {/* Sidebar */}
        <div style={{ flex: '0 0 240px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.5)', borderRadius: '20px', padding: '20px 16px', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 24px rgba(59, 130, 246, 0.05)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 4px 20px', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
              <i className="ti ti-school" aria-hidden="true"></i>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#1e3a5f', letterSpacing: '-0.5px' }}>Kamitia</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: isImpersonating ? 'rgba(124, 58, 237, 0.08)' : 'rgba(59, 130, 246, 0.06)', marginBottom: '20px', border: isImpersonating ? '1px solid rgba(124, 58, 237, 0.2)' : '1px solid rgba(59, 130, 246, 0.1)', flexShrink: 0 }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#fff', color: isImpersonating ? '#7c3aed' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, flexShrink: 0, boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)' }}>
              {initials}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.first_name} {profile?.last_name}
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: isImpersonating ? '#7c3aed' : '#64748b', textTransform: 'capitalize', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isImpersonating && <i className="ti ti-eye" style={{ fontSize: '10px', marginRight: '4px' }} />}
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'hidden', flex: 1, paddingRight: '4px' }}>
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                    borderRadius: '10px',
                    background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    fontSize: '14px', fontWeight: isActive ? 600 : 500, textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none',
                    flexShrink: 1, minHeight: 0
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.05)';
                      (e.currentTarget as HTMLElement).style.color = '#3b82f6';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = '#64748b';
                    }
                  }}
                >
                  <i className={`ti ${link.icon}`} style={{ fontSize: '18px', color: isActive ? '#ffffff' : link.color, flexShrink: 0 }} aria-hidden="true"></i>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: '16px', flexShrink: 0 }}>
            {isImpersonating ? (
              <button
                onClick={handleStopImpersonating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', width: '100%',
                  borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed',
                  fontSize: '14px', fontWeight: 600, border: '1px solid #ede9fe', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ede9fe'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f5f3ff'; }}
              >
                <i className="ti ti-arrow-back-up" style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true"></i>
                Quitter le mode
              </button>
            ) : (
              <button
                onClick={() => signOut()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', width: '100%',
                  borderRadius: '10px', background: '#fef2f2', color: '#dc2626',
                  fontSize: '14px', fontWeight: 600, border: '1px solid #fee2e2', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
              >
                <i className="ti ti-logout" style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true"></i>
                Déconnexion
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 12px 24px rgba(59, 130, 246, 0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(226, 232, 240, 0.6)', flexShrink: 0, background: '#fff', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
            {/* GAUCHE : Fil d'Ariane & Sélecteur d'année */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <strong style={{ color: '#1e293b' }}>Tableau de bord</strong>
              <span style={{ color: '#cbd5e1' }}>/</span>
              {academicYears.length > 0 ? (
                <select
                  value={selectedYear?.id || ''}
                  onChange={(e) => {
                    const year = academicYears.find(y => y.id === e.target.value) || null;
                    setSelectedYear(year);
                  }}
                  style={{
                    padding: '5px 12px', borderRadius: '10px', border: '1px solid #bfdbfe',
                    background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', outline: 'none', colorScheme: 'light'
                  }}
                  title="Changer l'année scolaire affichée sur le Dashboard"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      Année {y.name} {y.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ color: '#64748b' }}>
                  {activeYear ? `Année ${activeYear.name}` : 'Année en cours'}
                </span>
              )}
            </div>

            {/* DROITE : Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Barre de recherche */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: '12px', color: '#94a3b8', fontSize: '16px' }} />
                <input 
                  type="text" 
                  placeholder="Chercher un élève, un ..." 
                  style={{ padding: '8px 12px 8px 36px', borderRadius: '20px', border: '1px solid #e2e8f0', outline: 'none', width: '250px', fontSize: '13px', background: '#fff' }}
                />
                <div style={{ position: 'absolute', right: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                  ⌘K
                </div>
              </div>

              {/* Badge Synchronisé */}
              <SyncStatusPanel schoolId={profile?.school_id ?? null} />

              {/* Bouton Mode Sombre */}
              <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}>
                <i className="ti ti-moon" style={{ fontSize: '18px' }} />
              </button>

              {/* Bouton Notifications */}
              <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}>
                <i className="ti ti-bell" style={{ fontSize: '18px' }} />
              </button>
            </div>
          </div>
          <div style={{ padding: '20px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
