import {
  AppDatabaseBackup,
  AppDatabaseState,
  Committee,
  CommitteeId,
  CommitteeStat,
  FilterState,
  MeetingSession,
  MonthlyTrendPoint,
  Representative,
  RepresentativeStat,
  SessionAttendance,
  Trustee,
  TrusteeStat,
} from '../types';
import {
  compareJalaliDates,
  formatJalaliYearMonth,
  isValidJalaliDate,
  toEnglishDigits,
  toPersianDigits,
} from './jalali';

const DEFAULT_COMMITTEES: Committee[] = [
  {
    id: 'audit-budget',
    name: 'حسابرسی و بودجه',
    description: 'پایش صورت‌های مالی، انضباط بودجه‌ای، کنترل داخلی و گزارش‌های حسابرسی',
    accentColor: '#0F766E',
  },
  {
    id: 'economy-investment',
    name: 'اقتصاد و سرمایه گذاری',
    description: 'بررسی طرح‌های سرمایه‌گذاری، تحلیل بازار سرمایه، بازدهی پرتفوی و تامین مالی',
    accentColor: '#1D4ED8',
  },
  {
    id: 'insurance-actuarial',
    name: 'بیمه و محاسبات اکچوئری',
    description: 'ارزیابی ریسک‌های بیمه‌ای، محاسبات اکچوئری، تعهدات آتی و کفایت ذخایر',
    accentColor: '#7C3AED',
  },
  {
    id: 'healthcare',
    name: 'بهداشت و درمان',
    description: 'سیاست‌گذاری خدمات درمانی، تعرفه‌های پزشکی، کیفیت مراکز درمانی و بیمه تکمیلی',
    accentColor: '#B45309',
  },
  {
    id: 'consolidation',
    name: 'تلفیق',
    description: 'هماهنگی مشترک کارگروه‌ها، تدوین برنامه راهبردی، بررسی بودجه و تلفیق مصوبات',
    accentColor: '#334155',
  },
];

export const COMMITTEES: Committee[] = [...DEFAULT_COMMITTEES];
export const COMMITTEE_MAP: Record<string, Committee> = {};

function rebuildCommitteeMap() {
  Object.keys(COMMITTEE_MAP).forEach((key) => delete COMMITTEE_MAP[key]);
  COMMITTEES.forEach((committee) => { COMMITTEE_MAP[committee.id] = committee; });
}
rebuildCommitteeMap();

export function replaceCommittees(next: Committee[]) {
  if (!Array.isArray(next) || next.length === 0) return;
  COMMITTEES.splice(0, COMMITTEES.length, ...next);
  rebuildCommitteeMap();
}

export function persistCommittees(next: Committee[]) {
  replaceCommittees(next);
  try {
    const storage = typeof window !== 'undefined' ? (window.desktopStorage ?? window.localStorage) : null;
    storage?.setItem('kargoroh_committees_v1', JSON.stringify(COMMITTEES));
  } catch { /* keep current in-memory list */ }
}

export function loadSavedCommittees() {
  try {
    const storage = typeof window !== 'undefined' ? (window.desktopStorage ?? window.localStorage) : null;
    const raw = storage?.getItem('kargoroh_committees_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as Committee[];
      if (Array.isArray(parsed) && parsed.length) replaceCommittees(parsed);
    }
  } catch { /* use built-in committees */ }
}

export function getEffectiveTrusteeId(
  rep: Representative,
  committeeId?: CommitteeId
): string {
  if (committeeId && rep.committeeTrusteeOverrides?.[committeeId]) {
    return rep.committeeTrusteeOverrides[committeeId]!;
  }
  return rep.trusteeId;
}

