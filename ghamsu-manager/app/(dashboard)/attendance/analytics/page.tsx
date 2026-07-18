'use client';
import { useMe } from '@/lib/hooks/use-me';
import { LocalAnalyticsView } from '@/components/attendance/local-analytics-view';
import { NationalComparisonTable } from '@/components/attendance/national-comparison-table';

export default function AttendanceAnalyticsPage() {
  const { data: me } = useMe();
  const isNational = me?.activeRole.role === 'national_president';

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-foreground mb-4">Attendance analytics</h1>
      {isNational ? <NationalComparisonTable /> : <LocalAnalyticsView />}
    </div>
  );
}
