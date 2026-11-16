import * as XLSX from 'xlsx';
import {
  AppDatabaseState,
  CommitteeStat,
  MeetingSession,
  Representative,
  RepresentativeStat,
  Trustee,
  TrusteeStat,
} from '../types';
import {
  COMMITTEE_MAP,
  formatMinutesToPersian,
  getAttendanceMinutes,
  getEffectiveTrusteeId,
  serializeBackup,
} from './analytics';
import { getTodayJalali, toPersianDigits } from './jalali';

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportBackupJson(state: AppDatabaseState): string {
  const today = getTodayJalali().formatted.replace(/\//g, '-');
  const filename = `kargoroh-backup-${today}.json`;
  const json = serializeBackup(state);
  downloadTextFile(json, filename, 'application/json;charset=utf-8');
  return filename;
}

export function exportToExcel(params: {
  sessions: MeetingSession[];
  representatives: Representative[];
  trustees: Trustee[];
  repStats: RepresentativeStat[];
  trusteeStats: TrusteeStat[];
  committeeStats: CommitteeStat[];
}): string {
  const {
    sessions,
    representatives,
    trustees,
    repStats,
    trusteeStats,
    committeeStats,
  } = params;

  const repMap = new Map(representatives.map((r) => [r.id, r]));
  const trusteeMap = new Map(trustees.map((t) => [t.id, t]));

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  // Sheet 1: Sessions
  const sessionRows = sessions.map((s, idx) => {
    const attendeesText = s.attendees
      .map((a) => {
        const rep = repMap.get(a.representativeId);
        const effTrusteeId = rep
          ? getEffectiveTrusteeId(rep, s.committeeId)
          : '';
        const trustee = effTrusteeId ? trusteeMap.get(effTrusteeId) : undefined;
        const mins = getAttendanceMinutes(s, a);
        const repName = rep?.fullName ?? 'نامشخص';
        const trusteeName = trustee ? ` (نماینده ${trustee.fullName})` : '';
        return `${repName}${trusteeName} [${formatMinutesToPersian(mins)}]`;
      })
      .join(' | ');

    return {
      ردیف: toPersianDigits(idx + 1),
      'تاریخ جلسه (شمسی)': toPersianDigits(s.jalaliDate),
      'نام کارگروه': COMMITTEE_MAP[s.committeeId]?.name ?? s.committeeId,
      'ساعت شروع': toPersianDigits(s.startTime),
      'ساعت پایان': toPersianDigits(s.endTime),
      'مدت جلسه': formatMinutesToPersian(s.durationMinutes),
      'مدت (ساعت عددی)': Number((s.durationMinutes / 60).toFixed(2)),
      'تعداد حاضران': s.attendees.length,
      'موضوع جلسه': s.topic,
      'شرح گزارش': s.reportSummary || '—',
      'نمایندگان حاضر و عضو هیئت امنا': attendeesText,
    };
  });
  const wsSessions = XLSX.utils.json_to_sheet(sessionRows);
  wsSessions['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 42 },
    { wch: 48 },
    { wch: 56 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSessions, 'گزارش جلسات');

  // Sheet 2: Representative Stats
  const repRows = repStats.map((st, idx) => ({
    ردیف: toPersianDigits(idx + 1),
    'نام نماینده': st.representative.fullName,
    'سمت سازمانی': st.representative.roleTitle || '—',
    'نماینده عضو هیئت امنا': st.trustee?.fullName ?? 'بدون انتساب / مستقل',
    'کارگروه‌های عضویت': st.committeeNames.join('، ') || '—',
    'تعداد جلسات حضور': st.sessionCount,
    'مجموع ساعت حضور': formatMinutesToPersian(st.totalMinutes),
    'ساعت حضور (عددی)': Number((st.totalMinutes / 60).toFixed(2)),
    'حسابرسی و بودجه (ساعت)': Number(
      (st.committeeBreakdown['audit-budget'].minutes / 60).toFixed(2)
    ),
    'اقتصاد و سرمایه‌گذاری (ساعت)': Number(
      (st.committeeBreakdown['economy-investment'].minutes / 60).toFixed(2)
    ),
    'بیمه و اکچوئری (ساعت)': Number(
      (st.committeeBreakdown['insurance-actuarial'].minutes / 60).toFixed(2)
    ),
    'بهداشت و درمان (ساعت)': Number(
      (st.committeeBreakdown['healthcare'].minutes / 60).toFixed(2)
    ),
    'تلفیق (ساعت)': Number(
      (st.committeeBreakdown['consolidation'].minutes / 60).toFixed(2)
    ),
  }));
  const wsReps = XLSX.utils.json_to_sheet(repRows);
  wsReps['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 26 },
    { wch: 24 },
    { wch: 34 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsReps, 'حضور نمایندگان');

  // Sheet 3: Trustee Stats
  const trusteeRows = trusteeStats.map((st, idx) => ({
    ردیف: toPersianDigits(idx + 1),
    'نام عضو هیئت امنا': st.trustee.fullName,
    'عنوان و جایگاه': st.trustee.position || '—',
    'اسامی نمایندگان': st.representatives.map((r) => r.fullName).join('، ') || '—',
    'تعداد جلسات با حضور نماینده': st.sessionCount,
    'مجموع دفعات حضور نمایندگان': st.totalAttendances,
    'مجموع ساعت حضور': formatMinutesToPersian(st.totalMinutes),
    'ساعت حضور (عددی)': Number((st.totalMinutes / 60).toFixed(2)),
  }));
  const wsTrustees = XLSX.utils.json_to_sheet(trusteeRows);
  wsTrustees['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 30 },
    { wch: 38 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTrustees, 'حضور اعضای هیئت امنا');

  // Sheet 4: Committee Stats
  const committeeRows = committeeStats.map((st, idx) => ({
    ردیف: toPersianDigits(idx + 1),
    'نام کارگروه': st.committee.name,
    'تعداد جلسات': st.sessionCount,
    'مجموع زمان جلسات': formatMinutesToPersian(st.totalSessionMinutes),
    'زمان جلسات (ساعت عددی)': Number((st.totalSessionMinutes / 60).toFixed(2)),
    'مجموع نفر-ساعت حضور': formatMinutesToPersian(st.totalPersonMinutes),
    'نفر-ساعت (عددی)': Number((st.totalPersonMinutes / 60).toFixed(2)),
    'میانگین حاضران در جلسه': st.averageAttendees,
  }));
  const wsCommittees = XLSX.utils.json_to_sheet(committeeRows);
  wsCommittees['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCommittees, 'آمار کارگروه‌ها');

  const today = getTodayJalali().formatted.replace(/\//g, '-');
  const filename = `gozaresh-kargoroh-${today}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

export function generateExecutiveShareText(params: {
  sessions: MeetingSession[];
  repStats: RepresentativeStat[];
  trusteeStats: TrusteeStat[];
  committeeStats: CommitteeStat[];
}): string {
  const { sessions, repStats, trusteeStats, committeeStats } = params;
  const totalSessionMins = sessions.reduce((s, x) => s + x.durationMinutes, 0);
  const totalPersonMins = repStats.reduce((s, r) => s + r.totalMinutes, 0);
  const today = getTodayJalali().formatted;

  const lines: string[] = [
    `📊 گزارش مدیریتی جلسات کارگروه‌ها (تاریخ گزارش: ${toPersianDigits(today)})`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `• تعداد کل جلسات: ${toPersianDigits(sessions.length)} جلسه`,
    `• مجموع ساعات تشکیل جلسات: ${formatMinutesToPersian(totalSessionMins)}`,
    `• مجموع نفر-ساعت حضور نمایندگان: ${formatMinutesToPersian(totalPersonMins)}`,
    ``,
    `🏛 آمار کارگروه‌ها:`,
    ...committeeStats.map(
      (c) =>
        `- ${c.committee.name}: ${toPersianDigits(c.sessionCount)} جلسه (${formatMinutesToPersian(c.totalSessionMinutes)})`
    ),
    ``,
    `👤 حضور به تفکیک اعضای هیئت امنا:`,
    ...trusteeStats
      .filter((t) => t.totalMinutes > 0 || t.representatives.length > 0)
      .map(
        (t) =>
          `- ${t.trustee.fullName}: ${toPersianDigits(t.sessionCount)} جلسه · ${formatMinutesToPersian(t.totalMinutes)}`
      ),
    ``,
    `🧾 حضور به تفکیک نمایندگان:`,
    ...repStats
      .filter((r) => r.sessionCount > 0)
      .map(
        (r) =>
          `- ${r.representative.fullName} (نماینده ${r.trustee?.fullName ?? '—'}): ${toPersianDigits(r.sessionCount)} جلسه · ${formatMinutesToPersian(r.totalMinutes)}`
      ),
  ];

  return lines.join('\n');
}
