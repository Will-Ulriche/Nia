import { useState, useEffect, useCallback } from 'react';
import { SyncService } from '../services/sync.service';
import { ConflictService } from '../services/conflict.service';
import { getDb } from '../services/local/db';
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

  // Determine overall status
  const getStatus = (): { label: string; color: string; dot: string } => {
    if (!isOnline)
      return { label: 'Hors ligne', color: '#7f8c8d', dot: '#7f8c8d' };
    if (stats.isSyncing)
      return { label: 'Synchronisation…', color: '#3498db', dot: '#3498db' };
    if (stats.conflictCount > 0)
      return { label: `${stats.conflictCount} conflit(s)`, color: '#c0392b', dot: '#c0392b' };
    if (stats.deadCount > 0)
      return { label: `${stats.deadCount} erreur(s)`, color: '#e67e22', dot: '#e67e22' };
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
            top: 'calc(100% + 10px)',
            right: 0,
            zIndex: 100,
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            width: '320px',
            padding: '1.25rem',
            border: '1px solid #eee',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Synchronisation</h3>
              <button
                onClick={handleSync}
                disabled={!isOnline || stats.isSyncing}
                style={{
                  padding: '0.4rem 0.9rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: isOnline && !stats.isSyncing ? '#3498db' : '#ccc',
                  color: 'white',
                  fontWeight: 600,
                  cursor: isOnline && !stats.isSyncing ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                }}
              >
                {stats.isSyncing ? '⏳ En cours…' : '🔄 Sync maintenant'}
              </button>
            </div>

            {/* Status rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <StatusRow
                icon={isOnline ? '🌐' : '📵'}
                label="Connexion"
                value={isOnline ? 'En ligne' : 'Hors ligne'}
                color={isOnline ? '#27ae60' : '#7f8c8d'}
              />
              <StatusRow
                icon="🕐"
                label="Dernière sync"
                value={formatLastSync(stats.lastSyncAt)}
                color="#2c3e50"
              />
              <StatusRow
                icon="⏳"
                label="Modifications en attente"
                value={stats.pendingCount > 0 ? `${stats.pendingCount} opération(s)` : 'Aucune'}
                color={stats.pendingCount > 0 ? '#f39c12' : '#27ae60'}
              />
              {stats.deadCount > 0 && (
                <StatusRow
                  icon="❌"
                  label="Erreurs de sync"
                  value={`${stats.deadCount} (max retries atteint)`}
                  color="#e67e22"
                />
              )}
              {stats.conflictCount > 0 && (
                <StatusRow
                  icon="⚠️"
                  label="Conflits critiques"
                  value={
                    <a href="/direction/conflicts" onClick={() => setOpen(false)} style={{ color: '#c0392b', fontWeight: 700, textDecoration: 'none' }}>
                      {stats.conflictCount} à résoudre →
                    </a>
                  }
                  color="#c0392b"
                />
              )}
            </div>

            {/* Info offline */}
            {!isOnline && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.8rem', color: '#666', lineHeight: 1.5 }}>
                📱 <strong>Mode hors ligne actif.</strong> Vos modifications sont sauvegardées localement et seront synchronisées automatiquement à la reconnexion.
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

function StatusRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#666', fontSize: '0.85rem' }}>
        {icon} {label}
      </span>
      <span style={{ color, fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', maxWidth: '160px' }}>
        {value}
      </span>
    </div>
  );
}
