import { supabase } from './supabase';
import { getDb, ENABLE_REMOTE_SYNC } from './local/db';
import { ConflictService } from './conflict.service';
import { DeviceService } from './device.service';

// All tables to sync, in dependency order (parents before children)
const SYNC_TABLES = [
  'academic_years',
  'periods',
  'sections',
  'levels',
  'series',
  'classes',
  'students',
  'teachers',
  'subjects',
  'enrollments',
  'teacher_assignments',
  'schedules',
  'assessments',
  'grades',
  'averages',
  'attendance',
  'fee_definitions',
  'payments',
  'receipts',
  'expenses',
];

// Columns to insert per table (explicit to avoid type issues with SQLite)
const TABLE_COLUMNS: Record<string, string[]> = {
  academic_years: ['id','school_id','name','start_date','end_date','is_active','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  periods: ['id','school_id','academic_year_id','name','start_date','end_date','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  sections: ['id','school_id','name','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  levels: ['id','school_id','section_id','name','level_order','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  series: ['id','school_id','level_id','name','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  classes: ['id','school_id','level_id','academic_year_id','series_id','name','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  students: ['id','school_id','matricule','first_name','last_name','gender','birth_date','birth_place','address','contact_phone','contact_email','parent_name','parent_contact','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  teachers: ['id','school_id','profile_id','first_name','last_name','contact_phone','contact_email','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  enrollments: ['id','school_id','student_id','class_id','academic_year_id','status','enrollment_date','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  subjects: ['id','school_id','name','code','description','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  teacher_assignments: ['id','school_id','teacher_id','subject_id','class_id','academic_year_id','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  schedules: ['id','school_id','academic_year_id','class_id','subject_id','teacher_id','day_of_week','start_time','end_time','room','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  assessments: ['id','school_id','class_id','subject_id','period_id','teacher_id','title','assessment_date','total_score','weight','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  grades: ['id','school_id','assessment_id','student_id','score','is_absent','comments','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  averages: ['id','school_id','student_id','period_id','class_id','subject_id','average','rank','appreciation','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  attendance: ['id','school_id','student_id','class_id','period_id','date','status','justification','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  fee_definitions: ['id','school_id','academic_year_id','name','amount','description','is_mandatory','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  payments: ['id','school_id','student_id','academic_year_id','fee_definition_id','amount','payment_date','payment_method','reference_number','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  receipts: ['id','school_id','payment_id','receipt_number','issued_by','issue_date','version','created_at','updated_at','updated_by','device_id','deleted_at'],
  expenses: ['id','school_id','academic_year_id','category','amount','expense_date','description','recorded_by','version','created_at','updated_at','updated_by','device_id','deleted_at'],
};

// Boolean columns that need conversion from JS boolean → SQLite integer (0/1)
const BOOLEAN_COLUMNS: Record<string, string[]> = {
  academic_years: ['is_active'],
  grades: ['is_absent'],
  fee_definitions: ['is_mandatory'],
};

// Max retry attempts before giving up on a mutation
const MAX_RETRIES = 3;

let pullInterval: ReturnType<typeof setInterval> | null = null;

// ================================================================
// Helpers
// ================================================================

async function getLastSyncAt(): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM sync_metadata WHERE key = 'last_sync_at'`
  );
  return rows.length ? rows[0].value : null;
}

async function setLastSyncAt(timestamp: string) {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('last_sync_at', $1)`,
    [timestamp]
  );
}

// ================================================================
// SyncService
// ================================================================
export class SyncService {
  /**
   * PULL INCRÉMENTAL — télécharge uniquement les lignes modifiées depuis
   * le dernier sync. Si c'est le premier sync, télécharge tout.
   * Utilise INSERT OR REPLACE pour l'idempotence.
   */
  static async pullData(schoolId: string) {
    if (!ENABLE_REMOTE_SYNC) return;
    if (!navigator.onLine) throw new Error('Offline: cannot pull');

    if (await DeviceService.isRevoked()) {
      console.warn('[Sync] Device is revoked. Aborting pull.');
      return;
    }

    const db = await getDb();
    const lastSyncAt = await getLastSyncAt();
    const syncStartedAt = new Date().toISOString();

    console.log(`[Sync] Pull started. Mode: ${lastSyncAt ? `incremental since ${lastSyncAt}` : 'full'}`);

    for (const table of SYNC_TABLES) {
      try {
        let query = supabase.from(table).select('*').eq('school_id', schoolId);

        // Sync incrémentale : ne prendre que les lignes nouvelles ou modifiées
        if (lastSyncAt) {
          query = query.gt('updated_at', lastSyncAt);
        }

        const { data, error } = await query;
        if (error) { console.warn(`[Sync] Pull error on ${table}:`, error.message); continue; }
        if (!data || data.length === 0) { continue; }

        const columns = TABLE_COLUMNS[table];
        const boolCols = BOOLEAN_COLUMNS[table] || [];
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        for (const row of data) {
          // Idempotent: INSERT OR REPLACE handles both new rows and updates
          const values = columns.map(col => {
            const v = row[col];
            if (boolCols.includes(col)) return v ? 1 : 0;
            return v ?? null;
          });

          await db.execute(
            `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }

        console.log(`[Sync] Pulled ${data.length} rows for ${table}`);
      } catch (e) {
        console.error(`[Sync] Error pulling ${table}:`, e);
      }
    }

    // Enregistrer le timestamp du début de ce sync (pas la fin, pour éviter de manquer des rows)
    await setLastSyncAt(syncStartedAt);
    await DeviceService.updateLastSync();
    console.log('[Sync] Pull complete. last_sync_at set to', syncStartedAt);
  }

  /**
   * PUSH — Rejoue les mutations en attente sur Supabase.
   * Retry automatique (jusqu'à MAX_RETRIES) sur les mutations en erreur.
   * Idempotent : utilise upsert côté Supabase.
   */
  static async pushMutations() {
    if (!ENABLE_REMOTE_SYNC) return;
    if (!navigator.onLine) throw new Error('Offline: cannot push');

    if (await DeviceService.isRevoked()) {
      console.warn('[Sync] Device is revoked. Aborting push.');
      return;
    }

    const db = await getDb();

    // Include 'error' mutations that haven't exceeded retry limit
    const mutations = await db.select<any[]>(
      `SELECT * FROM mutations_queue 
       WHERE (status = 'pending' OR (status = 'error' AND retry_count < $1))
       ORDER BY created_at ASC`,
      [MAX_RETRIES]
    );

    if (mutations.length === 0) {
      console.log('[Sync] No mutations to push');
      return;
    }

    console.log(`[Sync] Pushing ${mutations.length} mutations...`);

    for (const mutation of mutations) {
      try {
        await db.execute(`UPDATE mutations_queue SET status = 'processing' WHERE id = $1`, [mutation.id]);
        const payload = JSON.parse(mutation.payload);

        if (mutation.operation === 'INSERT') {
          // Upsert for idempotence: if the row was already pushed by a previous retry,
          // this won't create a duplicate.
          const { error } = await supabase.from(mutation.table_name).upsert([payload], { onConflict: 'id' });
          if (error) throw error;

        } else if (mutation.operation === 'UPDATE') {
          const { id, ...updateFields } = payload;

          // Récupération de la version distante pour détection de conflit
          const { data: remote } = await supabase
            .from(mutation.table_name)
            .select('*')
            .eq('id', id)
            .single();

          if (remote) {
            const { hasConflict, resolution, winner } = await ConflictService.detectAndResolve(
              mutation.table_name,
              payload,       // version locale
              remote         // version distante
            );

            if (hasConflict && resolution === 'pending_manual') {
              // Conflit critique : on ne pousse pas, on attend résolution manuelle
              await db.execute(
                `UPDATE mutations_queue SET status = 'error', retry_count = $1 WHERE id = $2`,
                [MAX_RETRIES, mutation.id] // bloquer les retries automatiques
              );
              continue;
            }

            if (hasConflict && resolution === 'auto_lww' && winner && winner.id !== payload.id) {
              // Remote a gagné : on supprime la mutation locale, SQLite a été mis à jour par ConflictService
              await db.execute(`DELETE FROM mutations_queue WHERE id = $1`, [mutation.id]);
              continue;
            }
          }

          // Pas de conflit ou local gagne : on pousse
          const { error } = await supabase.from(mutation.table_name).update(updateFields).eq('id', id);
          if (error) throw error;

        } else if (mutation.operation === 'DELETE') {
          // Soft delete
          const { error } = await supabase
            .from(mutation.table_name)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', payload.id);
          if (error) throw error;
        }

        // Success: remove from queue
        await db.execute(`DELETE FROM mutations_queue WHERE id = $1`, [mutation.id]);

      } catch (err: any) {
        console.error(`[Sync] Failed mutation ${mutation.id} (attempt ${mutation.retry_count + 1}/${MAX_RETRIES}):`, err.message);
        await db.execute(
          `UPDATE mutations_queue SET status = 'error', retry_count = retry_count + 1 WHERE id = $1`,
          [mutation.id]
        );
      }
    }

    // Log mutations that have exhausted all retries
    const deadMutations = await db.select<{ id: string; table_name: string }[]>(
      `SELECT id, table_name FROM mutations_queue WHERE status = 'error' AND retry_count >= $1`,
      [MAX_RETRIES]
    );
    if (deadMutations.length > 0) {
      console.warn(`[Sync] ${deadMutations.length} mutations have exceeded max retries and need manual review:`, deadMutations);
    }

    console.log('[Sync] Push complete');
  }

  /**
   * FULL SYNC : Push local mutations then pull fresh/incremental data.
   */
  static async fullSync(schoolId: string) {
    await SyncService.pushMutations();
    await SyncService.pullData(schoolId);
  }

  /**
   * Retourne le nombre de mutations en attente (pour affichage dans l'UI).
   */
  static async getPendingMutationCount(): Promise<number> {
    if (!ENABLE_REMOTE_SYNC) return 0;
    const db = await getDb();
    const rows = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM mutations_queue WHERE status IN ('pending', 'error')`
    );
    return rows[0]?.count ?? 0;
  }

  /**
   * Retourne les mutations en erreur définitive (pour alerte UI).
   */
  static async getDeadMutations(): Promise<any[]> {
    if (!ENABLE_REMOTE_SYNC) return [];
    const db = await getDb();
    return db.select<any[]>(
      `SELECT * FROM mutations_queue WHERE status = 'error' AND retry_count >= $1 ORDER BY created_at ASC`,
      [MAX_RETRIES]
    );
  }

  /**
   * Efface les mutations bloquées en erreur pour réinitialiser les compteurs d'erreur UI.
   */
  static async clearDeadMutations(): Promise<void> {
    const db = await getDb();
    await db.execute(`DELETE FROM mutations_queue`);
    
    // Purge mutations_queue directly from localStorage if present
    try {
      const raw = localStorage.getItem('kemitia_local_db');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.mutations_queue = [];
        localStorage.setItem('kemitia_local_db', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Failed to clear mutations_queue from localStorage', e);
    }
  }

  /**
   * Démarre la synchronisation automatique :
   * - Pull immédiat au démarrage
   * - Pull à chaque reconnexion réseau
   * - Pull périodique toutes les 5 minutes
   */
  static startAutoSync(schoolId: string) {
    SyncService.stopAutoSync();

    const doPull = () => {
      if (navigator.onLine) {
        SyncService.pullData(schoolId).catch(e => console.error('[Sync] Auto-pull failed:', e));
      }
    };

    // Immediate pull on start
    doPull();

    // Pull on network restore
    window.addEventListener('online', doPull);

    // Periodic pull every 5 minutes
    pullInterval = setInterval(doPull, 5 * 60 * 1000);

    console.log('[Sync] Auto-sync started (initial pull + every 5 min)');
  }

  static stopAutoSync() {
    if (pullInterval) {
      clearInterval(pullInterval);
      pullInterval = null;
    }
  }
}
