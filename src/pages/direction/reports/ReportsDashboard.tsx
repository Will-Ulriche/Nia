import { useState, useEffect } from 'react';
import { useSchool } from '../../../hooks/useModules';
import { useAcademic } from '../../../context/AcademicContext';
import { ReportService } from '../../../services/report.service';

export function ReportsDashboard() {
  const { school } = useSchool();
  const { selectedYear, academicYears, setSelectedYear } = useAcademic();
  
  const [reportType, setReportType] = useState('students'); // students, teachers, absences, unpaid
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadReport();
  }, [school, selectedYear, reportType]);

  const loadReport = async () => {
    if (!school || !selectedYear) return;
    try {
      setIsLoading(true);
      if (reportType === 'students') {
        const res = await ReportService.getStudentsByClassReport(school.id, selectedYear.id);
        setData(res);
      } else if (reportType === 'teachers') {
        const res = await ReportService.getTeachersReport(school.id);
        setData(res);
      } else if (reportType === 'absences') {
        const res = await ReportService.getAbsencesReport(school.id, selectedYear.id);
        setData(res);
      } else if (reportType === 'unpaid') {
        const res = await ReportService.getUnpaidFeesReport(school.id, selectedYear.id);
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (reportType === 'students') {
      csvContent += "Classe,Matricule,Nom,Prenom,Genre,Contact Parent\n";
      Object.keys(data).forEach(className => {
        data[className].forEach((s: any) => {
          csvContent += `"${className}","${s.matricule || ''}","${s.last_name}","${s.first_name}","${s.gender || ''}","${s.parent_contact || ''}"\n`;
        });
      });
    } else if (reportType === 'teachers') {
      csvContent += "Nom,Prenom,Telephone,Email\n";
      data.forEach((t: any) => {
        csvContent += `"${t.last_name}","${t.first_name}","${t.contact_phone || ''}","${t.contact_email || ''}"\n`;
      });
    } else if (reportType === 'absences') {
      csvContent += "Date,Statut,Classe,Matricule,Eleve\n";
      data.forEach((a: any) => {
        csvContent += `"${a.date}","${a.status}","${a.classes?.name || ''}","${a.students?.matricule || ''}","${a.students?.first_name} ${a.students?.last_name}"\n`;
      });
    } else if (reportType === 'unpaid') {
      csvContent += "Classe,Matricule,Nom,Prenom,Total Du,Total Paye,Reste a Payer\n";
      data.forEach((u: any) => {
        csvContent += `"${u.class_name || ''}","${u.matricule || ''}","${u.last_name}","${u.first_name}",${u.total_due},${u.total_paid},${u.balance}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_${reportType}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Rapports & Statistiques</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedYear?.id || ''} 
            onChange={(e) => setSelectedYear(academicYears.find(y => y.id === e.target.value) || null)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
          <button onClick={handlePrint} style={{ padding: '0.6rem 1.2rem', background: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🖨 Imprimer</button>
          <button onClick={handleExportCSV} style={{ padding: '0.6rem 1.2rem', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📥 Export CSV</button>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button onClick={() => setReportType('students')} style={{ padding: '0.8rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', background: reportType === 'students' ? '#2980b9' : '#ecf0f1', color: reportType === 'students' ? 'white' : '#333' }}>Élèves par classe</button>
        <button onClick={() => setReportType('teachers')} style={{ padding: '0.8rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', background: reportType === 'teachers' ? '#2980b9' : '#ecf0f1', color: reportType === 'teachers' ? 'white' : '#333' }}>Liste Enseignants</button>
        <button onClick={() => setReportType('absences')} style={{ padding: '0.8rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', background: reportType === 'absences' ? '#2980b9' : '#ecf0f1', color: reportType === 'absences' ? 'white' : '#333' }}>Rapport Absences</button>
        <button onClick={() => setReportType('unpaid')} style={{ padding: '0.8rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', background: reportType === 'unpaid' ? '#e74c3c' : '#ecf0f1', color: reportType === 'unpaid' ? 'white' : '#333' }}>Rapport Impayés</button>
      </div>

      {/* ZONE D'IMPRESSION */}
      <div id="printableArea" style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printableArea, #printableArea * { visibility: visible; }
            #printableArea { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; padding: 0; }
            .no-print { display: none !important; }
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        `}</style>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2>{school?.name || 'Établissement'}</h2>
          <h3>Année Scolaire: {selectedYear?.name}</h3>
          <h4>
            {reportType === 'students' ? 'Répartition des élèves par classe' :
             reportType === 'teachers' ? 'Liste du personnel enseignant' :
             reportType === 'absences' ? 'Rapport global des absences' :
             'Liste des impayés (Reste à recouvrer)'}
          </h4>
        </div>

        {isLoading ? <p>Génération du rapport en cours...</p> : (
          <div>
            {reportType === 'students' && data && Object.keys(data).length > 0 ? (
              Object.keys(data).map(className => (
                <div key={className} style={{ marginBottom: '2rem' }}>
                  <h4 style={{ background: '#ecf0f1', padding: '0.5rem' }}>Classe : {className} (Effectif: {data[className].length})</h4>
                  <table>
                    <thead>
                      <tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Contact Parent</th></tr>
                    </thead>
                    <tbody>
                      {data[className].map((s: any, idx: number) => (
                        <tr key={idx}>
                          <td>{s.matricule || '-'}</td>
                          <td style={{ fontWeight: 'bold' }}>{s.last_name}</td>
                          <td>{s.first_name}</td>
                          <td>{s.gender || '-'}</td>
                          <td>{s.parent_contact || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            ) : reportType === 'students' && <p>Aucune donnée disponible.</p>}

            {reportType === 'teachers' && data ? (
              <table>
                <thead>
                  <tr><th>Nom</th><th>Prénom</th><th>Téléphone</th><th>Email</th></tr>
                </thead>
                <tbody>
                  {data.map((t: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 'bold' }}>{t.last_name}</td>
                      <td>{t.first_name}</td>
                      <td>{t.contact_phone || '-'}</td>
                      <td>{t.contact_email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {reportType === 'absences' && data ? (
              <table>
                <thead>
                  <tr><th>Date</th><th>Statut</th><th>Classe</th><th>Matricule</th><th>Nom Prénom</th></tr>
                </thead>
                <tbody>
                  {data.map((a: any, idx: number) => (
                    <tr key={idx}>
                      <td>{new Date(a.date).toLocaleDateString()}</td>
                      <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>{a.status.toUpperCase()}</td>
                      <td>{a.classes?.name || '-'}</td>
                      <td>{a.students?.matricule || '-'}</td>
                      <td>{a.students?.last_name} {a.students?.first_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {reportType === 'unpaid' && data ? (
              <div>
                <p style={{ fontWeight: 'bold', color: '#e74c3c', marginBottom: '1rem', fontSize: '1.2rem' }}>
                  Total à recouvrer sur la liste : {data.reduce((acc: number, item: any) => acc + item.balance, 0).toLocaleString()} FCFA
                </p>
                <table>
                  <thead>
                    <tr><th>Classe</th><th>Matricule</th><th>Nom Prénom</th><th>Total Dû</th><th>Déjà Payé</th><th>Reste à Payer</th></tr>
                  </thead>
                  <tbody>
                    {data.map((u: any, idx: number) => (
                      <tr key={idx}>
                        <td>{u.class_name || '-'}</td>
                        <td>{u.matricule || '-'}</td>
                        <td style={{ fontWeight: 'bold' }}>{u.last_name} {u.first_name}</td>
                        <td>{u.total_due.toLocaleString()}</td>
                        <td>{u.total_paid.toLocaleString()}</td>
                        <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>{u.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
