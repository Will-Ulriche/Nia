import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AcademicService } from '../../../services/academic.service';
import type { AcademicYear, Period } from '../../../types/database';

export function AcademicYearDetails() {
  const { yearId } = useParams<{ yearId: string }>();
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!yearId) return;
      try {
        const y = await AcademicService.getAcademicYear(yearId);
        setYear(y);
        const p = await AcademicService.listPeriods(yearId);
        setPeriods(p);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [yearId]);

  if (isLoading) return <div>Chargement...</div>;
  if (!year) return <div>Année introuvable</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/direction/academic" style={{ textDecoration: 'none', color: '#7f8c8d' }}>&larr; Retour aux années scolaires</Link>
      </div>

      <h2>Configuration de l'année {year.name}</h2>
      
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>Détails</h3>
        <p><strong>Début :</strong> {year.start_date || 'Non défini'}</p>
        <p><strong>Fin :</strong> {year.end_date || 'Non défini'}</p>
        <p><strong>Statut :</strong> {year.is_active ? 'Active' : 'Inactive'}</p>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Périodes (Trimestres/Semestres)</h3>
          <button style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px' }}>
            + Ajouter
          </button>
        </div>

        {periods.length === 0 ? (
          <p>Aucune période configurée pour cette année.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {periods.map(period => (
              <li key={period.id} style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{period.name}</strong><br/>
                  <small style={{ color: '#7f8c8d' }}>{period.start_date} au {period.end_date}</small>
                </div>
                <div>
                  <button style={{ padding: '0.25rem 0.5rem' }}>Modifier</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
