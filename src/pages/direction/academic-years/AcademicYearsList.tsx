import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAcademic } from '../../../context/AcademicContext';
import { useSchool } from '../../../hooks/useModules';
import { AcademicService } from '../../../services/academic.service';

export function AcademicYearsList() {
  const { academicYears, refreshYears, isLoading } = useAcademic();
  const { school } = useSchool();
  const [isActivating, setIsActivating] = useState<string | null>(null);

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

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Années scolaires</h2>
        <button style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px' }}>
          + Nouvelle année
        </button>
      </div>

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
