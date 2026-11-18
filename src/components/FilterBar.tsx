import React from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import {
  Committee,
  CommitteeId,
  FilterState,
  Representative,
  Trustee,
} from '../types';
import { COMMITTEES } from '../utils/analytics';
import { JalaliDatePicker } from './JalaliDatePicker';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  trustees: Trustee[];
  representatives: Representative[];
  committees?: Committee[];
  scopeLabel?: string;
}

export const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  searchMode: 'all',
  searchField: 'all',
  committeeId: 'all',
  committeeCategory: 'all',
  trusteeId: 'all',
  representativeId: 'all',
  dateFrom: '',
  dateTo: '',
  startTimeFrom: '',
  startTimeTo: '',
  minDuration: '',
  maxDuration: '',
  minAttendees: '',
  maxAttendees: '',
  attachmentStatus: 'all',
};

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  trustees,
  representatives,
  committees = COMMITTEES,
  scopeLabel = 'جلسات',
}) => {
  const patch = (values: Partial<FilterState>) => onChange({ ...DEFAULT_FILTERS, ...filters, ...values });
  const normalized = { ...DEFAULT_FILTERS, ...filters };
  const hasActiveFilters = Object.entries(normalized).some(([key, value]) => {
    const defaultValue = DEFAULT_FILTERS[key as keyof FilterState];
    return value !== defaultValue && value !== '' && value !== undefined;
  });

  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15';
  const labelClass = 'mb-1 block text-[11px] font-medium text-slate-600';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3" aria-label={`جستجو و فیلتر ${scopeLabel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-teal-50 p-2 text-teal-700"><Search className="h-4 w-4" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">جستجو و فیلتر هوشمند {scopeLabel}</h3>
            <p className="text-[11px] text-slate-500">جستجوی چندعبارتی، دقیق و ترکیبی؛ همه فیلترها هم‌زمان اعمال می‌شوند.</p>
          </div>
        </div>
        {hasActiveFilters && <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"><RotateCcw className="h-3.5 w-3.5" />پاک‌کردن فیلترها</button>}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-6">
          <label htmlFor="filter-search" className={labelClass}>عبارت جستجو</label>
          <div className="relative">
            <input id="filter-search" type="search" autoComplete="off" value={normalized.searchQuery} onChange={(e) => patch({ searchQuery: e.target.value })} placeholder="مثلاً: بودجه ۱۴۰۵، نام نماینده، شماره نامه..." className={`${inputClass} pr-9`} />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="filter-search-mode" className={labelClass}>روش تطبیق عبارت</label>
          <select id="filter-search-mode" value={normalized.searchMode} onChange={(e) => patch({ searchMode: e.target.value as FilterState['searchMode'] })} className={inputClass}>
            <option value="all">تمام واژه‌ها (AND)</option><option value="any">حداقل یکی از واژه‌ها (OR)</option><option value="exact">عبارت دقیق</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="filter-search-field" className={labelClass}>جستجو در کدام اطلاعات؟</label>
          <select id="filter-search-field" value={normalized.searchField} onChange={(e) => patch({ searchField: e.target.value as FilterState['searchField'] })} className={inputClass}>
            <option value="all">تمام فیلدها</option><option value="topic">موضوع جلسه</option><option value="summary">متن گزارش</option><option value="people">اعضا و نمایندگان</option><option value="committee">کارگروه / نوع جلسه</option><option value="letter">شماره نامه</option><option value="attachment">نام پیوست</option><option value="date">تاریخ</option><option value="time">ساعت برگزاری</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><label htmlFor="filter-committee" className={labelClass}>کارگروه / کمیته / نشست</label><select id="filter-committee" value={normalized.committeeId} onChange={(e) => patch({ committeeId: e.target.value as CommitteeId | 'all' })} className={inputClass}><option value="all">همه موارد</option>{committees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label htmlFor="filter-category" className={labelClass}>دسته‌بندی جلسه</label><select id="filter-category" value={normalized.committeeCategory} onChange={(e) => patch({ committeeCategory: e.target.value as FilterState['committeeCategory'] })} className={inputClass}><option value="all">همه دسته‌ها</option><option value="کارگروه">کارگروه</option><option value="کمیته">کمیته</option><option value="نشست">نشست</option></select></div>
        <div><label htmlFor="filter-trustee" className={labelClass}>عضو هیئت‌امنا</label><select id="filter-trustee" value={normalized.trusteeId} onChange={(e) => patch({ trusteeId: e.target.value })} className={inputClass}><option value="all">همه اعضا</option>{trustees.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select></div>
        <div><label htmlFor="filter-rep" className={labelClass}>نماینده حاضر</label><select id="filter-rep" value={normalized.representativeId} onChange={(e) => patch({ representativeId: e.target.value })} className={inputClass}><option value="all">همه نمایندگان</option>{representatives.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}</select></div>
        <div><JalaliDatePicker id="filter-date-from" label="از تاریخ شمسی" value={normalized.dateFrom} onChange={(val) => patch({ dateFrom: val })} placeholder="۱۴۰۵/۰۱/۰۱" clearable compact /></div>
        <div><JalaliDatePicker id="filter-date-to" label="تا تاریخ شمسی" value={normalized.dateTo} onChange={(val) => patch({ dateTo: val })} placeholder="۱۴۰۵/۱۲/۲۹" clearable compact /></div>
      </div>

      <details className="group rounded-lg border border-slate-100 bg-slate-50/70">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700"><SlidersHorizontal className="h-4 w-4 text-teal-700" />فیلترهای تکمیلی <span className="text-[10px] font-normal text-slate-400">ساعت، مدت جلسه، تعداد حاضران و پیوست</span></summary>
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label htmlFor="filter-time-from" className={labelClass}>ساعت شروع از</label><input id="filter-time-from" type="time" value={normalized.startTimeFrom} onChange={(e) => patch({ startTimeFrom: e.target.value })} className={inputClass} /></div>
          <div><label htmlFor="filter-time-to" className={labelClass}>ساعت شروع تا</label><input id="filter-time-to" type="time" value={normalized.startTimeTo} onChange={(e) => patch({ startTimeTo: e.target.value })} className={inputClass} /></div>
          <div><label htmlFor="filter-min-duration" className={labelClass}>حداقل مدت جلسه (دقیقه)</label><input id="filter-min-duration" type="number" min="0" value={normalized.minDuration} onChange={(e) => patch({ minDuration: e.target.value })} placeholder="مثلاً ۳۰" className={inputClass} /></div>
          <div><label htmlFor="filter-max-duration" className={labelClass}>حداکثر مدت جلسه (دقیقه)</label><input id="filter-max-duration" type="number" min="0" value={normalized.maxDuration} onChange={(e) => patch({ maxDuration: e.target.value })} placeholder="مثلاً ۱۸۰" className={inputClass} /></div>
          <div><label htmlFor="filter-min-attendees" className={labelClass}>حداقل تعداد نماینده حاضر</label><input id="filter-min-attendees" type="number" min="0" value={normalized.minAttendees} onChange={(e) => patch({ minAttendees: e.target.value })} className={inputClass} /></div>
          <div><label htmlFor="filter-max-attendees" className={labelClass}>حداکثر تعداد نماینده حاضر</label><input id="filter-max-attendees" type="number" min="0" value={normalized.maxAttendees} onChange={(e) => patch({ maxAttendees: e.target.value })} className={inputClass} /></div>
          <div><label htmlFor="filter-attachment" className={labelClass}>وضعیت پیوست</label><select id="filter-attachment" value={normalized.attachmentStatus} onChange={(e) => patch({ attachmentStatus: e.target.value as FilterState['attachmentStatus'] })} className={inputClass}><option value="all">با پیوست و بدون پیوست</option><option value="with">فقط دارای پیوست</option><option value="without">فقط بدون پیوست</option></select></div>
        </div>
      </details>
    </section>
  );
};
