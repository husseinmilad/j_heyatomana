import React, { useState } from 'react';
import {
  CommitteeStat,
  MonthlyTrendPoint,
  TrusteeStat,
} from '../types';
import {
  formatMinutesToClock,
  formatMinutesToPersian,
} from '../utils/analytics';
import { toPersianDigits } from '../utils/jalali';

interface DashboardChartsProps {
  committeeStats: CommitteeStat[];
  trusteeStats: TrusteeStat[];
  monthlyTrend: MonthlyTrendPoint[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  committeeStats,
  trusteeStats,
  monthlyTrend,
}) => {
  const [hoveredCommittee, setHoveredCommittee] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const maxCommitteeHours = Math.max(
    1,
    ...committeeStats.map((c) => c.totalSessionMinutes / 60)
  );
  const maxTrusteeMinutes = Math.max(
    1,
    ...trusteeStats.map((t) => t.totalMinutes)
  );
  const maxMonthMinutes = Math.max(
    1,
    ...monthlyTrend.map((m) =>
      Math.max(m.totalSessionMinutes, m.totalPersonMinutes)
    )
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Committee Hours & Session Count Chart */}
      <section className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              عملکرد کارگروه‌های تخصصی
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مقایسه مجموع ساعات تشکیل جلسه و تعداد جلسات هر کارگروه
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
            واحد: ساعت جلسه
          </span>
        </div>

        <div className="space-y-4">
          {committeeStats.map((stat) => {
            const hours = stat.totalSessionMinutes / 60;
            const widthPct = Math.max(
              stat.sessionCount > 0 ? 8 : 0,
              Math.round((hours / maxCommitteeHours) * 100)
            );
            const isHovered = hoveredCommittee === stat.committee.id;

            return (
              <div
                key={stat.committee.id}
                onMouseEnter={() => setHoveredCommittee(stat.committee.id)}
                onMouseLeave={() => setHoveredCommittee(null)}
                className="group"
              >
                <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                  <span className="font-medium text-slate-800 truncate">
                    {stat.committee.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums whitespace-nowrap shrink-0">
                    <span>{toPersianDigits(stat.sessionCount)} جلسه</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatMinutesToPersian(stat.totalSessionMinutes)}
                    </span>
                  </div>
                </div>
                <div className="h-3 w-full rounded-md bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-300"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: stat.committee.accentColor,
                      opacity: hoveredCommittee && !isHovered ? 0.55 : 1,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trustee Attendance Hours Chart */}
      <section className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              میزان حضور به تفکیک اعضای هیئت‌امنا
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مجموع نفر-ساعت حضور نمایندگان منصوب هر عضو هیئت‌امنا
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
            ساعت:دقیقه
          </span>
        </div>

        {trusteeStats.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            عضو هیئت‌امنایی ثبت نشده است.
          </p>
        ) : (
          <div className="space-y-4">
            {trusteeStats.map((stat) => {
              const widthPct = Math.max(
                stat.totalMinutes > 0 ? 6 : 0,
                Math.round((stat.totalMinutes / maxTrusteeMinutes) * 100)
              );

              return (
                <div key={stat.trustee.id}>
                  <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800 block truncate">
                        {stat.trustee.fullName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums whitespace-nowrap shrink-0">
                      <span>{toPersianDigits(stat.sessionCount)} جلسه</span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-semibold text-teal-800">
                        {formatMinutesToClock(stat.totalMinutes)} ساعت
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full rounded-md bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-md bg-teal-700 transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Monthly Jalali Trend Chart */}
      <section className="lg:col-span-12 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              روند ماهانه جلسات و ساعات کارگروه‌ها (تقویم شمسی)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              توزیع تعداد جلسات و مجموع نفر-ساعت حضور در ماه‌های شمسی
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-800" />
              ساعت جلسات
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-teal-600" />
              نفر-ساعت حضور
            </span>
          </div>
        </div>

        {monthlyTrend.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            برای بازه فیلترشده جلسه‌ای جهت نمایش روند ماهانه وجود ندارد.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 items-end pt-4">
            {monthlyTrend.map((point) => {
              const sessionBarHeight = Math.max(
                14,
                Math.round((point.totalSessionMinutes / maxMonthMinutes) * 112)
              );
              const personBarHeight = Math.max(
                14,
                Math.round((point.totalPersonMinutes / maxMonthMinutes) * 112)
              );
              const isHovered = hoveredMonth === point.yearMonth;

              return (
                <div
                  key={point.yearMonth}
                  onMouseEnter={() => setHoveredMonth(point.yearMonth)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  className="flex flex-col items-center text-center group"
                >
                  <div className="h-36 w-full flex items-end justify-center gap-2 pb-2 border-b border-slate-200">
                    <div
                      className="w-7 rounded-t-md bg-slate-800 transition-all duration-200 relative"
                      style={{
                        height: `${sessionBarHeight}px`,
                        opacity: isHovered ? 0.9 : 1,
                      }}
                      title={`${point.label} - ساعت جلسات: ${formatMinutesToPersian(point.totalSessionMinutes)}`}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                        {formatMinutesToClock(point.totalSessionMinutes)}
                      </span>
                    </div>
                    <div
                      className="w-7 rounded-t-md bg-teal-600 transition-all duration-200 relative"
                      style={{
                        height: `${personBarHeight}px`,
                        opacity: isHovered ? 0.9 : 1,
                      }}
                      title={`${point.label} - نفر-ساعت حضور: ${formatMinutesToPersian(point.totalPersonMinutes)}`}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-teal-800 tabular-nums whitespace-nowrap">
                        {formatMinutesToClock(point.totalPersonMinutes)}
                      </span>
                    </div>
                  </div>
                  <span className="mt-2 text-xs font-semibold text-slate-800">
                    {point.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium tabular-nums mt-0.5">
                    {toPersianDigits(point.sessionCount)} جلسه برگزارشده
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
