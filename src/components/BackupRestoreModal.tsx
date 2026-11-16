import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { AppDatabaseBackup, AppDatabaseState } from '../types';
import { parseAndValidateBackup } from '../utils/analytics';
import { exportBackupJson } from '../utils/exporters';
import { toPersianDigits } from '../utils/jalali';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: AppDatabaseState;
  onRestoreReplace: (data: AppDatabaseState) => void;
  onRestoreMerge: (data: AppDatabaseState) => void;
  onResetToSeed: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onRestoreReplace,
  onRestoreMerge,
  onResetToSeed,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedBackup, setParsedBackup] = useState<AppDatabaseBackup | null>(
    null
  );
  const [fileError, setFileError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const filename = exportBackupJson(currentState);
    setStatusMessage(`فایل پشتیبان با نام ${filename} ذخیره شد.`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    setStatusMessage('');
    setParsedBackup(null);

    if (!file) return;

    try {
      const text = await file.text();
      const result = parseAndValidateBackup(text);
      if (result.ok === false) {
        setFileError(result.error);
      } else {
        setParsedBackup(result.data);
      }
    } catch {
      setFileError('خطا در خواندن فایل انتخاب‌شده.');
    }

    // Reset input so selecting the same file again triggers onChange
    e.target.value = '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2
              id="backup-modal-title"
              className="text-base font-bold text-slate-900"
            >
              ذخیره فایلی و بازیابی اطلاعات (لوکال)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              پشتیبان‌گیری آفلاین در قالب فایل JSON و بازیابی کامل در هر سیستم
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره پشتیبان‌گیری"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {statusMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Save to file */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  ذخیره فایل پشتیبان (Export)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed tabular-nums">
                  داده‌های فعلی شامل {toPersianDigits(currentState.sessions.length)}{' '}
                  جلسه، {toPersianDigits(currentState.representatives.length)}{' '}
                  نماینده و {toPersianDigits(currentState.trustees.length)} عضو
                  هیئت‌امنا در یک فایل JSON روی سیستم شما ذخیره می‌شود.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                دانلود فایل پشتیبان
              </button>
            </div>
          </div>

          {/* Restore from file */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  بازیابی از فایل پشتیبان (Import)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  فایل JSON ذخیره‌شده قبلی را انتخاب کنید تا اطلاعات بررسی و بازیابی شود.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                aria-label="انتخاب فایل پشتیبان JSON"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-4 h-4" />
                انتخاب فایل JSON
              </button>
            </div>

            {fileError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {parsedBackup && (
              <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 space-y-3">
                <div className="text-xs text-slate-700 space-y-1 tabular-nums">
                  <p className="font-semibold text-teal-900">
                    فایل پشتیبان معتبر است و آماده بازیابی می‌باشد:
                  </p>
                  <p>
                    • تعداد جلسات: {toPersianDigits(parsedBackup.sessions.length)}{' '}
                    · نمایندگان: {toPersianDigits(parsedBackup.representatives.length)}{' '}
                    · اعضای هیئت‌امنا: {toPersianDigits(parsedBackup.trustees.length)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreReplace({
                        trustees: parsedBackup.trustees,
                        representatives: parsedBackup.representatives,
                        sessions: parsedBackup.sessions,
                      });
                      setParsedBackup(null);
                      setStatusMessage('اطلاعات با موفقیت به طور کامل جایگزین و بازیابی شد.');
                    }}
                    className="rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 transition-colors"
                  >
                    جایگزینی کامل با داده‌های فایل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreMerge({
                        trustees: parsedBackup.trustees,
                        representatives: parsedBackup.representatives,
                        sessions: parsedBackup.sessions,
                      });
                      setParsedBackup(null);
                      setStatusMessage('اطلاعات جدید فایل با داده‌های فعلی ادغام شد.');
                    }}
                    className="rounded-lg border border-teal-700 bg-white px-3.5 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50 transition-colors"
                  >
                    ادغام با داده‌های فعلی
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset to initial sample data */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              بازنشانی به داده‌های نمونه اولیه سامانه
            </span>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetToSeed();
                    setConfirmReset(false);
                    setStatusMessage('داده‌ها به حالت اولیه بازنشانی شد.');
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  تایید بازنشانی
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
                >
                  انصراف
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                بازنشانی داده‌های نمونه
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
