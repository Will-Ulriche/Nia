import { useState, useEffect } from 'react';
import { LicenseService, type LicenseAdminRow } from '../../services/license.service';
import { AdminService } from '../../services/admin.service';
import type { School } from '../../types/database';

const STATUS_META: Record<string, { label: string; color: string; emoji: string }> = {
  active:   { label: 'Active',    color: '#27ae60', emoji: '✅' },
  pending:  { label: 'En attente', color: '#e67e22', emoji: '⏳' },
  expired:  { label: 'Expirée',   color: '#e74c3c', emoji: '⏰' },
  cancelled:{ label: 'Révoquée',  color: '#c0392b', emoji: '⛔' },
};

export function LicensesList() {
  const [licenses, setLicenses] = useState<LicenseAdminRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ schoolId: '', months: 12, maxDevices: 3, notes: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [licData, schoolData] = await Promise.all([
        LicenseService.listLicenses(),
        AdminService.listSchools(),
      ]);
      setLicenses(licData);
      setSchools(schoolData);
      if (schoolData.length > 0 && !form.schoolId) {
        setForm((f) => ({ ...f, schoolId: schoolData[0].id }));
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors du chargement des licences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setFormError('');
    if (!form.schoolId) {
      setFormError('Veuillez sélectionner un établissement.');
      return;
    }
    setCreating(true);
    try {
      const created = await LicenseService.createLicense({
        schoolId: form.schoolId,
        months: form.months,
        maxDevices: form.maxDevices,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm((f) => ({ ...f, notes: '' }));
      setCopiedKey(created.license_key);
      alert(`Licence créée : ${created.license_key}\nCopie : la clé a été copiée dans le presse-papiers (Ctrl+V pour la transmettre).`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Erreur lors de la création de la licence.');
    } finally {
      setCreating(false);
      setCopiedKey(null);
    }
  };

  const handleAction = async (id: string, action: 'extend' | 'revoke' | 'reactivate') => {
    const label = action === 'extend' ? 'prolonger de 12 mois' : action === 'revoke' ? 'révoquer' : 'réactiver';
    if (!confirm(`Voulez-vous vraiment ${label} cette licence ?`)) return;

    setActionId(id);
    try {
      if (action === 'extend') await LicenseService.extendLicense(id, 12);
      if (action === 'revoke') await LicenseService.revokeLicense(id);
      if (action === 'reactivate') await LicenseService.reactivateLicense(id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`Erreur lors de la tentative de ${label}.`);
    } finally {
      setActionId(null);
    }
  };

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2000);
    } catch {
      alert(`Clé : ${key}`);
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🔑 Gestion des Licences</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
            Activation & validation des établissements (Phase 28)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={loadData} style={{ padding: '0.5rem 1rem', background: '#ecf0f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            🔄 Rafraîchir
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {showForm ? '✖ Annuler' : '＋ Nouvelle licence'}
          </button>
        </div>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: '#2c3e50' }}>Créer une licence</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Établissement</label>
              <select
                value={form.schoolId}
                onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Durée (mois)</label>
              <input
                type="number" min={1} max={120}
                value={form.months}
                onChange={(e) => setForm({ ...form, months: Math.max(1, Number(e.target.value)) })}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Max appareils</label>
              <input
                type="number" min={1} max={100}
                value={form.maxDevices}
                onChange={(e) => setForm({ ...form, maxDevices: Math.max(1, Number(e.target.value)) })}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Note (optionnel)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="ex : Renouvellement annuel 2026-2027"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          {formError && <p style={{ color: 'var(--text-danger)', fontSize: '14px', marginTop: '12px' }}>{formError}</p>}
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              marginTop: '1rem', padding: '0.6rem 1.5rem', background: creating ? '#95a5a6' : '#27ae60',
              color: 'white', border: 'none', borderRadius: '6px', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 'bold'
            }}
          >
            {creating ? 'Création...' : 'Créer la licence'}
          </button>
        </div>
      )}

      {copiedKey && (
        <p style={{ color: '#27ae60', fontWeight: 600, marginBottom: '1rem' }}>
          ✅ Clé copiée : {copiedKey}
        </p>
      )}

      {/* Tableau des licences */}
      {loading ? (
        <div>Chargement des licences...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Établissement</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Clé de licence</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Statut</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Validité</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>Appareils</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #eee', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic) => {
                const meta = STATUS_META[lic.status] || STATUS_META.pending;
                return (
                  <tr key={lic.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{lic.school_name || '—'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666', fontFamily: 'monospace' }}>{lic.school_id}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <code style={{ fontSize: '0.85rem', background: '#f4f4f4', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }} title="Copier la clé" onClick={() => copyKey(lic.license_key)}>
                        {lic.license_key}
                      </code>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', background: `${meta.color}22`, color: meta.color, fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {meta.emoji} {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#555' }}>
                      <div>{fmtDate(lic.valid_from)} → {fmtDate(lic.valid_until)}</div>
                      {lic.notes && <div style={{ fontSize: '0.78rem', color: '#999' }}>{lic.notes}</div>}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{lic.max_devices}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {lic.status === 'cancelled' ? (
                        <button
                          onClick={() => handleAction(lic.id, 'reactivate')}
                          disabled={actionId === lic.id}
                          style={{ padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px', background: '#27ae60', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                          {actionId === lic.id ? '...' : 'Réactiver'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAction(lic.id, 'extend')}
                            disabled={actionId === lic.id}
                            style={{ padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px', background: '#3498db', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', marginRight: '0.4rem' }}
                          >
                            {actionId === lic.id ? '...' : '＋12 mois'}
                          </button>
                          <button
                            onClick={() => handleAction(lic.id, 'revoke')}
                            disabled={actionId === lic.id}
                            style={{ padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px', background: '#c0392b', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                          >
                            {actionId === lic.id ? '...' : 'Révoquer'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    Aucune licence. Créez la première licence pour un établissement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}