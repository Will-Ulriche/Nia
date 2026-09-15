import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { StructureService } from '../../../services/structure.service';
import type { Level, Section } from '../../../types/database';

export function LevelsList() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { school } = useSchool();
  const [section, setSection] = useState<Section | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', level_order: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!school || !sectionId) return;
    try {
      setIsLoading(true);
      // Charger la section parente
      const allSections = await StructureService.listSections(school.id);
      setSection(allSections.find(s => s.id === sectionId) || null);
      // Charger les niveaux
      const data = await StructureService.listLevels(school.id, sectionId);
      setLevels(data);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [school, sectionId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !sectionId || !formData.name.trim()) return;
    try {
      setIsSaving(true);
      await StructureService.createLevel({
        school_id: school.id,
        section_id: sectionId,
        name: formData.name.trim(),
        level_order: formData.level_order,
      });
      setFormData({ name: '', level_order: levels.length + 1 });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError('Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce niveau ?')) return;
    try {
      await StructureService.deleteLevel(id);
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
        <h2>Niveaux — {section?.name}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Nouveau niveau
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Nouveau niveau</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="level-name" style={{ display: 'block', marginBottom: '0.5rem' }}>Nom (ex: 6ème, 5ème)</label>
              <input
                id="level-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="6ème"
                required
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label htmlFor="level-order" style={{ display: 'block', marginBottom: '0.5rem' }}>Ordre d'affichage</label>
              <input
                id="level-order"
                type="number"
                value={formData.level_order}
                onChange={(e) => setFormData({ ...formData, level_order: parseInt(e.target.value) })}
                min={0}
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', width: '80px' }}
              />
            </div>
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
        {levels.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>Aucun niveau créé. Ajoutez 6ème, 5ème, 4ème, 3ème pour le Collège.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {levels.map((level, i) => (
              <li key={level.id} style={{ padding: '1rem 1.5rem', borderBottom: i < levels.length - 1 ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{level.name}</strong>
                  <span style={{ color: '#95a5a6', marginLeft: '0.5rem', fontSize: '0.85rem' }}>Ordre : {level.level_order}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    to={`/direction/structure/sections/${sectionId}/levels/${level.id}/series`}
                    style={{ padding: '0.4rem 0.75rem', background: '#9b59b6', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                  >
                    Séries
                  </Link>
                  <Link
                    to={`/direction/structure/levels/${level.id}/classes`}
                    style={{ padding: '0.4rem 0.75rem', background: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                  >
                    Classes
                  </Link>
                  <button
                    onClick={() => handleDelete(level.id)}
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
    </div>
  );
}
