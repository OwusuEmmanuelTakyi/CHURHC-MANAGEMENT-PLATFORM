'use client';
import { createContext, useContext, useMemo, useState } from 'react';
import { currentAcademicYear, shiftAcademicYear } from './academic-year';

interface AcademicYearContextValue {
  year: string;
  setYear: (year: string) => void;
  availableYears: string[];
}

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null);

export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState(currentAcademicYear());
  const availableYears = useMemo(() => [0, -1, -2].map((d) => shiftAcademicYear(currentAcademicYear(), d)), []);

  return (
    <AcademicYearContext.Provider value={{ year, setYear, availableYears }}>
      {children}
    </AcademicYearContext.Provider>
  );
}

// Dashboards that care about the picker call this; pages that don't just ignore it —
// the context always has a sensible default (the current academic year).
export function useAcademicYearContext(): AcademicYearContextValue {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error('useAcademicYearContext must be used within AcademicYearProvider');
  return ctx;
}
