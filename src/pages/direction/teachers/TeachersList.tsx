import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { TeacherService } from '../../../services/teacher.service';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Teacher } from '../../../types/database';

interface TeacherFormData {
  first_name: string;
  last_name: string;
  contact_phone: string;
  contact_email: string;
}

const emptyForm: TeacherFormData = { first_name: '', last_name: '', contact_phone: '', contact_email: '' };

export function TeachersList() {
  const { school } = useSchool();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<TeacherFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeachers = async () => {
    if (!school) return;
    try {
      setIsLoading(true);
      const data = await TeacherService.listTeachers(school.id);
      setTeachers(data);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTeachers(); }, [school]);

  const openCreate = () => {
    setEditingTeacher(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      contact_phone: teacher.contact_phone || '',
      contact_email: teacher.contact_email || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !formData.first_name.trim() || !formData.last_name.trim()) return;
    try {
      setIsSaving(true);
      setError(null);
      const payload = {
        school_id: school.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        contact_phone: formData.contact_phone.trim() || null,
        contact_email: formData.contact_email.trim() || null,
      };
      if (editingTeacher) {
        await TeacherService.updateTeacher(editingTeacher.id, payload);
      } else {
        await TeacherService.createTeacher(payload);
      }
      setShowForm(false);
      setEditingTeacher(null);
      setFormData(emptyForm);
      await loadTeachers();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`Supprimer ${teacher.first_name} ${teacher.last_name} ? Ses affectations seront aussi supprimées.`)) return;
    try {
      await TeacherService.deleteTeacher(teacher.id);
      await loadTeachers();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Enseignants</h2>
          <p style={{ color: '#7f8c8d', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            {teachers.length} enseignant{teachers.length > 1 ? 's' : ''} enregistré{teachers.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Nouvel enseignant
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>{editingTeacher ? 'Modifier le profil' : 'Nouvel enseignant'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="teacher-lastname" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Nom <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                id="teacher-lastname"
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="DIALLO"
                required
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
              />
            </div>
            <div>
              <label htmlFor="teacher-firstname" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Prénom <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                id="teacher-firstname"
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Mamadou"
                required
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
              />
            </div>
            <div>
              <label htmlFor="teacher-phone" style={{ display: 'block', marginBottom: '0.5rem' }}>Téléphone</label>
              <input
                id="teacher-phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+224 XXX XXX XXX"
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
              />
            </div>
            <div>
              <label htmlFor="teacher-email" style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
              <input
                id="teacher-email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="prof@example.com"
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isSaving} style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isSaving ? 'Enregistrement...' : (editingTeacher ? 'Mettre à jour' : 'Créer')}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingTeacher(null); setFormData(emptyForm); }}
              style={{ padding: '0.5rem 1rem', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {teachers.length === 0 ? (
          <EmptyState
            icon="👨‍🏫"
            title="Aucun enseignant"
            description="Aucun enseignant enregistré. Créez le premier profil professeur pour pouvoir lui assigner des classes et des matières."
            action={{ label: "+ Nouvel enseignant", onClick: () => { setShowForm(true); setEditingTeacher(null); setFormData(emptyForm); } }}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Nom complet</th>
                <th style={{ padding: '1rem' }}>Téléphone</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, i) => (
                <tr key={teacher.id} style={{ borderBottom: i < teachers.length - 1 ? '1px solid #eee' : 'none' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong>{teacher.last_name} {teacher.first_name}</strong>
                  </td>
                  <td style={{ padding: '1rem', color: '#7f8c8d' }}>{teacher.contact_phone || '—'}</td>
                  <td style={{ padding: '1rem', color: '#7f8c8d' }}>{teacher.contact_email || '—'}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        to={`/direction/teachers/${teacher.id}`}
                        style={{ padding: '0.35rem 0.65rem', background: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                      >
                        Affectations
                      </Link>
                      <button
                        onClick={() => openEdit(teacher)}
                        style={{ padding: '0.35rem 0.65rem', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(teacher)}
                        style={{ padding: '0.35rem 0.65rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
