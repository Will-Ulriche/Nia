import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../../hooks/useModules';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/StatCard';
import { StudentService } from '../../services/student.service';
import { FinanceService } from '../../services/finance.service';
import { GradeService } from '../../services/grade.service';
import { SyncService } from '../../services/sync.service';

interface DashboardStats {
  totalStudents: number;
  totalTeachers?: number;
  cashBalance: number;
  totalIncomes: number;
  assessmentsThisYear: number;
  pendingSync: number;
}

const QUICK_LINKS = [
  { icon: '👩‍🎓', label: 'Élèves', to: '/direction/students', color: '#3498db' },
  { icon: '💰', label: 'Paiements', to: '/direction/finance/payments', color: '#27ae60' },
  { icon: '📝', label: 'Évaluations', to: '/direction/assessments', color: '#e67e22' },
  { icon: '📋', label: 'Bulletins', to: '/direction/bulletins', color: '#8e44ad' },
  { icon: '🕐', label: 'Présences', to: '/direction/attendance', color: '#16a085' },
  { icon: '📊', label: 'Rapports', to: '/direction/reports', color: '#2c3e50' },
];

export function DirectionDashboard() {
  const { school, isLoading: schoolLoading } = useSchool();
  const { activeYear } = useAcademic();
  const { profile } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!school || !activeYear) {
        setLoadingStats(false);
        return;
      }
      try {
        setLoadingStats(true);
        const [students, cashSummary, assessments, pendingSync] = await Promise.all([
          StudentService.listStudents(school.id),
          FinanceService.getCashRegisterSummary(school.id, activeYear.id),
          GradeService.listAssessments(school.id),
          SyncService.getPendingMutationCount(),
        ]);

        setStats({
          totalStudents: students.length,
          cashBalance: cashSummary.balance,
          totalIncomes: cashSummary.totalIncomes,
          assessmentsThisYear: assessments.length,
          pendingSync,
        });
      } catch (err) {
        console.error('[DirectionDashboard] Failed to load stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [school?.id, activeYear?.id]);

  if (schoolLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
        Chargement...
      </div>
    );
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = profile?.first_name || 'Directeur';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: '#2c3e50', margin: 0, fontWeight: 700 }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ color: '#7f8c8d', margin: '0.3rem 0 0', fontSize: '1rem' }}>
          {school ? (
            <>
              Tableau de bord de <strong style={{ color: '#34495e' }}>{school.name}</strong>
              {activeYear && <> — Année scolaire : <strong style={{ color: '#3498db' }}>{activeYear.name}</strong></>}
            </>
          ) : 'Bienvenue dans votre espace de direction.'}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard
          label="Élèves inscrits"
          value={stats?.totalStudents ?? '—'}
          icon="🎓"
          color="#3498db"
          to="/direction/students"
          loading={loadingStats}
          subtext="cette année scolaire"
        />
        <StatCard
          label="Encaissements"
          value={stats ? `${stats.totalIncomes.toLocaleString('fr-FR')} FCFA` : '—'}
          icon="💰"
          color="#27ae60"
          to="/direction/finance/payments"
          loading={loadingStats}
          subtext="paiements reçus"
        />
        <StatCard
          label="Solde caisse"
          value={stats ? `${stats.cashBalance.toLocaleString('fr-FR')} FCFA` : '—'}
          icon="🏦"
          color={stats && stats.cashBalance < 0 ? '#e74c3c' : '#16a085'}
          to="/direction/finance/caisse"
          loading={loadingStats}
          subtext="revenus — dépenses"
        />
        <StatCard
          label="Évaluations"
          value={stats?.assessmentsThisYear ?? '—'}
          icon="📝"
          color="#e67e22"
          to="/direction/assessments"
          loading={loadingStats}
          subtext="créées cette année"
        />
        <StatCard
          label="Sync en attente"
          value={stats?.pendingSync ?? '—'}
          icon={stats?.pendingSync === 0 ? '✅' : '🔄'}
          color={stats?.pendingSync === 0 ? '#27ae60' : '#e67e22'}
          loading={loadingStats}
          subtext={stats?.pendingSync === 0 ? 'données synchronisées' : 'mutations à envoyer'}
        />
      </div>

      {/* Raccourcis rapides */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: '#7f8c8d', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          Accès rapides
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '1.2rem 1rem',
                background: 'white', borderRadius: '12px', textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                color: '#34495e', fontSize: '0.9rem', fontWeight: 600,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
            >
              <span style={{ fontSize: '2rem' }}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Aide / guide si pas d'année active */}
      {!activeYear && !schoolLoading && (
        <div style={{
          background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '10px',
          padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <span style={{ fontSize: '1.8rem' }}>⚠️</span>
          <div>
            <strong style={{ color: '#856404' }}>Aucune année scolaire active</strong>
            <p style={{ margin: '0.2rem 0 0', color: '#856404', fontSize: '0.9rem' }}>
              Veuillez configurer une année scolaire active pour commencer à utiliser toutes les fonctionnalités.
            </p>
            <Link to="/direction/academic" style={{ color: '#856404', fontSize: '0.9rem', fontWeight: 700 }}>
              Configurer maintenant →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
