import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth, useRole } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import { SyncStatusPanel } from '../components/SyncStatusPanel';

export function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const { isSuperAdmin, isDirection, isSecretary, isTeacher } = useRole();
  const permissions = usePermission();
  const location = useLocation();

  const getNavLinks = () => {
    const links = [];

    if (isSuperAdmin) {
      links.push({ path: '/admin', label: 'Dashboard global', icon: 'ti-layout-dashboard', color: 'var(--text-primary)' });
      links.push({ path: '/admin/schools', label: 'Établissements', icon: 'ti-building', color: 'var(--text-accent)' });
      links.push({ path: '/admin/devices', label: 'Appareils', icon: 'ti-device-mobile', color: 'var(--text-success)' });
      links.push({ path: '/admin/licenses', label: 'Licences', icon: 'ti-key', color: 'var(--text-warning)' });
    }

    if (isDirection) {
      links.push({ path: '/direction', label: 'Tableau de bord', icon: 'ti-layout-dashboard', color: 'var(--text-primary)' });
      links.push({ path: '/direction/academic', label: 'Années scolaires', icon: 'ti-calendar', color: 'var(--text-accent)' });
      links.push({ path: '/direction/structure', label: 'Structure scolaire', icon: 'ti-sitemap', color: 'var(--text-accent)' });
      links.push({ path: '/direction/subjects', label: 'Matières', icon: 'ti-book', color: 'var(--text-accent)' });
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
      links.push({ path: '/direction/audit', label: 'Journal d\'audit', icon: 'ti-history', color: 'var(--text-secondary)' });
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
    <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: 0, height: '100vh', overflow: 'hidden', background: 'var(--surface-2)' }}>
      
      {/* Sidebar */}
      <div style={{ background: 'var(--surface-1)', borderRight: '0.5px solid var(--border)', padding: '28px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 8px 22px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--fill-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: '22px' }}>
            <i className="ti ti-school" aria-hidden="true"></i>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)' }}>Kemitia</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: 'var(--radius)', background: 'var(--bg-pro)', marginBottom: '28px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--fill-pro)', color: 'var(--on-pro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-pro)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.first_name} {profile?.last_name}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-pro)', textTransform: 'capitalize' }}>
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  background: isActive ? 'var(--fill-accent)' : 'transparent',
                  color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                  fontSize: '16px',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none'
                }}
              >
                <i className={`ti ${link.icon}`} style={{ fontSize: '22px', color: isActive ? 'inherit' : link.color }} aria-hidden="true"></i>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '28px', borderTop: '0.5px solid var(--border)' }}>
          <button 
            onClick={() => signOut()}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', width: '100%',
              borderRadius: 'var(--radius)', background: 'var(--bg-danger)', color: 'var(--text-danger)', 
              fontSize: '16px', fontWeight: 600, border: 'none', cursor: 'pointer', textAlign: 'left'
            }}
          >
            <i className="ti ti-logout" style={{ fontSize: '22px' }} aria-hidden="true"></i>
            Déconnexion
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div style={{ overflowY: 'auto' }}>
        <div style={{ padding: '28px 36px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingBottom: '22px', borderBottom: '0.5px solid var(--border)' }}>
            <SyncStatusPanel schoolId={profile?.school_id ?? null} />
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '15px', fontWeight: 500, padding: '7px 15px', borderRadius: '99px', background: 'var(--bg-accent)', color: 'var(--text-accent)' }}>
              {profile?.school_id ? 'Établissement lié' : 'Plateforme globale'}
            </span>
          </div>
          
          <Outlet />
        </div>
      </div>
    </div>
  );
}
