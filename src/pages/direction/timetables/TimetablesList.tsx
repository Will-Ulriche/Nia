import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { StructureService } from '../../../services/structure.service';
import { ScheduleService } from '../../../services/schedule.service';
import { TeacherService } from '../../../services/teacher.service';
import { SubjectService } from '../../../services/subject.service';
import type { Schedule, Class, Teacher, Subject } from '../../../types/database';

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];

export function TimetablesList() {
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  
  // Referentiels pour le formulaire
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '08:00',
    end_time: '10:00',
    subject_id: '',
    teacher_id: '',
    room: ''
  });

  // Charger les classes et les référentiels
  useEffect(() => {
    const init = async () => {
      if (!school || !selectedYear) return;
      try {
        const [clsData, tData, sData] = await Promise.all([
          StructureService.listClasses(school.id, selectedYear.id),
          TeacherService.listTeachers(school.id),
          SubjectService.listLibrarySubjects(school.id)
        ]);
        setClasses(clsData);
        setTeachers(tData);
        setSubjects(sData);
        if (clsData.length > 0 && !selectedClassId) {
          setSelectedClassId(clsData[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, [school, selectedYear]);

  // Charger l'emploi du temps de la classe sélectionnée
  const loadSchedules = async () => {
    if (!school || !selectedYear || !selectedClassId) return;
    try {
      setIsLoading(true);
      const data = await ScheduleService.listClassSchedules(school.id, selectedYear.id, selectedClassId);
      setSchedules(data);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [school, selectedYear, selectedClassId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !selectedYear || !selectedClassId) return;
    try {
      setIsSaving(true);
      setError(null);

      // Vérification des chevauchements
      const check = await ScheduleService.checkOverlap(
        school.id,
        selectedYear.id,
        formData.day_of_week,
        formData.start_time,
        formData.end_time,
        selectedClassId,
        formData.teacher_id
      );

      if (check.hasOverlap) {
        setError(check.reason || 'Conflit d\'horaire détecté.');
        setIsSaving(false);
        return;
      }

      await ScheduleService.createSchedule({
        school_id: school.id,
        academic_year_id: selectedYear.id,
        class_id: selectedClassId,
        subject_id: formData.subject_id,
        teacher_id: formData.teacher_id,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        room: formData.room || undefined
      });

      setShowForm(false);
      await loadSchedules();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce créneau ?')) return;
    try {
      await ScheduleService.deleteSchedule(id);
      await loadSchedules();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  // Grouper les créneaux par jour pour l'affichage
  const groupedSchedules = DAYS.map(day => ({
    ...day,
    schedules: schedules.filter(s => s.day_of_week === day.value)
  })).filter(day => day.schedules.length > 0 || day.value <= 5); // Toujours afficher Lundi-Vendredi

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Emplois du temps</h2>
      </div>

      <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div>
          <label htmlFor="year-select" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Année scolaire</label>
          <select
            id="year-select"
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
          <label htmlFor="class-select" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Classe</label>
          <select
            id="class-select"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '150px' }}
          >
            <option value="">-- Sélectionner --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}

      {selectedClassId && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Ajouter un cours
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Nouveau cours</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Jour</label>
              <select value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: parseInt(e.target.value)})} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}>
                {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Heure début (ex: 08:00)</label>
              <input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Heure fin (ex: 10:00)</label>
              <input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Matière</label>
              <select value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}>
                <option value="">-- Choisir --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Professeur</label>
              <select value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})} required style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}>
                <option value="">-- Choisir --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.last_name} {t.first_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Salle (Optionnel)</label>
              <input type="text" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} placeholder="Salle 101" style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isSaving} style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isSaving ? 'Enregistrement...' : 'Ajouter'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div>Chargement...</div>
      ) : selectedClassId ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {groupedSchedules.map(day => (
            <div key={day.value} style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ background: '#f8f9fa', padding: '0.75rem 1.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                {day.label}
              </div>
              <div style={{ padding: '0' }}>
                {day.schedules.length === 0 ? (
                  <p style={{ padding: '1rem 1.5rem', margin: 0, color: '#95a5a6', fontStyle: 'italic', fontSize: '0.9rem' }}>Aucun cours</p>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {day.schedules.map((s: any, idx) => (
                      <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: idx < day.schedules.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</div>
                          <div style={{ color: '#34495e', marginTop: '0.25rem' }}><strong>{s.subjects?.name}</strong> {s.room && <span style={{ color: '#7f8c8d' }}>({s.room})</span>}</div>
                          <div style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>{s.teachers?.last_name} {s.teachers?.first_name}</div>
                        </div>
                        <button onClick={() => handleDelete(s.id)} style={{ padding: '0.3rem 0.5rem', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                          Supprimer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Sélectionnez une classe pour voir son emploi du temps.</p>
      )}
    </div>
  );
}
