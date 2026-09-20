import { supabase } from './supabase';
import { getDb } from './local/db';
import { APP_VERSION } from '../utils/version';

export interface Device {
  id: string;
  school_id: string | null;
  name: string;
  app_version: string;
  last_active_at: string;
  last_sync_at: string | null;
  is_revoked: boolean;
  created_at: string;
}

export class DeviceService {
  private static deviceIdCache: string | null = null;
  private static isRevokedCache: boolean | null = null;
  private static lastRevocationCheck: number = 0;

  /**
   * Retrieves the local device ID from SQLite. Generates one if it doesn't exist.
   */
  static async getDeviceId(): Promise<string> {
    if (this.deviceIdCache) return this.deviceIdCache;

    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM sync_metadata WHERE key = 'device_id'`
    );

    if (rows.length > 0 && rows[0].value) {
      this.deviceIdCache = rows[0].value;
      return this.deviceIdCache;
    }

    // Generate new ID and save
    const newId = crypto.randomUUID();
    await db.execute(
      `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('device_id', $1)`,
      [newId]
    );
    this.deviceIdCache = newId;
    return newId;
  }

  /**
   * Registers the device in Supabase.
   */
  static async registerDevice(schoolId: string | null, name: string): Promise<void> {
    const deviceId = await this.getDeviceId();
    
    if (!schoolId) return; // Un appareil doit être lié à un établissement.

    const { error } = await supabase
      .from('school_devices')
      .upsert({
        id: deviceId,
        school_id: schoolId,
        device_name: name,
        app_version: APP_VERSION,
        last_sync_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error('[DeviceService] Failed to register device:', error);
      throw error;
    }
  }

  /**
   * Heartbeat to update last_active_at in Supabase.
   */
  static async heartbeat(): Promise<void> {
    const deviceId = await this.getDeviceId();
    const { error } = await supabase
      .from('school_devices')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', deviceId);
      
    if (error) {
      console.error('[DeviceService] Heartbeat failed:', error);
    }
  }

  /**
   * Updates last_sync_at in Supabase.
   */
  static async updateLastSync(): Promise<void> {
    const deviceId = await this.getDeviceId();
    const { error } = await supabase
      .from('school_devices')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', deviceId);
      
    if (error) {
      console.error('[DeviceService] Update last_sync_at failed:', error);
    }
  }

  /**
   * Checks if the device is revoked. Caches the result to avoid too many requests.
   */
  static async isRevoked(): Promise<boolean> {
    // Return cached result if less than 60 seconds old
    if (this.isRevokedCache !== null && Date.now() - this.lastRevocationCheck < 60000) {
      return this.isRevokedCache;
    }

    const deviceId = await this.getDeviceId();
    const { data, error } = await supabase
      .from('school_devices')
      .select('is_revoked')
      .eq('id', deviceId)
      .single();

    if (error || !data) {
      // If we can't connect, assume not revoked to allow offline work,
      // or if device doesn't exist on server yet.
      return false; 
    }

    this.isRevokedCache = data.is_revoked;
    this.lastRevocationCheck = Date.now();
    return data.is_revoked;
  }
  
  // --- Admin Methods ---
  // Note: These methods are mostly replaced by AdminService, kept for compatibility if needed.

  static async getDevicesBySchool(schoolId: string | null): Promise<Device[]> {
    let query = supabase.from('school_devices').select('*').order('created_at', { ascending: false });
    if (schoolId) {
        query = query.eq('school_id', schoolId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async setRevocationStatus(deviceId: string, isRevoked: boolean): Promise<void> {
    const { error } = await supabase
      .from('school_devices')
      .update({ is_revoked: isRevoked })
      .eq('id', deviceId);
    if (error) throw error;
  }
  
  static async assignToSchool(deviceId: string, schoolId: string): Promise<void> {
      const { error } = await supabase
        .from('school_devices')
        .update({ school_id: schoolId })
        .eq('id', deviceId);
      if (error) throw error;
  }
}
