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
      links.push({ path: '/admin', label: 'Dashboard Global' });
      links.push({ path: '/admin/schools', label: 'Établissements' });
      links.push({ path: '/admin/devices', label: '📱 Appareils' });
      links.push({ path: '/admin/licenses', label: '🔑 Licences' });
    }

    if (isDirection) {
      links.push({ path: '/direction', label: 'Tableau de bord' });
      links.push({ path: '/direction/academic', label: 'Années scolaires' });
      links.push({ path: '/direction/structure', label: 'Structure scolaire' });
      links.push({ path: '/direction/subjects', label: 'Matières' });
      links.push({ path: '/direction/teachers', label: 'Enseignants' });
      links.push({ path: '/direction/students', label: 'Élèves' });
      links.push({ path: '/direction/timetables', label: 'Emplois du temps' });
      links.push({ path: '/direction/assessments', label: 'Évaluations & Notes' });
      links.push({ path: '/direction/averages', label: 'Résultats & Classement' });
      links.push({ path: '/direction/bulletins', label: 'Bulletins' });
      links.push({ path: '/direction/attendance', label: 'Présences & Absences' });
      links.push({ path: '/direction/finance/fees', label: 'Frais & Tranches' });
      links.push({ path: '/direction/finance/payments', label: 'Paiements (Élèves)' });
      links.push({ path: '/direction/finance/caisse', label: 'Caisse & Dépenses' });
      links.push({ path: '/direction/reports', label: 'Rapports & Statistiques' });
      links.push({ path: '/direction/audit', label: '📋 Journal d\'audit' });
      links.push({ path: '/direction/conflicts', label: '🔀 Conflits' });
      links.push({ path: '/direction/backup', label: '💾 Sauvegarde & Données' });
    }

    if (isSecretary) {
      links.push({ path: '/secretaire', label: 'Tableau de bord' });
    }

    if (isTeacher) {
      links.push({ path: '/professeur', label: 'Tableau de bord' });
    }

    // Liens communs selon permissions
    if (permissions.canManageStudents || permissions.canViewAllStudents) {
      links.push({ path: '/direction/students', label: 'Élèves' }); // Exemple, on ajustera les chemins plus tard
    }

    return links;
  };

  const navLinks = getNavLinks();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', background: '#2c3e50', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', fontWeight: 'bold', fontSize: '1.2rem', borderBottom: '1px solid #34495e' }}>
          Kemitia
        </div>
        
        <div style={{ padding: '1rem', fontSize: '0.9rem', color: '#bdc3c7', borderBottom: '1px solid #34495e' }}>
          Connecté en tant que:<br/>
          <strong style={{ color: 'white' }}>{profile?.first_name} {profile?.last_name}</strong><br/>
          ({profile?.role})
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  style={{
                    display: 'block',
                    padding: '0.75rem 1.5rem',
                    color: location.pathname === link.path ? '#3498db' : 'white',
                    textDecoration: 'none',
                    backgroundColor: location.pathname === link.path ? '#34495e' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div style={{ padding: '1rem', borderTop: '1px solid #34495e' }}>
          <button 
            onClick={() => signOut()}
            style={{ width: '100%', padding: '0.5rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Déconnexion
          </button>
        </div>
      </aside>
      
      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
        <header style={{ padding: '0.75rem 2rem', background: 'white', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <SyncStatusPanel schoolId={profile?.school_id ?? null} />
           <span style={{ color: '#666', fontSize: '0.85rem' }}>{profile?.school_id ? '🏫 Établissement lié' : '🌐 Plateforme Globale'}</span>
        </header>
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
