import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { useSchool } from '../../../hooks/useModules';

interface AuditLogEntry {
  id: string;
  user_id: string;
  device_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  LOGIN:          { label: 'Connexion',        color: '#2ecc71', emoji: '🔑' },
  LOGOUT:         { label: 'Déconnexion',      color: '#95a5a6', emoji: '🚪' },
  CREATE_PAYMENT: { label: 'Paiement créé',    color: '#3498db', emoji: '💰' },
  DELETE_PAYMENT: { label: 'Paiement annulé',  color: '#e74c3c', emoji: '🗑️' },
  CREATE_GRADE:   { label: 'Note saisie',      color: '#9b59b6', emoji: '📝' },
  UPDATE_GRADE:   { label: 'Note modifiée',    color: '#e67e22', emoji: '✏️' },
  MANUAL_SYNC:    { label: 'Sync manuelle',    color: '#1abc9c', emoji: '🔄' },
  CREATE_BACKUP:  { label: 'Sauvegarde créée', color: '#2980b9', emoji: '💾' },
  RESTORE_BACKUP: { label: 'Restauration',     color: '#8e44ad', emoji: '↩️' },
  VERIFY_INTEGRITY: { label: 'Vérification intégrité', color: '#16a085', emoji: '🛡️' },
  LICENSE_ACTIVATE: { label: 'Licence activée',  color: '#2ecc71', emoji: '🔑' },
  LICENSE_REVOKED:  { label: 'Licence révoquée', color: '#e74c3c', emoji: '⛔' },
  LICENSE_EXTENDED: { label: 'Licence prolongée', color: '#3498db', emoji: '📅' },
};

export function AuditLogsList() {
  const { school } = useSchool();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  const loadLogs = useCallback(async () => {
    if (!school) return;
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles(full_name)', { count: 'exact' })
        .eq('school_id', school.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (filterAction) query = query.eq('action', filterAction);
      if (filterDate) {
        const start = new Date(filterDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filterDate);
        end.setHours(23, 59, 59, 999);
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[AuditLogsList] Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  }, [school, filterAction, filterDate]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#2c3e50' }}>📋 Journal d'Audit</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
            Traçabilité des actions sensibles de l'établissement
          </p>
        </div>
        <button onClick={loadLogs} style={{ padding: '0.5rem 1rem', background: '#ecf0f1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
          🔄 Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#555' }}>Type d'action</label>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', background: '#fafafa' }}
          >
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val.emoji} {val.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#555' }}>Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', background: '#fafafa' }}
          />
        </div>
        {(filterAction || filterDate) && (
          <button onClick={() => { setFilterAction(''); setFilterDate(''); }} style={{ padding: '0.5rem 1rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
            Réinitialiser
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#7f8c8d' }}>
          {totalCount} entrée{totalCount > 1 ? 's' : ''} (affichage des {PAGE_SIZE} plus récentes)
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7f8c8d' }}>Chargement du journal...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '10px', color: '#7f8c8d' }}>
          Aucune entrée d'audit pour les filtres sélectionnés.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '0.9rem 1rem', borderBottom: '2px solid #eee', fontSize: '0.8rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horodatage</th>
                <th style={{ padding: '0.9rem 1rem', borderBottom: '2px solid #eee', fontSize: '0.8rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utilisateur</th>
                <th style={{ padding: '0.9rem 1rem', borderBottom: '2px solid #eee', fontSize: '0.8rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                <th style={{ padding: '0.9rem 1rem', borderBottom: '2px solid #eee', fontSize: '0.8rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entité</th>
                <th style={{ padding: '0.9rem 1rem', borderBottom: '2px solid #eee', fontSize: '0.8rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const meta = ACTION_LABELS[log.action] || { label: log.action, color: '#95a5a6', emoji: '📌' };
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{log.profiles?.full_name || '—'}</span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem' }}>
                      <span style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: `${meta.color}1A`,
                        color: meta.color,
                        whiteSpace: 'nowrap'
                      }}>
                        {meta.emoji} {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#555' }}>
                      {log.entity_type && (
                        <span>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{log.entity_type}</span>
                          {log.entity_id && (
                            <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: '#aaa' }}>
                              {log.entity_id}
                            </span>
                          )}
                        </span>
                      )}
                      {!log.entity_type && '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1rem', fontSize: '0.8rem', color: '#666', maxWidth: '280px' }}>
                      {log.details ? (
                        <code style={{ background: '#f4f4f4', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {JSON.stringify(log.details)}
                        </code>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
