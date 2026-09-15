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
    if (!school) {
      setAcademicYears([]);
      setActiveYear(null);
      setSelectedYear(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const years = await AcademicService.listAcademicYears(school.id);
      setAcademicYears(years);
      
      const active = years.find((y) => y.is_active) || null;
      setActiveYear(active);
      
      // On conserve l'année sélectionnée si elle existe toujours, sinon on prend l'active
      if (!selectedYear || !years.find(y => y.id === selectedYear.id)) {
        setSelectedYear(active);
      }
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
