import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { StructureService } from '../../../services/structure.service';
import type { Class, Level } from '../../../types/database';

export function ClassesList() {
  const { levelId } = useParams<{ levelId: string }>();
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [level, setLevel] = useState<Level | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [className, setClassName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!school || !levelId || !selectedYear) return;
    try {
      setIsLoading(true);
      const allLevels = await StructureService.listLevels(school.id);
      setLevel(allLevels.find(l => l.id === levelId) || null);
      const data = await StructureService.listClasses(school.id, selectedYear.id, levelId);
      setClasses(data);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [school, levelId, selectedYear]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !levelId || !selectedYear || !className.trim()) return;
    try {
      setIsSaving(true);
      await StructureService.createClass({
        school_id: school.id,
        level_id: levelId,
        academic_year_id: selectedYear.id,
        name: className.trim(),
        series_id: null,
      });
      setClassName('');
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError('Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette classe ?')) return;
    try {
      await StructureService.deleteClass(id);
      await loadData();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/direction/structure" style={{ color: '#7f8c8d', textDecoration: 'none' }}>&larr; Retour aux sections</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Classes — {level?.name}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Nouvelle classe
        </button>
      </div>

      {/* Sélecteur d'année scolaire */}
      <div style={{ background: 'white', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <label htmlFor="year-select" style={{ fontWeight: 'bold' }}>Année scolaire :</label>
        <select
          id="year-select"
          value={selectedYear?.id || ''}
          onChange={(e) => {
            const year = academicYears.find(y => y.id === e.target.value) || null;
            setSelectedYear(year);
          }}
          style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          {academicYears.map(year => (
            <option key={year.id} value={year.id}>{year.name} {year.is_active ? '(Active)' : ''}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!selectedYear && (
        <p style={{ color: '#e67e22' }}>⚠️ Aucune année scolaire sélectionnée. Veuillez d'abord configurer une année.</p>
      )}

      {showForm && selectedYear && (
        <form onSubmit={handleCreate} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle classe — {level?.name} ({selectedYear.name})</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="class-name" style={{ display: 'block', marginBottom: '0.5rem' }}>Nom de la classe (ex: 6ème A, 6ème B)</label>
            <input
              id="class-name"
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="6ème A"
              required
              style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '300px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isSaving} style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isSaving ? 'Enregistrement...' : 'Créer'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div>Chargement des classes...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          {classes.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
              Aucune classe pour ce niveau et cette année. Créez "6ème A", "6ème B", etc.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {classes.map((cls, i) => (
                <li key={cls.id} style={{ padding: '1rem 1.5rem', borderBottom: i < classes.length - 1 ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{cls.name}</strong>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    style={{ padding: '0.4rem 0.75rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
