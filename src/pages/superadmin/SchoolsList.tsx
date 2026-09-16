import { useState, useEffect } from 'react';
import { AdminService } from '../../services/admin.service';
import type { School } from '../../types/database';

export function SchoolsList() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', contact_phone: '', contact_email: '' });

  const loadSchools = async () => {
    setLoading(true);
    try {
      const data = await AdminService.listSchools();
      setSchools(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchools(); }, []);

  const handleSubmit = async () => {
    setFormError('');
    if (!form.name.trim()) {
      setFormError("Le nom de l'établissement est obligatoire.");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
      } as any;
      
      if (editingSchoolId) {
        await AdminService.updateSchool(editingSchoolId, payload);
      } else {
        await AdminService.createSchool(payload);
      }
      
      setShowForm(false);
      setEditingSchoolId(null);
      setForm({ name: '', address: '', contact_phone: '', contact_email: '' });
      await loadSchools();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Erreur lors de l'enregistrement de l'établissement.");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (school: School) => {
    setForm({
      name: school.name,
      address: school.address || '',
      contact_phone: school.contact_phone || '',
      contact_email: school.contact_email || ''
    });
    setEditingSchoolId(school.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (school: School) => {
    if (!confirm(`Voulez-vous vraiment supprimer l'établissement "${school.name}" ?`)) return;
    try {
      await AdminService.deleteSchool(school.id);
      await loadSchools();
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleToggleStatus = async (school: School) => {
    const action = school.is_active === false ? 'activer' : 'désactiver';
    if (!confirm(`Voulez-vous vraiment ${action} l'établissement "${school.name}" ?`)) return;
    try {
      await AdminService.toggleSchoolStatus(school.id, school.is_active === false);
      await loadSchools();
    } catch (err: any) {
      console.error(err);
      alert(`Erreur lors de l'action (${action}).`);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSchoolId(null);
    setForm({ name: '', address: '', contact_phone: '', contact_email: '' });
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '28px 0 20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 600, color: 'var(--text-primary)' }}>Établissements</h2>
          <p style={{ margin: '6px 0 0', fontSize: '15px', color: 'var(--text-secondary)' }}>
            Gérer les établissements scolaires de la plateforme
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadSchools}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-1)', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '15px', cursor: 'pointer' }}
          >
            <i className="ti ti-refresh" style={{ fontSize: '18px' }} />
            Rafraîchir
          </button>
          <button
            onClick={() => showForm ? handleCancelForm() : setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', border: 'none', borderRadius: 'var(--radius)', background: showForm ? 'var(--bg-danger)' : 'var(--fill-accent)', color: showForm ? 'var(--text-danger)' : 'var(--on-accent)', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
          >
            <i className={`ti ${showForm ? 'ti-x' : 'ti-plus'}`} style={{ fontSize: '18px' }} />
            {showForm ? 'Annuler' : 'Nouvel établissement'}
          </button>
        </div>
      </div>

      {/* Formulaire de création/édition */}
      {showForm && (
        <div style={{ background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--border)', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {editingSchoolId ? 'Modifier l\'établissement' : 'Créer un établissement'}
          </h3>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Nom *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex : Lycée Jean-Baptiste"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Adresse</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="ex : Rue de l'Indépendance, Kinshasa"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Téléphone</label>
              <input
                type="text"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="+243 ..."
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="contact@ecole.cd"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', background: 'var(--surface-2)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          {formError && (
            <p style={{ color: 'var(--text-danger)', fontSize: '14px', marginTop: '12px' }}>{formError}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={creating}
            style={{ marginTop: '16px', padding: '10px 24px', border: 'none', borderRadius: 'var(--radius)', background: creating ? 'var(--surface-2)' : 'var(--fill-accent)', color: creating ? 'var(--text-muted)' : 'var(--on-accent)', fontWeight: 600, fontSize: '15px', cursor: creating ? 'not-allowed' : 'pointer' }}
          >
            {creating ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '60px 20px', background: 'var(--surface-1)', borderRadius: '14px' }}>
          <span className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--fill-accent)', width: '28px', height: '28px' }}></span>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>Chargement des établissements...</p>
        </div>
      ) : schools.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '60px 20px', background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <i className="ti ti-building-off" style={{ fontSize: '48px', color: 'var(--text-muted)' }} />
          <p style={{ margin: 0, fontSize: '16px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucun établissement trouvé.<br />Créez le premier établissement ci-dessus.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Établissement</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Contact</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Créé le</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>Statut</th>
                <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school, i) => (
                <tr key={school.id} style={{ borderBottom: i < schools.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>{school.name}</div>
                    {(school as any).address && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{(school as any).address}</div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{school.id}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {school.contact_phone && (
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{school.contact_phone}</div>
                    )}
                    {school.contact_email && (
                      <div style={{ fontSize: '14px', color: 'var(--text-accent)' }}>{school.contact_email}</div>
                    )}
                    {!school.contact_phone && !school.contact_email && (
                      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {fmtDate(school.created_at)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {school.is_active === false ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '99px', background: 'var(--bg-danger)', color: 'var(--text-danger)', fontSize: '13px', fontWeight: 600 }}>
                        Inactif
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '99px', background: 'var(--bg-success)', color: 'var(--text-success)', fontSize: '13px', fontWeight: 600 }}>
                        Actif
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button 
                        onClick={() => handleToggleStatus(school)}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: school.is_active === false ? 'var(--text-success)' : 'var(--text-warning)' }}
                        title={school.is_active === false ? "Activer" : "Désactiver"}
                      >
                        <i className={`ti ${school.is_active === false ? 'ti-check' : 'ti-ban'}`} style={{ fontSize: '16px' }} />
                      </button>
                      <button 
                        onClick={() => handleEdit(school)}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        title="Modifier"
                      >
                        <i className="ti ti-edit" style={{ fontSize: '16px' }} />
                      </button>
                      <button 
                        onClick={() => handleDelete(school)}
                        style={{ background: 'var(--bg-danger)', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-danger)' }}
                        title="Supprimer"
                      >
                        <i className="ti ti-trash" style={{ fontSize: '16px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
