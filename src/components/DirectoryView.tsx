import React, { useState } from 'react';
import { Check, Pencil, Plus, Share2, Trash2, UserPlus } from 'lucide-react';
import {
  CommitteeId,
  Representative,
  Trustee,
} from '../types';
import { COMMITTEES, getEffectiveTrusteeId, persistCommittees } from '../utils/analytics';
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
  usedCommitteeIds?: string[];
  onCommitteesChange?: () => void;
  onOpenShare?: () => void;
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
  usedCommitteeIds = [],
  onCommitteesChange,
  onOpenShare,
}) => {
  // Trustee form state
  const [editingTrusteeId, setEditingTrusteeId] = useState<string | null>(null);
  const [trusteeName, setTrusteeName] = useState('');
  const [trusteePosition, setTrusteePosition] = useState('');
  const [trusteeError, setTrusteeError] = useState('');
  const [committeeName, setCommitteeName] = useState('');
  const [committeeDescription, setCommitteeDescription] = useState('');
  const [committeeCategory, setCommitteeCategory] = useState<'کارگروه' | 'کمیته' | 'نشست'>('کارگروه');
  const [editingCommitteeId, setEditingCommitteeId] = useState<string | null>(null);
  const [committeeError, setCommitteeError] = useState('');

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

  const saveCommittee = (e: React.FormEvent) => {
    e.preventDefault();
    if (committeeName.trim().length < 2) { setCommitteeError('نام کارگروه را وارد کنید.'); return; }
    const next = COMMITTEES.map((c) => c.id === editingCommitteeId
      ? { ...c, name: committeeName.trim(), description: committeeDescription.trim(), category: committeeCategory }
      : c);
    if (!editingCommitteeId) next.push({
      id: `committee-${Date.now()}`,
      name: committeeName.trim(),
      description: committeeDescription.trim(),
      accentColor: '#0F766E',
      category: committeeCategory,
    });
    persistCommittees(next);
    setCommitteeName(''); setCommitteeDescription(''); setCommitteeCategory('کارگروه'); setEditingCommitteeId(null); setCommitteeError('');
    onCommitteesChange?.();
  };

  const editCommittee = (committee: (typeof COMMITTEES)[number]) => {
    setEditingCommitteeId(committee.id); setCommitteeName(committee.name); setCommitteeDescription(committee.description); setCommitteeCategory(committee.category ?? 'کارگروه');
  };

  const deleteCommittee = (id: string) => {
    const usedByRepresentative = representatives.some((r) => r.committeeIds.includes(id));
    if (usedByRepresentative || usedCommitteeIds.includes(id)) { setCommitteeError('این کارگروه در سوابق نمایندگان یا جلسات استفاده شده است؛ ابتدا سوابق وابسته را اصلاح کنید.'); return; }
    if (!window.confirm('این کارگروه حذف شود؟')) return;
    persistCommittees(COMMITTEES.filter((c) => c.id !== id));
    onCommitteesChange?.();
  };

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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><div className="flex items-center gap-2"><h2 className="text-base font-semibold text-slate-900">کارگروه‌ها، کمیته‌ها و نشست‌ها</h2>{onOpenShare && <button type="button" onClick={onOpenShare} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"><Share2 className="w-3.5 h-3.5" /> گزارش و اشتراک‌گذاری این بخش</button>}</div>{!isReadOnlyShared && <form onSubmit={saveCommittee} className="flex flex-wrap gap-2"><select value={committeeCategory} onChange={(e) => setCommitteeCategory(e.target.value as 'کارگروه' | 'کمیته' | 'نشست')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"><option>کارگروه</option><option>کمیته</option><option>نشست</option></select><input value={committeeName} onChange={(e) => setCommitteeName(e.target.value)} placeholder="نام کارگروه / کمیته / نشست" className="rounded-lg border border-slate-200 px-3 py-2 text-xs" /><input value={committeeDescription} onChange={(e) => setCommitteeDescription(e.target.value)} placeholder="شرح حوزه فعالیت" className="rounded-lg border border-slate-200 px-3 py-2 text-xs" /><button className="rounded-lg bg-teal-700 px-3 py-2 text-xs text-white">{editingCommitteeId ? 'ذخیره ویرایش' : 'افزودن مورد'}</button>{editingCommitteeId && <button type="button" onClick={() => {setEditingCommitteeId(null);setCommitteeName('');setCommitteeDescription('');setCommitteeCategory('کارگروه');}} className="rounded-lg border px-3 py-2 text-xs">انصراف</button>}</form>}</div>{committeeError && <p className="mb-2 text-xs text-red-600">{committeeError}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMITTEES.map((committee) => {
            const isAdHoc = committee.category === 'کمیته' || committee.category === 'نشست';
            const members = isAdHoc ? [] : representatives.filter((r) => r.committeeIds.includes(committee.id));
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
                      {committee.category && committee.category !== 'کارگروه' ? `${committee.category} · ${committee.name}` : committee.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{committee.description}</p>
                  </div>
                  <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">{isAdHoc ? 'بدون اعضای ثابت' : `${toPersianDigits(members.length)} نماینده`}</span>{!isReadOnlyShared && <><button type="button" onClick={() => editCommittee(committee)} className="text-xs text-teal-700">ویرایش</button><button type="button" onClick={() => deleteCommittee(committee.id)} className="text-xs text-red-600">حذف</button></>}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {isAdHoc ? 'مدعوین و نمایندگان در زمان ثبت هر جلسه به‌صورت موردی انتخاب می‌شوند.' : 'هنوز نماینده‌ای در این کارگروه ثبت نشده است.'}
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
