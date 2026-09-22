import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAcademic } from '../../../context/AcademicContext';
import { useSchool } from '../../../hooks/useModules';
import { AcademicService } from '../../../services/academic.service';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { AcademicYear } from '../../../types/database';

interface AcademicYearFormData {
  name: string;
  start_date: string;
  end_date: string;
}

const emptyForm: AcademicYearFormData = { name: '', start_date: '', end_date: '' };

export function AcademicYearsList() {
  const { academicYears, selectedYear, setSelectedYear, refreshYears, isLoading } = useAcademic();
  const { school } = useSchool();
  const [showForm, setShowForm] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState<AcademicYearFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schoolId = school?.id || 'sch_demo_01';

  const openCreate = () => {
    setEditingYear(null);
    setFormData(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      start_date: year.start_date || '',
      end_date: year.end_date || '',
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('La date de début doit être antérieure à la date de fin.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (editingYear) {
        await AcademicService.updateAcademicYear(editingYear.id, {
          name: formData.name.trim(),
          start_date: formData.start_date,
          end_date: formData.end_date,
        });
      } else {
        const createdYear = await AcademicService.createAcademicYear({
          school_id: schoolId,
          name: formData.name.trim(),
          start_date: formData.start_date,
          end_date: formData.end_date,
        });
        setSelectedYear(createdYear);
      }

      await refreshYears();
      setShowForm(false);
      setEditingYear(null);
      setFormData(emptyForm);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Erreur lors de l'enregistrement de l'année scolaire : ${detail}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (year: AcademicYear, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setIsActivating(year.id);
      if (year.is_active) {
        await AcademicService.updateAcademicYear(year.id, { is_active: false });
      } else {
        await AcademicService.activateAcademicYear(schoolId, year.id);
      }
      await refreshYears();
    } catch (err) {
      setError('Erreur lors de la modification du statut de l\'année');
    } finally {
      setIsActivating(null);
    }
  };

  const handleDelete = async (year: AcademicYear, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Voulez-vous supprimer l'année scolaire ${year.name} ?`)) return;
    try {
      await AcademicService.deleteAcademicYear(year.id);
      await refreshYears();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Années scolaires</h2>
          <p style={{ color: '#7f8c8d', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            {academicYears.length} année{academicYears.length > 1 ? 's' : ''} scolaire{academicYears.length > 1 ? 's' : ''} enregistrée{academicYears.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{ padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Nouvelle année
        </button>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative'
          }}>
            <button 
              onClick={() => { setShowForm(false); setEditingYear(null); setFormData(emptyForm); }}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}
            >
              <i className="ti ti-x" /> ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <i className="ti ti-calendar" style={{ fontSize: '24px' }} /> 📅
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                  {editingYear ? 'Modifier l\'année scolaire' : 'Nouvelle année scolaire'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Définissez la période de l'année scolaire
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label htmlFor="year-name" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    Nom de l'année <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="year-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: 2025-2026"
                    required
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="start-date" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    Date de début <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="end-date" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    Date de fin <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowForm(false); setEditingYear(null); setFormData(emptyForm); }}
                  style={{ padding: '12px 20px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  style={{ 
                    padding: '12px 24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                    color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  {isSaving ? 'Enregistrement...' : (editingYear ? 'Mettre à jour' : 'Créer l\'année')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {academicYears.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Aucune année scolaire"
            description="Aucune année scolaire enregistrée. Créez la première année scolaire pour commencer l'organisation."
            action={{ label: "+ Nouvelle année", onClick: openCreate }}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>Icône</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>Nom de l'année</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>Date de début</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>Date de fin</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>Statut</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>Opérations</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {academicYears.map((year) => {
                const isSelected = selectedYear?.id === year.id;
                return (
                  <tr
                    key={year.id}
                    style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? '#f0f7ff' : 'transparent'; }}
                  >
                    {/* Icône */}
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: isSelected
                          ? 'linear-gradient(135deg, #7c3aed, #a78bfa)'
                          : 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '18px', fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                      }}>
                        📅
                      </div>
                    </td>

                    {/* Nom */}
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>{year.name}</span>
                        {isSelected && (
                          <span style={{
                            background: '#ede9fe', color: '#7c3aed', padding: '2px 8px',
                            borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                          }}>
                            Dashboard
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date début */}
                    <td style={{ padding: '12px 20px', color: '#6b7280', fontSize: '14px' }}>
                      {year.start_date || '—'}
                    </td>

                    {/* Date fin */}
                    <td style={{ padding: '12px 20px', color: '#6b7280', fontSize: '14px' }}>
                      {year.end_date || '—'}
                    </td>

                    {/* Statut */}
                    <td style={{ padding: '12px 20px' }}>
                      {year.is_active ? (
                        <span style={{
                          background: '#dcfce7', color: '#16a34a',
                          padding: '4px 14px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: 600,
                        }}>
                          Active
                        </span>
                      ) : (
                        <span style={{
                          background: '#fef3c7', color: '#d97706',
                          padding: '4px 14px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: 600,
                        }}>
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Opérations (icônes) */}
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        {/* Dashboard */}
                        <button
                          onClick={() => setSelectedYear(year)}
                          title="Voir sur Dashboard"
                          style={{
                            width: 32, height: 32, borderRadius: '6px',
                            border: '1px solid #e5e7eb', background: isSelected ? '#ede9fe' : '#fff',
                            color: isSelected ? '#7c3aed' : '#6b7280',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.color = '#7c3aed'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? '#ede9fe' : '#fff'; e.currentTarget.style.color = isSelected ? '#7c3aed' : '#6b7280'; }}
                        >
                          📊
                        </button>
                        {/* Modifier */}
                        <button
                          onClick={() => openEdit(year)}
                          title="Modifier"
                          style={{
                            width: 32, height: 32, borderRadius: '6px',
                            border: '1px solid #e5e7eb', background: '#fff',
                            color: '#6b7280', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.color = '#d97706'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
                        >
                          ✏️
                        </button>
                        {/* Activer / Désactiver */}
                        <button
                          onClick={(e) => handleToggleActive(year, e)}
                          disabled={isActivating === year.id}
                          title={year.is_active ? "Désactiver l'année" : "Définir comme active"}
                          style={{
                            width: 32, height: 32, borderRadius: '6px',
                            border: '1px solid #e5e7eb', background: '#fff',
                            color: '#6b7280', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', transition: 'all 0.15s',
                            opacity: isActivating === year.id ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => { 
                            e.currentTarget.style.background = year.is_active ? '#fee2e2' : '#dcfce7'; 
                            e.currentTarget.style.color = year.is_active ? '#dc2626' : '#16a34a'; 
                          }}
                          onMouseLeave={(e) => { 
                            e.currentTarget.style.background = '#fff'; 
                            e.currentTarget.style.color = '#6b7280'; 
                          }}
                        >
                          {year.is_active ? '❌' : '✅'}
                        </button>
                        {/* Supprimer */}
                        <button
                          onClick={(e) => handleDelete(year, e)}
                          title="Supprimer"
                          style={{
                            width: 32, height: 32, borderRadius: '6px',
                            border: '1px solid #e5e7eb', background: '#fff',
                            color: '#6b7280', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>

                    {/* Action (bouton Configurer) */}
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <Link
                        to={`/direction/academic/${year.id}`}
                        style={{
                          padding: '6px 18px', borderRadius: '6px',
                          border: '2px solid #7c3aed', background: 'transparent',
                          color: '#7c3aed', textDecoration: 'none',
                          fontSize: '13px', fontWeight: 600,
                          transition: 'all 0.15s', display: 'inline-block',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7c3aed'; }}
                      >
                        Configurer
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
