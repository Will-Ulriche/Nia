import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { StructureService } from '../../../services/structure.service';
import type { Section } from '../../../types/database';

interface SectionFormData {
  name: string;
}

export function SectionsList() {
  const { school } = useSchool();
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<SectionFormData>({ name: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSections = async () => {
    if (!school) return;
    try {
      setIsLoading(true);
      const data = await StructureService.listSections(school.id);
      setSections(data);
    } catch (err) {
      setError('Erreur lors du chargement des sections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, [school]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !formData.name.trim()) return;
    try {
      setIsSaving(true);
      await StructureService.createSection({ school_id: school.id, name: formData.name.trim() });
      setFormData({ name: '' });
      setShowForm(false);
      await loadSections();
    } catch (err) {
      setError('Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette section ? Ses niveaux seront aussi supprimés.')) return;
    try {
      await StructureService.deleteSection(id);
      await loadSections();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Sections</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Nouvelle section
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle section</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="section-name" style={{ display: 'block', marginBottom: '0.5rem' }}>Nom (ex: Collège, Lycée)</label>
            <input
              id="section-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              placeholder="Collège"
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
        {sections.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>Aucune section créée. Commencez par ajouter "Collège" ou "Lycée".</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sections.map((section, i) => (
              <li key={section.id} style={{ padding: '1rem 1.5rem', borderBottom: i < sections.length - 1 ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{section.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    to={`/direction/structure/sections/${section.id}/levels`}
                    style={{ padding: '0.4rem 0.75rem', background: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                  >
                    Niveaux
                  </Link>
                  <button
                    onClick={() => handleDelete(section.id)}
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
