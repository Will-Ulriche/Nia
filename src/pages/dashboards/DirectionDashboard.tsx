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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', padding: '0', gap: '2vh' }}>
      {/* En-tête */}
      <div style={{ flexShrink: 0, background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)', padding: 'max(16px, 2vh) max(20px, 2vw)', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '200px', height: '200px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', filter: 'blur(20px)' }}></div>
        <h1 style={{ fontSize: 'clamp(20px, 2.5vh, 28px)', margin: 0, fontWeight: 800, letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '4px 0 0', fontSize: 'clamp(12px, 1.5vh, 14px)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {school ? (
            <>
              Tableau de bord de <strong style={{ color: 'white' }}>{school.name}</strong>
              {activeYear && <> — Année scolaire : <strong style={{ color: '#bfdbfe' }}>{activeYear.name}</strong></>}
            </>
          ) : 'Bienvenue dans votre espace de direction.'}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 'clamp(8px, 1.5vw, 16px)', flex: '1 1 auto', minHeight: 0 }}>
        <StatCard
          label="Élèves inscrits"
          value={stats?.totalStudents ?? '—'}
          icon="🎓"
          color="#3b82f6"
          to="/direction/students"
          loading={loadingStats}
          subtext="cette année scolaire"
        />
        <StatCard
          label="Encaissements"
          value={stats ? `${stats.totalIncomes.toLocaleString('fr-FR')} F` : '—'}
          icon="💰"
          color="#10b981"
          to="/direction/finance/payments"
          loading={loadingStats}
          subtext="paiements reçus"
        />
        <StatCard
          label="Solde caisse"
          value={stats ? `${stats.cashBalance.toLocaleString('fr-FR')} F` : '—'}
          icon="🏦"
          color={stats && stats.cashBalance < 0 ? '#ef4444' : '#10b981'}
          to="/direction/finance/caisse"
          loading={loadingStats}
          subtext="revenus — dépenses"
        />
        <StatCard
          label="Évaluations"
          value={stats?.assessmentsThisYear ?? '—'}
          icon="📝"
          color="#f59e0b"
          to="/direction/assessments"
          loading={loadingStats}
          subtext="créées cette année"
        />
        <StatCard
          label="Sync en attente"
          value={stats?.pendingSync ?? '—'}
          icon={stats?.pendingSync === 0 ? '✅' : '🔄'}
          color={stats?.pendingSync === 0 ? '#10b981' : '#f59e0b'}
          loading={loadingStats}
          subtext={stats?.pendingSync === 0 ? 'données synchronisées' : 'mutations à envoyer'}
        />
      </div>

      {/* Raccourcis rapides */}
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h2 style={{ flexShrink: 0, fontSize: 'clamp(14px, 1.8vh, 16px)', color: '#1e3a5f', margin: '0 0 1vh', fontWeight: 700, letterSpacing: '-0.2px' }}>
          Accès rapides
        </h2>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 'clamp(8px, 1.5vw, 16px)', minHeight: 0 }}>
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 'clamp(4px, 1vh, 8px)', padding: 'clamp(8px, 1vw, 16px)',
                background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)',
                borderRadius: '16px', textDecoration: 'none', border: '1px solid rgba(226, 232, 240, 0.6)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                color: '#1e3a5f', fontSize: 'clamp(11px, 1.2vw, 14px)', fontWeight: 600,
                textAlign: 'center', minHeight: 0
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.1)'; (e.currentTarget as HTMLElement).style.border = '1px solid rgba(59, 130, 246, 0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.05)'; (e.currentTarget as HTMLElement).style.border = '1px solid rgba(226, 232, 240, 0.6)'; }}
            >
              <span style={{ fontSize: 'clamp(20px, 3vh, 28px)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{link.icon}</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{link.label}</span>
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
