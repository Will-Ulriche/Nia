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
    const label = action === 'extend' ? 'prolonger de 1 mois' : action === 'revoke' ? 'révoquer' : 'réactiver';
    if (!confirm(`Voulez-vous vraiment ${label} cette licence ?`)) return;

    setActionId(id);
    try {
      if (action === 'extend') await LicenseService.extendLicense(id, 1);
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '28px 0 20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 600, color: 'var(--text-primary)' }}>Gestion des Licences</h2>
          <p style={{ margin: '6px 0 0', fontSize: '15px', color: 'var(--text-secondary)' }}>
            Activation & validation des établissements
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-1)', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '15px', cursor: 'pointer' }}
          >
            <i className="ti ti-refresh" style={{ fontSize: '18px' }} />
            Rafraîchir
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', border: 'none', borderRadius: 'var(--radius)', background: showForm ? 'var(--bg-danger)' : 'var(--fill-accent)', color: showForm ? 'var(--text-danger)' : 'var(--on-accent)', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
          >
            <i className={`ti ${showForm ? 'ti-x' : 'ti-plus'}`} style={{ fontSize: '18px' }} />
            {showForm ? 'Annuler' : 'Nouvelle licence'}
          </button>
        </div>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div style={{ background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--border)', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Créer une licence
          </h3>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Établissement</label>
              <select
                value={form.schoolId}
                onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
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
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Max appareils</label>
              <input
                type="number" min={1} max={100}
                value={form.maxDevices}
                onChange={(e) => setForm({ ...form, maxDevices: Math.max(1, Number(e.target.value)) })}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Note (optionnel)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="ex : Renouvellement annuel 2026-2027"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          {formError && <p style={{ color: 'var(--text-danger)', fontSize: '14px', marginTop: '12px' }}>{formError}</p>}
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              marginTop: '16px', padding: '10px 24px', background: creating ? 'var(--surface-2)' : 'var(--fill-accent)',
              color: creating ? 'var(--text-muted)' : 'var(--on-accent)', border: 'none', borderRadius: 'var(--radius)', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '15px'
            }}
          >
            {creating ? 'Création...' : 'Créer la licence'}
          </button>
        </div>
      )}

      {copiedKey && (
        <div style={{ background: 'var(--bg-success)', border: '1px solid var(--border-success)', color: 'var(--text-success)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '15px' }}>
          <i className="ti ti-check" style={{ fontSize: '20px' }}></i>
          Clé copiée : <strong style={{ fontFamily: 'monospace' }}>{copiedKey}</strong>
        </div>
      )}

      {/* Tableau des licences */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '60px 20px', background: 'var(--surface-1)', borderRadius: '14px' }}>
          <span className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--fill-accent)', width: '28px', height: '28px' }}></span>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>Chargement des licences...</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--surface-2)' }}>
              <tr>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Établissement</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Clé de licence</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Statut</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Validité</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Appareils</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic) => {
                const meta = STATUS_META[lic.status] || STATUS_META.pending;
                return (
                  <tr key={lic.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>{lic.school_name || '—'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{lic.school_id}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <code
                        style={{ fontSize: '13px', background: 'var(--surface-2)', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', color: 'var(--fill-accent)', border: '1px solid var(--border)', display: 'inline-block' }}
                        title="Copier la clé"
                        onClick={() => copyKey(lic.license_key)}
                      >
                        {lic.license_key}
                      </code>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', background: `${meta.color}15`, color: meta.color, fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px' }}>{meta.emoji}</span> {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <div>{fmtDate(lic.valid_from)} → {fmtDate(lic.valid_until)}</div>
                      {lic.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{lic.notes}</div>}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>{lic.max_devices}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {lic.status === 'cancelled' ? (
                        <button
                          onClick={() => handleAction(lic.id, 'reactivate')}
                          disabled={actionId === lic.id}
                          style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: 'var(--bg-success)', color: 'var(--text-success)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                        >
                          {actionId === lic.id ? '...' : 'Réactiver'}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleAction(lic.id, 'extend')}
                            disabled={actionId === lic.id}
                            style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', background: 'var(--fill-accent)', color: 'var(--on-accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 700, boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)'; }}
                          >
                            {actionId === lic.id ? '...' : '+ 1 mois'}
                          </button>
                          <button
                            onClick={() => handleAction(lic.id, 'revoke')}
                            disabled={actionId === lic.id}
                            style={{ padding: '6px 12px', border: '1px solid var(--border-danger)', borderRadius: '6px', background: 'transparent', color: 'var(--text-danger)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-danger)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {actionId === lic.id ? '...' : 'Révoquer'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <i className="ti ti-key" style={{ fontSize: '32px', color: 'var(--text-muted)' }}></i>
                      <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                        Aucune licence. Créez la première licence pour un établissement.
                      </div>
                    </div>
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