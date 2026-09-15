import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { StudentService } from '../../../services/student.service';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Student } from '../../../types/database';

interface StudentFormData {
  matricule: string;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date: string;
  birth_place: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  parent_name: string;
  parent_contact: string;
}

const emptyForm: StudentFormData = {
  matricule: '', first_name: '', last_name: '', gender: '', birth_date: '',
  birth_place: '', address: '', contact_phone: '', contact_email: '',
  parent_name: '', parent_contact: ''
};

export function StudentsList() {
  const { school } = useSchool();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StudentFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = async () => {
    if (!school) return;
    try {
      setIsLoading(true);
      const data = await StudentService.listStudents(school.id);
      setStudents(data);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !formData.first_name.trim() || !formData.last_name.trim()) return;
    try {
      setIsSaving(true);
      setError(null);
      await StudentService.createStudent({
        school_id: school.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        matricule: formData.matricule.trim() || null,
        gender: formData.gender || null,
        birth_date: formData.birth_date || null,
        birth_place: formData.birth_place.trim() || null,
        address: formData.address.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        parent_name: formData.parent_name.trim() || null,
        parent_contact: formData.parent_contact.trim() || null,
      });
      setShowForm(false);
      setFormData(emptyForm);
      await loadStudents();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Élèves</h2>
          <p style={{ color: '#7f8c8d', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            {students.length} élève{students.length > 1 ? 's' : ''} inscrit{students.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormData(emptyForm); }}
          style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Nouvel élève
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Nouvel élève</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
             <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Matricule</label>
              <input type="text" value={formData.matricule} onChange={e => setFormData({...formData, matricule: e.target.value})} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div></div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Nom *</label>
              <input type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Prénom *</label>
              <input type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Sexe</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}>
                <option value="">--</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date de naissance</label>
              <input type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nom Parent/Tuteur</label>
              <input type="text" value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contact Parent</label>
              <input type="tel" value={formData.parent_contact} onChange={e => setFormData({...formData, parent_contact: e.target.value})} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isSaving} style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isSaving ? 'Création...' : 'Créer'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {students.length === 0 ? (
          <EmptyState
            icon="👩‍🎓"
            title="Aucun élève enregistré"
            description="Commencez par ajouter le premier élève de cet établissement. Vous pourrez ensuite gérer sa scolarité, ses présences et ses notes."
            action={{ label: "+ Nouvel élève", onClick: () => { setShowForm(true); setFormData(emptyForm); } }}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Matricule</th>
                <th style={{ padding: '1rem' }}>Nom complet</th>
                <th style={{ padding: '1rem' }}>Sexe</th>
                <th style={{ padding: '1rem' }}>Contact Parent</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, i) => (
                <tr key={student.id} style={{ borderBottom: i < students.length - 1 ? '1px solid #eee' : 'none' }}>
                  <td style={{ padding: '1rem' }}>{student.matricule || '—'}</td>
                  <td style={{ padding: '1rem' }}>
                    <strong>{student.last_name} {student.first_name}</strong>
                  </td>
                  <td style={{ padding: '1rem' }}>{student.gender || '—'}</td>
                  <td style={{ padding: '1rem' }}>{student.parent_contact || '—'}</td>
                  <td style={{ padding: '1rem' }}>
                    <Link
                      to={`/direction/students/${student.id}`}
                      style={{ padding: '0.35rem 0.65rem', background: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                    >
                      Dossier
                    </Link>
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
