import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { SyncService } from './services/sync.service';
import { SchoolProvider } from './context/SchoolContext';
import { AcademicProvider } from './context/AcademicContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DeviceRegistrationModal } from './components/DeviceRegistrationModal';
import { LicenseGuard } from './components/LicenseGuard';
import { Login } from './pages/Login';
import { Unauthorized } from './pages/Unauthorized';
import { RoleRedirect } from './components/RoleRedirect';

import { SuperAdminDashboard } from './pages/dashboards/SuperAdminDashboard';
import { DirectionDashboard } from './pages/dashboards/DirectionDashboard';
import { SecretaireDashboard } from './pages/dashboards/SecretaireDashboard';
import { ProfesseurDashboard } from './pages/dashboards/ProfesseurDashboard';
import { DevicesList } from './pages/superadmin/DevicesList';
import { LicensesList } from './pages/superadmin/LicensesList';

import { AcademicYearsList } from './pages/direction/academic-years/AcademicYearsList';
import { AcademicYearDetails } from './pages/direction/academic-years/AcademicYearDetails';

import { SectionsList } from './pages/direction/structure/SectionsList';
import { LevelsList } from './pages/direction/structure/LevelsList';
import { ClassesList } from './pages/direction/structure/ClassesList';
import { SeriesList } from './pages/direction/structure/SeriesList';

import { SubjectsList } from './pages/direction/subjects/SubjectsList';

import { TeachersList } from './pages/direction/teachers/TeachersList';
import { TeacherDetails } from './pages/direction/teachers/TeacherDetails';

import { StudentsList } from './pages/direction/students/StudentsList';
import { StudentDetails } from './pages/direction/students/StudentDetails';

import { TimetablesList } from './pages/direction/timetables/TimetablesList';

import { AssessmentsList } from './pages/direction/grades/AssessmentsList';
import { AssessmentGrades } from './pages/direction/grades/AssessmentGrades';
import { AveragesList } from './pages/direction/grades/AveragesList';

import { BulletinsList } from './pages/direction/bulletins/BulletinsList';

import { AttendancePage } from './pages/direction/attendance/AttendancePage';

import { FeeDefinitionsList } from './pages/direction/finance/FeeDefinitionsList';
import { PaymentsList } from './pages/direction/finance/PaymentsList';
import { CashRegister } from './pages/direction/finance/CashRegister';
import { ReportsDashboard } from './pages/direction/reports/ReportsDashboard';
import { AuditLogsList } from './pages/direction/reports/AuditLogsList';
import { ConflictsPage } from './pages/direction/sync/ConflictsPage';
import { BackupPage } from './pages/direction/backup/BackupPage';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { BackupService } from './services/backup.service';

import './App.css';

function AppInner() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.school_id) return;

    // Démarrage : pull initial pour avoir les données les plus récentes
    SyncService.startAutoSync(profile.school_id);

    // Intercepter la fermeture de la fenêtre pour la sauvegarde automatique
    const setupCloseHandler = async () => {
      const appWindow = getCurrentWindow();
      const unlisten = await appWindow.onCloseRequested(async (event) => {
        // Empêcher la fermeture immédiate
        event.preventDefault();
        try {
          console.log('[App] Fermeture détectée, création de la sauvegarde automatique...');
          await BackupService.createAutoBackup();
        } catch (err) {
          console.error('[App] Erreur lors de la sauvegarde auto:', err);
        } finally {
          // Fermer l'application après la sauvegarde
          await appWindow.destroy();
        }
      });
      return unlisten;
    };
    
    let unlistenClose: (() => void) | undefined;
    setupCloseHandler().then(u => { unlistenClose = u; });

    // Reconnexion réseau : full sync (push mutations pendantes PUIS pull)
    const handleOnline = () => {
      console.log('[App] Network restored — triggering full sync');
      SyncService.fullSync(profile.school_id).catch(e =>
        console.error('[App] Full sync on reconnect failed:', e)
      );
    };
    window.addEventListener('online', handleOnline);

    return () => {
      SyncService.stopAutoSync();
      window.removeEventListener('online', handleOnline);
      if (unlistenClose) unlistenClose();
    };
  }, [profile?.school_id]);

  return (
    <>
      <DeviceRegistrationModal />
      <LicenseGuard />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
        <SchoolProvider>
          <AcademicProvider>
            <Routes>
              {/* Routes publiques */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Redirection intelligente à la racine */}
              <Route path="/" element={<RoleRedirect />} />

              {/* Routes Super Admin */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin" element={<SuperAdminDashboard />} />
                  <Route path="/admin/devices" element={<DevicesList />} />
                  <Route path="/admin/licenses" element={<LicensesList />} />
                </Route>
              </Route>

              {/* Routes Direction */}
              <Route element={<ProtectedRoute allowedRoles={['direction']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/direction" element={<DirectionDashboard />} />
                  <Route path="/direction/academic" element={<AcademicYearsList />} />
                  <Route path="/direction/academic/:yearId" element={<AcademicYearDetails />} />
                  <Route path="/direction/structure" element={<SectionsList />} />
                  <Route path="/direction/structure/sections/:sectionId/levels" element={<LevelsList />} />
                  <Route path="/direction/structure/sections/:sectionId/levels/:levelId/series" element={<SeriesList />} />
                  <Route path="/direction/structure/levels/:levelId/classes" element={<ClassesList />} />
                  <Route path="/direction/subjects" element={<SubjectsList />} />
                  <Route path="/direction/teachers" element={<TeachersList />} />
                  <Route path="/direction/teachers/:teacherId" element={<TeacherDetails />} />
                  <Route path="/direction/students" element={<StudentsList />} />
                  <Route path="/direction/students/:studentId" element={<StudentDetails />} />
                  <Route path="/direction/timetables" element={<TimetablesList />} />
                  <Route path="/direction/assessments" element={<AssessmentsList />} />
                  <Route path="/direction/assessments/:assessmentId" element={<AssessmentGrades />} />
                  <Route path="/direction/averages" element={<AveragesList />} />
                  <Route path="/direction/bulletins" element={<BulletinsList />} />
                  <Route path="/direction/attendance" element={<AttendancePage />} />
                  <Route path="/direction/finance/fees" element={<FeeDefinitionsList />} />
                  <Route path="/direction/finance/payments" element={<PaymentsList />} />
                  <Route path="/direction/finance/caisse" element={<CashRegister />} />
                  <Route path="/direction/reports" element={<ReportsDashboard />} />
                  <Route path="/direction/audit" element={<AuditLogsList />} />
                  <Route path="/direction/backup" element={<BackupPage />} />
                  <Route path="/direction/conflicts" element={<ConflictsPage />} />
                </Route>
              </Route>

              {/* Routes Secrétaire */}
              <Route element={<ProtectedRoute allowedRoles={['secretaire']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/secretaire" element={<SecretaireDashboard />} />
                </Route>
              </Route>

              {/* Routes Professeur */}
              <Route element={<ProtectedRoute allowedRoles={['professeur']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/professeur" element={<ProfesseurDashboard />} />
                </Route>
              </Route>
              
            </Routes>
          </AcademicProvider>
        </SchoolProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
