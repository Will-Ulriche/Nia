import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, useRole } from '../hooks/useAuth';
import type { UserRole } from '../types/app';

interface ProtectedRouteProps {
  /** Rôles autorisés pour accéder à cette route. Si non spécifié, tous les utilisateurs connectés ont accès. */
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, isLoading } = useAuth();
  const { role } = useRole();

  if (isLoading) {
    return <div>Chargement de l'application...</div>;
  }

  // Non connecté
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Vérification des rôles si spécifié
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Autorisé : on affiche le composant enfant
  return <Outlet />;
}
