-- Migration: 03_fix_audit_logs
-- Description: Rend entity_type et entity_id nullables dans audit_logs.
-- La table initiale (01_init.sql) les définissait NOT NULL alors que
-- AuditService les envoie souvent à NULL (ex. MANUAL_SYNC, LOGIN, etc.).
-- SQLite ne supporte pas ALTER COLUMN → on recrée la table.

CREATE TABLE IF NOT EXISTS audit_logs_new (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    device_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    deleted_at TEXT
);

INSERT OR IGNORE INTO audit_logs_new
    SELECT id, school_id, user_id, action, entity_type, entity_id,
           details, device_id, created_at, version, updated_at, updated_by, deleted_at
    FROM audit_logs;

DROP TABLE audit_logs;

ALTER TABLE audit_logs_new RENAME TO audit_logs;
