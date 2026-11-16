export type CommitteeId = string;

export interface Committee {
  id: CommitteeId;
  name: string;
  description: string;
  accentColor: string;
}

export interface Trustee {
  id: string;
  fullName: string;
  position: string;
}

export interface Representative {
  id: string;
  fullName: string;
  roleTitle: string;
  trusteeId: string; // "" when advisor/coordinator without trustee
  committeeIds: CommitteeId[];
  committeeTrusteeOverrides?: Partial<Record<CommitteeId, string>>;
}

export interface SessionAttendance {
  representativeId: string;
  durationMinutes?: number;
}

export interface MeetingSession {
  id: string;
  committeeId: CommitteeId;
  jalaliDate: string; // Format: YYYY/MM/DD in ASCII digits e.g. "1405/08/25"
  startTime: string; // Format: HH:mm e.g. "09:00"
  endTime: string; // Format: HH:mm e.g. "11:30"
  durationMinutes: number;
  topic: string;
  reportSummary: string;
  letterNumber?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentData?: string;
  attendees: SessionAttendance[];
  createdAt: string;
}

export interface FilterState {
  searchQuery: string;
  committeeId: CommitteeId | 'all';
  trusteeId: string | 'all';
  representativeId: string | 'all';
  dateFrom: string; // "" or YYYY/MM/DD
  dateTo: string; // "" or YYYY/MM/DD
}

export interface AppDatabaseState {
  trustees: Trustee[];
  representatives: Representative[];
  sessions: MeetingSession[];
}

export interface AppDatabaseBackup extends AppDatabaseState {
  schemaVersion: number;
  exportedAt: string;
  appName: string;
}

export interface RepresentativeStat {
  representative: Representative;
  trustee: Trustee | undefined;
  committeeNames: string[];
  sessionCount: number;
  totalMinutes: number;
  committeeBreakdown: Record<CommitteeId, { sessions: number; minutes: number }>;
}

export interface TrusteeStat {
  trustee: Trustee;
  representatives: Representative[];
  sessionCount: number; // Unique sessions where at least one of this trustee's reps attended
  totalAttendances: number; // Sum of rep attendances
  totalMinutes: number; // Sum of attendance minutes across all reps of this trustee
  committeeBreakdown: Record<CommitteeId, { sessions: number; minutes: number }>;
}

export interface CommitteeStat {
  committee: Committee;
  sessionCount: number;
  totalSessionMinutes: number;
  totalPersonMinutes: number;
  averageAttendees: number;
}

export interface MonthlyTrendPoint {
  yearMonth: string; // e.g. "1405/08"
  label: string; // e.g. "آبان ۱۴۰۵"
  sessionCount: number;
  totalSessionMinutes: number;
  totalPersonMinutes: number;
}

export type ActiveTab = 'dashboard' | 'sessions' | 'reports' | 'directory';
