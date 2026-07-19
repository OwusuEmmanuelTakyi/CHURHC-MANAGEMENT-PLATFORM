export type MemberStatus = 'prospective' | 'active' | 'executive' | 'associate';
export type MemberGender = 'male' | 'female';
export type MemberLevel = 100 | 200 | 300 | 400 | 500 | 600;

export interface Member {
  id: number;
  student_id: string;
  full_name: string;
  gender: MemberGender;
  phone: string;
  email: string | null;
  level: MemberLevel;
  status: MemberStatus;
  wing_id: number | null;
  class_id: number | null;
  local_id: number;
  dues_paid?: boolean; // present only when the viewer is a treasurer
}

export interface MemberDetail extends Member {
  hall_of_residence: string | null;
  expected_graduation: string | null;
  date_of_birth: string | null;
  joined_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MemberHistoryEntry {
  event_type: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  executives: { name: string } | null;
}

export interface Wing { id: number; name: string; local_id: number; }
export interface SchoolClass { id: number; name: string; local_id: number; }

export interface Local {
  id: number;
  name: string;
  short_code: string;
  university_name: string;
  active: boolean;
}

export interface LocalDetail {
  local: Local;
  wings: (Wing & { memberCount: number })[];
  classes: (SchoolClass & { memberCount: number })[];
}

export interface ImportSummary {
  total: number;
  new: number;
  duplicateInFile: number;
  duplicateExisting: number;
  invalid: number;
  missingEmail: number;
}

export type ImportRowResolution = 'duplicate_in_file' | 'duplicate_existing' | 'invalid';

export interface ImportReviewRow {
  row_number: number;
  resolution: ImportRowResolution;
  raw_data: Record<string, unknown>;
  error_detail: string | null;
}

export interface ImportUploadResponse {
  jobId: string;
  summary: ImportSummary;
  reviewRows: ImportReviewRow[];
}

export interface ImportConfirmResponse {
  imported: number;
  merged: number;
  skipped: number;
  failed: number;
}

export type PositionScope = 'national' | 'local' | 'wing';

export interface LeadershipAssignmentInfo {
  id: number;
  member_id: number;
  member_name: string;
  start_date: string;
  end_date: string | null;
}

export interface LeadershipPosition {
  id: number;
  title: string;
  scope: PositionScope;
  local_id: number | null;
  wing_id: number | null;
  wing_name: string | null;
  assignment: LeadershipAssignmentInfo | null;
}

export interface LeadershipPositionsResponse {
  positions: LeadershipPosition[];
  academicYear: string;
  availableYears: string[];
}

export interface HandoverResult {
  newAcademicYear: string;
  endedCount: number;
  createdCount: number;
}

export type BlastStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'failed';
export type AudienceType = 'all' | 'local' | 'wing' | 'class' | 'executives';

export interface AudienceFilterValue {
  type: AudienceType;
  ids: number[];
}

export interface EmailBlastSummary {
  id: number;
  local_id: number | null;
  subject: string;
  status: BlastStatus;
  recipient_count: number;
  skipped_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface EmailBlastDetail extends EmailBlastSummary {
  audience_filter: AudienceFilterValue;
  body_html: string;
  body_text: string | null;
  created_by: string;
  approved_by: string | null;
}

export interface EmailBlastReport {
  blast: EmailBlastDetail;
  report: Record<string, number>;
}

export interface EstimateResult {
  recipientCount: number;
  skippedCount: number;
}

export type PaymentMethod = 'momo' | 'cash';
export type Semester = 'first' | 'second';

export interface Contribution {
  id: number;
  member_id: number;
  amount_pesewas: number;
  payment_method: PaymentMethod;
  momo_reference: string | null;
  receipt_note: string | null;
  academic_year: string;
  semester: Semester;
  paid_at: string;
  created_at: string;
  members: { full_name: string; student_id: string } | null;
}

export interface ContributionTotal {
  local_id: number;
  semester: Semester;
  payment_method: PaymentMethod;
  totalPesewas: number;
  count: number;
}

export interface DuesStatusRow {
  local_id: number;
  semester: Semester;
  paidCount: number;
  unpaidCount: number;
}

export interface ContributionsSummary {
  academicYear: string;
  totals: ContributionTotal[];
  duesStatus: DuesStatusRow[];
}

export type Role = 'national_president' | 'local_president' | 'treasurer' | 'secretary';

export interface RoleAssignment {
  id: number;
  role_type: Role;
  local_id: number | null;
  academic_year: string;
  locals: { name: string; short_code: string } | null;
}

export interface MeResponse {
  profile: { id: string; name: string; phone: string; email: string | null };
  roles: RoleAssignment[];
  activeRole: { id: number; role: Role; localId: number | null };
  permissions: string[];
}

export type DocumentType = 'minutes' | 'report' | 'constitution' | 'handover' | 'other';
export type DocumentStatus = 'pending' | 'approved';

export interface DocumentRecord {
  id: number;
  local_id: number;
  name: string;
  document_type: DocumentType;
  academic_year: string;
  file_size_bytes: number;
  mime_type: string;
  status: DocumentStatus;
  uploaded_by: string;
  uploaded_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  local_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  executives: { name: string } | null;
}

export type ServiceType = 'sunday_service' | 'midweek' | 'special';

export interface ServiceSummary {
  id: number;
  local_id: number;
  service_date: string;
  service_type: ServiceType;
  title: string | null;
  created_at: string;
  presentCount: number;
  eligibleCount: number;
}

export interface AttendanceMember {
  id: number;
  full_name: string;
  student_id: string;
  wing_id: number | null;
  level: number;
  present: boolean;
}

export interface AttendanceCheckIn {
  members: AttendanceMember[];
  wings: Wing[];
  presentCount: number;
  totalCount: number;
}

export interface RegistrationLink {
  token: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface MemberRegistration {
  id: number;
  full_name: string;
  gender: MemberGender;
  phone: string;
  email: string | null;
  student_id: string;
  hall_of_residence: string | null;
  wing_id: number | null;
  class_id: number | null;
  level: MemberLevel;
  expected_graduation: string | null;
  date_of_birth: string | null;
  status: RegistrationStatus;
  matched_member_id: number | null;
  matched_member_name: string | null;
  created_at: string;
}

export interface PublicRegistrationFormData {
  localName: string;
  wings: Wing[];
  classes: SchoolClass[];
}

export interface UpcomingBirthday {
  id: number;
  full_name: string;
  date_of_birth: string;
  local_id: number;
  daysUntil: number;
}

export interface SundayTrendPoint {
  service_date: string;
  presentCount: number;
}

export interface WingAttendanceBreakdown {
  wing_id: number | null;
  wing_name: string;
  presentCount: number;
  eligibleCount: number;
}

export interface FollowUpMember {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  wing_id: number | null;
}

export interface ServiceSnapshot {
  id: number;
  service_date: string;
  presentCount: number;
}

export interface LocalAttendanceAnalytics {
  localId: number;
  latestService: ServiceSnapshot | null;
  previousService: ServiceSnapshot | null;
  eligibleCount: number;
  percentage: number;
  trend: SundayTrendPoint[];
  wingBreakdown: WingAttendanceBreakdown[];
  followUpList: FollowUpMember[];
  missedThreshold: number;
}

export interface NationalAttendanceRow {
  local_id: number;
  local_name: string;
  latestServiceDate: string | null;
  presentCount: number;
  eligibleCount: number;
  percentage: number;
}

export interface NationalDashboardData {
  stats: {
    totalMembers: number;
    activeMembers: number;
    associatesAlumni: number;
    executivesCount: number;
  };
  chartData: { short_code: string; totalMembers: number; activeMembers: number }[];
  needsAttention: { gradOverdueCount: number; noEmailCount: number; handoverDueCount: number };
  comparativeLocals: {
    local_id: number;
    name: string;
    short_code: string;
    totalMembers: number;
    activeMembers: number;
    wingsCount: number;
    trend: 'up' | 'down' | 'flat';
  }[];
}

export interface LocalDashboardData {
  stats: {
    totalMembers: number;
    activeMembers: number;
    graduationDueCount: number;
    executivesCount: number;
  };
  wingBreakdown: { wing_id: number; name: string; count: number }[];
  noWingCount: number;
  classBreakdown: { class_id: number; name: string; count: number }[];
}

export interface TreasurerDashboardData {
  stats: {
    duesCollectedPesewas: number;
    membersOwingCount: number;
    momoCount: number;
    cashCount: number;
  };
  monthlyIncome: { label: string; totalPesewas: number }[];
  recentPayments: {
    id: number;
    member_name: string;
    amount_pesewas: number;
    payment_method: 'momo' | 'cash';
    paid_at: string;
  }[];
}

export interface SecretaryDashboardData {
  stats: {
    documentsCount: number;
    pendingUploadCount: number;
    membersCount: number;
    auditEventsThisWeek: number;
  };
  recentDocuments: {
    id: number;
    name: string;
    document_type: string;
    status: 'pending' | 'approved';
    created_at: string;
  }[];
  recentAuditEvents: { id: number; action: string; actorName: string | null; created_at: string }[];
  monthsMissingMinutes: string[];
}

export interface ExecutiveAccount {
  id: number; // role_assignment id
  user_id: string;
  role_type: Role;
  local_id: number | null;
  academic_year: string;
  active: boolean;
  executives: { name: string; phone: string } | null;
  locals: { name: string; short_code: string } | null;
}
