import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { StructureService } from '../../../services/structure.service';
import type { Level, Series } from '../../../types/database';

export function SeriesList() {
  const { levelId } = useParams<{ levelId: string }>();
  const { school } = useSchool();
  const [level, setLevel] = useState<Level | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seriesName, setSeriesName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!school || !levelId) return;
    try {
      setIsLoading(true);
      const allLevels = await StructureService.listLevels(school.id);
      setLevel(allLevels.find(l => l.id === levelId) || null);
      const data = await StructureService.listSeries(school.id, levelId);
      setSeries(data);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [school, levelId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !levelId || !seriesName.trim()) return;
    try {
      setIsSaving(true);
      await StructureService.createSeries({
        school_id: school.id,
        level_id: levelId,
        name: seriesName.trim(),
      });
      setSeriesName('');
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError('Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette série ?')) return;
    try {
      await StructureService.deleteSeries(id);
      await loadData();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/direction/structure" style={{ color: '#7f8c8d', textDecoration: 'none' }}>&larr; Retour aux sections</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Séries — {level?.name}</h2>
          <p style={{ color: '#7f8c8d', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Configurez les séries de ce niveau (ex: A, C, D pour le Lycée)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Nouvelle série
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle série</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="series-name" style={{ display: 'block', marginBottom: '0.5rem' }}>Nom (ex: A, C, D, A4, Sciences)</label>
            <input
              id="series-name"
              type="text"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              placeholder="A"
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

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {series.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
            Aucune série configurée pour ce niveau.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {series.map((s, i) => (
              <li key={s.id} style={{ padding: '1rem 1.5rem', borderBottom: i < series.length - 1 ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Série {s.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    to={`/direction/structure/levels/${levelId}/classes?series=${s.id}`}
                    style={{ padding: '0.4rem 0.75rem', background: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                  >
                    Classes
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{ padding: '0.4rem 0.75rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: '1.5rem', background: 'white', borderRadius: '8px', padding: '1rem 1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: 0, color: '#7f8c8d' }}>
          💡 <strong>Astuce :</strong> Pour les niveaux de Collège (6ème, 5ème…), vous n'avez pas besoin de séries. Pour le Lycée, créez les séries (A, C, D ou Sciences, Lettres…) avant de créer les classes.
        </p>
      </div>
    </div>
  );
}
