import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { StructureService } from '../../../services/structure.service';
import { AcademicService } from '../../../services/academic.service';
import { CalculationService } from '../../../services/calculation.service';
import type { Class, Period, Average } from '../../../types/database';

export function AveragesList() {
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [classes, setClasses] = useState<Class[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [averages, setAverages] = useState<Average[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init — charger les référentiels
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

  // Charger les moyennes
  const loadAverages = async () => {
    if (!school || !selectedClassId || !selectedPeriodId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await CalculationService.getClassAverages(school.id, selectedClassId, selectedPeriodId);
      setAverages(data);
    } catch (err) {
      setError('Erreur lors du chargement des moyennes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadAverages(); }, [school, selectedClassId, selectedPeriodId]);

  // Séparer les moyennes générales et les moyennes par matière
  const generalAverages = (averages as any[]).filter(a => !a.subject_id).sort((a, b) => (a.rank || 999) - (b.rank || 999));
  const subjectAverages = (averages as any[]).filter(a => a.subject_id);

  // Obtenir toutes les matières uniques
  const subjectNames: Record<string, string> = {};
  subjectAverages.forEach(a => {
    if (a.subjects) subjectNames[a.subject_id] = `${a.subjects.code ? a.subjects.code + ' - ' : ''}${a.subjects.name}`;
  });

  // Grouper les moyennes par matière par élève
  const avgByStudentAndSubject: Record<string, Record<string, number>> = {};
  subjectAverages.forEach((a: any) => {
    if (!avgByStudentAndSubject[a.student_id]) avgByStudentAndSubject[a.student_id] = {};
    avgByStudentAndSubject[a.student_id][a.subject_id] = a.average;
  });

  const allSubjectIds = Object.keys(subjectNames);

  const getColor = (avg: number) => {
    if (avg >= 14) return '#27ae60';
    if (avg >= 10) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Résultats & Classement</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>Les moyennes se calculent automatiquement à chaque saisie de note.</p>
        </div>
      </div>

      {/* Filtres */}
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
      </div>

      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}

      {isLoading ? (
        <div>Calcul en cours...</div>
      ) : generalAverages.length === 0 ? (
        <div style={{ background: 'white', padding: '3rem', borderRadius: '8px', textAlign: 'center', color: '#7f8c8d', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>Aucune moyenne disponible pour ce filtre.</p>
          <p style={{ color: '#95a5a6', marginTop: '0.5rem', fontSize: '0.9rem' }}>Saisissez les notes depuis la section "Évaluations & Notes".</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#2c3e50', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '1rem 0.75rem' }}>Rang</th>
                <th style={{ padding: '1rem 0.75rem' }}>Élève</th>
                {allSubjectIds.map(sid => (
                  <th key={sid} style={{ padding: '1rem 0.5rem', textAlign: 'center', minWidth: '90px' }}>
                    {subjectNames[sid]}
                  </th>
                ))}
                <th style={{ padding: '1rem 0.75rem', textAlign: 'center', background: '#1a252f' }}>Moy. Gén.</th>
                <th style={{ padding: '1rem 0.75rem' }}>Appréciation</th>
              </tr>
            </thead>
            <tbody>
              {generalAverages.map((ga: any, idx: number) => {
                const student = ga.students;
                const subjectRow = avgByStudentAndSubject[ga.student_id] || {};

                return (
                  <tr key={ga.id} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {ga.rank === 1 ? '🥇' : ga.rank === 2 ? '🥈' : ga.rank === 3 ? '🥉' : ga.rank}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <strong>{student?.last_name} {student?.first_name}</strong>
                      {student?.matricule && <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>{student.matricule}</div>}
                    </td>
                    {allSubjectIds.map(sid => {
                      const avg = subjectRow[sid];
                      return (
                        <td key={sid} style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {avg !== undefined ? (
                            <span style={{ color: getColor(avg), fontWeight: 'bold' }}>{avg.toFixed(2)}</span>
                          ) : '—'}
                        </td>
                      );
                    })}
                    <td style={{ padding: '0.75rem', textAlign: 'center', background: '#f8f9fa', fontWeight: 'bold' }}>
                      <span style={{ color: getColor(ga.average), fontSize: '1.1rem' }}>{ga.average.toFixed(2)}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#7f8c8d', fontSize: '0.9rem' }}>
                      {ga.appreciation}
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
