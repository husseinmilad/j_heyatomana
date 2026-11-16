import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  CommitteeId,
  MeetingSession,
  Representative,
  SessionAttendance,
  Trustee,
} from '../types';
import {
  calculateSessionDuration,
  COMMITTEES,
  formatMinutesToPersian,
  getEffectiveTrusteeId,
  normalizeTimeString,
  validateSessionInput,
} from '../utils/analytics';
import { getTodayJalali, toEnglishDigits, toPersianDigits } from '../utils/jalali';
import { JalaliDatePicker } from './JalaliDatePicker';

interface SessionFormModalProps {
  isOpen: boolean;
  editingSession: MeetingSession | null;
  representatives: Representative[];
  trustees: Trustee[];
  onClose: () => void;
  onSave: (sessionData: Omit<MeetingSession, 'id' | 'createdAt'>, existingId?: string) => void;
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  editingSession,
  representatives,
  trustees,
  onClose,
  onSave,
}) => {
  const todayStr = getTodayJalali().formatted;

  const [committeeId, setCommitteeId] = useState<CommitteeId>('audit-budget');
  const [jalaliDate, setJalaliDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('11:00');
  const [topic, setTopic] = useState<string>('');
  const [reportSummary, setReportSummary] = useState<string>('');
  const [attendees, setAttendees] = useState<SessionAttendance[]>([]);
  const [showAllReps, setShowAllReps] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const trusteeMap = new Map(trustees.map((t) => [t.id, t]));

  useEffect(() => {
    if (!isOpen) return;
    if (editingSession) {
      setCommitteeId(editingSession.committeeId);
      setJalaliDate(editingSession.jalaliDate);
      setStartTime(editingSession.startTime);
      setEndTime(editingSession.endTime);
      setTopic(editingSession.topic);
      setReportSummary(editingSession.reportSummary);
      setAttendees(editingSession.attendees);
      // Show all reps if any attendee isn't normally in this committee
      const hasExternal = editingSession.attendees.some((a) => {
        const r = representatives.find((x) => x.id === a.representativeId);
        return r && !r.committeeIds.includes(editingSession.committeeId);
      });
      setShowAllReps(hasExternal);
    } else {
      setCommitteeId('audit-budget');
      setJalaliDate(todayStr);
      setStartTime('09:00');
      setEndTime('11:00');
      setTopic('');
      setReportSummary('');
      setAttendees([]);
      setShowAllReps(false);
    }
    setErrors({});
  }, [isOpen, editingSession, todayStr, representatives]);

  if (!isOpen) return null;

  const computedDuration = calculateSessionDuration(startTime, endTime);

  const primaryReps = representatives.filter((r) =>
    r.committeeIds.includes(committeeId)
  );
  const otherReps = representatives.filter(
    (r) => !r.committeeIds.includes(committeeId)
  );
  const visibleReps = showAllReps ? [...primaryReps, ...otherReps] : primaryReps;

  const isRepSelected = (repId: string) =>
    attendees.some((a) => a.representativeId === repId);

  const getRepAttendance = (repId: string) =>
    attendees.find((a) => a.representativeId === repId);

  const toggleRep = (repId: string) => {
    if (isRepSelected(repId)) {
      setAttendees((prev) => prev.filter((a) => a.representativeId !== repId));
    } else {
      setAttendees((prev) => [...prev, { representativeId: repId }]);
    }
  };

  const handleSelectAllCommitteeReps = () => {
    const existingIds = new Set(attendees.map((a) => a.representativeId));
    const additions = primaryReps
      .filter((r) => !existingIds.has(r.id))
      .map((r) => ({ representativeId: r.id }));
    setAttendees((prev) => [...prev, ...additions]);
  };

  const handleCustomDurationChange = (repId: string, val: string) => {
    const clean = toEnglishDigits(val.trim());
    setAttendees((prev) =>
      prev.map((a) => {
        if (a.representativeId !== repId) return a;
        if (!clean) {
          return { representativeId: repId };
        }
        const mins = Number(clean);
        return {
          representativeId: repId,
          durationMinutes: Number.isFinite(mins) ? mins : undefined,
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSessionInput({
      committeeId,
      jalaliDate,
      startTime,
      endTime,
      topic,
      reportSummary,
      attendees,
    });

    if (!validation.valid) {
      setErrors(validation.errors as Record<string, string>);
      return;
    }

    const durationMinutes = calculateSessionDuration(startTime, endTime)!;
    const cleanedAttendees = attendees.map((a) => {
      if (
        a.durationMinutes !== undefined &&
        a.durationMinutes > 0 &&
        a.durationMinutes < durationMinutes
      ) {
        return {
          representativeId: a.representativeId,
          durationMinutes: Math.round(a.durationMinutes),
        };
      }
      return { representativeId: a.representativeId };
    });

    onSave(
      {
        committeeId,
        jalaliDate: toEnglishDigits(jalaliDate.trim()),
        startTime: normalizeTimeString(startTime),
        endTime: normalizeTimeString(endTime),
        durationMinutes,
        topic: topic.trim(),
        reportSummary: reportSummary.trim(),
        attendees: cleanedAttendees,
      },
      editingSession?.id
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2
              id="session-modal-title"
              className="text-base font-bold text-slate-900"
            >
              {editingSession ? 'ویرایش اطلاعات جلسه' : 'ثبت جلسه جدید کارگروه'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              اطلاعات زمان، تاریخ شمسی، موضوع گزارش و نمایندگان حاضر را وارد کنید
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره ثبت جلسه"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Committee */}
            <div>
              <label
                htmlFor="session-committee"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                نام کارگروه <span className="text-red-600">*</span>
              </label>
              <select
                id="session-committee"
                value={committeeId}
                onChange={(e) => setCommitteeId(e.target.value as CommitteeId)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
              >
                {COMMITTEES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.committeeId && (
                <p className="mt-1 text-xs text-red-600">{errors.committeeId}</p>
              )}
            </div>

            {/* Jalali Date */}
            <div>
              <JalaliDatePicker
                id="session-jalali-date"
                label="تاریخ جلسه (تقویم شمسی) *"
                value={jalaliDate}
                onChange={setJalaliDate}
                error={errors.jalaliDate}
              />
            </div>
          </div>

          {/* Time & Computed Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div>
              <label
                htmlFor="session-start-time"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                ساعت شروع <span className="text-red-600">*</span>
              </label>
              <input
                id="session-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 ${
                  errors.startTime ? 'border-red-500' : 'border-slate-200'
                }`}
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-600">{errors.startTime}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="session-end-time"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                ساعت پایان <span className="text-red-600">*</span>
              </label>
              <input
                id="session-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 ${
                  errors.endTime ? 'border-red-500' : 'border-slate-200'
                }`}
              />
              {errors.endTime && (
                <p className="mt-1 text-xs text-red-600">{errors.endTime}</p>
              )}
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                مدت محاسبه‌شده جلسه
              </span>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-teal-800 tabular-nums">
                {computedDuration !== null
                  ? formatMinutesToPersian(computedDuration)
                  : 'نامعتبر'}
              </div>
            </div>
          </div>

          {/* Topic */}
          <div>
            <label
              htmlFor="session-topic"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              موضوع جلسه و گزارش <span className="text-red-600">*</span>
            </label>
            <input
              id="session-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثال: بررسی گزارش تفریغ بودجه سه‌ماهه و مصوبات مالی"
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 ${
                errors.topic ? 'border-red-500' : 'border-slate-200'
              }`}
            />
            {errors.topic && (
              <p className="mt-1 text-xs text-red-600">{errors.topic}</p>
            )}
          </div>

          {/* Report Summary */}
          <div>
            <label
              htmlFor="session-report-summary"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              خلاصه گزارش و مصوبات جلسه
            </label>
            <textarea
              id="session-report-summary"
              rows={3}
              value={reportSummary}
              onChange={(e) => setReportSummary(e.target.value)}
              placeholder="شرح مختصر تصمیمات، مصوبات یا نکات کلیدی گزارش..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
          </div>

          {/* Attendees */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-700">
                نمایندگان حاضر در جلسه ({toPersianDigits(attendees.length)} نفر انتخاب‌شده){' '}
                <span className="text-red-600">*</span>
              </span>
              <div className="flex items-center gap-3">
                {primaryReps.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllCommitteeReps}
                    className="text-xs font-medium text-teal-700 hover:text-teal-900"
                  >
                    انتخاب همه اعضای کارگروه
                  </button>
                )}
                {otherReps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllReps((v) => !v)}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    {showAllReps
                      ? 'فقط اعضای این کارگروه'
                      : `نمایش سایر نمایندگان (${toPersianDigits(otherReps.length)})`}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {visibleReps.length === 0 ? (
                <p className="p-4 text-xs text-slate-500 text-center">
                  هنوز نماینده‌ای برای این کارگروه تعریف نشده است. از بخش «اعضا و کارگروه‌ها» نماینده اضافه کنید یا همه نمایندگان را نمایش دهید.
                </p>
              ) : (
                visibleReps.map((rep) => {
                  const selected = isRepSelected(rep.id);
                  const att = getRepAttendance(rep.id);
                  const effTrusteeId = getEffectiveTrusteeId(rep, committeeId);
                  const trustee = effTrusteeId
                    ? trusteeMap.get(effTrusteeId)
                    : undefined;
                  const isMemberOfCommittee = rep.committeeIds.includes(committeeId);

                  return (
                    <div
                      key={rep.id}
                      className={`px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                        selected ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-[220px]">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          aria-label={`حضور ${rep.fullName}`}
                          onClick={() => toggleRep(rep.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            selected
                              ? 'bg-teal-700 border-teal-700 text-white'
                              : 'bg-white border-slate-300 text-transparent hover:border-teal-600'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-900 block">
                            {rep.fullName}
                            {!isMemberOfCommittee && (
                              <span className="text-[11px] font-normal text-slate-400 mr-1.5">
                                (سایر اعضا / مشاور)
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-500 block">
                            {trustee ? (
                              <>
                                نماینده عضو هیئت امنا:{' '}
                                <span className="font-medium text-slate-700">
                                  {trustee.fullName}
                                </span>
                              </>
                            ) : (
                              <span>{rep.roleTitle || 'مشاور / مستقل'}</span>
                            )}
                          </span>
                        </div>
                      </label>

                      {selected && computedDuration !== null && (
                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor={`dur-${rep.id}`}
                            className="text-[11px] text-slate-500 whitespace-nowrap"
                          >
                            حضور (دقیقه):
                          </label>
                          <input
                            id={`dur-${rep.id}`}
                            type="number"
                            min={1}
                            max={computedDuration}
                            value={att?.durationMinutes ?? ''}
                            onChange={(e) =>
                              handleCustomDurationChange(rep.id, e.target.value)
                            }
                            placeholder={String(computedDuration)}
                            className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums text-slate-900 focus:outline-none focus:border-teal-700"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {errors.attendees && (
              <p className="mt-1.5 text-xs text-red-600">{errors.attendees}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-teal-700 text-xs font-medium text-white hover:bg-teal-800 transition-colors"
            >
              {editingSession ? 'ذخیره تغییرات جلسه' : 'ثبت نهایی جلسه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
