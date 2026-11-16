import React from 'react';
import {
  ActiveTab,
  CommitteeStat,
  FilterState,
  MeetingSession,
  MonthlyTrendPoint,
  Representative,
  RepresentativeStat,
  Trustee,
  TrusteeStat,
} from '../types';
import {
  COMMITTEE_MAP,
  formatMinutesToClock,
  formatMinutesToPersian,
} from '../utils/analytics';
import { formatJalaliReadable, toPersianDigits } from '../utils/jalali';
import { DashboardCharts } from './DashboardCharts';
import { FilterBar } from './FilterBar';

interface DashboardViewProps {
  sessions: MeetingSession[];
  trustees: Trustee[];
  representatives: Representative[];
  repStats: RepresentativeStat[];
  trusteeStats: TrusteeStat[];
  committeeStats: CommitteeStat[];
  monthlyTrend: MonthlyTrendPoint[];
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenNewSession: () => void;
  onEditSession: (session: MeetingSession) => void;
  isReadOnlyShared?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sessions,
  trustees,
  representatives,
  repStats,
  trusteeStats,
  committeeStats,
  monthlyTrend,
  filters,
  onFiltersChange,
  onNavigate,
  onOpenNewSession,
  onEditSession,
  isReadOnlyShared = false,
}) => {
  const totalSessions = sessions.length;
  const totalSessionMinutes = sessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const totalPersonMinutes = repStats.reduce(
    (sum, r) => sum + r.totalMinutes,
    0
  );
  const activeCommitteeCount = committeeStats.filter(
    (c) => c.sessionCount > 0
  ).length;

  const mostActiveCommittee = [...committeeStats].sort(
    (a, b) => b.totalSessionMinutes - a.totalSessionMinutes
  )[0];

  const topReps = repStats.slice(0, 5);
  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <section
        aria-label="شاخص‌های کلیدی عملکرد"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">تعداد کل جلسات</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {toPersianDigits(totalSessions)}{' '}
            <span className="text-sm font-normal text-slate-500">جلسه</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            در {toPersianDigits(activeCommitteeCount)} کارگروه فعال
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            مجموع ساعات برگزاری جلسات
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {formatMinutesToClock(totalSessionMinutes)}{' '}
            <span className="text-sm font-normal text-slate-500">ساعت</span>
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            {formatMinutesToPersian(totalSessionMinutes)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            مجموع نفر-ساعت حضور نمایندگان
          </p>
          <p className="mt-2 text-2xl font-bold text-teal-800 tabular-nums">
            {formatMinutesToClock(totalPersonMinutes)}{' '}
            <span className="text-sm font-normal text-slate-500">نفرساعت</span>
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            {toPersianDigits(
              repStats.filter((r) => r.sessionCount > 0).length
            )}{' '}
            نماینده فعال از {toPersianDigits(trustees.length)} عضو هیئت امنا
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            پرفعالیت‌ترین کارگروه
          </p>
          <p className="mt-2 text-lg font-bold text-slate-900 truncate">
            {mostActiveCommittee && mostActiveCommittee.sessionCount > 0
              ? mostActiveCommittee.committee.name
              : '—'}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            {mostActiveCommittee && mostActiveCommittee.sessionCount > 0
              ? `${toPersianDigits(mostActiveCommittee.sessionCount)} جلسه · ${formatMinutesToPersian(mostActiveCommittee.totalSessionMinutes)}`
              : 'هنوز جلسه‌ای ثبت نشده'}
          </p>
        </div>
      </section>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={onFiltersChange}
        trustees={trustees}
        representatives={representatives}
      />

      {/* Charts */}
      <DashboardCharts
        committeeStats={committeeStats}
        trusteeStats={trusteeStats}
        monthlyTrend={monthlyTrend}
      />

      {/* Two-Column Executive Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Representatives Table */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                خلاصه حضور نمایندگان
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                بر اساس مجموع ساعات حضور و عضو هیئت امنای متبوع
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap shrink-0"
            >
              مشاهده گزارش کامل
            </button>
          </div>

          {topReps.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              نماینده‌ای یافت نشد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">نماینده</th>
                    <th className="py-2.5 px-4">عضو هیئت امنا</th>
                    <th className="py-2.5 px-4 text-left">تعداد جلسات</th>
                    <th className="py-2.5 px-4 text-left">ساعت حضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {topReps.map((st) => (
                    <tr
                      key={st.representative.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {st.representative.fullName}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {st.representative.committeeTrusteeOverrides
                          ? 'سیفی · بیات'
                          : st.trustee?.fullName ?? 'مشاور / مستقل'}
                      </td>
                      <td className="py-3 px-4 text-left tabular-nums text-slate-700">
                        {toPersianDigits(st.sessionCount)}
                      </td>
                      <td className="py-3 px-4 text-left tabular-nums font-semibold text-teal-800">
                        {formatMinutesToClock(st.totalMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Sessions Feed */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                آخرین جلسات ثبت‌شده
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                فهرست تازه‌ترین جلسات کارگروه‌ها به ترتیب تاریخ شمسی
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sessions')}
              className="text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap shrink-0"
            >
              همه جلسات ({toPersianDigits(sessions.length)})
            </button>
          </div>

          {recentSessions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500 mb-3">
                با فیلترهای انتخاب‌شده جلسه‌ای یافت نشد.
              </p>
              {!isReadOnlyShared && (
                <button
                  type="button"
                  onClick={onOpenNewSession}
                  className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-medium hover:bg-teal-800 transition-colors"
                >
                  ثبت جلسه جدید
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSessions.map((session) => {
                const committee = COMMITTEE_MAP[session.committeeId];
                return (
                  <div
                    key={session.id}
                    className="px-5 py-3.5 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {session.topic}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums">
                        <span
                          className="font-medium"
                          style={{ color: committee?.accentColor }}
                        >
                          {committee?.name}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatJalaliReadable(session.jalaliDate)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {toPersianDigits(session.startTime)} تا{' '}
                          {toPersianDigits(session.endTime)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {toPersianDigits(session.attendees.length)} نماینده حاضر
                        </span>
                      </div>
                    </div>
                    {!isReadOnlyShared && (
                      <button
                        type="button"
                        onClick={() => onEditSession(session)}
                        className="text-xs font-medium text-slate-600 hover:text-teal-700 px-2.5 py-1 rounded-md hover:bg-slate-100 whitespace-nowrap shrink-0 transition-colors"
                      >
                        مشاهده / ویرایش
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
