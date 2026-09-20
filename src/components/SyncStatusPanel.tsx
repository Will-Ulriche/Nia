import { useState, useEffect, useCallback } from 'react';
import { SyncService } from '../services/sync.service';
import { ConflictService } from '../services/conflict.service';
import { getDb, getStorageEngine } from '../services/local/db';
import { useNetwork } from '../hooks/useNetwork';

interface SyncStats {
  pendingCount: number;
  deadCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
}

interface SyncStatusPanelProps {
  schoolId: string | null;
  onSyncComplete?: () => void;
}

async function getLastSyncAt(): Promise<string | null> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM sync_metadata WHERE key = 'last_sync_at'`
    );
    return rows.length ? rows[0].value : null;
  } catch {
    return null;
  }
}

function formatLastSync(isoDate: string | null): string {
  if (!isoDate) return 'Jamais';
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function SyncStatusPanel({ schoolId, onSyncComplete }: SyncStatusPanelProps) {
  const { isOnline } = useNetwork();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<SyncStats>({
    pendingCount: 0,
    deadCount: 0,
    conflictCount: 0,
    lastSyncAt: null,
    isSyncing: false,
  });

  const refresh = useCallback(async () => {
    try {
      const [pending, dead, conflicts, lastSyncAt] = await Promise.all([
        SyncService.getPendingMutationCount(),
        SyncService.getDeadMutations(),
        ConflictService.getPendingConflictCount(),
        getLastSyncAt(),
      ]);
      setStats(s => ({
        ...s,
        pendingCount: pending,
        deadCount: dead.length,
        conflictCount: conflicts,
        lastSyncAt,
      }));
    } catch (e) {
      console.error('[SyncStatusPanel] refresh error:', e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleSync = async () => {
    if (!schoolId || !isOnline || stats.isSyncing) return;
    setStats(s => ({ ...s, isSyncing: true }));
    try {
      await SyncService.fullSync(schoolId);
      await refresh();
      onSyncComplete?.();
      
      const { AuditService } = await import('../services/audit.service');
      const { supabase } = await import('../services/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await AuditService.logAction({
          schoolId,
          userId: session.user.id,
          action: 'MANUAL_SYNC',
          details: { triggered_by: 'user' }
        });
      }
    } catch (err) {
      console.error('[SyncStatusPanel] sync failed:', err);
    } finally {
      setStats(s => ({ ...s, isSyncing: false }));
    }
  };

  const handleClearErrors = async () => {
    try {
      await SyncService.clearDeadMutations();
      await refresh();
    } catch (err) {
      console.error('[SyncStatusPanel] clear errors failed:', err);
    }
  };

  // Determine overall status
  const getStatus = (): { label: string; color: string; dot: string } => {
    if (!isOnline)
      return { label: 'Hors ligne', color: '#7f8c8d', dot: '#7f8c8d' };
    if (stats.isSyncing)
      return { label: 'Synchronisation…', color: '#3498db', dot: '#3498db' };
    if (stats.conflictCount > 0)
      return { label: `${stats.conflictCount} conflit(s)`, color: '#c0392b', dot: '#c0392b' };
    if (stats.deadCount > 0)
      return { label: `${stats.deadCount} erreur(s)`, color: '#ea580c', dot: '#ea580c' };
    if (stats.pendingCount > 0)
      return { label: `${stats.pendingCount} en attente`, color: '#f39c12', dot: '#f39c12' };
    return { label: 'Synchronisé', color: '#27ae60', dot: '#27ae60' };
  };

  const status = getStatus();

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Statut de synchronisation"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.9rem',
          border: `1px solid ${status.color}33`,
          borderRadius: '20px',
          background: `${status.color}11`,
          color: status.color,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
          transition: 'all 0.2s',
        }}
      >
        {/* Animated dot */}
        <span style={{
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          background: status.dot,
          boxShadow: stats.isSyncing ? `0 0 0 3px ${status.dot}44` : undefined,
          animation: stats.isSyncing ? 'pulse 1.2s infinite' : undefined,
          flexShrink: 0,
        }} />
        {status.label}
        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>▾</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Overlay to close */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            zIndex: 100,
            background: 'var(--surface-1)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            width: '340px',
            padding: '20px',
            border: '1px solid var(--border)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Synchronisation</h3>
              <button
                onClick={handleSync}
                disabled={!isOnline || stats.isSyncing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  background: isOnline && !stats.isSyncing ? 'var(--bg-accent)' : 'var(--surface-2)',
                  color: isOnline && !stats.isSyncing ? 'var(--text-accent)' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: isOnline && !stats.isSyncing ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  transition: 'background 0.2s'
                }}
              >
                {stats.isSyncing ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'var(--border)', borderTopColor: 'var(--text-accent)' }} /> : <i className="ti ti-refresh" style={{ fontSize: '16px' }} />}
                {stats.isSyncing ? 'En cours…' : 'Sync. manuelle'}
              </button>
            </div>

            {/* Status rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <StatusRow
                label="Connexion"
                value={isOnline ? 'En ligne' : 'Hors ligne'}
                color={isOnline ? 'var(--text-success)' : 'var(--text-muted)'}
              />
              <StatusRow
                label="Moteur de données"
                value={storageEngineLabel(getStorageEngine())}
                color={storageEngineColor(getStorageEngine())}
              />
              <StatusRow
                label="Dernière sync"
                value={formatLastSync(stats.lastSyncAt)}
                color="var(--text-primary)"
              />
              <StatusRow
                label="En attente"
                value={stats.pendingCount > 0 ? `${stats.pendingCount} opération(s)` : 'Aucune'}
                color={stats.pendingCount > 0 ? 'var(--text-warning)' : 'var(--text-success)'}
              />
              {stats.deadCount > 0 && (
                <div style={{ marginTop: '8px', padding: '12px', background: '#fff7ed', borderRadius: '10px', border: '1px solid #ffedd5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#c2410c' }}>
                      {stats.deadCount} erreur(s) de sync (échecs)
                    </span>
                    <button
                      onClick={handleClearErrors}
                      style={{ padding: '4px 10px', background: '#ea580c', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Effacer les erreurs
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#9a3412', lineHeight: 1.4 }}>
                    Tentatives de synchronisation serveur en attente sans connexion. Vos données locales sont bien enregistrées en sécurité.
                  </p>
                </div>
              )}
              {stats.conflictCount > 0 && (
                <StatusRow
                  label="Conflits"
                  value={
                    <a href="/direction/conflicts" onClick={() => setOpen(false)} style={{ color: 'var(--text-danger)', fontWeight: 600, textDecoration: 'none' }}>
                      {stats.conflictCount} à résoudre →
                    </a>
                  }
                  color="var(--text-danger)"
                />
              )}
            </div>

            {/* Info offline */}
            {!isOnline && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, border: '1px solid var(--border)' }}>
                <strong>Mode hors ligne.</strong> Vos modifications sont sauvegardées localement et seront synchronisées à la reconnexion.
              </div>
            )}

            {/* Spin animation style */}
            <style>{`
              @keyframes pulse {
                0%, 100% { box-shadow: 0 0 0 0 ${status.dot}66; }
                50% { box-shadow: 0 0 0 5px ${status.dot}00; }
              }
            `}</style>
          </div>
        </>
      )}
    </div>
  );
}

function storageEngineLabel(engine: 'sqlite' | 'websql-mock' | 'none'): string {
  switch (engine) {
    case 'sqlite': return 'SQLite (Tauri)';
    case 'websql-mock': return 'LocalStorage (dév.)';
    case 'none': return 'Indisponible';
  }
}

function storageEngineColor(engine: 'sqlite' | 'websql-mock' | 'none'): string {
  switch (engine) {
    case 'sqlite': return 'var(--text-success)';
    case 'websql-mock': return 'var(--text-warning)';
    case 'none': return 'var(--text-danger)';
  }
}

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ color, fontWeight: 600, fontSize: '14px', textAlign: 'right', maxWidth: '160px' }}>
        {value}
      </span>
    </div>
  );
}
