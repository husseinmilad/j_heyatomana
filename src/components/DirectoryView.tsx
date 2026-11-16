import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import {
  CommitteeId,
  Representative,
  Trustee,
} from '../types';
import { COMMITTEES, getEffectiveTrusteeId } from '../utils/analytics';
import { toPersianDigits } from '../utils/jalali';

interface DirectoryViewProps {
  trustees: Trustee[];
  representatives: Representative[];
  onAddTrustee: (data: Omit<Trustee, 'id'>) => void;
  onUpdateTrustee: (trustee: Trustee) => void;
  onDeleteTrustee: (id: string) => void;
  onAddRepresentative: (data: Omit<Representative, 'id'>) => void;
  onUpdateRepresentative: (rep: Representative) => void;
  onDeleteRepresentative: (id: string) => void;
  isReadOnlyShared?: boolean;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  trustees,
  representatives,
  onAddTrustee,
  onUpdateTrustee,
  onDeleteTrustee,
  onAddRepresentative,
  onUpdateRepresentative,
  onDeleteRepresentative,
  isReadOnlyShared = false,
}) => {
  // Trustee form state
  const [editingTrusteeId, setEditingTrusteeId] = useState<string | null>(null);
  const [trusteeName, setTrusteeName] = useState('');
  const [trusteePosition, setTrusteePosition] = useState('');
  const [trusteeError, setTrusteeError] = useState('');

  // Representative form state
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [repName, setRepName] = useState('');
  const [repRole, setRepRole] = useState('');
  const [repTrusteeId, setRepTrusteeId] = useState<string>(trustees[0]?.id ?? '');
  const [repCommittees, setRepCommittees] = useState<CommitteeId[]>([
    'audit-budget',
  ]);
  const [repError, setRepError] = useState('');

  const trusteeMap = new Map(trustees.map((t) => [t.id, t]));

  const handleSaveTrustee = (e: React.FormEvent) => {
    e.preventDefault();
    if (trusteeName.trim().length < 2) {
      setTrusteeError('نام عضو هیئت‌امنا را وارد کنید.');
      return;
    }
    setTrusteeError('');
    if (editingTrusteeId) {
      onUpdateTrustee({
        id: editingTrusteeId,
        fullName: trusteeName.trim(),
        position: trusteePosition.trim(),
      });
      setEditingTrusteeId(null);
    } else {
      onAddTrustee({
        fullName: trusteeName.trim(),
        position: trusteePosition.trim(),
      });
    }
    setTrusteeName('');
    setTrusteePosition('');
  };

  const startEditTrustee = (t: Trustee) => {
    setEditingTrusteeId(t.id);
    setTrusteeName(t.fullName);
    setTrusteePosition(t.position);
    setTrusteeError('');
  };

  const toggleRepCommittee = (cid: CommitteeId) => {
    setRepCommittees((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
    );
  };

  const handleSaveRep = (e: React.FormEvent) => {
    e.preventDefault();
    if (repName.trim().length < 2) {
      setRepError('نام نماینده را وارد کنید.');
      return;
    }
    setRepError('');
    if (editingRepId) {
      onUpdateRepresentative({
        id: editingRepId,
        fullName: repName.trim(),
        roleTitle: repRole.trim(),
        trusteeId: repTrusteeId,
        committeeIds: repCommittees,
      });
      setEditingRepId(null);
    } else {
      onAddRepresentative({
        fullName: repName.trim(),
        roleTitle: repRole.trim(),
        trusteeId: repTrusteeId,
        committeeIds: repCommittees,
      });
    }
    setRepName('');
    setRepRole('');
    setRepCommittees(['audit-budget']);
  };

  const startEditRep = (r: Representative) => {
    setEditingRepId(r.id);
    setRepName(r.fullName);
    setRepRole(r.roleTitle);
    setRepTrusteeId(r.trusteeId);
    setRepCommittees(r.committeeIds);
    setRepError('');
  };

  return (
    <div className="space-y-6">
      {/* 4 Committees Overview */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          کارگروه‌های تخصصی و نمایندگان منصوب
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMITTEES.map((committee) => {
            const members = representatives.filter((r) =>
              r.committeeIds.includes(committee.id)
            );
            return (
              <div
                key={committee.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      className="text-sm font-bold"
                      style={{ color: committee.accentColor }}
                    >
                      {committee.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {committee.description}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                    {toPersianDigits(members.length)} نماینده
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      هنوز نماینده‌ای در این کارگروه ثبت نشده است.
                    </p>
                  ) : (
                    members.map((rep) => {
                      const effTrusteeId = getEffectiveTrusteeId(
                        rep,
                        committee.id
                      );
                      const trustee = effTrusteeId
                        ? trusteeMap.get(effTrusteeId)
                        : undefined;
                      return (
                        <div
                          key={rep.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-medium text-slate-900">
                            {rep.fullName}
                          </span>
                          <span className="text-slate-500">
                            {trustee
                              ? `نماینده ${trustee.fullName}`
                              : rep.roleTitle || 'مستقل / هماهنگ‌کننده'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Representatives & Trustees Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Trustees Column */}
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              اعضای هیئت‌امنا ({toPersianDigits(trustees.length)})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              اسامی اعضای هیئت‌امنا و جایگاه سازمانی
            </p>
          </div>

          {!isReadOnlyShared && (
            <form
              onSubmit={handleSaveTrustee}
              className="p-4 bg-slate-50/60 border-b border-slate-200 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="trustee-name-input"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    نام و نام خانوادگی
                  </label>
                  <input
                    id="trustee-name-input"
                    type="text"
                    value={trusteeName}
                    onChange={(e) => setTrusteeName(e.target.value)}
                    placeholder="مثال: دکتر حمید رضایی"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="trustee-pos-input"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    عنوان / مسئولیت
                  </label>
                  <input
                    id="trustee-pos-input"
                    type="text"
                    value={trusteePosition}
                    onChange={(e) => setTrusteePosition(e.target.value)}
                    placeholder="عضو هیئت‌امنا"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>
              {trusteeError && (
                <p className="text-xs text-red-600">{trusteeError}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {editingTrusteeId ? 'به‌روزرسانی عضو' : 'افزودن عضو هیئت‌امنا'}
                </button>
                {editingTrusteeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTrusteeId(null);
                      setTrusteeName('');
                      setTrusteePosition('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200"
                  >
                    انصراف
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {trustees.map((t) => {
              const repCount = representatives.filter(
                (r) => r.trusteeId === t.id
              ).length;
              return (
                <div
                  key={t.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {t.fullName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {t.position || 'عضو هیئت‌امنا'} ·{' '}
                      {toPersianDigits(repCount)} نماینده
                    </p>
                  </div>
                  {!isReadOnlyShared && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditTrustee(t)}
                        aria-label={`ویرایش ${t.fullName}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTrustee(t.id)}
                        disabled={repCount > 0}
                        title={
                          repCount > 0
                            ? 'ابتدا نمایندگان این عضو را ویرایش یا حذف کنید'
                            : 'حذف عضو هیئت‌امنا'
                        }
                        aria-label={`حذف ${t.fullName}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Representatives Column */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              نمایندگان کارگروه‌ها ({toPersianDigits(representatives.length)})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تعیین نماینده، کارگروه‌های عضویت و انتساب به عضو هیئت‌امنا
            </p>
          </div>

          {!isReadOnlyShared && (
            <form
              onSubmit={handleSaveRep}
              className="p-4 bg-slate-50/60 border-b border-slate-200 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="rep-name-input"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    نام و نام خانوادگی نماینده
                  </label>
                  <input
                    id="rep-name-input"
                    type="text"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="مثال: آرش محمدی"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="rep-role-input"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    سمت / تخصص
                  </label>
                  <input
                    id="rep-role-input"
                    type="text"
                    value={repRole}
                    onChange={(e) => setRepRole(e.target.value)}
                    placeholder="کارشناس ارشد مالی"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="rep-trustee-select"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    نماینده کدام عضو هیئت‌امنا؟
                  </label>
                  <select
                    id="rep-trustee-select"
                    value={repTrusteeId}
                    onChange={(e) => setRepTrusteeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  >
                    <option value="">بدون انتساب</option>
                    {trustees.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-600 mb-1.5">
                  عضویت در کارگروه‌ها:
                </span>
                <div className="flex flex-wrap gap-2">
                  {COMMITTEES.map((c) => {
                    const active = repCommittees.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleRepCommittee(c.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {repError && <p className="text-xs text-red-600">{repError}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {editingRepId ? 'به‌روزرسانی نماینده' : 'افزودن نماینده جدید'}
                </button>
                {editingRepId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRepId(null);
                      setRepName('');
                      setRepRole('');
                      setRepCommittees(['audit-budget']);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200"
                  >
                    انصراف
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-2.5 px-4">نماینده</th>
                  <th className="py-2.5 px-4">عضو هیئت‌امنای متبوع</th>
                  <th className="py-2.5 px-4">کارگروه‌ها</th>
                  {!isReadOnlyShared && (
                    <th className="py-2.5 px-4 text-left">عملیات</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {representatives.map((rep) => {
                  const trustee = trusteeMap.get(rep.trusteeId);
                  return (
                    <tr
                      key={rep.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {rep.fullName}
                        </span>
                        {rep.roleTitle && (
                          <span className="text-xs text-slate-500">
                            {rep.roleTitle}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-800">
                        {rep.committeeTrusteeOverrides
                          ? 'سیفی (تلفیق) · بیات (بیمه و اکچوئری)'
                          : trustee?.fullName ?? 'بدون انتساب'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {rep.committeeIds
                          .map(
                            (cid) =>
                              COMMITTEES.find((c) => c.id === cid)?.name ?? cid
                          )
                          .join(' · ') || 'ثبت‌نشده در فایل'}
                      </td>
                      {!isReadOnlyShared && (
                        <td className="py-3 px-4 text-left whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditRep(rep)}
                              aria-label={`ویرایش ${rep.fullName}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRepresentative(rep.id)}
                              aria-label={`حذف ${rep.fullName}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
