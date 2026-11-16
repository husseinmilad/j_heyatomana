import React, { useState } from 'react';
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
  encodeSharePayload,
  formatMinutesToClock,
  formatMinutesToPersian,
} from '../utils/analytics';
import { generateExecutiveShareText } from '../utils/exporters';
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
}) => {
  const [copiedType, setCopiedType] = useState<'text' | 'link' | null>(null);
  const [printParts, setPrintParts] = useState({ summary: true, trustees: true, representatives: true, sessions: true });

  if (!isOpen) return null;

  const today = getTodayJalali().formatted;
  const totalSessionMins = sessions.reduce((s, x) => s + x.durationMinutes, 0);
  const totalPersonMins = repStats.reduce((s, r) => s + r.totalMinutes, 0);

  const buildShareUrl = () => {
    const encoded = encodeSharePayload({
      trustees,
      representatives,
      sessions,
    });
    const url = new URL(window.location.href);
    url.searchParams.set('share', encoded);
    return url.toString();
  };

  const handleCopyText = async () => {
    const text = generateExecutiveShareText({
      sessions,
      repStats,
      trusteeStats,
      committeeStats,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('text');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Fallback ignored in restricted frames
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = buildShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedType('link');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Fallback ignored
    }
  };

  const handleNativeShare = async () => {
    const text = generateExecutiveShareText({
      sessions,
      repStats,
      trusteeStats,
      committeeStats,
    });
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

  const handlePrintPdf = () => {
    if (window.desktopPrint) window.desktopPrint();
    else window.print();
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
          <div className="no-print flex flex-wrap gap-3 px-6 py-3 border-b border-slate-200 text-xs text-slate-700"><span className="font-semibold">بخش‌های خروجی:</span><label><input type="checkbox" checked={printParts.summary} onChange={(e) => setPrintParts((p) => ({ ...p, summary: e.target.checked }))} /> خلاصه</label><label><input type="checkbox" checked={printParts.trustees} onChange={(e) => setPrintParts((p) => ({ ...p, trustees: e.target.checked }))} /> اعضای هیئت‌امنا</label><label><input type="checkbox" checked={printParts.representatives} onChange={(e) => setPrintParts((p) => ({ ...p, representatives: e.target.checked }))} /> نمایندگان</label><label><input type="checkbox" checked={printParts.sessions} onChange={(e) => setPrintParts((p) => ({ ...p, sessions: e.target.checked }))} /> فهرست جلسات</label></div>
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
                گزارش مدیریتی جلسات کارگروه‌های تخصصی و حضور نمایندگان هیئت‌امنا
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                حسابرسی و بودجه · اقتصاد و سرمایه‌گذاری · بیمه و محاسبات اکچوئری · بهداشت و درمان
              </p>
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
          <div className={printParts.summary ? "grid grid-cols-3 gap-4" : "hidden"}>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <span className="text-[11px] text-slate-500 block">
                تعداد جلسات گزارش
              </span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {toPersianDigits(sessions.length)} جلسه
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <span className="text-[11px] text-slate-500 block">
                مجموع ساعات برگزاری
              </span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {formatMinutesToPersian(totalSessionMins)}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <span className="text-[11px] text-slate-500 block">
                مجموع نفر-ساعت حضور
              </span>
              <span className="text-lg font-bold text-teal-800 tabular-nums">
                {formatMinutesToPersian(totalPersonMins)}
              </span>
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
                  <th className="border border-slate-200 py-2 px-3 text-left">
                    میزان ساعت حضور
                  </th>
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
                    <td className="border border-slate-200 py-2 px-3 text-left tabular-nums font-semibold">
                      {formatMinutesToPersian(st.totalMinutes)} (
                      {formatMinutesToClock(st.totalMinutes)})
                    </td>
                  </tr>
                ))}
              </tbody>
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
                  <th className="border border-slate-200 py-2 px-3 text-left">
                    میزان ساعت حضور
                  </th>
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
                    <td className="border border-slate-200 py-2 px-3 text-left tabular-nums font-semibold">
                      {formatMinutesToPersian(st.totalMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Committee & Sessions Summary */}
          <div className={printParts.sessions ? "" : "hidden"}>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              ۳. فهرست جلسات ({toPersianDigits(sessions.length)} جلسه)
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
