import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { useAuth } from '../../../hooks/useAuth';
import { useAcademic } from '../../../context/AcademicContext';
import { FinanceService } from '../../../services/finance.service';
import type { Expense } from '../../../types/database';

type Transaction = {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
};

export function CashRegister() {
  const { school } = useSchool();
  const { profile } = useAuth();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ totalIncomes: 0, totalExpenses: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Formulaire Dépense
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [expenseData, setExpenseData] = useState<Partial<Expense>>({
    category: 'Achat de matériel',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const loadCashData = async () => {
    if (!school || !selectedYear) return;
    try {
      setIsLoading(true);
      
      const [sum, expenses, payments] = await Promise.all([
        FinanceService.getCashRegisterSummary(school.id, selectedYear.id),
        FinanceService.listExpenses(school.id, selectedYear.id),
        // We need all payments in the school, but we don't have a direct function in service that lists all payments (only by student).
        // For the sake of this component, let's fetch them directly or via a new service method.
        // I will implement a quick fetch for all payments in this year.
        import('../../../services/supabase').then(({ supabase }) => 
          supabase
            .from('payments')
            .select('id, payment_date, amount, fee_definitions(name), students(first_name, last_name)')
            .eq('school_id', school.id)
            .eq('academic_year_id', selectedYear.id)
            .is('deleted_at', null)
        ).then(res => res.data || [])
      ]);

      setSummary(sum);

      // Merge transactions
      const merged: Transaction[] = [];
      
      expenses.forEach(e => {
        merged.push({
          id: e.id,
          date: e.expense_date,
          type: 'expense',
          category: e.category,
          description: e.description || '',
          amount: Number(e.amount)
        });
      });

      payments.forEach((p: any) => {
        merged.push({
          id: p.id,
          date: p.payment_date,
          type: 'income',
          category: 'Paiement scolarité',
          description: `${p.students?.first_name || ''} ${p.students?.last_name || ''} - ${p.fee_definitions?.name || 'Paiement'}`,
          amount: Number(p.amount)
        });
      });

      // Sort by date descending
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(merged);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCashData();
  }, [school, selectedYear]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !selectedYear || !profile) return;
    try {
      await FinanceService.addExpense({
        ...expenseData,
        school_id: school.id,
        academic_year_id: selectedYear.id,
        recorded_by: profile.id
      });
      setIsExpenseFormOpen(false);
      setExpenseData({
        category: 'Achat de matériel',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      loadCashData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'enregistrement de la dépense');
    }
  };

  const handleDeleteExpense = async (id: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      alert("Les annulations d'encaissements doivent se faire depuis le dossier de l'élève.");
      return;
    }
    if (!confirm('Voulez-vous annuler cette dépense ?')) return;
    try {
      await FinanceService.deleteExpense(id);
      loadCashData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Livre de Caisse & Dépenses</h2>
        <div>
          <select 
            value={selectedYear?.id || ''} 
            onChange={(e) => setSelectedYear(academicYears.find(y => y.id === e.target.value) || null)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginRight: '1rem' }}
          >
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
          <button
            onClick={() => setIsExpenseFormOpen(true)}
            style={{ padding: '0.6rem 1.2rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            - Enregistrer une Dépense
          </button>
        </div>
      </div>

      {/* Résumé de Caisse */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '5px solid #2ecc71' }}>
          <div style={{ color: '#7f8c8d', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Entrées</div>
          <div style={{ fontSize: '2rem', color: '#27ae60', marginTop: '0.5rem' }}>{summary.totalIncomes.toLocaleString()} FCFA</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '5px solid #e74c3c' }}>
          <div style={{ color: '#7f8c8d', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Sorties</div>
          <div style={{ fontSize: '2rem', color: '#c0392b', marginTop: '0.5rem' }}>{summary.totalExpenses.toLocaleString()} FCFA</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: `5px solid ${summary.balance >= 0 ? '#3498db' : '#e67e22'}` }}>
          <div style={{ color: '#7f8c8d', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Solde en Caisse</div>
          <div style={{ fontSize: '2rem', color: summary.balance >= 0 ? '#2980b9' : '#d35400', marginTop: '0.5rem' }}>{summary.balance.toLocaleString()} FCFA</div>
        </div>
      </div>

      {/* Liste des Transactions */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Historique des Transactions (Entrées / Sorties)</h3>
        
        {isLoading ? <p>Chargement...</p> : transactions.length === 0 ? (
          <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '2rem 0' }}>Aucune transaction enregistrée.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Type</th>
                <th style={{ padding: '0.75rem' }}>Catégorie</th>
                <th style={{ padding: '0.75rem' }}>Description / Élève</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Montant (FCFA)</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{new Date(t.date).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {t.type === 'income' ? (
                      <span style={{ background: '#d4edda', color: '#155724', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>ENTRÉE</span>
                    ) : (
                      <span style={{ background: '#f8d7da', color: '#721c24', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>SORTIE</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{t.category}</td>
                  <td style={{ padding: '0.75rem', color: '#7f8c8d' }}>{t.description}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: t.type === 'income' ? '#27ae60' : '#e74c3c' }}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {t.type === 'expense' && (
                      <button onClick={() => handleDeleteExpense(t.id, t.type)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e74c3c' }} title="Annuler la dépense">❌</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal d'ajout de dépense */}
      {isExpenseFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '500px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#c0392b' }}>Enregistrer une Dépense (Sortie)</h3>
            <form onSubmit={handleAddExpense}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Catégorie</label>
                <select value={expenseData.category} onChange={e => setExpenseData({ ...expenseData, category: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option value="Achat de matériel">Achat de matériel</option>
                  <option value="Salaire">Salaire / Honoraires</option>
                  <option value="Facture (Eau, Électricité)">Facture (Eau, Électricité...)</option>
                  <option value="Entretien / Réparation">Entretien / Réparation</option>
                  <option value="Autre dépense">Autre dépense</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Date de la dépense</label>
                <input required type="date" value={expenseData.expense_date} onChange={e => setExpenseData({ ...expenseData, expense_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Montant (FCFA)</label>
                <input required type="number" min="1" value={expenseData.amount || ''} onChange={e => setExpenseData({ ...expenseData, amount: Number(e.target.value) })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description / Motif précis</label>
                <input required type="text" value={expenseData.description || ''} onChange={e => setExpenseData({ ...expenseData, description: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="Ex: Paquet de rames de papier..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsExpenseFormOpen(false)} style={{ padding: '0.5rem 1rem', background: '#ecf0f1', color: '#2c3e50', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Annuler</button>
                <button type="submit" style={{ padding: '0.5rem 1.5rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Valider la sortie</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
