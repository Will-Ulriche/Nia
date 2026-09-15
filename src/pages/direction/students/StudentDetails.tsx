import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { StudentService } from '../../../services/student.service';
import { StructureService } from '../../../services/structure.service';
import type { Student, Enrollment, Class } from '../../../types/database';

export function StudentDetails() {
  const { studentId } = useParams<{ studentId: string }>();
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newClassId, setNewClassId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!school || !studentId) return;
    try {
      setIsLoading(true);
      const s = await StudentService.getStudent(studentId);
      setStudent(s);
      const enr = await StudentService.getStudentEnrollments(studentId);
      setEnrollments(enr);
      if (selectedYear) {
        const classData = await StructureService.listClasses(school.id, selectedYear.id);
        setClasses(classData);
      }
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [school, studentId, selectedYear]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !studentId || !selectedYear || !newClassId) return;
    try {
      setIsSaving(true);
      setError(null);
      await StudentService.createEnrollment({
        school_id: school.id,
        student_id: studentId,
        class_id: newClassId,
        academic_year_id: selectedYear.id,
        status: 'active',
      });
      setNewClassId('');
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      setError('Cet élève est déjà inscrit pour cette année ou une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEnrollment = async (id: string) => {
    if (!confirm('Supprimer cette inscription ?')) return;
    try {
      await StudentService.deleteEnrollment(id);
      await loadData();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  if (isLoading) return <div>Chargement...</div>;
  if (!student) return <div>Élève introuvable</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/direction/students" style={{ color: '#7f8c8d', textDecoration: 'none' }}>&larr; Retour aux élèves</Link>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>{student.last_name} {student.first_name}</h2>
        <div style={{ color: '#7f8c8d', fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div><strong>Matricule:</strong> {student.matricule || 'N/A'}</div>
          <div><strong>Sexe:</strong> {student.gender || 'N/A'}</div>
          <div><strong>Né(e) le:</strong> {student.birth_date || 'N/A'}</div>
          <div><strong>Lieu:</strong> {student.birth_place || 'N/A'}</div>
          <div><strong>Parent/Tuteur:</strong> {student.parent_name || 'N/A'}</div>
          <div><strong>Contact:</strong> {student.parent_contact || 'N/A'}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <label htmlFor="year-select" style={{ fontWeight: 'bold' }}>Année scolaire (pour inscription) :</label>
        <select
          id="year-select"
          value={selectedYear?.id || ''}
          onChange={(e) => setSelectedYear(academicYears.find(y => y.id === e.target.value) || null)}
          style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          {academicYears.map(year => (
            <option key={year.id} value={year.id}>{year.name} {year.is_active ? '(Active)' : ''}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '2px solid #eee' }}>
          <h3 style={{ margin: 0 }}>Historique des Inscriptions</h3>
          {selectedYear && !enrollments.some(e => e.academic_year_id === selectedYear.id) && (
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Inscrire pour {selectedYear.name}
            </button>
          )}
        </div>

        {showForm && selectedYear && (
          <form onSubmit={handleEnroll} style={{ padding: '1.5rem', borderBottom: '1px solid #eee', background: '#f8f9fa' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label htmlFor="enroll-class" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Classe</label>
                <select
                  id="enroll-class"
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                  required
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '200px' }}
                >
                  <option value="">— Choisir une classe —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={isSaving} style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {isSaving ? '...' : 'Inscrire'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          </form>
        )}

        {enrollments.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>Aucune inscription.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Année</th>
                <th style={{ padding: '1rem' }}>Classe</th>
                <th style={{ padding: '1rem' }}>Statut</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enr: any, i: number) => (
                <tr key={enr.id} style={{ borderBottom: i < enrollments.length - 1 ? '1px solid #eee' : 'none' }}>
                  <td style={{ padding: '1rem' }}><strong>{enr.academic_years?.name}</strong></td>
                  <td style={{ padding: '1rem' }}>{enr.classes?.name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: enr.status === 'active' ? '#2ecc71' : '#f39c12', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {enr.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      onClick={() => handleRemoveEnrollment(enr.id)}
                      style={{ padding: '0.3rem 0.6rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Supprimer
                    </button>
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
