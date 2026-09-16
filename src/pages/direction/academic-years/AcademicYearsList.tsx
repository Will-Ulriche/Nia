import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAcademic } from '../../../context/AcademicContext';
import { useSchool } from '../../../hooks/useModules';
import { AcademicService } from '../../../services/academic.service';

export function AcademicYearsList() {
  const { academicYears, refreshYears, isLoading } = useAcademic();
  const { school } = useSchool();
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });

  const handleActivate = async (id: string) => {
    if (!school) return;
    try {
      setIsActivating(id);
      await AcademicService.activateAcademicYear(school.id, id);
      await refreshYears();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'activation de l\'année');
    } finally {
      setIsActivating(null);
    }
  };

  const handleCreate = async () => {
    if (!school || !form.name || !form.start_date || !form.end_date) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    try {
      setIsCreating(true);
      await AcademicService.createAcademicYear({
        school_id: school.id,
        name: form.name,
        start_date: form.start_date,
        end_date: form.end_date,
      });
      await refreshYears();
      setShowForm(false);
      setForm({ name: '', start_date: '', end_date: '' });
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la création de l\'année');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Années scolaires</h2>
        <button onClick={() => setShowForm(true)} style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          + Nouvelle année
        </button>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3>Nouvelle année scolaire</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Nom</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: 2025-2026"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Date de début</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Date de fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => { setShowForm(false); setForm({ name: '', start_date: '', end_date: '' }); }}
                disabled={isCreating}
                style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {isCreating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {academicYears.length === 0 ? (
          <p>Aucune année scolaire configurée.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Nom</th>
                <th style={{ padding: '1rem' }}>Période</th>
                <th style={{ padding: '1rem' }}>Statut</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {academicYears.map((year) => (
                <tr key={year.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong>{year.name}</strong>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {year.start_date} - {year.end_date}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {year.is_active ? (
                      <span style={{ background: '#2ecc71', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                        Active
                      </span>
                    ) : (
                      <span style={{ background: '#95a5a6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                        Inative
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/direction/academic/${year.id}`} style={{ marginRight: '1rem', color: '#3498db', textDecoration: 'none' }}>
                      Configurer
                    </Link>
                    {!year.is_active && (
                      <button 
                        onClick={() => handleActivate(year.id)}
                        disabled={isActivating === year.id}
                        style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                      >
                        {isActivating === year.id ? 'Activation...' : 'Définir active'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
