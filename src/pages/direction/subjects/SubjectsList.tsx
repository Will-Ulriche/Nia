import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { SubjectService } from '../../../services/subject.service';
import type { Subject } from '../../../types/database';

interface SubjectFormData {
  name: string;
  code: string;
  description: string;
}

const emptyForm: SubjectFormData = { name: '', code: '', description: '' };

export function SubjectsList() {
  const { school } = useSchool();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = async () => {
    if (!school) return;
    try {
      setIsLoading(true);
      const data = await SubjectService.listSubjects(school.id, showArchived);
      setSubjects(data);
    } catch (err) {
      setError('Erreur lors du chargement des matières');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadSubjects(); }, [school, showArchived]);

  const openCreate = () => {
    setEditingSubject(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({ name: subject.name, code: subject.code || '', description: subject.description || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !formData.name.trim()) return;
    try {
      setIsSaving(true);
      setError(null);
      const payload = {
        school_id: school.id,
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description.trim() || null,
      };
      if (editingSubject) {
        await SubjectService.updateSubject(editingSubject.id, payload);
      } else {
        await SubjectService.createSubject(payload);
      }
      setShowForm(false);
      setFormData(emptyForm);
      setEditingSubject(null);
      await loadSubjects();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (subject: Subject) => {
    const isArchived = subject.deleted_at !== null;
    const action = isArchived ? 'réactiver' : 'désactiver';
    if (!confirm(`Voulez-vous ${action} la matière "${subject.name}" ?`)) return;
    try {
      if (isArchived) {
        await SubjectService.reactivateSubject(subject.id);
      } else {
        await SubjectService.deactivateSubject(subject.id);
      }
      await loadSubjects();
    } catch (err) {
      setError(`Erreur lors de l'opération`);
    }
  };

  const activeCount = subjects.filter(s => !s.deleted_at).length;
  const archivedCount = subjects.filter(s => s.deleted_at).length;

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Matières</h2>
          <p style={{ color: '#7f8c8d', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            {activeCount} active{activeCount > 1 ? 's' : ''}
            {archivedCount > 0 && ` · ${archivedCount} archivée${archivedCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#7f8c8d', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Voir les archivées
          </label>
          <button
            onClick={openCreate}
            style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Nouvelle matière
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>{editingSubject ? 'Modifier la matière' : 'Nouvelle matière'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="subject-name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Nom <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                id="subject-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Mathématiques"
                required
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
              />
            </div>
            <div>
              <label htmlFor="subject-code" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Code
              </label>
              <input
                id="subject-code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="MATHS"
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="subject-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
            <textarea
              id="subject-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description optionnelle..."
              rows={2}
              style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isSaving} style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isSaving ? 'Enregistrement...' : (editingSubject ? 'Mettre à jour' : 'Créer')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingSubject(null); setFormData(emptyForm); }}
              style={{ padding: '0.5rem 1rem', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {subjects.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
            Aucune matière trouvée. Créez les matières (Maths, Français, SVT…).
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Nom</th>
                <th style={{ padding: '1rem' }}>Code</th>
                <th style={{ padding: '1rem' }}>Description</th>
                <th style={{ padding: '1rem' }}>Statut</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, i) => {
                const isArchived = subject.deleted_at !== null;
                return (
                  <tr key={subject.id} style={{ borderBottom: i < subjects.length - 1 ? '1px solid #eee' : 'none', opacity: isArchived ? 0.6 : 1 }}>
                    <td style={{ padding: '1rem' }}><strong>{subject.name}</strong></td>
                    <td style={{ padding: '1rem' }}>
                      {subject.code ? (
                        <code style={{ background: '#f0f0f0', padding: '0.2rem 0.4rem', borderRadius: '3px', fontSize: '0.85rem' }}>{subject.code}</code>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '1rem', color: '#7f8c8d', fontSize: '0.9rem' }}>{subject.description || '—'}</td>
                    <td style={{ padding: '1rem' }}>
                      {isArchived ? (
                        <span style={{ background: '#95a5a6', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Archivée</span>
                      ) : (
                        <span style={{ background: '#2ecc71', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isArchived && (
                          <button
                            onClick={() => openEdit(subject)}
                            style={{ padding: '0.3rem 0.6rem', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Modifier
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(subject)}
                          style={{ padding: '0.3rem 0.6rem', background: isArchived ? '#27ae60' : '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {isArchived ? 'Réactiver' : 'Désactiver'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
