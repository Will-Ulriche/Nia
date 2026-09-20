import React, { createContext, useEffect, useRef, useState } from 'react';
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
  const previousUserIdRef = useRef<string | null>(null);

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

    // Applique une session en ne rechargeant le profil RÉEL que sur un vrai
    // changement d'identité (connexion / premier chargement). Un simple refresh
    // de token ne doit PAS écraser un mode impersonation en cours, et une
    // nouvelle connexion doit toujours purger un éventuel originalProfile résiduel.
    async function applySession(newSession: Session | null) {
      const nextUserId = newSession?.user?.id ?? null;
      const userChanged = previousUserIdRef.current !== nextUserId;

      if (!newSession?.user) {
        previousUserIdRef.current = null;
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setOriginalProfile(null);
        }
        return;
      }

      if (userChanged) {
        const userProfile = await AuthService.getCurrentProfile();
        if (!mounted) return;
        setProfile(userProfile);
        setOriginalProfile(null);

        // Log de connexion (uniquement au vrai changement, pas au refresh)
        AuditService.logAction({
          schoolId: userProfile?.school_id ?? null,
          userId: newSession.user.id,
          action: 'LOGIN',
          details: { method: 'email' }
        });
      }

      if (mounted) {
        setSession(newSession);
        setUser(newSession.user ?? null);
      }
      previousUserIdRef.current = nextUserId;
    }

    async function fetchSession() {
      try {
        const currentSession = await AuthService.getSession();
        if (mounted) {
          await applySession(currentSession);
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
          await applySession(newSession);
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
    setOriginalProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, originalProfile, isLoading, signOut, impersonateUser, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}
