import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { useAuth } from '../../../hooks/useAuth';
import { useAcademic } from '../../../context/AcademicContext';
import { StructureService } from '../../../services/structure.service';
import { StudentService } from '../../../services/student.service';
import { FinanceService } from '../../../services/finance.service';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Class, Student, Payment, FeeDefinition } from '../../../types/database';

export function PaymentsList() {
  const { school } = useSchool();
  const { profile } = useAuth();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [fees, setFees] = useState<FeeDefinition[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState({ totalDue: 0, totalPaid: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Modal pour nouveau paiement
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Payment>>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference_number: '',
    fee_definition_id: ''
  });

  // Initialisation : Classes et Frais
  useEffect(() => {
    const init = async () => {
      if (!school || !selectedYear) return;
      try {
        const clsData = await StructureService.listClasses(school.id, selectedYear.id);
        setClasses(clsData);
        if (clsData.length > 0) setSelectedClassId(clsData[0].id);

        const feeData = await FinanceService.listFeeDefinitions(school.id, selectedYear.id);
        setFees(feeData);
      } catch (err) { console.error(err); }
    };
    init();
  }, [school, selectedYear]);

  // Chargement des élèves de la classe
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedClassId || !selectedYear) {
        setStudents([]);
        return;
      }
      try {
        const enrData = await StudentService.listEnrollmentsByClass(selectedClassId, selectedYear.id);
        setStudents(enrData.map((e: any) => e.students).filter(Boolean));
      } catch (err) { console.error(err); }
    };
    loadStudents();
  }, [selectedClassId, selectedYear]);

  // Chargement financier de l'élève
  const loadStudentFinance = async () => {
    if (!school || !selectedStudent || !selectedYear) return;
    try {
      setIsLoading(true);
      const [pays, sum] = await Promise.all([
        FinanceService.listPaymentsByStudent(school.id, selectedStudent.id, selectedYear.id),
        FinanceService.getStudentFinancialSummary(school.id, selectedStudent.id, selectedYear.id)
      ]);
      setPayments(pays);
      setSummary(sum);
    } catch (err) { console.error(err); } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) loadStudentFinance();
    else { setPayments([]); setSummary({ totalDue: 0, totalPaid: 0, balance: 0 }); }
  }, [selectedStudent, selectedYear]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !selectedStudent || !selectedYear || !profile) return;
    try {
      const payload = {
        ...formData,
        school_id: school.id,
        student_id: selectedStudent.id,
        academic_year_id: selectedYear.id,
        fee_definition_id: formData.fee_definition_id || undefined
      };
      
      const result = await FinanceService.addPaymentWithReceipt(payload, profile.id);
      console.log('Payment saved, receipt generated:', result.receipt.receipt_number);
      
      setIsFormOpen(false);
      setFormData({ amount: 0, payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_number: '', fee_definition_id: '' });
      loadStudentFinance();
      alert(`Paiement enregistré avec succès. Reçu n° ${result.receipt.receipt_number} généré.`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du paiement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous annuler ce paiement ?")) return;
    try {
      await FinanceService.deletePayment(id, school!.id, profile!.id);
      loadStudentFinance();
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Caisse & Paiements</h2>
      </div>

      {/* Barre de recherche / filtre */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'flex-end', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Année scolaire</label>
          <select value={selectedYear?.id || ''} onChange={(e) => setSelectedYear(academicYears.find(y => y.id === e.target.value) || null)} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}>
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Classe</label>
          <select value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedStudent(null); }} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', minWidth: '150px' }}>
            <option value="">-- Sélectionner --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Élève</label>
          <select value={selectedStudent?.id || ''} onChange={e => setSelectedStudent(students.find(s => s.id === e.target.value) || null)} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}>
            <option value="">-- Sélectionner un élève --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.last_name} {s.first_name} {s.matricule ? `(${s.matricule})` : ''}</option>)}
          </select>
        </div>
      </div>

      {!selectedStudent ? (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <EmptyState
            icon="💵"
            title="Aucun élève sélectionné"
            description="Veuillez sélectionner un élève dans la liste à gauche pour voir et gérer ses paiements."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Panneau de résumé financier */}
          <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Bilan de l'élève</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px' }}>
                <span style={{ color: '#7f8c8d' }}>Frais obligatoires (Dû) :</span>
                <strong style={{ fontSize: '1.1rem' }}>{summary.totalDue.toLocaleString()} FCFA</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#d4edda', borderRadius: '4px' }}>
                <span style={{ color: '#155724' }}>Total Payé :</span>
                <strong style={{ fontSize: '1.1rem', color: '#155724' }}>{summary.totalPaid.toLocaleString()} FCFA</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: summary.balance > 0 ? '#f8d7da' : '#d1ecf1', borderRadius: '4px', border: `1px solid ${summary.balance > 0 ? '#f5c6cb' : '#bee5eb'}` }}>
                <span style={{ color: summary.balance > 0 ? '#721c24' : '#0c5460', fontWeight: 'bold' }}>Reste à payer :</span>
                <strong style={{ fontSize: '1.3rem', color: summary.balance > 0 ? '#e74c3c' : '#27ae60' }}>
                  {summary.balance > 0 ? summary.balance.toLocaleString() : '0'} FCFA
                </strong>
              </div>
            </div>

            <button
              onClick={() => setIsFormOpen(true)}
              style={{ width: '100%', marginTop: '2rem', padding: '1rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Encaisser un paiement
            </button>
          </div>

          {/* Liste des paiements */}
          <div style={{ flex: 2, background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Historique des paiements</h3>
            
            {isLoading ? <p>Chargement...</p> : payments.length === 0 ? (
              <EmptyState
                icon="💸"
                title="Aucun paiement"
                description="Cet élève n'a effectué aucun paiement pour l'année en cours."
              />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Date</th>
                    <th style={{ padding: '0.75rem' }}>Motif / Tranche</th>
                    <th style={{ padding: '0.75rem' }}>Montant</th>
                    <th style={{ padding: '0.75rem' }}>Mode</th>
                    <th style={{ padding: '0.75rem' }}>Reçu</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => {
                    const receipt = p.receipts && p.receipts.length > 0 ? p.receipts[0] : null;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.75rem' }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem' }}>{p.fee_definitions?.name || 'Paiement libre'}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#27ae60' }}>{Number(p.amount).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {p.payment_method === 'cash' ? 'Espèces' : p.payment_method === 'check' ? 'Chèque' : p.payment_method === 'mobile_money' ? 'Mobile Money' : 'Virement'}
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#7f8c8d' }}>
                          {receipt?.receipt_number || '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button onClick={() => handleDelete(p.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e74c3c' }} title="Annuler">❌</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Modal / Formulaire d'encaissement */}
      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '500px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Nouvel Encaissement</h3>
            <form onSubmit={handleSubmitPayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Motif / Tranche (Optionnel)</label>
                <select value={formData.fee_definition_id || ''} onChange={e => setFormData({ ...formData, fee_definition_id: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option value="">-- Paiement libre --</option>
                  {fees.map(f => <option key={f.id} value={f.id}>{f.name} - {Number(f.amount).toLocaleString()} FCFA</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Montant versé (FCFA)</label>
                <input required type="number" min="1" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Date</label>
                  <input required type="date" value={formData.payment_date} onChange={e => setFormData({ ...formData, payment_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Mode de paiement</label>
                  <select value={formData.payment_method || 'cash'} onChange={e => setFormData({ ...formData, payment_method: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <option value="cash">Espèces</option>
                    <option value="mobile_money">Mobile Money (OM/MOMO)</option>
                    <option value="check">Chèque</option>
                    <option value="transfer">Virement</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>N° de référence / chèque (Optionnel)</label>
                <input type="text" value={formData.reference_number || ''} onChange={e => setFormData({ ...formData, reference_number: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsFormOpen(false)} style={{ padding: '0.5rem 1rem', background: '#ecf0f1', color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Annuler</button>
                <button type="submit" style={{ padding: '0.5rem 1.5rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Valider l'encaissement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
