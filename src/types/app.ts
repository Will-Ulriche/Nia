import type { School, SchoolModule, Profile } from './database';

// ---------------------------------------------------------------------------
// Payloads (données d'entrée pour les services)
// ---------------------------------------------------------------------------

export interface CreateSchoolPayload {
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateSchoolPayload {
  name?: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: Profile['role'];
  school_id: string | null;
  first_name: string;
  last_name: string;
}

export interface UpdateUserPayload {
  role?: Profile['role'];
  first_name?: string;
  last_name?: string;
  school_id?: string | null;
}

// ---------------------------------------------------------------------------
// Réponses enrichies
// ---------------------------------------------------------------------------

export interface SchoolWithModules extends School {
  modules: SchoolModule[];
}

export interface AdminStats {
  total_schools: number;
  total_users: number;
  total_devices: number;
  pending_sync_count: number;
}

// ---------------------------------------------------------------------------
// États de l'application
// ---------------------------------------------------------------------------

export type SyncStatus =
  | 'synced'
  | 'syncing'
  | 'offline'
  | 'pending'
  | 'error';

export interface SyncState {
  status: SyncStatus;
  pending_changes: number;
  last_sync_at: string | null;
  error_message: string | null;
}

export type UserRole = Profile['role'];
export type ModuleName = SchoolModule['module_name'];
