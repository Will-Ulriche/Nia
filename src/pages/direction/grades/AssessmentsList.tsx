import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { GradeService } from '../../../services/grade.service';
import { StructureService } from '../../../services/structure.service';
import { SubjectService } from '../../../services/subject.service';
import { AcademicService } from '../../../services/academic.service';
import type { Assessment, Class, Subject, Period } from '../../../types/database';

export function AssessmentsList() {
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  
  // Referentiels
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  
  // Filtres
  const [filterClassId, setFilterClassId] = useState('');
  const [filterPeriodId, setFilterPeriodId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    assessment_date: new Date().toISOString().split('T')[0],
    class_id: '',
    subject_id: '',
    period_id: '',
    total_score: 20,
    weight: 1
  });

  useEffect(() => {
    const init = async () => {
      if (!school || !selectedYear) return;
      try {
        const [clsData, subjData, perData] = await Promise.all([
          StructureService.listClasses(school.id, selectedYear.id),
          SubjectService.listLibrarySubjects(school.id),
          AcademicService.listPeriods(selectedYear.id)
        ]);
        setClasses(clsData);
        setSubjects(subjData);
        setPeriods(perData);
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, [school, selectedYear]);

  const loadAssessments = async () => {
    if (!school || !selectedYear) return;
    try {
      setIsLoading(true);
      const data = await GradeService.listAssessments(school.id, filterClassId || undefined, filterPeriodId || undefined);
      // Filtrer côté client par année scolaire (car period_id ou class_id le fait indirectement, mais soyons sûrs)
      // Une meilleure approche SQL serait de joindre periods pour filtrer par academic_year, 
      // ici on filtre les évaluations dont la période appartient à l'année sélectionnée.
      const periodIdsForYear = periods.map(p => p.id);
      const filtered = data.filter(a => periodIdsForYear.includes(a.period_id));
      setAssessments(filtered);
    } catch (err) {
      setError('Erreur lors du chargement des évaluations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (periods.length > 0) {
      loadAssessments();
    } else {
      setAssessments([]);
      setIsLoading(false);
    }
  }, [school, selectedYear, filterClassId, filterPeriodId, periods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !formData.title.trim()) return;
    try {
      setIsSaving(true);
      setError(null);
      await GradeService.createAssessment({
        school_id: school.id,
        title: formData.title.trim(),
        assessment_date: formData.assessment_date,
        class_id: formData.class_id,
        subject_id: formData.subject_id,
        period_id: formData.period_id,
        total_score: formData.total_score,
        weight: formData.weight
      });
      setShowForm(false);
      setFormData({
        ...formData,
        title: '',
      });
      await loadAssessments();
    } catch (err) {
      setError('Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette évaluation ? Toutes les notes associées seront supprimées.')) return;
    try {
      await GradeService.deleteAssessment(id);
      await loadAssessments();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Évaluations et Devoirs</h2>
        {selectedYear && periods.length > 0 && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Nouvelle évaluation
          </button>
        )}
      </div>

      <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Année scolaire</label>
          <select
            value={selectedYear?.id || ''}
            onChange={(e) => setSelectedYear(academicYears.find(y => y.id === e.target.value) || null)}
            style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            {academicYears.map(year => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Période (Trimestre/Semestre)</label>
          <select
            value={filterPeriodId}
            onChange={(e) => setFilterPeriodId(e.target.value)}
            style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '150px' }}
          >
            <option value="">-- Toutes les périodes --</option>
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Classe</label>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '150px' }}
          >
            <option value="">-- Toutes les classes --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}

      {periods.length === 0 && selectedYear && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          ⚠️ Aucune période (Trimestre/Semestre) n'est configurée pour cette année scolaire. Allez dans "Années scolaires" pour configurer les périodes.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Créer une évaluation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Titre (ex: Interrogation Écrite 1) *</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Date *</label>
              <input type="date" value={formData.assessment_date} onChange={e => setFormData({...formData, assessment_date: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Classe *</label>
              <select value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}>
                <option value="">-- Choisir --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Matière *</label>
              <select value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}>
                <option value="">-- Choisir --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Période *</label>
              <select value={formData.period_id} onChange={e => setFormData({...formData, period_id: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}>
                <option value="">-- Choisir --</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Note sur (Total)</label>
              <input type="number" value={formData.total_score} onChange={e => setFormData({...formData, total_score: parseFloat(e.target.value)})} min={1} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Coefficient (Poids)</label>
              <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})} min={0.1} step="0.1" required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isSaving} style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isSaving ? 'Création...' : 'Créer l\'évaluation'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div>Chargement...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          {assessments.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>Aucune évaluation trouvée.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', background: '#f8f9fa' }}>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Titre</th>
                  <th style={{ padding: '1rem' }}>Classe</th>
                  <th style={{ padding: '1rem' }}>Matière</th>
                  <th style={{ padding: '1rem' }}>Période</th>
                  <th style={{ padding: '1rem' }}>Barème</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a: any, i: number) => (
                  <tr key={a.id} style={{ borderBottom: i < assessments.length - 1 ? '1px solid #eee' : 'none' }}>
                    <td style={{ padding: '1rem' }}>{a.assessment_date}</td>
                    <td style={{ padding: '1rem' }}><strong>{a.title}</strong></td>
                    <td style={{ padding: '1rem' }}>{a.classes?.name}</td>
                    <td style={{ padding: '1rem' }}>{a.subjects?.name}</td>
                    <td style={{ padding: '1rem' }}>{a.periods?.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: '#f0f0f0', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                        /{a.total_score} (Coef: {a.weight})
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link
                          to={`/direction/assessments/${a.id}`}
                          style={{ padding: '0.35rem 0.65rem', background: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                        >
                          Saisir les notes
                        </Link>
                        <button
                          onClick={() => handleDelete(a.id)}
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
      )}
    </div>
  );
}
