import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RoleRedirect() {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  switch (profile.role) {
    case 'super_admin':
      return <Navigate to="/admin" replace />;
    case 'direction':
      return <Navigate to="/direction" replace />;
    case 'secretaire':
      return <Navigate to="/secretaire" replace />;
    case 'professeur':
      return <Navigate to="/professeur" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}
