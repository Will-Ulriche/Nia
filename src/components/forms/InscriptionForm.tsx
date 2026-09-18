import React, { useState, useEffect } from 'react';
import { useSchool } from '../../hooks/useModules';
import { useAcademic } from '../../context/AcademicContext';
import { StructureService } from '../../services/structure.service';
import { StudentService } from '../../services/student.service';
import type { Class } from '../../types/database';

export function InscriptionForm({ onSuccess, initialData }: { onSuccess?: () => void, initialData?: any }) {
  const { school } = useSchool();
  const { activeYear, academicYears } = useAcademic();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateMatricule = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `MAT${year}${rand}`;
  };

  const createInitialForm = () => {
    if (initialData) {
      return {
        matricule: initialData.matricule || '', nomEleve: initialData.last_name || '', prenomEleve: initialData.first_name || '', sexe: initialData.gender || 'M', 
        dateNaissance: initialData.birth_date || '', lieuNaissance: initialData.birth_place || '',
        nationalite: initialData.nationality || '', adresseEleve: initialData.address || '', villeEleve: initialData.city || '', quartierEleve: initialData.neighborhood || '', 
        telEleve: initialData.contact_phone || '', emailEleve: initialData.contact_email || '',
        
        nomParent: initialData.parent_name || '', prenomParent: '', relation: initialData.parent_relation || '', tel1: initialData.parent_contact || '', tel2: '', 
        whatsapp: initialData.parent_whatsapp || '', emailParent: '',
        profession: initialData.parent_profession || '', adresseParent: '', villeParent: initialData.parent_city || '', quartierParent: initialData.parent_neighborhood || '', 
        responsableFinancier: initialData.financial_sponsor ? 'Oui' : 'Non',

        anneeScolaire: activeYear?.id || '', typeInscription: 'Nouvelle', cycle: '', niveau: '', classe: initialData.class_id || '',
        regime: initialData.schooling_regime || 'Externe', ecolePrecedente: initialData.previous_school || '', derniereClasse: initialData.previous_class || '', anneePrecedente: initialData.previous_year || ''
      };
    }
    return {
      // Élève
      matricule: generateMatricule(), nomEleve: '', prenomEleve: '', sexe: 'M', dateNaissance: '', lieuNaissance: '',
      nationalite: '', adresseEleve: '', villeEleve: '', quartierEleve: '', telEleve: '', emailEleve: '',
      // Parent
      nomParent: '', prenomParent: '', relation: '', tel1: '', tel2: '', whatsapp: '', emailParent: '',
      profession: '', adresseParent: '', villeParent: '', quartierParent: '', responsableFinancier: 'Oui',
      // Scolaire
      anneeScolaire: '', typeInscription: 'Nouvelle', cycle: '', niveau: '', classe: '',
      regime: 'Externe', ecolePrecedente: '', derniereClasse: '', anneePrecedente: ''
    };
  };

  const [formData, setFormData] = useState(createInitialForm());

  useEffect(() => {
    if (activeYear) {
      setFormData(prev => ({ ...prev, anneeScolaire: activeYear.id }));
    }
  }, [activeYear]);

  useEffect(() => {
    if (school && formData.anneeScolaire) {
      StructureService.listClasses(school.id, formData.anneeScolaire).then(setClasses);
    } else {
      setClasses([]);
    }
  }, [school, formData.anneeScolaire]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !formData.nomEleve.trim() || !formData.prenomEleve.trim()) {
      setError("Le nom et prénom de l'élève sont obligatoires.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      if (initialData) {
        // Edit mode
        await StudentService.updateStudent(initialData.id, {
          first_name: formData.prenomEleve.trim(),
          last_name: formData.nomEleve.trim(),
          gender: formData.sexe || null,
          birth_date: formData.dateNaissance || null,
          birth_place: formData.lieuNaissance.trim() || null,
          address: formData.adresseEleve.trim() || null,
          city: formData.villeEleve.trim() || null,
          neighborhood: formData.quartierEleve.trim() || null,
          nationality: formData.nationalite.trim() || null,
          contact_phone: formData.telEleve.trim() || null,
          contact_email: formData.emailEleve.trim() || null,
          parent_name: formData.nomParent.trim() || null,
          parent_contact: formData.tel1.trim() || formData.tel2.trim() || null,
          parent_city: formData.villeParent.trim() || null,
          parent_neighborhood: formData.quartierParent.trim() || null,
          parent_whatsapp: formData.whatsapp.trim() || null,
          parent_profession: formData.profession.trim() || null,
          parent_relation: formData.relation.trim() || null,
          financial_sponsor: formData.responsableFinancier === 'Oui' ? 1 : 0,
          schooling_regime: formData.regime || null,
          previous_school: formData.ecolePrecedente.trim() || null,
          previous_class: formData.derniereClasse.trim() || null,
          previous_year: formData.anneePrecedente.trim() || null,
        });

        if (initialData.enrollment_id && formData.classe && formData.anneeScolaire) {
          await StudentService.updateEnrollment(initialData.enrollment_id, {
            class_id: formData.classe,
            academic_year_id: formData.anneeScolaire
          });
        } else if (!initialData.enrollment_id && formData.classe && formData.anneeScolaire) {
          await StudentService.createEnrollment({
            school_id: school.id,
            student_id: initialData.id,
            academic_year_id: formData.anneeScolaire,
            class_id: formData.classe,
            status: 'active'
          });
        }
        setSuccess("Élève modifié avec succès !");
      } else {
        // 1. Create Student
        const newStudent = await StudentService.createStudent({
          school_id: school.id,
          first_name: formData.prenomEleve.trim(),
          last_name: formData.nomEleve.trim(),
          matricule: formData.matricule.trim() || null,
          gender: formData.sexe || null,
          birth_date: formData.dateNaissance || null,
          birth_place: formData.lieuNaissance.trim() || null,
          address: formData.adresseEleve.trim() || null,
          city: formData.villeEleve.trim() || null,
          neighborhood: formData.quartierEleve.trim() || null,
          nationality: formData.nationalite.trim() || null,
          contact_phone: formData.telEleve.trim() || null,
          contact_email: formData.emailEleve.trim() || null,
          parent_name: formData.nomParent.trim() || null,
          parent_contact: formData.tel1.trim() || formData.tel2.trim() || null,
          parent_city: formData.villeParent.trim() || null,
          parent_neighborhood: formData.quartierParent.trim() || null,
          parent_whatsapp: formData.whatsapp.trim() || null,
          parent_profession: formData.profession.trim() || null,
          parent_relation: formData.relation.trim() || null,
          financial_sponsor: formData.responsableFinancier === 'Oui' ? 1 : 0,
          schooling_regime: formData.regime || null,
          previous_school: formData.ecolePrecedente.trim() || null,
          previous_class: formData.derniereClasse.trim() || null,
          previous_year: formData.anneePrecedente.trim() || null,
        });

        // 2. Create Enrollment if class is selected
        if (formData.anneeScolaire && formData.classe) {
          await StudentService.createEnrollment({
            school_id: school.id,
            student_id: newStudent.id,
            academic_year_id: formData.anneeScolaire,
            class_id: formData.classe,
            status: 'active'
          });
        }
        setSuccess("Élève inscrit avec succès !");
      }

      if (!initialData) {
        setFormData({ ...createInitialForm(), anneeScolaire: activeYear?.id || '' });
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...createInitialForm(), anneeScolaire: activeYear?.id || '' });
    setError(null);
    setSuccess(null);
  };

  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
    marginBottom: '16px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '15px', fontWeight: 700, color: '#1e3a5f', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px'
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '4px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 600, color: '#64748b'
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc', color: '#1e293b'
  };

  return (
    <>
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a5f', margin: 0 }}>
            {initialData ? `Modifier l'élève` : `Nouvelle Inscription`}
          </h2>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #f87171', fontSize: '14px', flexShrink: 0 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fdf4', color: '#15803d', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #86efac', fontSize: '14px', flexShrink: 0 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          
          <div className="hide-scrollbar" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', overflowY: 'auto', paddingBottom: '16px' }}>
            {/* SECTION : Informations de l'élève */}
            <div style={{ ...sectionStyle, marginBottom: 0, height: 'fit-content' }}>
              <h3 style={titleStyle}><i className="ti ti-user" style={{ color: '#3b82f6' }} /> Informations de l'élève</h3>
              
              <div style={gridStyle}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Matricule</label>
                  <input style={{...inputStyle, background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed'}} name="matricule" value={formData.matricule} readOnly title="Généré automatiquement" />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Nom <span style={{ color: '#ef4444' }}>*</span></label>
                  <input style={inputStyle} name="nomEleve" value={formData.nomEleve} onChange={handleChange} required />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Prénom(s) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input style={inputStyle} name="prenomEleve" value={formData.prenomEleve} onChange={handleChange} required />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Sexe</label>
                  <select style={inputStyle} name="sexe" value={formData.sexe} onChange={handleChange}>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Date de naissance</label>
                  <input style={inputStyle} type="date" name="dateNaissance" value={formData.dateNaissance} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Lieu de naissance</label>
                  <input style={inputStyle} name="lieuNaissance" value={formData.lieuNaissance} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Nationalité</label>
                  <input style={inputStyle} name="nationalite" value={formData.nationalite} onChange={handleChange} />
                </div>
                
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Adresse</label>
                  <input style={inputStyle} name="adresseEleve" value={formData.adresseEleve} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Ville</label>
                  <input style={inputStyle} name="villeEleve" value={formData.villeEleve} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Quartier</label>
                  <input style={inputStyle} name="quartierEleve" value={formData.quartierEleve} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Téléphone</label>
                  <input style={inputStyle} name="telEleve" value={formData.telEleve} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" name="emailEleve" value={formData.emailEleve} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* SECTION : Parent / Tuteur */}
            <div style={{ ...sectionStyle, marginBottom: 0, height: 'fit-content' }}>
              <h3 style={titleStyle}><i className="ti ti-users" style={{ color: '#10b981' }} /> Parent / Tuteur</h3>
              
              <div style={gridStyle}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Nom</label>
                  <input style={inputStyle} name="nomParent" value={formData.nomParent} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Prénom</label>
                  <input style={inputStyle} name="prenomParent" value={formData.prenomParent} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Relation avec l'élève</label>
                  <select style={inputStyle} name="relation" value={formData.relation} onChange={handleChange}>
                    <option value="">Sélectionner...</option>
                    <option value="Père">Père</option>
                    <option value="Mère">Mère</option>
                    <option value="Tuteur">Tuteur légal</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Téléphone principal</label>
                  <input style={inputStyle} name="tel1" value={formData.tel1} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Téléphone secondaire</label>
                  <input style={inputStyle} name="tel2" value={formData.tel2} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>WhatsApp</label>
                  <input style={inputStyle} name="whatsapp" value={formData.whatsapp} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" name="emailParent" value={formData.emailParent} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Profession</label>
                  <input style={inputStyle} name="profession" value={formData.profession} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Adresse</label>
                  <input style={inputStyle} name="adresseParent" value={formData.adresseParent} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Ville</label>
                  <input style={inputStyle} name="villeParent" value={formData.villeParent} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Quartier</label>
                  <input style={inputStyle} name="quartierParent" value={formData.quartierParent} onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Responsable financier</label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '38px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                      <input type="radio" name="responsableFinancier" value="Oui" checked={formData.responsableFinancier === 'Oui'} onChange={handleChange} /> Oui
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                      <input type="radio" name="responsableFinancier" value="Non" checked={formData.responsableFinancier === 'Non'} onChange={handleChange} /> Non
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION : Informations scolaires */}
            <div style={{ ...sectionStyle, marginBottom: 0, height: 'fit-content' }}>
              <h3 style={titleStyle}><i className="ti ti-school" style={{ color: '#f59e0b' }} /> Informations scolaires</h3>
              
              <div style={gridStyle}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Année scolaire</label>
                  <select style={inputStyle} name="anneeScolaire" value={formData.anneeScolaire} onChange={handleChange}>
                    <option value="">-- Sélectionner --</option>
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id}>{ay.name} {ay.is_active ? '(Active)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Type d'inscription</label>
                  <select style={inputStyle} name="typeInscription" value={formData.typeInscription} onChange={handleChange}>
                    <option value="Nouvelle">Nouvelle inscription</option>
                    <option value="Reinscription">Réinscription</option>
                    <option value="Transfert">Transfert</option>
                  </select>
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Classe d'affectation</label>
                  <select style={inputStyle} name="classe" value={formData.classe} onChange={handleChange} disabled={!formData.anneeScolaire}>
                    <option value="">-- Sans classe --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Régime scolaire</label>
                  <select style={inputStyle} name="regime" value={formData.regime} onChange={handleChange}>
                    <option value="Externe">Externe</option>
                    <option value="Demi-pensionnaire">Demi-pensionnaire</option>
                    <option value="Interne">Interne</option>
                  </select>
                </div>
                
                {formData.typeInscription === 'Transfert' && (
                  <>
                    <div style={inputGroupStyle}>
                      <label style={labelStyle}>Établissement précédent</label>
                      <input style={inputStyle} name="ecolePrecedente" value={formData.ecolePrecedente} onChange={handleChange} />
                    </div>
                    <div style={inputGroupStyle}>
                      <label style={labelStyle}>Dernière classe fréquentée</label>
                      <input style={inputStyle} name="derniereClasse" value={formData.derniereClasse} onChange={handleChange} />
                    </div>
                    <div style={inputGroupStyle}>
                      <label style={labelStyle}>Année scolaire précédente</label>
                      <input style={inputStyle} name="anneePrecedente" value={formData.anneePrecedente} onChange={handleChange} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions du formulaire */}
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', justifyContent: 'flex-end', marginTop: '16px', flexShrink: 0 }}>
            <button type="submit" disabled={isSaving} title="Enregistrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none',
              padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s', opacity: isSaving ? 0.7 : 1
            }} onMouseEnter={e => !isSaving && ((e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)')} onMouseLeave={e => !isSaving && ((e.currentTarget as HTMLElement).style.transform = 'translateY(0)')}>
              <i className={isSaving ? "ti ti-loader" : "ti ti-device-floppy"} style={{ fontSize: '16px' }} />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>

            <button type="button" onClick={handleReset} title="Annuler" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0',
              padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s'
            }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f1f5f9'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}>
              <i className="ti ti-x" style={{ fontSize: '16px' }} />
              <span>Annuler</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
