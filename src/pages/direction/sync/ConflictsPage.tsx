import { useState, useEffect } from 'react';
import { ConflictService, type ConflictEntry } from '../../../services/conflict.service';

export function ConflictsPage() {
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);
  const [selected, setSelected] = useState<ConflictEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const data = await ConflictService.getAllConflicts(100);
      setConflicts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConflicts(); }, []);

  const handleResolve = async (keepLocal: boolean) => {
    if (!selected) return;
    setResolving(true);
    try {
      await ConflictService.resolveManually(selected.id, keepLocal);
      setSelected(null);
      await loadConflicts();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la résolution.');
    } finally {
      setResolving(false);
    }
  };

  const pending = conflicts.filter(c => c.resolution === 'pending_manual' && !c.resolved_at);
  const resolved = conflicts.filter(c => c.resolved_at);

  const badge = (c: ConflictEntry) => {
    if (c.resolution === 'pending_manual' && !c.resolved_at)
      return { label: '⚠️ En attente', color: '#e67e22' };
    if (c.resolution === 'kept_local')
      return { label: '✅ Local gardé', color: '#27ae60' };
    if (c.resolution === 'auto_lww')
      return { label: '🔁 Distant appliqué', color: '#2980b9' };
    return { label: c.resolution, color: '#7f8c8d' };
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔀 Conflits de synchronisation</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Lors d'une modification simultanée sur plusieurs appareils, un conflit peut survenir.
        Les données critiques (paiements, notes) requièrent une résolution manuelle.
      </p>

      {loading ? (
        <p>Chargement…</p>
      ) : conflicts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</p>
          <p style={{ color: '#27ae60', fontWeight: 'bold' }}>Aucun conflit détecté.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#e67e22', marginBottom: '1rem' }}>
                ⚠️ {pending.length} conflit(s) critique(s) en attente de résolution manuelle
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pending.map(c => (
                  <ConflictCard key={c.id} conflict={c} badge={badge(c)} onSelect={() => setSelected(c)} />
                ))}
              </div>
            </section>
          )}

          {resolved.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.1rem', color: '#7f8c8d', marginBottom: '1rem' }}>
                Historique ({resolved.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {resolved.map(c => (
                  <ConflictCard key={c.id} conflict={c} badge={badge(c)} onSelect={() => setSelected(c)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal de résolution */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>🔀 Résoudre le conflit</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Table : <strong>{selected.table_name}</strong> — ID : <code style={{ fontSize: '0.8rem' }}>{selected.record_id}</code>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#e8f5e9', borderRadius: '8px', padding: '1rem' }}>
                <p style={{ fontWeight: 'bold', color: '#27ae60', marginBottom: '0.5rem' }}>Version LOCALE</p>
                <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '300px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(JSON.parse(selected.local_payload), null, 2)}
                </pre>
              </div>
              <div style={{ background: '#e3f2fd', borderRadius: '8px', padding: '1rem' }}>
                <p style={{ fontWeight: 'bold', color: '#1565c0', marginBottom: '0.5rem' }}>Version DISTANTE (Supabase)</p>
                <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '300px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(JSON.parse(selected.remote_payload), null, 2)}
                </pre>
              </div>
            </div>

            {selected.resolution === 'pending_manual' && !selected.resolved_at ? (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelected(null)} style={{ padding: '0.6rem 1.2rem', border: '1px solid #ccc', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
                  Annuler
                </button>
                <button
                  onClick={() => handleResolve(false)}
                  disabled={resolving}
                  style={{ padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', background: '#2980b9', color: 'white', cursor: 'pointer' }}
                >
                  {resolving ? '...' : '⬇️ Appliquer la version distante'}
                </button>
                <button
                  onClick={() => handleResolve(true)}
                  disabled={resolving}
                  style={{ padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', background: '#27ae60', color: 'white', cursor: 'pointer' }}
                >
                  {resolving ? '...' : '✅ Garder la version locale'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'right' }}>
                <button onClick={() => setSelected(null)} style={{ padding: '0.6rem 1.2rem', border: '1px solid #ccc', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConflictCard({
  conflict,
  badge,
  onSelect,
}: {
  conflict: ConflictEntry;
  badge: { label: string; color: string };
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: 'white',
        border: `1px solid ${conflict.resolution === 'pending_manual' && !conflict.resolved_at ? '#e67e22' : '#eee'}`,
        borderRadius: '8px',
        padding: '1rem 1.5rem',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'box-shadow 0.15s',
      }}
    >
      <div>
        <span style={{ fontWeight: 'bold', marginRight: '1rem' }}>{conflict.table_name}</span>
        <code style={{ fontSize: '0.8rem', color: '#666' }}>{conflict.record_id}</code>
        <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
          {new Date(conflict.created_at).toLocaleString('fr-FR')}
        </p>
      </div>
      <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', background: badge.color + '22', color: badge.color, fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
        {badge.label}
      </span>
    </div>
  );
}
