import React, { useState } from 'react';
import { useSchool } from '../../hooks/useModules';
import { SubjectService } from '../../services/subject.service';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubjectModal({ isOpen, onClose }: SubjectModalProps) {
  const { school } = useSchool();
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !formData.name.trim()) return;
    
    try {
      setIsSaving(true);
      setError(null);
      const payload = {
        school_id: school.id,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        description: formData.description.trim() || undefined,
        is_archived: false,
      };
      await SubjectService.createLibrarySubject(payload);
      setFormData({ name: '', code: '', description: '' });
      onClose();
    } catch (err) {
      setError('Erreur lors de la création de la matière');
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
            <i className="ti ti-book" style={{ fontSize: '24px' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Créer une matière</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Ajouter une nouvelle matière pour les classes.</p>
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
              <label style={labelStyle}>Nom de la matière <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Mathématiques" 
                style={inputStyle} 
                required 
              />
            </div>
            <div>
              <label style={labelStyle}>Code</label>
              <input 
                type="text" 
                value={formData.code} 
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: MATH" 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Description (optionnel)</label>
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails supplémentaires..." 
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
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
              disabled={isSaving || !formData.name.trim()}
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isSaving ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-check" />}
              Créer la matière
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
