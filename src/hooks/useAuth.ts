import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { UserRole } from '../types/app';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Utilitaires pour vérifier les rôles courants
 */
export function useRole() {
  const { profile } = useAuth();
  
  return {
    role: profile?.role as UserRole | undefined,
    isSuperAdmin: profile?.role === 'super_admin',
    isDirection: profile?.role === 'direction',
    isTeacher: profile?.role === 'professeur',
    isSecretary: profile?.role === 'secretaire',
  };
}
