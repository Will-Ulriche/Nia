import React, { useState, useEffect } from 'react';
import { useSchool } from '../../hooks/useModules';
import { StructureService } from '../../services/structure.service';
import { useAcademic } from '../../context/AcademicContext';
import type { Level } from '../../types/database';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClassModal({ isOpen, onClose }: ClassModalProps) {
  const { school } = useSchool();
  const { selectedYear } = useAcademic();
  const [levels, setLevels] = useState<Level[]>([]);
  const [formData, setFormData] = useState({ name: '', level_id: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && school) {
      StructureService.listLevels(school.id).then(setLevels).catch(() => {});
    }
  }, [isOpen, school]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !selectedYear || !formData.name.trim() || !formData.level_id) {
      setError('Veuillez remplir tous les champs et sélectionner une année scolaire.');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      await StructureService.createClass({
        school_id: school.id,
        level_id: formData.level_id,
        academic_year_id: selectedYear.id,
        name: formData.name.trim(),
        series_id: null,
      });
      setFormData({ name: '', level_id: '' });
      onClose();
    } catch (err) {
      setError('Erreur lors de la création de la classe');
    } finally {
      setIsSaving(false);
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
    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
    fontSize: '14px', outline: 'none', transition: 'all 0.2s', background: '#f8fafc',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569'
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}
        >
          <i className="ti ti-x" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <i className="ti ti-school" style={{ fontSize: '24px' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Créer une classe</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Ajouter une classe pour l'année {selectedYear ? selectedYear.name : 'en cours'}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', fontWeight: 500 }}>
            <i className="ti ti-alert-circle" style={{ marginRight: '6px' }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>Niveau <span style={{ color: '#ef4444' }}>*</span></label>
              <select 
                value={formData.level_id} 
                onChange={e => setFormData({ ...formData, level_id: e.target.value })}
                style={inputStyle} 
                required 
              >
                <option value="">Sélectionnez un niveau</option>
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nom de la classe <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: 6ème A" 
                style={inputStyle} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ padding: '12px 20px', background: '#f8fafc', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={isSaving || !formData.name.trim() || !formData.level_id}
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isSaving ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-check" />}
              Créer la classe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
