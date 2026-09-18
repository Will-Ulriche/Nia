import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSchool } from '../hooks/useModules';
import { AcademicService } from '../services/academic.service';
import type { AcademicYear } from '../types/database';

interface AcademicContextType {
  activeYear: AcademicYear | null;
  selectedYear: AcademicYear | null;
  academicYears: AcademicYear[];
  setSelectedYear: (year: AcademicYear | null) => void;
  isLoading: boolean;
  refreshYears: () => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { school } = useSchool();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshYears = async () => {
    const schoolId = school?.id || 'sch_demo_01';

    try {
      // Only show full loading spinner on first load, not on subsequent refreshes
      if (academicYears.length === 0) {
        setIsLoading(true);
      }
      
      const years = await AcademicService.listAcademicYears(schoolId);
      setAcademicYears(years);
      
      const active = years.find((y) => y.is_active) || (years.length > 0 ? years[0] : null);
      setActiveYear(active);
      
      // On conserve l'année sélectionnée si elle existe toujours, sinon on prend l'active
      setSelectedYear((prev) => {
        if (prev && years.find((y) => y.id === prev.id)) {
          return prev;
        }
        return active;
      });
    } catch (error) {
      console.error('Error fetching academic years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshYears();
  }, [school]);

  return (
    <AcademicContext.Provider
      value={{
        activeYear,
        selectedYear,
        academicYears,
        setSelectedYear,
        isLoading,
        refreshYears
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (context === undefined) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
};
