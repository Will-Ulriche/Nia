import React, { useState } from 'react';

interface CoefficientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CoefficientModal({ isOpen, onClose }: CoefficientModalProps) {
  const [formData, setFormData] = useState({ class_id: '', subject_id: '', weight: '1' });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulation de sauvegarde
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 800);
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
            <i className="ti ti-calculator" style={{ fontSize: '24px' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Définir un coefficient</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Attribuer un coefficient à une matière</p>
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: '#fffbeb', color: '#d97706', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', fontWeight: 500, border: '1px solid #fef3c7' }}>
          <i className="ti ti-info-circle" style={{ marginRight: '6px' }} />
          Les coefficients sont généralement définis lors de la création des évaluations, mais vous pouvez définir ici une valeur par défaut.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>Classe</label>
              <select style={inputStyle}>
                <option value="">Sélectionnez une classe</option>
                <option value="1">Toutes les classes</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Matière</label>
              <select style={inputStyle}>
                <option value="">Sélectionnez une matière</option>
                <option value="1">Toutes les matières</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Coefficient (Poids) <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="number" 
                min="1"
                value={formData.weight} 
                onChange={e => setFormData({ ...formData, weight: e.target.value })}
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
              disabled={isSaving}
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isSaving ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-check" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
