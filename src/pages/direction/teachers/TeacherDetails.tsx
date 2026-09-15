import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { TeacherService } from '../../../services/teacher.service';
import { SubjectService } from '../../../services/subject.service';
import { StructureService } from '../../../services/structure.service';
import type { Teacher, TeacherAssignment, Subject, Class } from '../../../types/database';

export function TeacherDetails() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!school || !teacherId) return;
    try {
      setIsLoading(true);
      const t = await TeacherService.getTeacher(teacherId);
      setTeacher(t);
      const [assignData, subjectData, classData] = await Promise.all([
        TeacherService.listAssignments(school.id, selectedYear?.id, teacherId),
        SubjectService.listSubjects(school.id),
        selectedYear ? StructureService.listClasses(school.id, selectedYear.id) : Promise.resolve([]),
      ]);
      setAssignments(assignData);
      setSubjects(subjectData);
      setClasses(classData);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [school, teacherId, selectedYear]);

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !teacherId || !selectedYear || !newSubjectId || !newClassId) return;
    try {
      setIsSaving(true);
      setError(null);
      await TeacherService.createAssignment({
        school_id: school.id,
        teacher_id: teacherId,
        subject_id: newSubjectId,
        class_id: newClassId,
        academic_year_id: selectedYear.id,
      });
      setNewSubjectId('');
      setNewClassId('');
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      // Contrainte unique : cette affectation existe déjà
      setError('Cette affectation existe déjà ou une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm('Supprimer cette affectation ?')) return;
    try {
      await TeacherService.deleteAssignment(id);
      await loadData();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  if (isLoading) return <div>Chargement...</div>;
  if (!teacher) return <div>Enseignant introuvable</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/direction/teachers" style={{ color: '#7f8c8d', textDecoration: 'none' }}>&larr; Retour aux enseignants</Link>
      </div>

      {/* En-tête profil */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0' }}>{teacher.last_name} {teacher.first_name}</h2>
          <div style={{ color: '#7f8c8d', fontSize: '0.9rem', display: 'flex', gap: '1.5rem' }}>
            {teacher.contact_phone && <span>📞 {teacher.contact_phone}</span>}
            {teacher.contact_email && <span>✉️ {teacher.contact_email}</span>}
          </div>
        </div>
      </div>

      {/* Sélecteur d'année */}
      <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <label htmlFor="year-select" style={{ fontWeight: 'bold' }}>Année scolaire :</label>
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

      {/* Affectations */}
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '2px solid #eee' }}>
          <h3 style={{ margin: 0 }}>Affectations {selectedYear ? `— ${selectedYear.name}` : ''}</h3>
          {selectedYear && (
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Affecter
            </button>
          )}
        </div>

        {showForm && selectedYear && (
          <form onSubmit={handleAddAssignment} style={{ padding: '1.5rem', borderBottom: '1px solid #eee', background: '#f8f9fa' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label htmlFor="assign-subject" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Matière</label>
                <select
                  id="assign-subject"
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  required
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '200px' }}
                >
                  <option value="">— Choisir une matière —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="assign-class" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Classe</label>
                <select
                  id="assign-class"
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
                  {isSaving ? '...' : 'Affecter'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          </form>
        )}

        {assignments.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
            {selectedYear
              ? `Aucune affectation pour l'année ${selectedYear.name}. Cliquez sur "+ Affecter".`
              : 'Sélectionnez une année scolaire pour voir les affectations.'}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Matière</th>
                <th style={{ padding: '1rem' }}>Classe</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any, i: number) => (
                <tr key={a.id} style={{ borderBottom: i < assignments.length - 1 ? '1px solid #eee' : 'none' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong>{a.subjects?.name}</strong>
                    {a.subjects?.code && <code style={{ marginLeft: '0.5rem', background: '#f0f0f0', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.8rem' }}>{a.subjects.code}</code>}
                  </td>
                  <td style={{ padding: '1rem' }}>{a.classes?.name}</td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      onClick={() => handleRemoveAssignment(a.id)}
                      style={{ padding: '0.3rem 0.6rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Retirer
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
