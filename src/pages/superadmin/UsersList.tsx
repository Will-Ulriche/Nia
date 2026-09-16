import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserService } from '../../services/user.service';
import { AdminService } from '../../services/admin.service';
import { useAuth } from '../../hooks/useAuth';
import type { Profile, School } from '../../types/database';
import type { CreateUserPayload } from '../../types/app';

type ProfileWithSchool = Profile & { schools?: { name: string } | null };

const ROLE_REDIRECT: Record<string, string> = {
  direction: '/direction',
  secretaire: '/secretaire',
  professeur: '/professeur',
  super_admin: '/admin',
};

export function UsersList() {
  const { impersonateUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ProfileWithSchool[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [form, setForm] = useState<CreateUserPayload>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'direction',
    school_id: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, schoolsData] = await Promise.all([
        UserService.listAllUsers(),
        AdminService.listSchools()
      ]);
      setUsers(usersData);
      setSchools(schoolsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    setFormError('');
    if (!form.email.trim() || !form.password.trim() || !form.first_name.trim() || !form.last_name.trim()) {
      setFormError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setCreating(true);
    try {
      await UserService.inviteUser({
        ...form,
        school_id: form.school_id || null
      });
      
      setShowForm(false);
      setForm({ email: '', password: '', first_name: '', last_name: '', role: 'direction', school_id: '' });
      await loadData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Erreur lors de la création de l'utilisateur.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (user: Profile) => {
    if (!confirm(`Voulez-vous vraiment désactiver l'utilisateur "${user.first_name} ${user.last_name}" ?`)) return;
    try {
      await UserService.deactivateUser(user.id);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la désactivation.");
    }
  };

  const handleImpersonate = (user: ProfileWithSchool) => {
    impersonateUser(user as Profile);
    navigate(ROLE_REDIRECT[user.role] ?? '/');
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '16px 0 20px', flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e3a5f' }}>Utilisateurs</h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748b' }}>
            Gérer les comptes utilisateurs de la plateforme
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
          >
            <i className="ti ti-refresh" style={{ fontSize: '18px' }} />
            Rafraîchir
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '10px', background: showForm ? '#fee2e2' : '#3b82f6', color: showForm ? '#ef4444' : 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
          >
            <i className={`ti ${showForm ? 'ti-x' : 'ti-plus'}`} style={{ fontSize: '18px' }} />
            {showForm ? 'Annuler' : 'Nouvel utilisateur'}
          </button>
        </div>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '20px', flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700, color: '#1e3a5f' }}>
            Créer un utilisateur
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#475569' }}>Prénom *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Jean"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#475569' }}>Nom *</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Dupont"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#475569' }}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jean.dupont@ecole.tg"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#475569' }}>Mot de passe *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="********"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#475569' }}>Rôle *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as CreateUserPayload['role'] })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white' }}
              >
                <option value="direction">Direction</option>
                <option value="secretaire">Secrétaire</option>
                <option value="professeur">Professeur</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            {form.role !== 'super_admin' && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#475569' }}>Établissement</label>
                <select
                  value={form.school_id || ''}
                  onChange={(e) => setForm({ ...form, school_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white' }}
                >
                  <option value="">Sélectionner une école...</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {formError && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '16px', fontWeight: 500 }}>{formError}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={creating}
            style={{ marginTop: '20px', padding: '10px 24px', border: 'none', borderRadius: '8px', background: creating ? '#93c5fd' : '#3b82f6', color: 'white', fontWeight: 600, fontSize: '14px', cursor: creating ? 'not-allowed' : 'pointer' }}
          >
            {creating ? 'Création en cours...' : 'Créer l\'utilisateur'}
          </button>
        </div>
      )}

      {/* Liste */}
      <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
            <span className="spinner" style={{ borderColor: '#e2e8f0', borderTopColor: '#3b82f6', width: '32px', height: '32px' }}></span>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Chargement des utilisateurs...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
            <i className="ti ti-users-off" style={{ fontSize: '48px', color: '#cbd5e1' }} />
            <p style={{ margin: 0, fontSize: '15px', color: '#64748b', textAlign: 'center' }}>
              Aucun utilisateur trouvé.
            </p>
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Utilisateur</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Rôle</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Établissement</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Créé le</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, flexShrink: 0 }}>
                          {(user.first_name[0] + user.last_name[0]).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                            {user.first_name} {user.last_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                            {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize',
                        background: user.role === 'super_admin' ? '#f3e8ff' : user.role === 'direction' ? '#dbeafe' : user.role === 'secretaire' ? '#fce7f3' : '#dcfce3',
                        color: user.role === 'super_admin' ? '#7e22ce' : user.role === 'direction' ? '#1d4ed8' : user.role === 'secretaire' ? '#be185d' : '#15803d'
                      }}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', color: '#475569', fontWeight: 500 }}>
                      {user.schools?.name || (user.role === 'super_admin' ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Global</span> : <span style={{ color: '#ef4444' }}>Non assigné</span>)}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#64748b' }}>
                      {fmtDate(user.created_at)}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {user.role !== 'super_admin' && (
                          <button
                            onClick={() => handleImpersonate(user)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: '#16a34a', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}
                            title="Accéder à l'interface de cet utilisateur"
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dcfce7'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; }}
                          >
                            <i className="ti ti-eye" style={{ fontSize: '14px' }} />
                            Accéder
                          </button>
                        )}
                        <button
                          onClick={() => handleDeactivate(user)}
                          style={{ background: '#fef2f2', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s' }}
                          title="Désactiver"
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
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
    </div>
  );
}
