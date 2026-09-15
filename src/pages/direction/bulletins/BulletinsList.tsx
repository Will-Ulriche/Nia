import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { StructureService } from '../../../services/structure.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentService } from '../../../services/student.service';
import { CalculationService } from '../../../services/calculation.service';
import type { Class, Period, Enrollment } from '../../../types/database';

export function BulletinsList() {
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [classes, setClasses] = useState<Class[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [error] = useState<string | null>(null);

  // Chargement des référentiels
  useEffect(() => {
    const init = async () => {
      if (!school || !selectedYear) return;
      try {
        const [clsData, perData] = await Promise.all([
          StructureService.listClasses(school.id, selectedYear.id),
          AcademicService.listPeriods(selectedYear.id)
        ]);
        setClasses(clsData);
        setPeriods(perData);
        if (clsData.length > 0) setSelectedClassId(clsData[0].id);
        if (perData.length > 0) setSelectedPeriodId(perData[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, [school, selectedYear]);

  // Chargement des élèves de la classe sélectionnée
  useEffect(() => {
    const loadEnrollments = async () => {
      if (!school || !selectedClassId || !selectedYear) return;
      try {
        const data = await StudentService.listEnrollmentsByClass(selectedClassId, selectedYear.id);
        setEnrollments(data);
        if (data.length > 0) {
          const first = (data[0] as any).students;
          setSelectedStudentId(first?.id || '');
        } else {
          setSelectedStudentId('');
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadEnrollments();
  }, [school, selectedClassId, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  const currentClass = classes.find(c => c.id === selectedClassId);
  const currentPeriod = periods.find(p => p.id === selectedPeriodId);
  const currentStudentEnr = (enrollments as any[]).find(e => e.students?.id === selectedStudentId);
  const currentStudent = currentStudentEnr?.students;

  return (
    <div>
      {/* Interface de sélection — masquée à l'impression */}
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Bulletins de notes</h2>
          <button
            onClick={handlePrint}
            disabled={!selectedStudentId || !selectedPeriodId}
            style={{ padding: '0.5rem 1.5rem', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🖨️ Imprimer / Exporter PDF
          </button>
        </div>

        <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Année scolaire</label>
            <select
              value={selectedYear?.id || ''}
              onChange={(e) => setSelectedYear(academicYears.find(y => y.id === e.target.value) || null)}
              style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              {academicYears.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Période</label>
            <select
              value={selectedPeriodId}
              onChange={e => setSelectedPeriodId(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '180px' }}
            >
              <option value="">-- Période --</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Classe</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '150px' }}
            >
              <option value="">-- Classe --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Élève</label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '200px' }}
            >
              <option value="">-- Élève --</option>
              {(enrollments as any[]).map(e => (
                <option key={e.students?.id} value={e.students?.id}>
                  {e.students?.last_name} {e.students?.first_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
      </div>

      {/* BULLETIN IMPRIMABLE */}
      {selectedStudentId && selectedPeriodId && selectedClassId ? (
        <BulletinPreview
          school={school}
          student={currentStudent}
          className={currentClass?.name || ''}
          periodName={currentPeriod?.name || ''}
          yearName={selectedYear?.name || ''}
          schoolId={school?.id || ''}
          classId={selectedClassId}
          periodId={selectedPeriodId}
          studentId={selectedStudentId}
        />
      ) : (
        <div className="no-print" style={{ background: 'white', padding: '3rem', borderRadius: '8px', textAlign: 'center', color: '#7f8c8d', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>Sélectionnez une période, une classe et un élève pour afficher le bulletin.</p>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// Composant Bulletin (aperçu + impression)
// -------------------------------------------------------
interface BulletinPreviewProps {
  school: any;
  student: any;
  className: string;
  periodName: string;
  yearName: string;
  schoolId: string;
  classId: string;
  periodId: string;
  studentId: string;
}

function BulletinPreview({ school, student, className, periodName, yearName, schoolId, classId, periodId, studentId }: BulletinPreviewProps) {
  const [averages, setAverages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await CalculationService.getClassAverages(schoolId, classId, periodId);
        setAverages(data);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [schoolId, classId, periodId, studentId]);

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement du bulletin...</div>;

  const studentSubjectAvgs = averages.filter(a => a.student_id === studentId && a.subject_id);
  const studentGeneralAvg = averages.find(a => a.student_id === studentId && !a.subject_id);
  const totalStudents = averages.filter(a => !a.subject_id).length;

  const getColor = (avg: number) => avg >= 14 ? '#27ae60' : avg >= 10 ? '#f39c12' : '#e74c3c';

  if (studentSubjectAvgs.length === 0 && !studentGeneralAvg) {
    return (
      <div className="no-print" style={{ background: '#fff3cd', color: '#856404', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
        ⚠️ Aucune note saisie pour cet élève sur cette période. Les moyennes n'ont pas encore été calculées.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; font-family: 'Times New Roman', serif; }
          .bulletin-page { box-shadow: none !important; border: none !important; }
        }
      `}</style>
      <div className="bulletin-page" style={{
        background: 'white',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        fontFamily: "'Times New Roman', serif"
      }}>
        {/* En-tête */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #2c3e50', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{school?.name || 'École'}</div>
              {school?.address && <div style={{ fontSize: '0.85rem', color: '#555' }}>{school.address}</div>}
              {school?.phone && <div style={{ fontSize: '0.85rem', color: '#555' }}>Tél: {school.phone}</div>}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#2c3e50', letterSpacing: '2px' }}>BULLETIN DE NOTES</div>
              <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Année scolaire : <strong>{yearName}</strong></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: '#555' }}>République du Cameroun</div>
              <div style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>Paix — Travail — Patrie</div>
            </div>
          </div>
        </div>

        {/* Informations élève */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', background: '#f8f9fa', padding: '0.75rem 1rem', borderRadius: '4px' }}>
          <div><strong>Nom & Prénom :</strong> {student?.last_name} {student?.first_name}</div>
          <div><strong>Classe :</strong> {className}</div>
          <div><strong>Période :</strong> {periodName}</div>
          {student?.matricule && <div><strong>Matricule :</strong> {student.matricule}</div>}
          {student?.birth_date && <div><strong>Né(e) le :</strong> {student.birth_date}</div>}
          {studentGeneralAvg?.rank && <div><strong>Rang :</strong> {studentGeneralAvg.rank}<sup>e</sup> / {totalStudents}</div>}
        </div>

        {/* Tableau des matières */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#2c3e50', color: 'white' }}>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderRight: '1px solid #4a6278' }}>Matière</th>
              <th style={{ padding: '0.6rem', textAlign: 'center', borderRight: '1px solid #4a6278', width: '80px' }}>Coeff.</th>
              <th style={{ padding: '0.6rem', textAlign: 'center', borderRight: '1px solid #4a6278', width: '100px' }}>Moyenne /20</th>
              <th style={{ padding: '0.6rem', textAlign: 'left' }}>Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {studentSubjectAvgs.map((sa: any, idx: number) => (
              <tr key={sa.id} style={{ background: idx % 2 === 0 ? 'white' : '#f9f9f9', borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid #ddd' }}>
                  {sa.subjects?.code ? <strong>{sa.subjects.code}</strong> : null}
                  {sa.subjects?.code ? ' — ' : ''}{sa.subjects?.name}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #ddd' }}>—</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', borderRight: '1px solid #ddd', color: getColor(sa.average) }}>
                  {sa.average.toFixed(2)}
                </td>
                <td style={{ padding: '0.5rem 0.75rem', fontStyle: 'italic', color: '#555' }}>{sa.appreciation}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#2c3e50', color: 'white', fontWeight: 'bold' }}>
              <td colSpan={2} style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #4a6278' }}>Moyenne Générale :</td>
              <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '1.2rem', borderRight: '1px solid #4a6278' }}>
                {studentGeneralAvg ? studentGeneralAvg.average.toFixed(2) : '—'}
              </td>
              <td style={{ padding: '0.75rem', fontStyle: 'italic', color: '#eee' }}>
                {studentGeneralAvg?.appreciation}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Statistiques de classe */}
        {studentGeneralAvg && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ color: '#7f8c8d', fontSize: '0.8rem' }}>Rang de l'élève</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                {studentGeneralAvg.rank}<sup style={{ fontSize: '0.9rem' }}>e</sup>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>/ {totalStudents} élèves</div>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ color: '#7f8c8d', fontSize: '0.8rem' }}>Moyenne générale</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getColor(studentGeneralAvg.average) }}>
                {studentGeneralAvg.average.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>/ 20</div>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ color: '#7f8c8d', fontSize: '0.8rem' }}>Appréciation</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2c3e50', marginTop: '0.5rem' }}>
                {studentGeneralAvg.appreciation}
              </div>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ddd', fontSize: '0.85rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#555' }}>Le Directeur</div>
            <div style={{ height: '60px', borderBottom: '1px solid #ccc', marginTop: '1rem' }}></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#555' }}>Visa Parents / Tuteurs</div>
            <div style={{ height: '60px', borderBottom: '1px solid #ccc', marginTop: '1rem' }}></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#555' }}>Date</div>
            <div style={{ marginTop: '1rem', color: '#555' }}>Le ___ / ___ / ______</div>
          </div>
        </div>
      </div>
    </>
  );
}
