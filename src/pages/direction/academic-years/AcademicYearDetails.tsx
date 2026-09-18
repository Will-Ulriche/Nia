import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AcademicService } from '../../../services/academic.service';
import { useSchool } from '../../../hooks/useModules';
import type { AcademicYear, Period } from '../../../types/database';

export function AcademicYearDetails() {
  const { yearId } = useParams<{ yearId: string }>();
  const { school } = useSchool();
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<{id?: string, name: string, start_date: string, end_date: string}>({
    name: '', start_date: '', end_date: ''
  });

  const schoolId = school?.id || 'sch_demo_01';

  const loadData = async () => {
    if (!yearId) return;
    try {
      setIsLoading(true);
      const y = await AcademicService.getAcademicYear(yearId);
      setYear(y);
      const p = await AcademicService.listPeriods(yearId);
      setPeriods(p);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [yearId]);

  const handleEdit = (p: Period) => {
    setForm({
      id: p.id,
      name: p.name,
      start_date: p.start_date || '',
      end_date: p.end_date || ''
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette période ?')) return;
    try {
      await AcademicService.deletePeriod(id);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!yearId || !form.name.trim() || !form.start_date || !form.end_date) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    if (new Date(form.start_date) >= new Date(form.end_date)) {
      setFormError('La date de début doit être antérieure à la date de fin.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      if (form.id) {
        await AcademicService.updatePeriod(form.id, {
          name: form.name.trim(),
          start_date: form.start_date,
          end_date: form.end_date
        });
      } else {
        await AcademicService.createPeriod({
          school_id: schoolId,
          academic_year_id: yearId,
          name: form.name.trim(),
          start_date: form.start_date,
          end_date: form.end_date
        });
      }
      setShowForm(false);
      setForm({ name: '', start_date: '', end_date: '' });
      await loadData();
    } catch (error) {
      console.error(error);
      setFormError('Erreur lors de l\'enregistrement de la période.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '20px'
  };

  const modalStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
    fontSize: '14px', outline: 'none', transition: 'all 0.2s', background: '#ffffff',
    color: '#0f172a', fontWeight: 500, colorScheme: 'light', boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569'
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: '#64748b' }}>
        <i className="ti ti-loader" style={{ fontSize: '24px', animation: 'spin 1s linear infinite', marginRight: '8px' }} />
        Chargement de l'année scolaire...
      </div>
    );
  }

  if (!year) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Année scolaire introuvable.</p>
        <Link to="/direction/academic" style={{ color: '#3b82f6' }}>&larr; Retour à la liste</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/direction/academic" style={{ textDecoration: 'none', color: '#64748b', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
          <i className="ti ti-arrow-left" /> Retour aux années scolaires
        </Link>
      </div>

      {/* Header Info */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '16px', marginBottom: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>
                Année Scolaire {year.name}
              </h2>
              {year.is_active ? (
                <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                  Active
                </span>
              ) : (
                <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                  Inactive
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Période globale : <strong>{year.start_date || 'Non défini'}</strong> au <strong>{year.end_date || 'Non défini'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <button 
              onClick={() => setShowForm(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}
            >
              <i className="ti ti-x" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <i className="ti ti-clock" style={{ fontSize: '24px' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                  {form.id ? 'Modifier la période' : 'Nouvelle période'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Définissez un trimestre ou semestre pour cette année
                </p>
              </div>
            </div>

            {formError && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="ti ti-alert-circle" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={labelStyle}>Nom de la période <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Trimestre 1, Semestre 1"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date de début <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date de fin <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm({ name: '', start_date: '', end_date: '' }); }}
                  disabled={isSubmitting}
                  style={{ padding: '12px 20px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ 
                    padding: '12px 24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                    color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '14px', 
                    cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' 
                  }}
                >
                  {isSubmitting ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-check" />}
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Periods List */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Périodes (Trimestres / Semestres)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Découpage temporel pour la saisie des notes et calcul des moyennes</p>
          </div>
          <button 
            onClick={() => { setForm({ name: '', start_date: '', end_date: '' }); setFormError(null); setShowForm(true); }} 
            style={{ 
              padding: '10px 18px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <i className="ti ti-plus" />
            Ajouter une période
          </button>
        </div>

        {periods.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: 0, fontWeight: 500 }}>Aucune période configurée pour cette année.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Ajoutez les trimestres ou semestres ci-dessus.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {periods.map(period => (
              <div 
                key={period.id} 
                style={{ 
                  padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <i className="ti ti-clock" style={{ fontSize: '20px' }} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '15px', color: '#1e293b' }}>{period.name}</strong>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                      Du {period.start_date || 'N/A'} au {period.end_date || 'N/A'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleEdit(period)} 
                    style={{ padding: '8px 12px', background: '#ffffff', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <i className="ti ti-edit" /> Modifier
                  </button>
                  <button 
                    onClick={() => handleDelete(period.id)} 
                    style={{ padding: '8px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <i className="ti ti-trash" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

