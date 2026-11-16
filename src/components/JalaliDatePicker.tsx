import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  formatJalaliDate,
  getJalaliDayOfWeek,
  getJalaliMonthDays,
  getTodayJalali,
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  parseJalaliDate,
  toEnglishDigits,
  toPersianDigits,
} from '../utils/jalali';

interface JalaliDatePickerProps {
  id?: string;
  label?: string;
  value: string; // YYYY/MM/DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean;
  error?: string;
  compact?: boolean;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = '۱۴۰۵/۰۸/۲۵',
  clearable = false,
  error,
  compact = false,
}) => {
  const today = getTodayJalali();
  const parsed = value ? parseJalaliDate(value) : null;

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(parsed?.jy ?? today.jy);
  const [viewMonth, setViewMonth] = useState<number>(parsed?.jm ?? today.jm);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.jy);
      setViewMonth(parsed.jm);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    onChange(formatJalaliDate(viewYear, viewMonth, day));
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value);
    onChange(raw);
    const p = parseJalaliDate(raw);
    if (p) {
      setViewYear(p.jy);
      setViewMonth(p.jm);
    }
  };

  const daysInMonth = getJalaliMonthDays(viewYear, viewMonth);
  const firstDayWeekday = getJalaliDayOfWeek(viewYear, viewMonth, 1); // 0=Sat .. 6=Fri
  const cells: Array<number | null> = [
    ...Array(firstDayWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-slate-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          dir="ltr"
          value={toPersianDigits(value)}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          aria-label={label || placeholder}
          className={`w-full rounded-lg border bg-white text-right pr-9 ${
            clearable && value ? 'pl-8' : 'pl-3'
          } ${
            compact ? 'py-1.5 text-xs' : 'py-2 text-sm'
          } tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors ${
            error ? 'border-red-500' : 'border-slate-200'
          }`}
        />
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          aria-label="باز کردن تقویم شمسی"
          className="absolute right-2.5 text-slate-500 hover:text-teal-700 p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <Calendar className="w-4 h-4" />
        </button>
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="پاک کردن تاریخ"
            className="absolute left-2 text-slate-400 hover:text-slate-700 p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {isOpen && (
        <div
          role="dialog"
          aria-label="انتخابگر تاریخ شمسی"
          className="absolute z-50 mt-1.5 right-0 w-72 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="ماه قبل"
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="انتخاب ماه شمسی"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-teal-700"
              >
                {JALALI_MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                aria-label="انتخاب سال شمسی"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 tabular-nums focus:outline-none focus:border-teal-700"
              >
                {Array.from({ length: 15 }, (_, i) => today.jy - 7 + i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {toPersianDigits(y)}
                    </option>
                  )
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="ماه بعد"
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 pt-2.5 pb-1 text-center">
            {JALALI_WEEKDAYS_SHORT.map((day, i) => (
              <span
                key={day}
                className={`text-[11px] font-semibold ${
                  i === 6 ? 'text-red-600' : 'text-slate-500'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }
              const isSelected =
                parsed?.jy === viewYear &&
                parsed?.jm === viewMonth &&
                parsed?.jd === day;
              const isToday =
                today.jy === viewYear &&
                today.jm === viewMonth &&
                today.jd === day;
              const isFriday = idx % 7 === 6;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-full rounded-lg text-xs font-medium tabular-nums transition-colors flex items-center justify-center ${
                    isSelected
                      ? 'bg-teal-700 text-white font-semibold'
                      : isToday
                        ? 'bg-teal-50 text-teal-800 border border-teal-200 font-semibold'
                        : isFriday
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setViewYear(today.jy);
                setViewMonth(today.jm);
                onChange(today.formatted);
                setIsOpen(false);
              }}
              className="text-xs font-medium text-teal-700 hover:text-teal-900 px-2 py-1 rounded hover:bg-teal-50 transition-colors"
            >
              امروز ({toPersianDigits(today.formatted)})
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
