import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { useAuth } from '../../../hooks/useAuth';
import { GradeService } from '../../../services/grade.service';
import { StudentService } from '../../../services/student.service';
import type { Grade, Enrollment } from '../../../types/database';

export function AssessmentGrades() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { school } = useSchool();
  const { profile } = useAuth();
  const [assessment, setAssessment] = useState<any>(null); // Type 'any' temporarily to handle the joined relations easily
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string, Partial<Grade>>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!school || !assessmentId) return;
    try {
      setIsLoading(true);
      setError(null);
      
      const asmt = await GradeService.getAssessment(assessmentId);
      setAssessment(asmt);
      
      // Récupérer les inscriptions pour cette classe et cette année scolaire
      // @ts-ignore : academic_year_id comes from periods joined query
      const acaYearId = asmt.periods?.academic_year_id;
      if (acaYearId) {
        const enr = await StudentService.listEnrollmentsByClass(asmt.class_id, acaYearId);
        setEnrollments(enr);
      }

      // Récupérer les notes déjà saisies
      const existingGrades = await GradeService.getGradesForAssessment(assessmentId);
      const initialGradesMap: Record<string, Partial<Grade>> = {};
      existingGrades.forEach(g => {
        initialGradesMap[g.student_id] = g;
      });
      setGradesMap(initialGradesMap);

    } catch (err) {
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school, assessmentId]);

  const handleGradeChange = (studentId: string, field: string, value: any) => {
    setGradesMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!school || !assessment) return;
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);

      // On parcourt les inscriptions et on sauvegarde les notes modifiées/saisies
      const promises = enrollments.map(async (enr) => {
        // @ts-ignore : student_id from joined query
        const studentId = enr.students?.id;
        if (!studentId) return;

        const gradeData = gradesMap[studentId];
        if (gradeData && (gradeData.score !== undefined || gradeData.is_absent)) {
          await GradeService.upsertGrade({
            school_id: school.id,
            assessment_id: assessment.id,
            student_id: studentId,
            score: gradeData.score,
            is_absent: gradeData.is_absent || false,
            comments: gradeData.comments || null
          }, profile?.id);
        }
      });

      await Promise.all(promises);
      setSuccessMsg('Toutes les notes ont été enregistrées avec succès.');
      await loadData();
    } catch (err) {
      setError('Erreur lors de la sauvegarde de certaines notes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Chargement...</div>;
  if (!assessment) return <div>Évaluation introuvable.</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/direction/assessments" style={{ color: '#7f8c8d', textDecoration: 'none' }}>&larr; Retour aux évaluations</Link>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>{assessment.title}</h2>
        <div style={{ color: '#7f8c8d', fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div><strong>Date:</strong> {assessment.assessment_date}</div>
          <div><strong>Classe:</strong> {assessment.classes?.name}</div>
          <div><strong>Matière:</strong> {assessment.subjects?.name}</div>
          <div><strong>Période:</strong> {assessment.periods?.name}</div>
          <div><strong>Barème:</strong> /{assessment.total_score}</div>
          <div><strong>Coefficient:</strong> {assessment.weight}</div>
        </div>
      </div>

      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
      {successMsg && <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{successMsg}</div>}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '2px solid #eee' }}>
          <h3 style={{ margin: 0 }}>Saisie des notes ({enrollments.length} élèves)</h3>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            style={{ padding: '0.5rem 1.5rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer tout'}
          </button>
        </div>

        {enrollments.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>Aucun élève inscrit dans cette classe pour cette année.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left', background: '#f8f9fa' }}>
                <th style={{ padding: '1rem' }}>Matricule</th>
                <th style={{ padding: '1rem' }}>Nom de l'élève</th>
                <th style={{ padding: '1rem' }}>Note (/{assessment.total_score})</th>
                <th style={{ padding: '1rem' }}>Absent</th>
                <th style={{ padding: '1rem' }}>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enr: any, i: number) => {
                const student = enr.students;
                const gradeData = gradesMap[student.id] || {};
                
                return (
                  <tr key={student.id} style={{ borderBottom: i < enrollments.length - 1 ? '1px solid #eee' : 'none' }}>
                    <td style={{ padding: '1rem' }}>{student.matricule || '—'}</td>
                    <td style={{ padding: '1rem' }}><strong>{student.last_name} {student.first_name}</strong></td>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="number"
                        min="0"
                        max={assessment.total_score}
                        step="0.25"
                        value={gradeData.score !== undefined && gradeData.score !== null ? gradeData.score : ''}
                        onChange={(e) => handleGradeChange(student.id, 'score', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        disabled={!!gradeData.is_absent}
                        style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', width: '80px', background: gradeData.is_absent ? '#eee' : 'white' }}
                      />
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!gradeData.is_absent}
                        onChange={(e) => handleGradeChange(student.id, 'is_absent', e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="text"
                        placeholder="Appréciation..."
                        value={gradeData.comments || ''}
                        onChange={(e) => handleGradeChange(student.id, 'comments', e.target.value)}
                        style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
                      />
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
