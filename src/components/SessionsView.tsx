import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  FilterState,
  MeetingSession,
  Representative,
  Trustee,
} from '../types';
import {
  COMMITTEE_MAP,
  formatMinutesToPersian,
  getAttendanceMinutes,
  getEffectiveTrusteeId,
} from '../utils/analytics';
import { formatJalaliWithWeekday, toPersianDigits } from '../utils/jalali';
import { FilterBar } from './FilterBar';

interface SessionsViewProps {
  sessions: MeetingSession[];
  trustees: Trustee[];
  representatives: Representative[];
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  onOpenNewSession: () => void;
  onEditSession: (session: MeetingSession) => void;
  onDeleteSession: (sessionId: string) => void;
  isReadOnlyShared?: boolean;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  sessions,
  trustees,
  representatives,
  filters,
  onFiltersChange,
  onOpenNewSession,
  onEditSession,
  onDeleteSession,
  isReadOnlyShared = false,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const repMap = new Map(representatives.map((r) => [r.id, r]));
  const trusteeMap = new Map(trustees.map((t) => [t.id, t]));

  return (
    <div className="space-y-5">
      <FilterBar
        filters={filters}
        onChange={onFiltersChange}
        trustees={trustees}
        representatives={representatives}
      />

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              دفتر ثبت جلسات کارگروه‌ها
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              نمایش {toPersianDigits(sessions.length)} جلسه بر اساس فیلترهای فعال
            </p>
          </div>
          {!isReadOnlyShared && (
            <button
              type="button"
              onClick={onOpenNewSession}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              ثبت جلسه جدید
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <p className="text-sm font-medium text-slate-700">
              هیچ جلسه‌ای مطابق فیلترهای فعلی یافت نشد.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              می‌توانید فیلترها را تغییر دهید یا یک جلسه جدید در تقویم شمسی ثبت کنید.
            </p>
            {!isReadOnlyShared && (
              <button
                type="button"
                onClick={onOpenNewSession}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ثبت اولین جلسه
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">تاریخ (شمسی)</th>
                  <th className="py-3 px-4">کارگروه</th>
                  <th className="py-3 px-4">ساعت و مدت</th>
                  <th className="py-3 px-4">موضوع و گزارش جلسه</th>
                  <th className="py-3 px-4">نمایندگان حاضر و عضو هیئت‌امنا</th>
                  {!isReadOnlyShared && (
                    <th className="py-3 px-4 text-left">عملیات</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm align-top">
                {sessions.map((session) => {
                  const committee = COMMITTEE_MAP[session.committeeId];
                  const isExpanded = expandedId === session.id;
                  const isConfirmingDelete = confirmDeleteId === session.id;

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 tabular-nums block">
                          {toPersianDigits(session.jalaliDate)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatJalaliWithWeekday(session.jalaliDate).split('،')[0]}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: committee?.accentColor }}
                        >
                          {committee?.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                        <span className="text-slate-900 font-medium block">
                          {toPersianDigits(session.startTime)} تا{' '}
                          {toPersianDigits(session.endTime)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatMinutesToPersian(session.durationMinutes)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="font-semibold text-slate-900 leading-relaxed">
                          {session.topic}
                        </p>
                        {session.reportSummary && (
                          <div className="mt-1">
                            <p
                              className={`text-xs text-slate-600 leading-relaxed ${
                                isExpanded ? '' : 'line-clamp-2'
                              }`}
                            >
                              {session.reportSummary}
                            </p>
                            {session.reportSummary.length > 90 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : session.id)
                                }
                                className="text-[11px] font-medium text-teal-700 hover:underline mt-0.5"
                              >
                                {isExpanded ? 'بستن خلاصه' : 'مشاهده کامل گزارش'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 min-w-[230px]">
                        <div className="space-y-1">
                          {session.attendees.map((att) => {
                            const rep = repMap.get(att.representativeId);
                            const effTrusteeId = rep
                              ? getEffectiveTrusteeId(rep, session.committeeId)
                              : '';
                            const trustee = effTrusteeId
                              ? trusteeMap.get(effTrusteeId)
                              : undefined;
                            const mins = getAttendanceMinutes(session, att);
                            const isPartial = mins < session.durationMinutes;
                            return (
                              <div
                                key={att.representativeId}
                                className="text-xs text-slate-700 flex items-center justify-between gap-2"
                              >
                                <span>
                                  <span className="font-medium text-slate-900">
                                    {rep?.fullName ?? 'نماینده حذف‌شده'}
                                  </span>
                                  {trustee && (
                                    <span className="text-slate-500">
                                      {' '}
                                      · {trustee.fullName}
                                    </span>
                                  )}
                                </span>
                                {isPartial && (
                                  <span className="text-[11px] text-amber-700 tabular-nums whitespace-nowrap">
                                    ({formatMinutesToPersian(mins)})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      {!isReadOnlyShared && (
                        <td className="py-3.5 px-4 text-left whitespace-nowrap">
                          {isConfirmingDelete ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteSession(session.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                              >
                                تایید حذف
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 transition-colors"
                              >
                                انصراف
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditSession(session)}
                                aria-label={`ویرایش جلسه ${session.topic}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(session.id)}
                                aria-label={`حذف جلسه ${session.topic}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
