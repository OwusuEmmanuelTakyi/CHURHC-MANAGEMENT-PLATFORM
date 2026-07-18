import { currentAcademicYear } from './academic-year';

export const HISTORY_MAP: Record<string, string> = {
  wing_id: 'wing_changed', class_id: 'class_changed',
  status: 'status_changed', level: 'level_updated',
};

// One row per meaningful change between the stored member and the incoming updates.
export function buildHistoryRows(
  old: Record<string, unknown>,
  updates: Record<string, unknown>,
  memberId: number,
  changedBy: string,
) {
  return Object.entries(HISTORY_MAP)
    .filter(([field]) => field in updates && updates[field] !== old[field])
    .map(([field, event]) => ({
      member_id: memberId, event_type: event,
      old_value: { [field]: old[field] },
      new_value: { [field]: updates[field] },
      changed_by: changedBy, academic_year: currentAcademicYear(),
    }));
}
