import React, { createContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import type { Profile } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  originalProfile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  impersonateUser: (targetProfile: Profile) => void;
  stopImpersonating: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const impersonateUser = (targetProfile: Profile) => {
    // Garde : seule l'identité réelle d'un super admin peut impersonifier,
    // et on interdit l'impersonation en cascade.
    if (profile?.role !== 'super_admin' || originalProfile) return;

    AuditService.logAction({
      schoolId: targetProfile.school_id ?? null,
      userId: session?.user?.id,
      action: 'IMPERSONATE_START',
      entityType: 'profiles',
      entityId: targetProfile.id,
      details: { targetUserId: targetProfile.id, targetRole: targetProfile.role },
    });

    setOriginalProfile(profile);
    setProfile(targetProfile);
  };

  const stopImpersonating = () => {
    if (!originalProfile) return;

    AuditService.logAction({
      schoolId: profile?.school_id ?? null,
      userId: session?.user?.id,
      action: 'IMPERSONATE_STOP',
      entityType: 'profiles',
      entityId: profile?.id,
      details: { restoredProfileId: originalProfile.id },
    });

    setProfile(originalProfile);
    setOriginalProfile(null);
  };

  useEffect(() => {
    let mounted = true;

    async function fetchSession() {
      try {
        const currentSession = await AuthService.getSession();
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            const userProfile = await AuthService.getCurrentProfile();
            setProfile(userProfile);
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Failed to load session', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (mounted) {
          const previousSession = session;
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            const userProfile = await AuthService.getCurrentProfile();
            setProfile(userProfile);
            
            // Log de connexion (seulement si ce n'est pas juste un refresh de token)
            if (!previousSession?.user || previousSession.user.id !== newSession.user.id) {
               AuditService.logAction({
                 schoolId: userProfile?.school_id ?? null,
                 userId: newSession.user.id,
                 action: 'LOGIN',
                 details: { method: 'email' }
               });
            }
          } else {
            setProfile(null);
          }
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (session?.user && profile?.school_id) {
      await AuditService.logAction({
        schoolId: profile.school_id,
        userId: session.user.id,
        action: 'LOGOUT'
      });
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, originalProfile, isLoading, signOut, impersonateUser, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}
