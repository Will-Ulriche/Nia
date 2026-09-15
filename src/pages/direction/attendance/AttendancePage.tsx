import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { StructureService } from '../../../services/structure.service';
import { AcademicService } from '../../../services/academic.service';
import { StudentService } from '../../../services/student.service';
import { AttendanceService } from '../../../services/attendance.service';
import type { Class, Period, Enrollment } from '../../../types/database';

const STATUS_CONFIG = {
  present: { label: 'Présent', color: '#27ae60', bg: '#d4edda' },
  absent: { label: 'Absent', color: '#e74c3c', bg: '#f8d7da' },
  late: { label: 'En retard', color: '#f39c12', bg: '#fff3cd' },
  excused: { label: 'Excusé', color: '#3498db', bg: '#d1ecf1' },
};

type StatusKey = keyof typeof STATUS_CONFIG;

export function AttendancePage() {
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();

  const [classes, setClasses] = useState<Class[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  // Map studentId => current status for this date
  const [statusMap, setStatusMap] = useState<Record<string, StatusKey>>({});
  const [justMap, setJustMap] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Référentiels
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
      } catch (err) { console.error(err); }
    };
    init();
  }, [school, selectedYear]);

  // Élèves de la classe
  useEffect(() => {
    const load = async () => {
      if (!school || !selectedClassId || !selectedYear) return;
      try {
        const data = await StudentService.listEnrollmentsByClass(selectedClassId, selectedYear.id);
        setEnrollments(data);
      } catch (err) { console.error(err); }
    };
    load();
  }, [school, selectedClassId, selectedYear]);

  // Présences existantes pour cette classe/date
  useEffect(() => {
    const load = async () => {
      if (!school || !selectedClassId || !selectedDate) return;
      try {
        setIsLoading(true);
        const existing = await AttendanceService.listByClassAndDate(school.id, selectedClassId, selectedDate);
        const sm: Record<string, StatusKey> = {};
        const jm: Record<string, string> = {};
        existing.forEach(a => {
          sm[a.student_id] = a.status as StatusKey;
          if (a.justification) jm[a.student_id] = a.justification;
        });
        setStatusMap(sm);
        setJustMap(jm);
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };
    load();
  }, [school, selectedClassId, selectedDate]);

  const handleSetAll = (status: StatusKey) => {
    const newMap: Record<string, StatusKey> = {};
    (enrollments as any[]).forEach(e => {
      if (e.students?.id) newMap[e.students.id] = status;
    });
    setStatusMap(newMap);
    setSuccessMsg(null);
  };

  const handleSaveAll = async () => {
    if (!school || !selectedClassId || !selectedDate) return;
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);

      const promises = (enrollments as any[]).map(async (e) => {
        const studentId = e.students?.id;
        if (!studentId) return;
        const status = statusMap[studentId];
        if (!status) return;

        await AttendanceService.upsertAttendance({
          school_id: school.id,
          student_id: studentId,
          class_id: selectedClassId,
          period_id: selectedPeriodId || undefined,
          date: selectedDate,
          status,
          justification: justMap[studentId] || undefined,
        });
      });

      await Promise.all(promises);
      setSuccessMsg('Présences enregistrées avec succès.');
    } catch (err) {
      setError('Erreur lors de l\'enregistrement.');
    } finally {
      setIsSaving(false);
    }
  };

  const enrolled = (enrollments as any[]).filter(e => e.students?.id);
  const totalSet = enrolled.filter(e => statusMap[e.students?.id]).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Présences & Absences</h2>
        <button
          onClick={handleSaveAll}
          disabled={isSaving || totalSet === 0}
          style={{ padding: '0.5rem 1.5rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isSaving ? 'Enregistrement...' : `💾 Enregistrer (${totalSet}/${enrolled.length})`}
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Année</label>
          <select value={selectedYear?.id || ''} onChange={(e) => setSelectedYear(academicYears.find(y => y.id === e.target.value) || null)} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}>
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Période</label>
          <select value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '160px' }}>
            <option value="">-- Période --</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Classe</label>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '140px' }}>
            <option value="">-- Classe --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Date</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
      </div>

      {/* Résumé rapide */}
      {enrolled.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, cfg]) => {
            const count = enrolled.filter(e => statusMap[e.students?.id] === key).length;
            return (
              <div key={key} style={{ background: cfg.bg, border: `1px solid ${cfg.color}`, borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: cfg.color }}>{count}</div>
                <div style={{ color: cfg.color, fontSize: '0.9rem' }}>{cfg.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Boutons "Tout marquer" */}
      {enrolled.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ alignSelf: 'center', fontSize: '0.9rem', color: '#7f8c8d' }}>Tout marquer comme :</span>
          {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => handleSetAll(key)} style={{ padding: '0.35rem 0.75rem', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
      {successMsg && <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{successMsg}</div>}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
      ) : !selectedClassId ? (
        <div style={{ background: 'white', padding: '3rem', borderRadius: '8px', textAlign: 'center', color: '#7f8c8d', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
          <p>Sélectionnez une classe et une date pour saisir les présences.</p>
        </div>
      ) : enrolled.length === 0 ? (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
          ⚠️ Aucun élève inscrit dans cette classe pour cette année scolaire.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Élève</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Présent</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Absent</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Retard</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Excusé</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Justification</th>
              </tr>
            </thead>
            <tbody>
              {enrolled.map((e: any, idx: number) => {
                const student = e.students;
                const currentStatus = statusMap[student.id];
                return (
                  <tr key={student.id} style={{ borderBottom: idx < enrolled.length - 1 ? '1px solid #eee' : 'none', background: currentStatus ? STATUS_CONFIG[currentStatus].bg + '55' : 'white' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong>{student.last_name} {student.first_name}</strong>
                      {student.matricule && <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>{student.matricule}</div>}
                    </td>
                    {(['present', 'absent', 'late', 'excused'] as StatusKey[]).map(status => (
                      <td key={status} style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <input
                          type="radio"
                          name={`status-${student.id}`}
                          value={status}
                          checked={currentStatus === status}
                          onChange={() => setStatusMap(prev => ({ ...prev, [student.id]: status }))}
                          style={{ transform: 'scale(1.3)', accentColor: STATUS_CONFIG[status].color, cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {(currentStatus === 'absent' || currentStatus === 'excused') && (
                        <input
                          type="text"
                          placeholder="Motif..."
                          value={justMap[student.id] || ''}
                          onChange={ev => setJustMap(prev => ({ ...prev, [student.id]: ev.target.value }))}
                          style={{ padding: '0.3rem 0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
