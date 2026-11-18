import React, { useState } from 'react';
import { FileSpreadsheet, Printer, Share2 } from 'lucide-react';
import {
  CommitteeStat,
  FilterState,
  Representative,
  RepresentativeStat,
  Trustee,
  TrusteeStat,
} from '../types';
import {
  COMMITTEES,
  getAttendanceMinutes,
  getEffectiveTrusteeId,
  formatMinutesToClock,
  formatMinutesToPersian,
} from '../utils/analytics';
import { toPersianDigits } from '../utils/jalali';
import { FilterBar } from './FilterBar';

interface ReportsViewProps {
  sessions: import('../types').MeetingSession[];
  repStats: RepresentativeStat[];
  trusteeStats: TrusteeStat[];
  committeeStats: CommitteeStat[];
  trustees: Trustee[];
  representatives: Representative[];
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  onExportExcel: () => void;
  onOpenSharePdf: (parts?: Partial<Record<'summary' | 'trustees' | 'representatives' | 'committees' | 'sessions', boolean>>) => void;
}

type ReportSubTab = 'by-representative' | 'by-trustee' | 'by-committee';

export const ReportsView: React.FC<ReportsViewProps> = ({
  sessions,
  repStats,
  trusteeStats,
  committeeStats,
  trustees,
  representatives,
  filters,
  onFiltersChange,
  onExportExcel,
  onOpenSharePdf,
}) => {
  const [subTab, setSubTab] = useState<ReportSubTab>('by-representative');

  return (
    <div className="space-y-5">
      <FilterBar
        filters={filters}
        onChange={onFiltersChange}
        trustees={trustees}
        representatives={representatives}
        scopeLabel="گزارش حضور"
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] text-slate-500">جلسات در بازهٔ فیلترشده</div><div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{toPersianDigits(sessions.length)}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] text-slate-500">مجموع زمان برگزاری</div><div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{formatMinutesToClock(sessions.reduce((sum, item) => sum + item.durationMinutes, 0))} <span className="text-xs font-normal">ساعت</span></div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] text-slate-500">نفر ـ ساعت حضور</div><div className="mt-1 text-xl font-bold text-teal-800 tabular-nums">{formatMinutesToClock(repStats.reduce((sum, item) => sum + item.totalMinutes, 0))} <span className="text-xs font-normal">ساعت</span></div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] text-slate-500">افراد دارای حضور ثبت‌شده</div><div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{toPersianDigits(repStats.filter(item => item.sessionCount > 0).length)}</div></div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          {/* Segmented Control */}
          <div
            role="tablist"
            aria-label="نوع گزارش تفکیکی"
            className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100"
          >
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'by-representative'}
              onClick={() => setSubTab('by-representative')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                subTab === 'by-representative'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              به تفکیک نماینده ({toPersianDigits(repStats.length)})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'by-trustee'}
              onClick={() => setSubTab('by-trustee')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                subTab === 'by-trustee'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              به تفکیک عضو هیئت‌امنا ({toPersianDigits(trusteeStats.length)})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'by-committee'}
              onClick={() => setSubTab('by-committee')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                subTab === 'by-committee'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              به تفکیک کارگروه ({toPersianDigits(committeeStats.length)})
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              صدور اکسل
            </button>
            <button
              type="button"
              onClick={() => onOpenSharePdf(subTab === 'by-representative' ? { representatives: true } : subTab === 'by-trustee' ? { trustees: true } : { committees: true })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              صدور PDF و اشتراک‌گذاری
              <Share2 className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>

        {/* Tab 1: By Representative */}
        {subTab === 'by-representative' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">نام نماینده</th>
                  <th className="py-3 px-4">نماینده عضو هیئت‌امنا</th>
                  <th className="py-3 px-4">کارگروه‌های عضویت</th>
                  <th className="py-3 px-4 text-left">تعداد جلسات</th>
                  <th className="py-3 px-4 text-left">روزهای حضور</th>
                  <th className="py-3 px-4 text-left">میزان ساعت حضور</th>
                  <th className="py-3 px-4">عناوین جلسات</th>
                  {COMMITTEES.map((c) => (
                    <th key={c.id} className="py-3 px-3 text-left whitespace-nowrap">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {repStats.map((st) => (
                  <tr
                    key={st.representative.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {st.representative.fullName}
                      </span>
                      {st.representative.roleTitle && (
                        <span className="text-xs text-slate-500">
                          {st.representative.roleTitle}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                      {st.representative.committeeTrusteeOverrides
                        ? 'سیفی (تلفیق) · بیات (بیمه و اکچوئری)'
                        : st.trustee?.fullName ?? 'مشاور / مستقل'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {st.committeeNames.join(' · ') || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums font-medium text-slate-900">
                      {toPersianDigits(st.sessionCount)}
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums">{toPersianDigits(st.attendanceDays)} روز</td>
                    <td className="py-3.5 px-4 text-left tabular-nums">
                      <span className="font-bold text-teal-800 block">
                        {formatMinutesToClock(st.totalMinutes)} ساعت
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatMinutesToPersian(st.totalMinutes)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 min-w-64">{st.attendedSessionTitles.join('؛ ') || '—'}</td>
                    {COMMITTEES.map((c) => {
                      const b = st.committeeBreakdown[c.id];
                      return (
                        <td
                          key={c.id}
                          className="py-3.5 px-3 text-left tabular-nums text-xs text-slate-600"
                        >
                          {b.sessions > 0 ? (
                            <>
                              <span className="font-medium text-slate-900 block">
                                {formatMinutesToClock(b.minutes)}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {toPersianDigits(b.sessions)} جلسه
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: By Trustee */}
        {subTab === 'by-trustee' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">عضو هیئت‌امنا</th>
                  <th className="py-3 px-4">نمایندگان منصوب</th>
                  <th className="py-3 px-4 text-left">تعداد جلسات</th>
                  <th className="py-3 px-4 text-left">دفعات حضور نمایندگان</th>
                  <th className="py-3 px-4 text-left">روزهای حضور</th>
                  <th className="py-3 px-4 text-left">مجموع ساعت حضور</th>
                  <th className="py-3 px-4">عناوین جلسات</th>
                  {COMMITTEES.map((c) => (
                    <th key={c.id} className="py-3 px-3 text-left whitespace-nowrap">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {trusteeStats.map((st) => (
                  <tr
                    key={st.trustee.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {st.trustee.fullName}
                      </span>
                      {st.trustee.position && (
                        <span className="text-xs text-slate-500">
                          {st.trustee.position}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      {st.representatives.length > 0
                        ? st.representatives.map((r) => r.fullName).join(' · ')
                        : 'بدون نماینده'}
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums font-medium text-slate-900">
                      {toPersianDigits(st.sessionCount)}
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums text-slate-700">
                      {toPersianDigits(st.totalAttendances)}
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums">{toPersianDigits(st.attendanceDays)} روز</td>
                    <td className="py-3.5 px-4 text-left tabular-nums">
                      <span className="font-bold text-teal-800 block">
                        {formatMinutesToClock(st.totalMinutes)} ساعت
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatMinutesToPersian(st.totalMinutes)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 min-w-64">{st.attendedSessionTitles.join('؛ ') || '—'}</td>
                    {COMMITTEES.map((c) => {
                      const b = st.committeeBreakdown[c.id];
                      return (
                        <td
                          key={c.id}
                          className="py-3.5 px-3 text-left tabular-nums text-xs text-slate-600"
                        >
                          {b.sessions > 0 ? (
                            <>
                              <span className="font-medium text-slate-900 block">
                                {formatMinutesToClock(b.minutes)}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {toPersianDigits(b.sessions)} جلسه
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detailed representative breakdown nested under each trustee */}
        {subTab === 'by-trustee' && (
          <div className="border-t border-slate-200 p-4 sm:p-5 space-y-3">
            <div><h3 className="text-sm font-bold text-slate-900">جزئیات عملکرد نمایندگان زیرمجموعهٔ هر عضو هیئت‌امنا</h3><p className="text-xs text-slate-500 mt-1">تعداد جلسه، روز حضور و مدت حضور هر نماینده با لحاظ انتساب او در همان کارگروه محاسبه شده است.</p></div>
            <div className="overflow-x-auto"><table className="w-full text-right border-collapse text-xs">
              <thead><tr className="bg-slate-50 text-slate-600 border-y border-slate-200"><th className="px-3 py-2">عضو هیئت‌امنا</th><th className="px-3 py-2">نماینده</th><th className="px-3 py-2 text-left">تعداد جلسات</th><th className="px-3 py-2 text-left">روزهای حضور</th><th className="px-3 py-2 text-left">ساعت حضور</th><th className="px-3 py-2">عناوین جلسات</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{trusteeStats.flatMap((t) => repStats.filter((r) => r.representative.trusteeId === t.trustee.id || Object.values(r.representative.committeeTrusteeOverrides ?? {}).includes(t.trustee.id)).map((r) => {
                const attended = sessions.filter((session) => session.attendees.some((a) => a.representativeId === r.representative.id && getEffectiveTrusteeId(r.representative, session.committeeId) === t.trustee.id));
                const minutes = attended.reduce((sum, session) => { const attendance = session.attendees.find((a) => a.representativeId === r.representative.id)!; return sum + getAttendanceMinutes(session, attendance); }, 0);
                const days = new Set(attended.map((session) => session.jalaliDate)).size;
                if (attended.length === 0) return null;
                return <tr key={t.trustee.id + ':' + r.representative.id}><td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{t.trustee.fullName}</td><td className="px-3 py-2">{r.representative.fullName}</td><td className="px-3 py-2 text-left tabular-nums">{toPersianDigits(attended.length)}</td><td className="px-3 py-2 text-left tabular-nums">{toPersianDigits(days)}</td><td className="px-3 py-2 text-left tabular-nums font-semibold">{formatMinutesToPersian(minutes)}</td><td className="px-3 py-2 text-slate-500 min-w-64">{attended.map((s) => s.jalaliDate + ' · ' + s.topic).join('؛ ') || '—'}</td></tr>;
              }))}</tbody>
            </table></div>
          </div>
        )}

        {/* Tab 3: By Committee */}
        {subTab === 'by-committee' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">نوع جلسه / کارگروه</th>
                  <th className="py-3 px-4">حوزه ماموریت</th>
                  <th className="py-3 px-4 text-left">تعداد جلسات</th>
                  <th className="py-3 px-4 text-left">مجموع ساعات جلسات</th>
                  <th className="py-3 px-4 text-left">مجموع نفر-ساعت حضور</th>
                  <th className="py-3 px-4 text-left">میانگین حاضران</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {committeeStats.map((st) => (
                  <tr
                    key={st.committee.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className="font-semibold"
                        style={{ color: st.committee.accentColor }}
                      >
                        {st.committee.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-md">
                      {st.committee.description}
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums font-semibold text-slate-900">
                      {toPersianDigits(st.sessionCount)}
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums">
                      <span className="font-semibold text-slate-900 block">
                        {formatMinutesToClock(st.totalSessionMinutes)} ساعت
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatMinutesToPersian(st.totalSessionMinutes)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums font-bold text-teal-800">
                      {formatMinutesToClock(st.totalPersonMinutes)} نفرساعت
                    </td>
                    <td className="py-3.5 px-4 text-left tabular-nums text-slate-700">
                      {toPersianDigits(
                        String(st.averageAttendees).replace('.', '٫')
                      )}{' '}
                      نفر
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
