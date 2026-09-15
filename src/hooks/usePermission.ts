import { useRole } from './useAuth';

export function usePermission() {
  const { isSuperAdmin, isDirection, isSecretary, isTeacher } = useRole();

  // Direction a généralement accès à tout dans son établissement
  // Secrétaire a accès aux tâches administratives et financières
  // Professeur a accès à ses classes, matières, notes
  // SuperAdmin a accès à toute la plateforme

  return {
    // --- Direction ---
    canManageSchool: isDirection,
    canManageUsers: isDirection,
    canManageClasses: isDirection,
    canManageSubjects: isDirection,
    canManageTeachers: isDirection,
    canViewAllStudents: isDirection || isSecretary,
    canViewReports: isDirection,

    // --- Secrétaire ---
    canManageStudents: isDirection || isSecretary,
    canManageEnrollments: isDirection || isSecretary,
    canManagePayments: isDirection || isSecretary,
    canManageReceipts: isDirection || isSecretary,
    canViewPayments: isDirection || isSecretary,

    // --- Professeur ---
    canViewMyClasses: isTeacher,
    canViewMySubjects: isTeacher,
    canViewMyStudents: isTeacher,
    canEnterGrades: isTeacher || isDirection, // La direction peut parfois éditer les notes
    canTakeAttendance: isTeacher || isDirection || isSecretary,
    
    // --- Super Admin ---
    canManagePlatform: isSuperAdmin,
  };
}
