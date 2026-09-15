import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { FinanceService } from '../../../services/finance.service';
import type { FeeDefinition } from '../../../types/database';

export function FeeDefinitionsList() {
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [fees, setFees] = useState<FeeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Formulaire rapide
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<FeeDefinition>>({
    name: '',
    amount: 0,
    description: '',
    is_mandatory: true
  });

  const loadFees = async () => {
    if (!school || !selectedYear) return;
    try {
      setIsLoading(true);
      const data = await FinanceService.listFeeDefinitions(school.id, selectedYear.id);
      setFees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, [school, selectedYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !selectedYear) return;
    try {
      await FinanceService.upsertFeeDefinition({
        ...formData,
        school_id: school.id,
        academic_year_id: selectedYear.id
      });
      setIsFormOpen(false);
      setFormData({ name: '', amount: 0, description: '', is_mandatory: true });
      loadFees();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous supprimer ce type de frais ?')) return;
    try {
      await FinanceService.deleteFeeDefinition(id);
      loadFees();
    } catch (err) {
      console.error(err);
    }
  };

  const totalMandatory = fees.filter(f => f.is_mandatory).reduce((acc, f) => acc + Number(f.amount), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Définition des Frais Scolaires</h2>
          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>Année scolaire :</label>
            <select
              value={selectedYear?.id || ''}
              onChange={(e) => setSelectedYear(academicYears.find(y => y.id === e.target.value) || null)}
              style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              {academicYears.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          style={{ padding: '0.5rem 1rem', background: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Nouveau type de frais
        </button>
      </div>

      <div style={{ background: '#ecf0f1', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'inline-block' }}>
        <strong>Scolarité totale obligatoire : </strong> 
        <span style={{ fontSize: '1.2rem', color: '#27ae60', marginLeft: '0.5rem' }}>{totalMandatory.toLocaleString()} FCFA</span>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Ajouter / Modifier</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nom (ex: Tranche 1)</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Montant (FCFA)</label>
              <input required type="number" min="0" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
              <input type="text" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={!!formData.is_mandatory} onChange={e => setFormData({ ...formData, is_mandatory: e.target.checked })} id="mandatory" />
              <label htmlFor="mandatory" style={{ fontWeight: 'bold' }}>Frais obligatoire pour tous les élèves</label>
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button type="submit" style={{ padding: '0.5rem 1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Enregistrer</button>
            <button type="button" onClick={() => { setIsFormOpen(false); setFormData({ name: '', amount: 0, description: '', is_mandatory: true }); }} style={{ padding: '0.5rem 1rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Annuler</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p>Chargement...</p>
      ) : fees.length === 0 ? (
        <div style={{ background: 'white', padding: '2rem', textAlign: 'center', borderRadius: '8px', color: '#7f8c8d' }}>
          Aucun frais n'est défini pour cette année scolaire.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Désignation</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Obligatoire</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Montant (FCFA)</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{f.name}</td>
                  <td style={{ padding: '1rem', color: '#7f8c8d' }}>{f.description}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {f.is_mandatory ? <span style={{ color: '#27ae60' }}>Oui</span> : <span style={{ color: '#e74c3c' }}>Non</span>}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {Number(f.amount).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button onClick={() => { setFormData(f); setIsFormOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginRight: '0.5rem', color: '#f39c12' }}>✏️</button>
                    <button onClick={() => handleDelete(f.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e74c3c' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
