import React, { useState, useEffect } from 'react';
import { useSchool } from '../../hooks/useModules';
import { useAcademic } from '../../context/AcademicContext';
import { StructureService } from '../../services/structure.service';
import { SubjectService } from '../../services/subject.service';
import type { Class, Subject, ClassSubject, SubjectTemplate } from '../../types/database';

interface SubjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubjectManagerModal({ isOpen, onClose }: SubjectManagerModalProps) {
  const { school } = useSchool();
  const { activeYear } = useAcademic();
  
  const [activeTab, setActiveTab] = useState<'AFFECTATION' | 'BIBLIOTHEQUE'>('AFFECTATION');
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  const [librarySubjects, setLibrarySubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<(ClassSubject & { subject_name?: string, subject_code?: string })[]>([]);
  const [templates, setTemplates] = useState<SubjectTemplate[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // === BIBLIOTHEQUE STATE ===
  const [newLibName, setNewLibName] = useState('');
  const [newLibCode, setNewLibCode] = useState('');

  // === AFFECTATION STATE ===
  const [showAddSlideover, setShowAddSlideover] = useState(false);
  const [selectedLibrarySubjectId, setSelectedLibrarySubjectId] = useState('');
  const [coef, setCoef] = useState<number>(1);
  const [hours, setHours] = useState<number>(1);
  const [subjectType, setSubjectType] = useState('principale');
  const [isMandatory, setIsMandatory] = useState(true);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCoef, setEditCoef] = useState<number>(1);
  const [editHours, setEditHours] = useState<number>(1);

  // Template State
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [applyTemplateId, setApplyTemplateId] = useState('');

  const loadBaseData = async () => {
    if (!school || !activeYear) return;
    try {
      setIsLoading(true);
      setError(null);
      const [cls, lib, tmpl] = await Promise.all([
        StructureService.listClassesWithEnrollmentCount(school.id, activeYear.id),
        SubjectService.listLibrarySubjects(school.id),
        SubjectService.listTemplates(school.id)
      ]);
      setClasses(cls);
      setLibrarySubjects(lib);
      setTemplates(tmpl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassSubjects = async (classId: string) => {
    if (!school || !activeYear) return;
    try {
      setIsLoading(true);
      const cs = await SubjectService.listClassSubjects(school.id, classId, activeYear.id);
      setClassSubjects(cs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBaseData();
    } else {
      setSelectedClassId('');
      setClassSubjects([]);
      setShowAddSlideover(false);
    }
  }, [isOpen, school, activeYear]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassSubjects(selectedClassId);
    } else {
      setClassSubjects([]);
    }
  }, [selectedClassId]);

  if (!isOpen) return null;

  const totalCoef = classSubjects.reduce((acc, curr) => acc + (curr.coefficient || 0), 0);
  const totalHours = classSubjects.reduce((acc, curr) => acc + (curr.weekly_hours || 0), 0);

  // --- BIBLIOTHEQUE ACTIONS ---
  const handleAddLibrarySubject = async () => {
    if (!school || !newLibName.trim()) return;
    try {
      setError(null);
      const newSub = await SubjectService.createLibrarySubject({
        school_id: school.id,
        name: newLibName.trim(),
        code: newLibCode.trim().toUpperCase() || null
      });
      setLibrarySubjects([...librarySubjects, newSub]);
      setNewLibName('');
      setNewLibCode('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteLibrarySubject = async (id: string, name: string) => {
    if (window.confirm(`Supprimer définitivement la matière globale "${name}" ?`)) {
      try {
        await SubjectService.deleteLibrarySubject(id);
        setLibrarySubjects(librarySubjects.filter(s => s.id !== id));
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  // --- AFFECTATION ACTIONS ---
  const handleAssignSubject = async () => {
    if (!school || !activeYear || !selectedClassId || !selectedLibrarySubjectId) {
      setError("Veuillez sélectionner une matière de la bibliothèque.");
      return;
    }
    try {
      setError(null);
      if (classSubjects.some(cs => cs.subject_id === selectedLibrarySubjectId)) {
        setError("Cette matière est déjà associée à cette classe.");
        return;
      }
      await SubjectService.assignSubjectToClass({
        school_id: school.id,
        academic_year_id: activeYear.id,
        class_id: selectedClassId,
        subject_id: selectedLibrarySubjectId,
        coefficient: coef,
        weekly_hours: hours,
        subject_type: subjectType,
        is_mandatory: isMandatory ? 1 : 0
      });
      await loadClassSubjects(selectedClassId);
      setShowAddSlideover(false);
      setSelectedLibrarySubjectId('');
      setCoef(1); setHours(1);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await SubjectService.updateClassSubject(editingId, { coefficient: editCoef, weekly_hours: editHours });
      await loadClassSubjects(selectedClassId);
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClassSubject = async (id: string, name: string) => {
    if (window.confirm(`Retirer la matière ${name} de cette classe ?`)) {
      try {
        await SubjectService.deleteClassSubject(id);
        await loadClassSubjects(selectedClassId);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!school || !newTemplateName.trim() || classSubjects.length === 0) return;
    try {
      const tmpl = await SubjectService.saveAsTemplate(school.id, newTemplateName.trim(), classSubjects);
      setTemplates([...templates, tmpl]);
      alert(`Modèle "${tmpl.name}" sauvegardé !`);
      setNewTemplateName('');
      setShowTemplateDropdown(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApplyTemplate = async () => {
    if (!school || !activeYear || !selectedClassId || !applyTemplateId) return;
    try {
      await SubjectService.applyTemplateToClass(school.id, activeYear.id, selectedClassId, applyTemplateId);
      await loadClassSubjects(selectedClassId);
      setApplyTemplateId('');
      setShowTemplateDropdown(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!applyTemplateId) return;
    const tmpl = templates.find(t => t.id === applyTemplateId);
    if (!tmpl) return;
    if (window.confirm(`Supprimer définitivement le modèle "${tmpl.name}" ?`)) {
      try {
        await SubjectService.deleteTemplate(tmpl.id);
        setTemplates(templates.filter(t => t.id !== tmpl.id));
        setApplyTemplateId('');
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '1100px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden', position: 'relative'
      }}>
        {/* HEADER & TABS */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 10px 0' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-books" style={{ color: '#10b981' }} /> Gestionnaire des Matières
            </h2>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <i className="ti ti-x" />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
            <button 
              onClick={() => setActiveTab('AFFECTATION')}
              style={{ background: 'none', border: 'none', padding: '12px 4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                color: activeTab === 'AFFECTATION' ? '#2563eb' : '#64748b',
                borderBottom: activeTab === 'AFFECTATION' ? '3px solid #2563eb' : '3px solid transparent',
                transition: 'all 0.2s'
              }}>
              Affectation par classe
            </button>
            <button 
              onClick={() => setActiveTab('BIBLIOTHEQUE')}
              style={{ background: 'none', border: 'none', padding: '12px 4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                color: activeTab === 'BIBLIOTHEQUE' ? '#10b981' : '#64748b',
                borderBottom: activeTab === 'BIBLIOTHEQUE' ? '3px solid #10b981' : '3px solid transparent',
                transition: 'all 0.2s'
              }}>
              Bibliothèque globale
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '16px 24px', background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f87171', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* --- ONGLET: BIBLIOTHEQUE --- */}
        {activeTab === 'BIBLIOTHEQUE' && (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fcfcfc', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Nouvelle matière</label>
                  <input type="text" value={newLibName} onChange={e => setNewLibName(e.target.value)} placeholder="Ex: Informatique" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', color: '#1e293b' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Code</label>
                  <input type="text" value={newLibCode} onChange={e => setNewLibCode(e.target.value)} placeholder="Ex: INFO" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', color: '#1e293b' }} />
                </div>
                <button onClick={handleAddLibrarySubject} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', height: '40px' }}>
                  Ajouter
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Nom de la matière</th>
                    <th style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Code</th>
                    <th style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {librarySubjects.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>La bibliothèque est vide.</td></tr>
                  ) : (
                    librarySubjects.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#64748b' }}>{s.code || '—'}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button onClick={() => handleDeleteLibrarySubject(s.id, s.name)} title="Supprimer de la bibliothèque" style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><i className="ti ti-trash" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ONGLET: AFFECTATION --- */}
        {activeTab === 'AFFECTATION' && (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* SIDEBAR CLASSES */}
            <div style={{ width: '280px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Classes
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {classes.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucune classe.</div>
                ) : (
                  classes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClassId(c.id)}
                      style={{
                        padding: '8px 12px', textAlign: 'left', border: 'none', borderRadius: '8px',
                        background: selectedClassId === c.id ? '#eff6ff' : 'transparent',
                        color: selectedClassId === c.id ? '#2563eb' : '#475569',
                        fontWeight: selectedClassId === c.id ? 700 : 500,
                        cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      {c.name}
                      {selectedClassId === c.id && <i className="ti ti-chevron-right" style={{ fontSize: '14px' }}/>}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* MAIN CONTENT AFFECTATION */}
            <div style={{ flex: 1, padding: '32px', overflowY: 'auto', background: '#fff', position: 'relative' }}>
              {!selectedClassId ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', flexDirection: 'column' }}>
                  <i className="ti ti-arrow-left" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }} />
                  Sélectionnez une classe à gauche
                </div>
              ) : isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Chargement...</div>
              ) : (
                <>
                  {/* Class Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>{selectedClass?.name}</h3>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>Total Coef: <strong style={{ color: '#3b82f6' }}>{totalCoef}</strong></span>
                        <span style={{ fontSize: '14px', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>Total Heures: <strong style={{ color: '#10b981' }}>{totalHours}h</strong></span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                      <button 
                        onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                        style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                      >
                        <i className="ti ti-template" /> Modèles <i className="ti ti-chevron-down" style={{ fontSize: '14px', opacity: 0.6 }} />
                      </button>
                      
                      {showTemplateDropdown && (
                        <div style={{ position: 'absolute', top: '100%', right: '140px', marginTop: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '16px', width: '320px', zIndex: 10 }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569', textTransform: 'uppercase' }}>Appliquer un modèle</h4>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            <select value={applyTemplateId} onChange={e => setApplyTemplateId(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <option value="">Sélectionner...</option>
                              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={handleApplyTemplate} title="Appliquer" disabled={!applyTemplateId} style={{ background: applyTemplateId ? '#10b981' : '#cbd5e1', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: applyTemplateId ? 'pointer' : 'not-allowed' }}><i className="ti ti-check" /></button>
                            <button onClick={handleDeleteTemplate} title="Supprimer ce modèle" disabled={!applyTemplateId} style={{ background: applyTemplateId ? '#fef2f2' : '#f1f5f9', color: applyTemplateId ? '#ef4444' : '#cbd5e1', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: applyTemplateId ? 'pointer' : 'not-allowed' }}><i className="ti ti-trash" /></button>
                          </div>
                          
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569', textTransform: 'uppercase' }}>Sauvegarder l'actuel</h4>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="Nom du modèle" style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            <button onClick={handleSaveTemplate} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>OK</button>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => setShowAddSlideover(true)}
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', transition: 'all 0.2s' }}
                      >
                        <i className="ti ti-plus" /> Ajouter une matière
                      </button>
                    </div>
                  </div>

                  {/* TABLE AFFECTATION */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Matière</th>
                          <th style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center', textTransform: 'uppercase' }}>Coeff</th>
                          <th style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center', textTransform: 'uppercase' }}>Vol. Hor.</th>
                          <th style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center', textTransform: 'uppercase' }}>Type</th>
                          <th style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'right', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classSubjects.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Aucune matière pour le moment.</td></tr>
                        ) : (
                          classSubjects.map(cs => (
                            <tr key={cs.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', ':hover': { background: '#f8fafc' } } as any}>
                              <td style={{ padding: '2px 10px' }}>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{cs.subject_name}</div>
                                {cs.subject_code && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{cs.subject_code}</div>}
                              </td>
                              
                              <td style={{ padding: '2px 8px', textAlign: 'center' }}>
                                {editingId === cs.id ? (
                                  <input type="number" min="0" step="0.5" value={editCoef} onChange={e => setEditCoef(parseFloat(e.target.value))} style={{ width: '60px', padding: '2px', textAlign: 'center', borderRadius: '4px', border: '1px solid #3b82f6', outline: 'none', fontSize: '12px' }} autoFocus />
                                ) : (
                                  <span onClick={() => { setEditingId(cs.id); setEditCoef(cs.coefficient || 1); setEditHours(cs.weekly_hours || 1); }} style={{ fontWeight: 700, color: '#3b82f6', cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', background: '#eff6ff', fontSize: '12px' }}>{cs.coefficient}</span>
                                )}
                              </td>
                              
                              <td style={{ padding: '2px 8px', textAlign: 'center' }}>
                                {editingId === cs.id ? (
                                  <input type="number" min="0" step="0.5" value={editHours} onChange={e => setEditHours(parseFloat(e.target.value))} style={{ width: '60px', padding: '2px', textAlign: 'center', borderRadius: '4px', border: '1px solid #3b82f6', outline: 'none', fontSize: '12px' }} />
                                ) : (
                                  <span onClick={() => { setEditingId(cs.id); setEditCoef(cs.coefficient || 1); setEditHours(cs.weekly_hours || 1); }} style={{ color: '#475569', cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', fontSize: '12px' }}>{cs.weekly_hours}h</span>
                                )}
                              </td>

                              <td style={{ padding: '2px 8px', textAlign: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{cs.subject_type}</span>
                                {cs.is_mandatory ? <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 600 }}>OBLIGATOIRE</div> : null}
                              </td>

                              <td style={{ padding: '2px 8px', textAlign: 'right' }}>
                                {editingId === cs.id ? (
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button onClick={handleSaveEdit} title="Valider" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><i className="ti ti-check" /></button>
                                    <button onClick={() => setEditingId(null)} title="Annuler" style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><i className="ti ti-x" /></button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleDeleteClassSubject(cs.id, cs.subject_name || '')} title="Retirer" style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}><i className="ti ti-trash" /></button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* POPUP MODAL D'AJOUT */}
                  {showAddSlideover && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px'
                    }}>
                      <div style={{
                        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column',
                        maxHeight: '90vh', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'
                      }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Ajouter à {selectedClass?.name}</h3>
                        <button onClick={() => setShowAddSlideover(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}><i className="ti ti-x" /></button>
                      </div>
                      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Matière (Bibliothèque)</label>
                          <select value={selectedLibrarySubjectId} onChange={e => setSelectedLibrarySubjectId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}>
                            <option value="">Sélectionner une matière...</option>
                            {librarySubjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                          </select>
                          {librarySubjects.length === 0 && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>La bibliothèque est vide. Allez dans l'onglet Bibliothèque pour en créer.</p>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Coefficient</label>
                            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#fff', overflow: 'hidden' }}>
                              <button onClick={() => setCoef(Math.max(1, coef - 0.5))} style={{ padding: '0 16px', background: '#f8fafc', border: 'none', borderRight: '1px solid #e2e8f0', cursor: 'pointer', color: '#475569', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}><i className="ti ti-minus" /></button>
                              <input type="number" className="no-spinner" min="1" step="0.5" value={coef} onChange={e => setCoef(parseFloat(e.target.value) || 1)} style={{ flex: 1, width: '100%', padding: '12px', border: 'none', outline: 'none', fontSize: '14px', textAlign: 'center', background: 'transparent', color: '#1e293b' }} />
                              <button onClick={() => setCoef(coef + 0.5)} style={{ padding: '0 16px', background: '#f8fafc', border: 'none', borderLeft: '1px solid #e2e8f0', cursor: 'pointer', color: '#475569', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}><i className="ti ti-plus" /></button>
                            </div>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Heures / sem.</label>
                            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#fff', overflow: 'hidden' }}>
                              <button onClick={() => setHours(Math.max(1, hours - 0.5))} style={{ padding: '0 16px', background: '#f8fafc', border: 'none', borderRight: '1px solid #e2e8f0', cursor: 'pointer', color: '#475569', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}><i className="ti ti-minus" /></button>
                              <input type="number" className="no-spinner" min="1" step="0.5" value={hours} onChange={e => setHours(parseFloat(e.target.value) || 1)} style={{ flex: 1, width: '100%', padding: '12px', border: 'none', outline: 'none', fontSize: '14px', textAlign: 'center', background: 'transparent', color: '#1e293b' }} />
                              <button onClick={() => setHours(hours + 0.5)} style={{ padding: '0 16px', background: '#f8fafc', border: 'none', borderLeft: '1px solid #e2e8f0', cursor: 'pointer', color: '#475569', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}><i className="ti ti-plus" /></button>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Type de matière</label>
                          <select value={subjectType} onChange={e => setSubjectType(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}>
                            <option value="principale">Principale</option>
                            <option value="secondaire">Secondaire</option>
                            <option value="langue">Langue</option>
                            <option value="sport">Sport / EPS</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                          <input type="checkbox" id="is_mandatory" checked={isMandatory} onChange={e => setIsMandatory(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                          <label htmlFor="is_mandatory" style={{ fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Matière obligatoire</label>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <button onClick={() => setShowAddSlideover(false)} style={{ padding: '12px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                          <button onClick={handleAssignSubject} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>Confirmer l'ajout</button>
                        </div>
                      </div>
                    </div>
                    </div>
                  )}
                  
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: scale(0.95); }
                      to { opacity: 1; transform: scale(1); }
                    }
                    input[type="number"].no-spinner::-webkit-inner-spin-button,
                    input[type="number"].no-spinner::-webkit-outer-spin-button {
                      -webkit-appearance: none;
                      margin: 0;
                    }
                    input[type="number"].no-spinner {
                      -moz-appearance: textfield;
                    }
                  `}</style>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
