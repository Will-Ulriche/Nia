-- Ajout d'une table pour stocker l'horodatage de la dernière synchronisation
CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- key = 'last_sync_at', value = ISO timestamp
