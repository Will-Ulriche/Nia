import { getDb } from './local/db';

// Tables critiques : jamais de résolution automatique.
// Un conflit ici est toujours signalé à l'utilisateur.
export const CRITICAL_TABLES = new Set([
  'payments',
  'receipts',
  'grades',
  'averages',
  'fee_definitions',
]);

export type ConflictResolution = 'auto_lww' | 'kept_local' | 'pending_manual';

export interface ConflictEntry {
  id: string;
  table_name: string;
  record_id: string;
  local_payload: string;   // JSON string
  remote_payload: string;  // JSON string
  resolution: ConflictResolution;
  is_critical: number;     // SQLite boolean: 0 | 1
  resolved_at: string | null;
  created_at: string;
}

const makeId = () => crypto.randomUUID();

export class ConflictService {
  /**
   * Détecte un conflit entre la version locale et la version distante d'un enregistrement.
   * Un conflit existe quand :
   *   - les deux versions existent (pas un simple nouvel enregistrement)
   *   - ET `local.updated_at` !== `remote.updated_at`
   *   - ET `local.version` !== `remote.version`
   *
   * @returns true si un conflit a été détecté (et journalisé)
   */
  static async detectAndResolve(
    tableName: string,
    localPayload: Record<string, any>,
    remotePayload: Record<string, any>
  ): Promise<{ hasConflict: boolean; resolution: ConflictResolution | null; winner: Record<string, any> | null }> {
    const localUpdatedAt = localPayload.updated_at ?? '';
    const remoteUpdatedAt = remotePayload.updated_at ?? '';
    const localVersion = localPayload.version ?? 0;
    const remoteVersion = remotePayload.version ?? 0;

    // Pas de conflit : même timestamp ou même version
    const versionDiffers = localVersion !== remoteVersion;
    const timestampDiffers = localUpdatedAt !== remoteUpdatedAt;
    if (!versionDiffers && !timestampDiffers) {
      return { hasConflict: false, resolution: null, winner: null };
    }

    const isCritical = CRITICAL_TABLES.has(tableName);

    if (isCritical) {
      // Tables critiques : on garde toujours la version locale,
      // le conflit est journalisé pour revue manuelle.
      await ConflictService._logConflict(
        tableName,
        localPayload.id,
        localPayload,
        remotePayload,
        'pending_manual',
        true
      );
      console.warn(
        `[Conflict] ⚠️ Critical conflict on ${tableName} id=${localPayload.id}. Kept local, flagged for manual review.`
      );
      return { hasConflict: true, resolution: 'pending_manual', winner: localPayload };
    }

    // Tables standards : Last Write Wins (LWW) basé sur updated_at
    const localDate = new Date(localUpdatedAt).getTime();
    const remoteDate = new Date(remoteUpdatedAt).getTime();

    let resolution: ConflictResolution;
    let winner: Record<string, any>;

    if (localDate >= remoteDate) {
      // La version locale est plus récente : on pousse le local
      resolution = 'kept_local';
      winner = localPayload;
    } else {
      // La version distante est plus récente : on écrase le local
      resolution = 'auto_lww';
      winner = remotePayload;
      // Appliquer la version distante dans SQLite
      await ConflictService._applyRemoteToLocal(tableName, remotePayload);
    }

    await ConflictService._logConflict(
      tableName,
      localPayload.id,
      localPayload,
      remotePayload,
      resolution,
      false
    );

    console.info(
      `[Conflict] ${tableName} id=${localPayload.id}: ${resolution === 'auto_lww' ? 'Remote won (LWW)' : 'Local won (LWW)'}`
    );

    return { hasConflict: true, resolution, winner };
  }

  /**
   * Applique la version distante dans SQLite (résolution auto LWW : remote gagne).
   */
  private static async _applyRemoteToLocal(
    tableName: string,
    remotePayload: Record<string, any>
  ) {
    const db = await getDb();
    // Build a generic UPDATE from all fields except id
    const { id, ...fields } = remotePayload;
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const vals = [...keys.map(k => fields[k]), id];
    await db.execute(
      `UPDATE ${tableName} SET ${sets} WHERE id = $${keys.length + 1}`,
      vals
    );
  }

  /**
   * Journalise un conflit dans conflicts_log.
   */
  private static async _logConflict(
    tableName: string,
    recordId: string,
    localPayload: Record<string, any>,
    remotePayload: Record<string, any>,
    resolution: ConflictResolution,
    isCritical: boolean
  ) {
    const db = await getDb();
    await db.execute(
      `INSERT INTO conflicts_log (id, table_name, record_id, local_payload, remote_payload, resolution, is_critical, resolved_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        makeId(),
        tableName,
        recordId,
        JSON.stringify(localPayload),
        JSON.stringify(remotePayload),
        resolution,
        isCritical ? 1 : 0,
        resolution === 'pending_manual' ? null : new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  }

  // ================================================================
  // Méthodes de lecture (pour l'UI)
  // ================================================================

  /** Retourne tous les conflits en attente de résolution manuelle. */
  static async getPendingConflicts(): Promise<ConflictEntry[]> {
    const db = await getDb();
    return db.select<ConflictEntry[]>(
      `SELECT * FROM conflicts_log WHERE resolution = 'pending_manual' AND resolved_at IS NULL ORDER BY created_at DESC`
    );
  }

  /** Retourne tous les conflits (historique). */
  static async getAllConflicts(limit = 50): Promise<ConflictEntry[]> {
    const db = await getDb();
    return db.select<ConflictEntry[]>(
      `SELECT * FROM conflicts_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }

  /**
   * Résoudre manuellement un conflit critique.
   * @param conflictId - ID dans conflicts_log
   * @param keepLocal  - true = garder local, false = appliquer remote
   */
  static async resolveManually(conflictId: string, keepLocal: boolean): Promise<void> {
    const db = await getDb();
    const rows = await db.select<ConflictEntry[]>(
      `SELECT * FROM conflicts_log WHERE id = $1`,
      [conflictId]
    );
    if (!rows.length) throw new Error('Conflict not found');
    const conflict = rows[0];

    if (!keepLocal) {
      const remotePayload = JSON.parse(conflict.remote_payload);
      await ConflictService._applyRemoteToLocal(conflict.table_name, remotePayload);
    }

    await db.execute(
      `UPDATE conflicts_log SET resolution = $1, resolved_at = $2 WHERE id = $3`,
      [keepLocal ? 'kept_local' : 'auto_lww', new Date().toISOString(), conflictId]
    );

    console.info(
      `[Conflict] Manually resolved conflict ${conflictId} on ${conflict.table_name}: ${keepLocal ? 'kept local' : 'applied remote'}`
    );
  }

  /** Nombre de conflits critiques non résolus (pour badge UI). */
  static async getPendingConflictCount(): Promise<number> {
    const db = await getDb();
    const rows = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM conflicts_log WHERE resolution = 'pending_manual' AND resolved_at IS NULL`
    );
    return rows[0]?.count ?? 0;
  }
}
