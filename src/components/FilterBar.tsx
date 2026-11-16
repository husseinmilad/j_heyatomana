import React from 'react';
import { RotateCcw, Search } from 'lucide-react';
import {
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
}

export const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  committeeId: 'all',
  trusteeId: 'all',
  representativeId: 'all',
  dateFrom: '',
  dateTo: '',
};

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  trustees,
  representatives,
}) => {
  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.committeeId !== 'all' ||
    filters.trusteeId !== 'all' ||
    filters.representativeId !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {/* Search */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-search"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            جستجو در موضوع و گزارش
          </label>
          <div className="relative">
            <input
              id="filter-search"
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                onChange({ ...filters, searchQuery: e.target.value })
              }
              placeholder="جستجوی موضوع، تاریخ..."
              className="w-full rounded-lg border border-slate-200 bg-white pr-8 pl-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Committee */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-committee"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            کارگروه
          </label>
          <select
            id="filter-committee"
            value={filters.committeeId}
            onChange={(e) =>
              onChange({
                ...filters,
                committeeId: e.target.value as CommitteeId | 'all',
              })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
          >
            <option value="all">همه کارگروه‌ها</option>
            {COMMITTEES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Trustee */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-trustee"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            عضو هیئت‌امنا
          </label>
          <select
            id="filter-trustee"
            value={filters.trusteeId}
            onChange={(e) =>
              onChange({ ...filters, trusteeId: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
          >
            <option value="all">همه اعضای هیئت‌امنا</option>
            {trustees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Representative */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-rep"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            نماینده
          </label>
          <select
            id="filter-rep"
            value={filters.representativeId}
            onChange={(e) =>
              onChange({ ...filters, representativeId: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
          >
            <option value="all">همه نمایندگان</option>
            {representatives.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="lg:col-span-2 sm:col-span-1">
          <JalaliDatePicker
            id="filter-date-from"
            label="از تاریخ شمسی"
            value={filters.dateFrom}
            onChange={(val) => onChange({ ...filters, dateFrom: val })}
            placeholder="۱۴۰۵/۰۱/۰۱"
            clearable
            compact
          />
        </div>

        {/* Date To */}
        <div className="lg:col-span-2 sm:col-span-1">
          <JalaliDatePicker
            id="filter-date-to"
            label="تا تاریخ شمسی"
            value={filters.dateTo}
            onChange={(val) => onChange({ ...filters, dateTo: val })}
            placeholder="۱۴۰۵/۱۲/۲۹"
            clearable
            compact
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            پاک کردن همه فیلترها
          </button>
        </div>
      )}
    </div>
  );
};
