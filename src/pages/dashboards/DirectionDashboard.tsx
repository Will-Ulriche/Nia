import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchool } from '../../hooks/useModules';
import { SubjectManagerModal } from '../../components/modals/SubjectManagerModal';
import { ClassModal } from '../../components/forms/ClassModal';
import { CoefficientModal } from '../../components/forms/CoefficientModal';
import { ClassManagerModal } from '../../components/modals/ClassManagerModal';

export function DirectionDashboard() {
  const { schoolLoading } = useSchool();
  const navigate = useNavigate();
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isCoefModalOpen, setIsCoefModalOpen] = useState(false);
  const [isClassManagerOpen, setIsClassManagerOpen] = useState(false);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);

  if (schoolLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
        Chargement...
      </div>
    );
  }

  const buttonStyle = {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white', border: 'none', borderRadius: '14px',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    width: '100%', textAlign: 'left' as const
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
    (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
  };

  const iconStyle = {
    width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 as const
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', padding: '0', gap: '2vh' }}>
      
      {/* GAUCHE : Zone de contenu principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '18px', fontWeight: 600 }}>
          <div style={{ textAlign: 'center' }}>
            <i className="ti ti-layout-dashboard" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px', display: 'block' }} />
            Sélectionnez une action à gauche pour commencer
          </div>
        </div>
      </div>

      {/* DROITE : Colonne droite pour les widgets et actions */}
      <div style={{ 
        width: '320px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        padding: '24px',
        background: '#fff',
        borderRadius: '20px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
        flexShrink: 0,
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b', fontWeight: 700 }}>
            Raccourcis
          </h3>
        </div>
        



        {/* Bouton GESTIONNAIRE DES CLASSES (nouveau) */}
        <button 
          onClick={() => setIsClassManagerOpen(true)}
          style={buttonStyle} 
          onMouseEnter={handleMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          <div style={iconStyle}>
            <i className="ti ti-building-community" style={{ fontSize: '18px' }} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>Gestionnaire des classes</div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Collège & Lycée</div>
          </div>
        </button>

        {/* Bouton GESTIONNAIRE DES MATIÈRES (nouveau) */}
        <button 
          onClick={() => setIsSubjectManagerOpen(true)}
          style={buttonStyle} 
          onMouseEnter={handleMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          <div style={iconStyle}>
            <i className="ti ti-book" style={{ fontSize: '18px' }} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>Gestionnaire des matières</div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Coefficients, Horaires & Modèles</div>
          </div>
        </button>

        {/* Bouton LISTE DES ÉLÈVES (nouveau) */}
        <button 
          onClick={() => navigate('/direction/students')}
          style={buttonStyle} 
          onMouseEnter={handleMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          <div style={iconStyle}>
            <i className="ti ti-users" style={{ fontSize: '18px' }} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>Liste des élèves</div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Gérer tous les élèves inscrits</div>
          </div>
        </button>

      </div>


      <ClassModal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
      />
      <CoefficientModal 
        isOpen={isCoefModalOpen} 
        onClose={() => setIsCoefModalOpen(false)} 
      />
      <ClassManagerModal
        isOpen={isClassManagerOpen}
        onClose={() => setIsClassManagerOpen(false)}
      />
      <SubjectManagerModal
        isOpen={isSubjectManagerOpen}
        onClose={() => setIsSubjectManagerOpen(false)}
      />
    </div>
  );
}
