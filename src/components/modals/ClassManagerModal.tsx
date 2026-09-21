import { useState, useEffect } from 'react';
import { useSchool } from '../../hooks/useModules';
import { useAcademic } from '../../context/AcademicContext';
import { StructureService } from '../../services/structure.service';
import type { Section, Level, Series, Class } from '../../types/database';

interface ClassManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClassManagerModal({ isOpen, onClose }: ClassManagerModalProps) {
  const { school } = useSchool();
  const { selectedYear } = useAcademic();
  const [activeTab, setActiveTab] = useState<'COLLEGE' | 'LYCEE'>('COLLEGE');
  
  const [sections, setSections] = useState<Section[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [classes, setClasses] = useState<(Class & { level_name?: string, series_name?: string, section_id?: string, effectif?: number })[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Class creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClassLevelId, setNewClassLevelId] = useState('');
  const [newClassSeriesId, setNewClassSeriesId] = useState('');
  const [newClassDivision, setNewClassDivision] = useState('');
  
  // Series creation state
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');

  // Class editing state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  const loadData = async () => {
    if (!school || !selectedYear) return;
    try {
      setIsLoading(true);
      setError(null);
      await StructureService.initializeDefaultStructure(school.id);
      
      const [secs, lvls, srs, cls] = await Promise.all([
        StructureService.listSections(school.id),
        StructureService.listLevels(school.id),
        StructureService.listSeries(school.id),
        StructureService.listClassesWithEnrollmentCount(school.id, selectedYear.id)
      ]);
      setSections(secs);
      setLevels(lvls);
      setSeriesList(srs);
      setClasses(cls);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Reset state on close
      setShowCreateForm(false);
      setShowAddSeries(false);
      setNewClassLevelId('');
      setNewClassSeriesId('');
      setNewClassDivision('');
      setEditingClassId(null);
    }
  }, [isOpen, school, selectedYear]);

  if (!isOpen) return null;

  const currentSection = sections.find(s => s.name === (activeTab === 'COLLEGE' ? 'COLLÈGE' : 'LYCÉE'));
  const currentLevels = levels.filter(l => l.section_id === currentSection?.id);
  const currentClasses = classes.filter(c => c.section_id === currentSection?.id);

  const handleCreateSeries = async () => {
    if (!school || !newClassLevelId || !newSeriesName.trim()) return;
    try {
      setError(null);
      const newSeries = await StructureService.createSeries({
        school_id: school.id,
        level_id: newClassLevelId,
        name: newSeriesName.trim().toUpperCase()
      });
      setSeriesList([...seriesList, newSeries]);
      setNewClassSeriesId(newSeries.id);
      setShowAddSeries(false);
      setNewSeriesName('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la série');
    }
  };

  const handleCreateClass = async () => {
    if (!school || !selectedYear || !newClassLevelId) return;
    
    if (activeTab === 'LYCEE' && !newClassSeriesId) {
      setError('La série est obligatoire au lycée.');
      return;
    }

    try {
      setError(null);
      const level = levels.find(l => l.id === newClassLevelId);
      const series = seriesList.find(s => s.id === newClassSeriesId);
      
      let generatedName = level?.name || '';
      if (series) generatedName += ` ${series.name}`;
      if (newClassDivision.trim()) generatedName += ` ${newClassDivision.trim()}`;
      
      // Check for uniqueness
      const exists = classes.some(c => c.name.toLowerCase() === generatedName.toLowerCase());
      if (exists) {
        setError(`La classe "${generatedName}" existe déjà pour cette année scolaire.`);
        return;
      }

      await StructureService.createClass({
        school_id: school.id,
        academic_year_id: selectedYear.id,
        level_id: newClassLevelId,
        series_id: newClassSeriesId || null,
        name: generatedName
      });

      await loadData();
      setShowCreateForm(false);
      setNewClassLevelId('');
      setNewClassSeriesId('');
      setNewClassDivision('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la classe');
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la classe "${className}" ?`)) {
      try {
        await StructureService.deleteClass(classId);
        await loadData();
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la suppression');
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingClassId || !editingClassName.trim()) return;
    try {
      setError(null);
      // Check for uniqueness
      const exists = classes.some(c => c.id !== editingClassId && c.name.toLowerCase() === editingClassName.trim().toLowerCase());
      if (exists) {
        setError(`La classe "${editingClassName}" existe déjà.`);
        return;
      }

      await StructureService.updateClass(editingClassId, { name: editingClassName.trim() });
      await loadData();
      setEditingClassId(null);
      setEditingClassName('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden'
      }}>
        {/* HEADER */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-school" style={{ color: '#3b82f6' }} /> Gestionnaire des classes
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Année scolaire : <strong style={{ color: '#334155' }}>{selectedYear?.name || 'Aucune'}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px', padding: '4px' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
          <button 
            onClick={() => { setActiveTab('COLLEGE'); setShowCreateForm(false); }}
            style={{ 
              flex: 1, padding: '16px', background: 'transparent', border: 'none', 
              borderBottom: activeTab === 'COLLEGE' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'COLLEGE' ? '#3b82f6' : '#64748b',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            COLLÈGE
          </button>
          <button 
            onClick={() => { setActiveTab('LYCEE'); setShowCreateForm(false); }}
            style={{ 
              flex: 1, padding: '16px', background: 'transparent', border: 'none', 
              borderBottom: activeTab === 'LYCEE' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'LYCEE' ? '#3b82f6' : '#64748b',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            LYCÉE
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f87171', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Chargement...</div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {currentLevels.map(lvl => (
                    <span key={lvl.id} style={{ background: '#e2e8f0', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
                      {lvl.name}
                    </span>
                  ))}
                </div>
                {!showCreateForm && (
                  <button 
                    onClick={() => {
                      setNewClassLevelId('');
                      setNewClassSeriesId('');
                      setNewClassDivision('');
                      setShowCreateForm(true);
                    }}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="ti ti-plus" /> Créer une classe
                  </button>
                )}
              </div>

              {/* Create Form */}
              {showCreateForm && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1e293b' }}>Nouvelle classe - {activeTab === 'COLLEGE' ? 'Collège' : 'Lycée'}</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'LYCEE' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Niveau <span style={{color:'#ef4444'}}>*</span></label>
                      <select 
                        value={newClassLevelId} 
                        onChange={e => { setNewClassLevelId(e.target.value); setNewClassSeriesId(''); setShowAddSeries(false); }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      >
                        <option value="">-- Sélectionner --</option>
                        {currentLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>

                    {activeTab === 'LYCEE' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Série <span style={{color:'#ef4444'}}>*</span></label>
                        {showAddSeries ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                              type="text" 
                              placeholder="Ex: A4, C, D..." 
                              value={newSeriesName}
                              onChange={e => setNewSeriesName(e.target.value)}
                              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            />
                            <button onClick={handleCreateSeries} style={{ padding: '0 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>✓</button>
                            <button onClick={() => setShowAddSeries(false)} style={{ padding: '0 12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select 
                              value={newClassSeriesId} 
                              onChange={e => setNewClassSeriesId(e.target.value)}
                              disabled={!newClassLevelId}
                              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', opacity: newClassLevelId ? 1 : 0.6 }}
                            >
                              <option value="">-- Sélectionner --</option>
                              {seriesList.filter(s => s.level_id === newClassLevelId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button 
                              onClick={() => setShowAddSeries(true)}
                              disabled={!newClassLevelId}
                              title="Ajouter une nouvelle série"
                              style={{ width: '40px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', opacity: newClassLevelId ? 1 : 0.6 }}
                            >
                              <i className="ti ti-plus" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Division / Indice <span style={{fontWeight: 400, color:'#94a3b8'}}>(Optionnel)</span></label>
                      <input 
                        type="text" 
                        placeholder={activeTab === 'COLLEGE' ? "Ex: A, B, C..." : "Ex: 1, 2, 3..."}
                        value={newClassDivision}
                        onChange={e => setNewClassDivision(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {newClassLevelId && (
                    <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: '#475569' }}>
                      Nom généré : <strong style={{ color: '#0f172a' }}>
                        {levels.find(l => l.id === newClassLevelId)?.name}
                        {activeTab === 'LYCEE' && newClassSeriesId ? ` ${seriesList.find(s => s.id === newClassSeriesId)?.name}` : ''}
                        {newClassDivision ? ` ${newClassDivision.trim()}` : ''}
                      </strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowCreateForm(false)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                    <button onClick={handleCreateClass} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Créer la classe</button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Niveau</th>
                      {activeTab === 'LYCEE' && <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Série</th>}
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Classe</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Effectif</th>
                      <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentClasses.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                          Aucune classe enregistrée pour cette section.
                        </td>
                      </tr>
                    ) : (
                      currentClasses.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{c.level_name}</td>
                          {activeTab === 'LYCEE' && <td style={{ padding: '12px 16px', fontSize: '14px', color: '#475569' }}>{c.series_name || '—'}</td>}
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>
                            {editingClassId === c.id ? (
                              <input 
                                type="text"
                                value={editingClassName}
                                onChange={e => setEditingClassName(e.target.value)}
                                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '120px', outline: 'none' }}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingClassId(null); }}
                              />
                            ) : (
                              c.name
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#3b82f6', fontWeight: 700, textAlign: 'right' }}>
                            {c.effectif || 0}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            {editingClassId === c.id ? (
                              <>
                                <button onClick={handleSaveEdit} title="Enregistrer" style={{ background: '#ecfdf5', color: '#10b981', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                                  <i className="ti ti-check" />
                                </button>
                                <button onClick={() => setEditingClassId(null)} title="Annuler" style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                                  <i className="ti ti-x" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => { setEditingClassId(c.id); setEditingClassName(c.name); }}
                                  title="Modifier le nom"
                                  style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                  <i className="ti ti-edit" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteClass(c.id, c.name)}
                                  title="Supprimer"
                                  style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                  <i className="ti ti-trash" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
