import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  FileSpreadsheet,
  Link2,
  Printer,
  Share2,
  X,
} from 'lucide-react';
import {
  CommitteeStat,
  MeetingSession,
  Representative,
  RepresentativeStat,
  Trustee,
  TrusteeStat,
} from '../types';
import {
  COMMITTEE_MAP,
  getAttendanceMinutes,
  getEffectiveTrusteeId,
  encodeSharePayload,
  formatMinutesToClock,
  formatMinutesToPersian,
} from '../utils/analytics';
import { formatJalaliReadable, getTodayJalali, toPersianDigits } from '../utils/jalali';

interface ShareAndPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: MeetingSession[];
  trustees: Trustee[];
  representatives: Representative[];
  repStats: RepresentativeStat[];
  trusteeStats: TrusteeStat[];
  committeeStats: CommitteeStat[];
  onExportExcel: () => void;
  initialParts?: Partial<Record<'summary' | 'trustees' | 'representatives' | 'committees' | 'sessions', boolean>>;
  scopeTitle?: string;
  filterSummary?: string;
}

export const ShareAndPdfModal: React.FC<ShareAndPdfModalProps> = ({
  isOpen,
  onClose,
  sessions,
  trustees,
  representatives,
  repStats,
  trusteeStats,
  committeeStats,
  onExportExcel,
  initialParts,
  scopeTitle = 'گزارش جلسات',
  filterSummary = 'بدون فیلتر',
}) => {
  const [copiedType, setCopiedType] = useState<'text' | 'link' | null>(null);
  const [printParts, setPrintParts] = useState({ summary: true, trustees: true, representatives: true, committees: true, sessions: true });
  useEffect(() => { if (isOpen && initialParts) setPrintParts({ summary: false, trustees: false, representatives: false, committees: false, sessions: false, ...initialParts }); }, [isOpen, initialParts]);

  if (!isOpen) return null;

  const today = getTodayJalali().formatted;
  const totalSessionMins = sessions.reduce((s, x) => s + x.durationMinutes, 0);
  const totalPersonMins = repStats.reduce((s, r) => s + r.totalMinutes, 0);
  const topRepresentative = [...repStats].sort((a, b) => b.totalMinutes - a.totalMinutes)[0];
  const mostActiveCommittee = [...committeeStats].sort((a, b) => b.sessionCount - a.sessionCount)[0];
  const matchingRepresentativeIds = new Set(sessions.flatMap((session) => session.attendees.map((a) => a.representativeId)));
  const matchingRepresentatives = representatives.filter((rep) => matchingRepresentativeIds.has(rep.id));
  const matchingTrusteeIds = new Set<string>();
  sessions.forEach((session) => session.attendees.forEach((att) => { const rep = representatives.find((item) => item.id === att.representativeId); if (rep) { const trusteeId = getEffectiveTrusteeId(rep, session.committeeId); if (trusteeId) matchingTrusteeIds.add(trusteeId); } }));
  const matchingTrustees = trustees.filter((trustee) => matchingTrusteeIds.has(trustee.id));

  const buildSelectedShareText = () => {
    const lines: string[] = [`گزارش ${scopeTitle} · سازمان تأمین اجتماعی و صندوق‌های تابعه · ${toPersianDigits(today)}`, `دامنه نتایج: ${filterSummary}`, `تعداد نتایج منطبق: ${toPersianDigits(sessions.length)} جلسه`];
    if (printParts.summary) lines.push(`تعداد جلسات: ${toPersianDigits(sessions.length)} · مجموع زمان جلسات: ${formatMinutesToPersian(totalSessionMins)} · نفرساعت حضور: ${formatMinutesToPersian(totalPersonMins)}`, `فعال‌ترین نماینده: ${topRepresentative?.representative.fullName ?? '—'}`, `پرفعالیت‌ترین نوع جلسه: ${mostActiveCommittee?.committee.name ?? '—'}`);
    if (printParts.trustees) lines.push('آمار اعضای هیئت‌امنا:', ...trusteeStats.map((st) => `${st.trustee.fullName}: ${toPersianDigits(st.sessionCount)} جلسه · ${toPersianDigits(st.attendanceDays)} روز حضور · ${formatMinutesToPersian(st.totalMinutes)} · ${st.attendedSessionTitles.join('؛ ')}`), 'جزئیات نمایندگان هر عضو:', ...trusteeStats.flatMap((st) => repStats.filter((r) => r.representative.trusteeId === st.trustee.id || Object.values(r.representative.committeeTrusteeOverrides ?? {}).includes(st.trustee.id)).map((r) => { const attended = sessions.filter((s) => s.attendees.some((a) => a.representativeId === r.representative.id && (r.representative.committeeTrusteeOverrides?.[s.committeeId] ?? r.representative.trusteeId) === st.trustee.id)); const mins = attended.reduce((sum, s) => sum + getAttendanceMinutes(s, s.attendees.find((a) => a.representativeId === r.representative.id)!), 0); return `${st.trustee.fullName} ← ${r.representative.fullName}: ${toPersianDigits(attended.length)} جلسه · ${toPersianDigits(new Set(attended.map((s) => s.jalaliDate)).size)} روز · ${formatMinutesToPersian(mins)}`; })));
    if (printParts.representatives) lines.push('آمار نمایندگان:', ...repStats.map((st) => `${st.representative.fullName}: ${toPersianDigits(st.sessionCount)} جلسه · ${toPersianDigits(st.attendanceDays)} روز حضور · ${formatMinutesToPersian(st.totalMinutes)} · ${st.attendedSessionTitles.join('؛ ')}`));
    if (printParts.committees) lines.push('آمار انواع جلسات و کارگروه‌ها:', ...committeeStats.map((st) => `${st.committee.name}: ${toPersianDigits(st.sessionCount)} جلسه · ${formatMinutesToPersian(st.totalSessionMinutes)}`));
    if (printParts.sessions) lines.push('فهرست جلسات:', ...sessions.map((session) => `${toPersianDigits(session.jalaliDate)} · ${COMMITTEE_MAP[session.committeeId]?.name ?? ''} · ${session.topic}`));
    return lines.join('\n');
  };

  const buildShareUrl = () => {
    const needsSessions = printParts.summary || printParts.committees || printParts.sessions || printParts.trustees || printParts.representatives;
    const needsPeople = needsSessions;
    const encoded = encodeSharePayload({
      trustees: needsPeople ? matchingTrustees : [],
      representatives: needsPeople ? matchingRepresentatives : [],
      sessions: needsSessions ? sessions : [],
    });
    const url = new URL(window.location.href);
    url.searchParams.set('share', encoded);
    return url.toString();
  };

  const copyText = async (value: string) => {
    try { if (window.desktopShare) { window.desktopShare(value); return true; } } catch { /* fallback */ }
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; } } catch { /* fallback */ }
    try { const area = document.createElement('textarea'); area.value = value; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); const ok = document.execCommand('copy'); area.remove(); return ok; } catch { return false; }
  };

  const handleCopyText = async () => {
    const ok = await copyText(buildSelectedShareText());
    setCopiedType(ok ? 'text' : null);
    if (ok) setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyLink = async () => {
    const shareUrl = buildShareUrl();
    const ok = await copyText(shareUrl);
    setCopiedType(ok ? 'link' : null);
    if (ok) setTimeout(() => setCopiedType(null), 2500);
  };

  const handleNativeShare = async () => {
    const text = buildSelectedShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'گزارش مدیریتی جلسات کارگروه‌ها',
          text,
          url: buildShareUrl(),
        });
      } catch {
        // User cancelled share
      }
    } else {
      await handleCopyText();
    }
  };

  const handlePrintPdf = async () => {
    if (window.desktopPrintPreview) {
      const report = document.querySelector('.print-only-container');
      const css = Array.from(document.styleSheets).map((sheet) => { try { return Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\\n'); } catch { return ''; } }).join('\\n');
      const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>گزارش جلسات هیئت امنا</title><style>${css} @page{size:A4;margin:10mm} body{font-family:Vazirmatn,Tahoma,Arial,sans-serif;background:#fff;color:#0f172a;font-size:8.5pt;line-height:1.4} .print-only-container{display:block!important;max-height:none!important;overflow:visible!important;font-size:8.5pt!important;line-height:1.4!important;padding:0!important} .print-only-container h1{font-size:13pt!important;line-height:1.35!important} .print-only-container h3{font-size:9.5pt!important;margin-bottom:5px!important} .print-only-container p,.print-only-container span,.print-only-container td,.print-only-container th{font-size:7.5pt!important;line-height:1.35!important} .print-only-container table{font-size:7.5pt!important;width:100%!important} .print-only-container th,.print-only-container td{padding:3px 4px!important} .print-only-container .text-lg{font-size:10pt!important} .print-only-container .text-xl{font-size:12pt!important}</style></head><body>${report?.outerHTML ?? '<p>گزارشی برای چاپ وجود ندارد.</p>'}</body></html>`;
      await window.desktopPrintPreview(html);
    } else { window.print(); }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-pdf-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 overflow-y-auto print:static print:block print:overflow-visible print:bg-white print:p-0"
    >
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden my-auto print:border-none print:shadow-none print:rounded-none print:max-w-none">
        {/* Modal Action Header (hidden when printing) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2
              id="share-pdf-title"
              className="text-base font-bold text-slate-900"
            >
              اشتراک‌گذاری، پیش‌نمایش و صدور گزارش PDF
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              نسخه رسمی قابل چاپ با فونت وزیر، اشتراک‌گذاری متنی یا لینک گزارش
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-3 px-6 py-3 border-b border-slate-200 text-xs text-slate-700"><span className="font-semibold">بخش‌های خروجی:</span><label><input type="checkbox" checked={printParts.summary} onChange={(e) => setPrintParts((p) => ({ ...p, summary: e.target.checked }))} /> خلاصه</label><label><input type="checkbox" checked={printParts.trustees} onChange={(e) => setPrintParts((p) => ({ ...p, trustees: e.target.checked }))} /> اعضای هیئت‌امنا</label><label><input type="checkbox" checked={printParts.representatives} onChange={(e) => setPrintParts((p) => ({ ...p, representatives: e.target.checked }))} /> نمایندگان</label><label><input type="checkbox" checked={printParts.committees} onChange={(e) => setPrintParts((p) => ({ ...p, committees: e.target.checked }))} /> کارگروه‌ها</label><label><input type="checkbox" checked={printParts.sessions} onChange={(e) => setPrintParts((p) => ({ ...p, sessions: e.target.checked }))} /> فهرست جلسات</label></div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {copiedType === 'text' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedType === 'text' ? 'متن کپی شد' : 'کپی خلاصه متنی'}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {copiedType === 'link' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              {copiedType === 'link' ? 'لینک کپی شد' : 'کپی لینک اشتراک'}
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              اشتراک‌گذاری
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              اکسل
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-teal-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
              چاپ / ذخیره PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="بستن پنجره پیش‌نمایش"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Executive Report Body */}
        <div className="print-only-container p-6 sm:p-8 max-h-[78vh] overflow-y-auto print:max-h-none print:overflow-visible space-y-6 bg-white">
          {/* Official Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b-2 border-slate-900">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                گزارش {scopeTitle} · هیئت‌امنای سازمان تأمین اجتماعی و صندوق‌های تابعه
              </h1>
              <p className="text-xs text-slate-600 mt-1">فقط نتایج منطبق با جستجوها و فیلترهای فعال</p>
              <p className="mt-1 text-[10px] leading-5 text-slate-500">فیلترهای اعمال‌شده: {filterSummary}</p>
            </div>
            <div className="text-left text-xs text-slate-600 tabular-nums">
              <p>
                تاریخ صدور گزارش:{' '}
                <strong className="text-slate-900">
                  {formatJalaliReadable(today)}
                </strong>
              </p>
              <p className="mt-0.5">
                تعداد کل جلسات:{' '}
                <strong className="text-slate-900">
                  {toPersianDigits(sessions.length)} جلسه
                </strong>
              </p>
            </div>
          </div>

          {/* Summary Totals */}
          <div className={printParts.summary ? "space-y-3" : "hidden"}>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 p-3"><span className="block text-[10px] text-slate-500">تعداد جلسات منطبق</span><strong className="mt-1 block text-base text-slate-900 tabular-nums">{toPersianDigits(sessions.length)} جلسه</strong></div>
              <div className="rounded-lg border border-slate-200 p-3"><span className="block text-[10px] text-slate-500">مجموع زمان برگزاری</span><strong className="mt-1 block text-base text-slate-900 tabular-nums">{formatMinutesToPersian(totalSessionMins)}</strong></div>
              <div className="rounded-lg border border-slate-200 p-3"><span className="block text-[10px] text-slate-500">مجموع نفرساعت حضور</span><strong className="mt-1 block text-base text-teal-800 tabular-nums">{formatMinutesToPersian(totalPersonMins)}</strong></div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 grid grid-cols-2 gap-2">
              <p>فعال‌ترین نماینده: <strong>{topRepresentative?.representative.fullName ?? '—'}</strong></p>
              <p>پرفعالیت‌ترین نوع جلسه: <strong>{mostActiveCommittee?.committee.name ?? '—'}</strong></p>
            </div>
          </div>

          {/* Trustee Breakdown Table */}
          <div className={printParts.trustees ? "" : "hidden"}>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              ۱. آمار جلسات و ساعات حضور به تفکیک اعضای هیئت‌امنا
            </h3>
            <table className="w-full text-right border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-200 py-2 px-3">عضو هیئت‌امنا</th>
                  <th className="border border-slate-200 py-2 px-3">نمایندگان</th>
                  <th className="border border-slate-200 py-2 px-3 text-left">
                    تعداد جلسات
                  </th>
                  <th className="border border-slate-200 py-2 px-3 text-left">روزهای حضور</th>
                  <th className="border border-slate-200 py-2 px-3 text-left">میزان ساعت حضور</th>
                  <th className="border border-slate-200 py-2 px-3">عناوین جلسات</th>
                </tr>
              </thead>
              <tbody>
                {trusteeStats.map((st) => (
                  <tr key={st.trustee.id}>
                    <td className="border border-slate-200 py-2 px-3 font-semibold text-slate-900">
                      {st.trustee.fullName}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 text-slate-600">
                      {st.representatives.map((r) => r.fullName).join('، ') || '—'}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 text-left tabular-nums">
                      {toPersianDigits(st.sessionCount)}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 text-left">{toPersianDigits(st.attendanceDays)} روز</td>
                    <td className="border border-slate-200 py-2 px-3 text-left tabular-nums font-semibold">
                      {formatMinutesToPersian(st.totalMinutes)} (
                      {formatMinutesToClock(st.totalMinutes)})
                    </td>
                    <td className="border border-slate-200 py-2 px-3">{st.attendedSessionTitles.join('؛ ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 className="text-xs font-bold text-slate-800 mt-3 mb-1">جزئیات تعداد جلسات و ساعات حضور نمایندگان هر عضو</h4>
            <table className="w-full text-right border-collapse border border-slate-200 text-[10px]">
              <thead><tr className="bg-slate-100 text-slate-700"><th className="border border-slate-200 py-1 px-2">عضو هیئت‌امنا</th><th className="border border-slate-200 py-1 px-2">نماینده</th><th className="border border-slate-200 py-1 px-2">جلسات</th><th className="border border-slate-200 py-1 px-2">روز حضور</th><th className="border border-slate-200 py-1 px-2">مدت حضور</th></tr></thead>
              <tbody>{trusteeStats.flatMap((st) => repStats.filter((r) => r.representative.trusteeId === st.trustee.id || Object.values(r.representative.committeeTrusteeOverrides ?? {}).includes(st.trustee.id)).map((r) => { const attended = sessions.filter((s) => s.attendees.some((a) => a.representativeId === r.representative.id && (r.representative.committeeTrusteeOverrides?.[s.committeeId] ?? r.representative.trusteeId) === st.trustee.id)); const mins = attended.reduce((sum, s) => sum + getAttendanceMinutes(s, s.attendees.find((a) => a.representativeId === r.representative.id)!), 0); return <tr key={st.trustee.id + ':' + r.representative.id}><td className="border border-slate-200 py-1 px-2">{st.trustee.fullName}</td><td className="border border-slate-200 py-1 px-2">{r.representative.fullName}</td><td className="border border-slate-200 py-1 px-2">{toPersianDigits(attended.length)}</td><td className="border border-slate-200 py-1 px-2">{toPersianDigits(new Set(attended.map((s) => s.jalaliDate)).size)}</td><td className="border border-slate-200 py-1 px-2">{formatMinutesToPersian(mins)}</td></tr>; }))}</tbody>
            </table>
          </div>

          {/* Representative Breakdown Table */}
          <div className={printParts.representatives ? "" : "hidden"}>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              ۲. آمار جلسات و ساعات حضور به تفکیک هر نماینده
            </h3>
            <table className="w-full text-right border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-200 py-2 px-3">نام نماینده</th>
                  <th className="border border-slate-200 py-2 px-3">
                    نماینده عضو هیئت‌امنا
                  </th>
                  <th className="border border-slate-200 py-2 px-3 text-left">
                    تعداد جلسات
                  </th>
                  <th className="border border-slate-200 py-2 px-3 text-left">روزهای حضور</th>
                  <th className="border border-slate-200 py-2 px-3 text-left">میزان ساعت حضور</th>
                  <th className="border border-slate-200 py-2 px-3">عناوین جلسات</th>
                </tr>
              </thead>
              <tbody>
                {repStats.map((st) => (
                  <tr key={st.representative.id}>
                    <td className="border border-slate-200 py-2 px-3 font-semibold text-slate-900">
                      {st.representative.fullName}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 text-slate-700">
                      {st.representative.committeeTrusteeOverrides
                        ? 'سیفی (تلفیق) · بیات (بیمه و اکچوئری)'
                        : st.trustee?.fullName ?? 'مشاور / مستقل'}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 text-left tabular-nums">
                      {toPersianDigits(st.sessionCount)}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 text-left">{toPersianDigits(st.attendanceDays)} روز</td>
                    <td className="border border-slate-200 py-2 px-3 text-left tabular-nums font-semibold">{formatMinutesToPersian(st.totalMinutes)}</td>
                    <td className="border border-slate-200 py-2 px-3">{st.attendedSessionTitles.join('؛ ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={printParts.committees ? "" : "hidden"}>
            <h3 className="text-sm font-bold text-slate-900 mb-2">۳. آمار به تفکیک کارگروه‌ها</h3>
            <table className="w-full text-right border-collapse border border-slate-200 text-xs">
              <thead><tr className="bg-slate-100 text-slate-700"><th className="border border-slate-200 py-2 px-3">نوع جلسه / کارگروه</th><th className="border border-slate-200 py-2 px-3">تعداد جلسات</th><th className="border border-slate-200 py-2 px-3">مجموع زمان جلسات</th><th className="border border-slate-200 py-2 px-3">نفر-ساعت حضور</th></tr></thead>
              <tbody>{committeeStats.map((st) => <tr key={st.committee.id}><td className="border border-slate-200 py-2 px-3">{st.committee.name}</td><td className="border border-slate-200 py-2 px-3">{toPersianDigits(st.sessionCount)}</td><td className="border border-slate-200 py-2 px-3">{formatMinutesToPersian(st.totalSessionMinutes)}</td><td className="border border-slate-200 py-2 px-3">{formatMinutesToPersian(st.totalPersonMinutes)}</td></tr>)}</tbody>
            </table>
          </div>

          {/* Committee & Sessions Summary */}
          <div className={printParts.sessions ? "" : "hidden"}>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              ۴. فهرست جلسات ({toPersianDigits(sessions.length)} جلسه)
            </h3>
            <table className="w-full text-right border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-200 py-2 px-3">تاریخ</th>
                  <th className="border border-slate-200 py-2 px-3">کارگروه</th>
                  <th className="border border-slate-200 py-2 px-3">ساعت</th>
                  <th className="border border-slate-200 py-2 px-3">موضوع گزارش</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="border border-slate-200 py-2 px-3 tabular-nums whitespace-nowrap">
                      {toPersianDigits(s.jalaliDate)}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 whitespace-nowrap">
                      {COMMITTEE_MAP[s.committeeId]?.name}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 tabular-nums whitespace-nowrap">
                      {toPersianDigits(s.startTime)} تا {toPersianDigits(s.endTime)}
                    </td>
                    <td className="border border-slate-200 py-2 px-3">
                      {s.topic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