export function parseTimeToMinutes(timeStr: string): number | null {
  const normalized = toEnglishDigits(timeStr.trim());
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function normalizeTimeString(timeStr: string): string {
  const total = parseTimeToMinutes(timeStr);
  if (total === null) return timeStr;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateSessionDuration(
  startTime: string,
  endTime: string
): number | null {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return null;
  if (end <= start) return null;
  return end - start;
}

export function formatMinutesToPersian(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0 && mins === 0) return '۰ دقیقه';
  if (hours === 0) return `${toPersianDigits(mins)} دقیقه`;
  if (mins === 0) return `${toPersianDigits(hours)} ساعت`;
  return `${toPersianDigits(hours)} ساعت و ${toPersianDigits(mins)} دقیقه`;
}

export function formatMinutesToShortHours(totalMinutes: number): string {
  const hours = Math.max(0, totalMinutes) / 60;
  const formatted = Number.isInteger(hours)
    ? String(hours)
    : hours.toFixed(1).replace(/\.0$/, '');
  return `${toPersianDigits(formatted.replace('.', '٫'))} ساعت`;
}

export function formatMinutesToClock(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return toPersianDigits(`${h}:${String(m).padStart(2, '0')}`);
}

export interface SessionInputDraft {
  committeeId: CommitteeId | '';
  jalaliDate: string;
  startTime: string;
  endTime: string;
  topic: string;
  reportSummary: string;
  attendees: SessionAttendance[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof SessionInputDraft | 'general', string>>;
}

export function validateSessionInput(draft: SessionInputDraft): ValidationResult {
  const errors: Partial<Record<keyof SessionInputDraft | 'general', string>> = {};

  if (!draft.committeeId || !COMMITTEE_MAP[draft.committeeId]) {
    errors.committeeId = 'لطفاً نام کارگروه را انتخاب کنید.';
  }

  if (!draft.jalaliDate || !isValidJalaliDate(draft.jalaliDate)) {
    errors.jalaliDate = 'تاریخ شمسی معتبر وارد کنید (مثال: ۱۴۰۵/۰۸/۲۵).';
  }

  const startMin = parseTimeToMinutes(draft.startTime);
  const endMin = parseTimeToMinutes(draft.endTime);

  if (startMin === null) {
    errors.startTime = 'ساعت شروع معتبر وارد کنید.';
  }
  if (endMin === null) {
    errors.endTime = 'ساعت پایان معتبر وارد کنید.';
  }
  if (startMin !== null && endMin !== null && endMin <= startMin) {
    errors.endTime = 'ساعت پایان باید بعد از ساعت شروع جلسه باشد.';
  }

  if (!draft.topic || draft.topic.trim().length < 3) {
    errors.topic = 'موضوع جلسه و گزارش باید حداقل ۳ کاراکتر باشد.';
  }

  if (!draft.attendees || draft.attendees.length === 0) {
    errors.attendees = 'حداقل یک نماینده حاضر در جلسه را انتخاب کنید.';
  } else if (startMin !== null && endMin !== null && endMin > startMin) {
    const maxDuration = endMin - startMin;
    for (const att of draft.attendees) {
      if (
        att.durationMinutes !== undefined &&
        (att.durationMinutes <= 0 || att.durationMinutes > maxDuration)
      ) {
        errors.attendees =
          'مدت حضور هر نماینده باید بیشتر از صفر و حداکثر برابر با مدت کل جلسه باشد.';
        break;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getAttendanceMinutes(
  session: MeetingSession,
  attendance: SessionAttendance
): number {
  if (
    typeof attendance.durationMinutes === 'number' &&
    attendance.durationMinutes > 0
  ) {
    return Math.min(attendance.durationMinutes, session.durationMinutes);
  }
  return session.durationMinutes;
}

export function filterSessions(
  sessions: MeetingSession[],
  filters: FilterState,
  representatives: Representative[]
): MeetingSession[] {
  const repMap = new Map(representatives.map((r) => [r.id, r]));
  const query = toEnglishDigits(filters.searchQuery.trim()).toLowerCase();

  return sessions
    .filter((session) => {
      if (
        filters.committeeId !== 'all' &&
        session.committeeId !== filters.committeeId
      ) {
        return false;
      }

      if (filters.dateFrom && isValidJalaliDate(filters.dateFrom)) {
        if (compareJalaliDates(session.jalaliDate, filters.dateFrom) < 0) {
          return false;
        }
      }

      if (filters.dateTo && isValidJalaliDate(filters.dateTo)) {
        if (compareJalaliDates(session.jalaliDate, filters.dateTo) > 0) {
          return false;
        }
      }

      if (filters.representativeId !== 'all') {
        const hasRep = session.attendees.some(
          (a) => a.representativeId === filters.representativeId
        );
        if (!hasRep) return false;
      }

      if (filters.trusteeId !== 'all') {
        const hasTrusteeRep = session.attendees.some((a) => {
          const rep = repMap.get(a.representativeId);
          if (!rep) return false;
          return (
            getEffectiveTrusteeId(rep, session.committeeId) === filters.trusteeId
          );
        });
        if (!hasTrusteeRep) return false;
      }

      if (query) {
        const committeeName = COMMITTEE_MAP[session.committeeId]?.name ?? '';
        const attendeeNames = session.attendees
          .map((a) => repMap.get(a.representativeId)?.fullName ?? '')
          .join(' ');
        const haystack = toEnglishDigits(
          `${session.topic} ${session.reportSummary} ${committeeName} ${session.jalaliDate} ${attendeeNames}`
        ).toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateDiff = compareJalaliDates(b.jalaliDate, a.jalaliDate);
      if (dateDiff !== 0) return dateDiff;
      return b.startTime.localeCompare(a.startTime);
    });
}

function createEmptyCommitteeBreakdown(): Record<
  CommitteeId,
  { sessions: number; minutes: number }
> {
  return Object.fromEntries(COMMITTEES.map((committee) => [committee.id, { sessions: 0, minutes: 0 }]));
}

export function computeRepresentativeStats(
  sessions: MeetingSession[],
  representatives: Representative[],
  trustees: Trustee[]
): RepresentativeStat[] {
  const trusteeMap = new Map(trustees.map((t) => [t.id, t]));
  const statsMap = new Map<string, RepresentativeStat>();

  for (const rep of representatives) {
    statsMap.set(rep.id, {
      representative: rep,
      trustee: trusteeMap.get(rep.trusteeId),
      committeeNames: rep.committeeIds.map((id) => COMMITTEE_MAP[id]?.name ?? id),
      sessionCount: 0,
      totalMinutes: 0,
      committeeBreakdown: createEmptyCommitteeBreakdown(),
    });
  }

  for (const session of sessions) {
    const seenInSession = new Set<string>();
    for (const att of session.attendees) {
      if (seenInSession.has(att.representativeId)) continue;
      seenInSession.add(att.representativeId);

      const stat = statsMap.get(att.representativeId);
      if (!stat) continue;

      const mins = getAttendanceMinutes(session, att);
      stat.sessionCount += 1;
      stat.totalMinutes += mins;
      if (stat.committeeBreakdown[session.committeeId]) {
        stat.committeeBreakdown[session.committeeId].sessions += 1;
        stat.committeeBreakdown[session.committeeId].minutes += mins;
      }
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
    return b.sessionCount - a.sessionCount;
  });
}

export function computeTrusteeStats(
  sessions: MeetingSession[],
  trustees: Trustee[],
  representatives: Representative[]
): TrusteeStat[] {
  const repMap = new Map(representatives.map((r) => [r.id, r]));
  const statsMap = new Map<string, TrusteeStat>();

  for (const trustee of trustees) {
    statsMap.set(trustee.id, {
      trustee,
      representatives: representatives.filter(
        (r) =>
          r.trusteeId === trustee.id ||
          (r.committeeTrusteeOverrides &&
            Object.values(r.committeeTrusteeOverrides).includes(trustee.id))
      ),
      sessionCount: 0,
      totalAttendances: 0,
      totalMinutes: 0,
      committeeBreakdown: createEmptyCommitteeBreakdown(),
    });
  }

  for (const session of sessions) {
    const trusteesInThisSession = new Set<string>();

    for (const att of session.attendees) {
      const rep = repMap.get(att.representativeId);
      if (!rep) continue;
      const effectiveTrusteeId = getEffectiveTrusteeId(
        rep,
        session.committeeId
      );
      if (!effectiveTrusteeId) continue;
      const tStat = statsMap.get(effectiveTrusteeId);
      if (!tStat) continue;

      const mins = getAttendanceMinutes(session, att);
      tStat.totalAttendances += 1;
      tStat.totalMinutes += mins;

      if (tStat.committeeBreakdown[session.committeeId]) {
        tStat.committeeBreakdown[session.committeeId].minutes += mins;
        if (!trusteesInThisSession.has(effectiveTrusteeId)) {
          tStat.committeeBreakdown[session.committeeId].sessions += 1;
        }
      }

      trusteesInThisSession.add(effectiveTrusteeId);
    }

    for (const tid of trusteesInThisSession) {
      const tStat = statsMap.get(tid);
      if (tStat) tStat.sessionCount += 1;
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
    return b.sessionCount - a.sessionCount;
  });
}

export function computeCommitteeStats(
  sessions: MeetingSession[],
  committees: Committee[] = COMMITTEES
): CommitteeStat[] {
  const statsMap = new Map<CommitteeId, CommitteeStat>();

  for (const c of committees) {
    statsMap.set(c.id, {
      committee: c,
      sessionCount: 0,
      totalSessionMinutes: 0,
      totalPersonMinutes: 0,
      averageAttendees: 0,
    });
  }

  for (const session of sessions) {
    const stat = statsMap.get(session.committeeId);
    if (!stat) continue;
    stat.sessionCount += 1;
    stat.totalSessionMinutes += session.durationMinutes;
    for (const att of session.attendees) {
      stat.totalPersonMinutes += getAttendanceMinutes(session, att);
    }
  }

  return Array.from(statsMap.values()).map((stat) => {
    const totalAttendees = sessions
      .filter((s) => s.committeeId === stat.committee.id)
      .reduce((sum, s) => sum + s.attendees.length, 0);
    return {
      ...stat,
      averageAttendees:
        stat.sessionCount > 0
          ? Number((totalAttendees / stat.sessionCount).toFixed(1))
          : 0,
    };
  });
}

export function computeMonthlyTrend(
  sessions: MeetingSession[]
): MonthlyTrendPoint[] {
  const map = new Map<string, MonthlyTrendPoint>();

  for (const session of sessions) {
    const normalized = toEnglishDigits(session.jalaliDate);
    const parts = normalized.split('/');
    if (parts.length < 2) continue;
    const yearMonth = `${parts[0]}/${parts[1].padStart(2, '0')}`;

    let point = map.get(yearMonth);
    if (!point) {
      point = {
        yearMonth,
        label: formatJalaliYearMonth(yearMonth),
        sessionCount: 0,
        totalSessionMinutes: 0,
        totalPersonMinutes: 0,
      };
      map.set(yearMonth, point);
    }

    point.sessionCount += 1;
    point.totalSessionMinutes += session.durationMinutes;
    for (const att of session.attendees) {
      point.totalPersonMinutes += getAttendanceMinutes(session, att);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.yearMonth.localeCompare(b.yearMonth)
  );
}

export const BACKUP_SCHEMA_VERSION = 1;

export function serializeBackup(state: AppDatabaseState): string {
  const payload: AppDatabaseBackup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'سامانه مدیریت جلسات کارگروه‌ها',
    committees: COMMITTEES,
    trustees: state.trustees,
    representatives: state.representatives,
    sessions: state.sessions,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseAndValidateBackup(
  jsonText: string
): { ok: true; data: AppDatabaseBackup } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText) as Partial<AppDatabaseBackup>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'ساختار فایل پشتیبان معتبر نیست.' };
    }
    if (
      !Array.isArray(parsed.trustees) ||
      !Array.isArray(parsed.representatives) ||
      !Array.isArray(parsed.sessions)
    ) {
      return {
        ok: false,
        error: 'فایل انتخاب‌شده فاقد بخش‌های الزامی (اعضای هیئت امنا، نمایندگان یا جلسات) است.',
      };
    }

    for (const t of parsed.trustees) {
      if (!t || typeof t.id !== 'string' || typeof t.fullName !== 'string') {
        return { ok: false, error: 'اطلاعات یکی از اعضای هیئت امنا ناقص است.' };
      }
    }

    for (const r of parsed.representatives) {
      if (
        !r ||
        typeof r.id !== 'string' ||
        typeof r.fullName !== 'string' ||
        typeof r.trusteeId !== 'string' ||
        !Array.isArray(r.committeeIds)
      ) {
        return { ok: false, error: 'اطلاعات یکی از نمایندگان کارگروه معتبر نیست.' };
      }
    }

    for (const s of parsed.sessions) {
      if (
        !s ||
        typeof s.id !== 'string' ||
        !COMMITTEE_MAP[s.committeeId] ||
        typeof s.jalaliDate !== 'string' ||
        !isValidJalaliDate(s.jalaliDate) ||
        typeof s.startTime !== 'string' ||
        typeof s.endTime !== 'string' ||
        typeof s.durationMinutes !== 'number' ||
        typeof s.topic !== 'string' ||
        !Array.isArray(s.attendees)
      ) {
        return { ok: false, error: 'اطلاعات یکی از جلسات در فایل پشتیبان نامعتبر است.' };
      }
    }

    return {
      ok: true,
      data: {
        schemaVersion:
          typeof parsed.schemaVersion === 'number'
            ? parsed.schemaVersion
            : BACKUP_SCHEMA_VERSION,
        exportedAt:
          typeof parsed.exportedAt === 'string'
            ? parsed.exportedAt
            : new Date().toISOString(),
        appName:
          typeof parsed.appName === 'string'
            ? parsed.appName
            : 'سامانه مدیریت جلسات کارگروه‌ها',
        committees: Array.isArray(parsed.committees) && parsed.committees.length ? parsed.committees : COMMITTEES,
        trustees: parsed.trustees,
        representatives: parsed.representatives,
        sessions: parsed.sessions,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'فایل انتخاب‌شده یک فایل JSON معتبر نیست یا خراب شده است.',
    };
  }
}

export function encodeSharePayload(state: AppDatabaseState): string {
  const json = JSON.stringify({ ...state, committees: COMMITTEES });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSharePayload(encoded: string): AppDatabaseState | null {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<AppDatabaseState>;
    if (
      !parsed ||
      !Array.isArray(parsed.trustees) ||
      !Array.isArray(parsed.representatives) ||
      !Array.isArray(parsed.sessions)
    ) {
      return null;
    }
    return {
      committees: Array.isArray(parsed.committees) ? parsed.committees : COMMITTEES,
      trustees: parsed.trustees,
      representatives: parsed.representatives,
      sessions: parsed.sessions,
    };
  } catch {
    return null;
  }
}
