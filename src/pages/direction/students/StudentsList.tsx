import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { StudentService } from '../../../services/student.service';
import { StructureService } from '../../../services/structure.service';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Student, Class, Level } from '../../../types/database';

interface StudentWithEnrollment extends Student {
  class_name?: string;
  class_id?: string;
  level_id?: string;
  level_name?: string;
  enrollment_id?: string;
  enrollment_status?: string;
}

import { InscriptionForm } from '../../../components/forms/InscriptionForm';

export function StudentsList() {
  const { school } = useSchool();
  const { selectedYear, refreshYears } = useAcademic();
  const [students, setStudents] = useState<StudentWithEnrollment[]>([]);
  const [classes, setClasses] = useState<(Class & { level_name?: string })[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithEnrollment | null>(null);
  
  

  // Filter states
  const [, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const loadData = async () => {
    if (!school || !selectedYear) return;
    try {
      setIsLoading(true);
      const [studentsData, classesData, levelsData] = await Promise.all([
        StudentService.listStudentsWithEnrollments(school.id, selectedYear.id),
        StructureService.listClasses(school.id, selectedYear.id),
        StructureService.listLevels(school.id)
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setLevels(levelsData);
    } catch (err) {
      setError('Erreur lors du chargement des donnÃ©es');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    loadData();
  }, [school, selectedYear]);

  // When level changes, reset class selection
  useEffect(() => {
    setSelectedClass('');
  }, [selectedLevel]);

  // Available classes filtered by selected level
  const availableClasses = useMemo(() => {
    if (!selectedLevel) return classes;
    return classes.filter(c => c.level_id === selectedLevel);
  }, [classes, selectedLevel]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Text search on name and matricule
      if (searchText) {
        const query = searchText.toLowerCase();
        const fullName = `${student.last_name} ${student.first_name}`.toLowerCase();
        const matricule = (student.matricule || '').toLowerCase();
        if (!fullName.includes(query) && !matricule.includes(query)) return false;
      }
      // Level filter
      if (selectedLevel && student.level_id !== selectedLevel) return false;
      // Class filter
      if (selectedClass && student.class_id !== selectedClass) return false;
      return true;
    });
  }, [students, searchText, selectedLevel, selectedClass]);

  const openForm = (student?: StudentWithEnrollment) => {
    setEditingStudent(student || null);
    setShowForm(true);
  };

  const handleSuccess = async () => {
    setShowForm(false);
    setEditingStudent(null);
    await loadData();
  };

  const handleDelete = async (student: StudentWithEnrollment) => {
    if (window.confirm(`ÃŠtes-vous sÃ»r de vouloir supprimer l'Ã©lÃ¨ve ${student.last_name} ${student.first_name} ?`)) {
      try {
        await StudentService.deleteStudent(student.id);
        if (student.enrollment_id) {
          await StudentService.deleteEnrollment(student.enrollment_id);
        }
        await loadData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedLevel('');
    setSelectedClass('');
  };

  const hasActiveFilters = searchText || selectedLevel || selectedClass;

  if (isLoading) return <div style={{ padding: '2rem' }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b' }}>Ã‰lÃ¨ves</h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            {filteredStudents.length} Ã©lÃ¨ve{filteredStudents.length > 1 ? 's' : ''}{hasActiveFilters ? ` sur ${students.length}` : ` enregistrÃ©${students.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => openForm()}
          style={{ padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="ti ti-plus" /> Nouvel Ã©lÃ¨ve
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1rem',
        padding: '12px 16px', background: '#f8fafc', borderRadius: '12px',
        border: '1px solid #e2e8f0', flexWrap: 'wrap'
      }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '200px' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: '#94a3b8', fontSize: '16px', pointerEvents: 'none'
          }} />
          <input
            type="text"
            placeholder="Rechercher par nom ou matriculeâ€¦"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0',
              borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white',
              transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box'
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Level filter */}
        <div style={{ flex: '0 0 auto', minWidth: '160px' }}>
          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0',
              borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white',
              cursor: 'pointer', color: selectedLevel ? '#0f172a' : '#94a3b8',
              transition: 'border-color 0.2s, box-shadow 0.2s', appearance: 'auto'
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <option value="">Tous les niveaux</option>
            {levels.map(level => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </select>
        </div>

        {/* Class filter */}
        <div style={{ flex: '0 0 auto', minWidth: '160px' }}>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0',
              borderRadius: '8px', fontSize: '14px', outline: 'none', background: 'white',
              cursor: 'pointer', color: selectedClass ? '#0f172a' : '#94a3b8',
              transition: 'border-color 0.2s, box-shadow 0.2s', appearance: 'auto'
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <option value="">Toutes les classes</option>
            {availableClasses.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: '9px 14px', background: '#fee2e2', color: '#dc2626',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.2s', whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
            onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
          >
            <i className="ti ti-x" /> Effacer
          </button>
        )}
      </div>

      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '20px', width: '95%', maxWidth: '1000px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <button 
              onClick={() => { setShowForm(false); setEditingStudent(null); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}
            >
              <i className="ti ti-x" /> âœ•
            </button>

            <InscriptionForm onSuccess={handleSuccess} initialData={editingStudent} />
          </div>
        </div>
      )}



      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {filteredStudents.length === 0 ? (
          hasActiveFilters ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>ðŸ”</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontWeight: 600 }}>Aucun rÃ©sultat</h3>
              <p style={{ color: '#64748b', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                Aucun Ã©lÃ¨ve ne correspond Ã  vos critÃ¨res de recherche.
              </p>
              <button
                onClick={clearFilters}
                style={{
                  padding: '0.5rem 1rem', background: '#eff6ff', color: '#3b82f6',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                }}
              >
                RÃ©initialiser les filtres
              </button>
            </div>
          ) : (
            <EmptyState
              icon="ðŸ‘©â€ðŸŽ“"
              title="Aucun Ã©lÃ¨ve enregistrÃ©"
              description="Commencez par ajouter le premier Ã©lÃ¨ve de cet Ã©tablissement. Vous pourrez l'inscrire directement dans une classe."
              action={{ label: "+ Nouvel Ã©lÃ¨ve", onClick: openForm }}
            />
          )
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Matricule</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Ã‰lÃ¨ve</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Sexe</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date de naissance</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Lieu de naissance</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Adresse</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Niveau</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Classe actuelle</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, i) => (
                <tr key={student.id} style={{ borderBottom: i < filteredStudents.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '6px 12px', color: '#64748b', fontWeight: 500 }}>{student.matricule || 'â€”'}</td>
                  <td style={{ padding: '6px 12px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.last_name} {student.first_name}</div>
                  </td>
                  <td style={{ padding: '6px 12px', color: '#64748b' }}>{student.gender || 'â€”'}</td>
                  <td style={{ padding: '6px 12px', color: '#64748b' }}>{student.birth_date ? new Date(student.birth_date).toLocaleDateString('fr-FR') : 'â€”'}</td>
                  <td style={{ padding: '6px 12px', color: '#64748b' }}>{student.birth_place || 'â€”'}</td>
                  <td style={{ padding: '6px 12px', color: '#64748b' }}>{student.address || 'â€”'}</td>
                  <td style={{ padding: '6px 12px' }}>
                    {student.level_name ? (
                      <span style={{ display: 'inline-flex', padding: '3px 8px', background: '#f0fdf4', color: '#15803d', borderRadius: '9999px', fontSize: '11px', fontWeight: 600 }}>
                        {student.level_name}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>â€”</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px' }}>
                    {student.class_name ? (
                      <span style={{ display: 'inline-flex', padding: '3px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '9999px', fontSize: '11px', fontWeight: 600 }}>
                        {student.class_name}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Non inscrit</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Link
                        to={`/direction/students/${student.id}`}
                        title="Voir le dossier"
                        style={{ padding: '8px', background: '#f1f5f9', color: '#334155', textDecoration: 'none', borderRadius: '6px', fontSize: '15px', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                      >
                        <i className="ti ti-eye" />
                      </Link>
                      <button
                        onClick={() => openForm(student)}
                        title="Modifier"
                        style={{ padding: '8px', background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fde68a'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fef3c7'}
                      >
                        <i className="ti ti-pencil" />
                      </button>
                      <button
                        onClick={() => handleDelete(student)}
                        title="Supprimer"
                        style={{ padding: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

