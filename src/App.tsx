import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  FolderSync,
  LayoutDashboard,
  Menu,
  Plus,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { DashboardView } from './components/DashboardView';
import { DirectoryView } from './components/DirectoryView';
import { DEFAULT_FILTERS } from './components/FilterBar';
import { ReportsView } from './components/ReportsView';
import { SessionFormModal } from './components/SessionFormModal';
import { SessionsView } from './components/SessionsView';
import { ShareAndPdfModal } from './components/ShareAndPdfModal';
import { INITIAL_SEED_STATE } from './data/seedData';
import {
  ActiveTab,
  AppDatabaseState,
  FilterState,
  MeetingSession,
  Representative,
  Trustee,
} from './types';
import {
  computeCommitteeStats,
  computeMonthlyTrend,
  computeRepresentativeStats,
  computeTrusteeStats,
  decodeSharePayload,
  loadSavedCommittees,
  persistCommittees,
  replaceCommittees,
  filterSessions,
  parseAndValidateBackup,
} from './utils/analytics';
import { exportToExcel } from './utils/exporters';
import { formatJalaliWithWeekday, getTodayJalali, toPersianDigits } from './utils/jalali';

const STORAGE_KEY = 'kargoroh_dashboard_db_v2';

function getAppStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  return window.desktopStorage ?? window.localStorage;
}

function loadInitialState(): {
  db: AppDatabaseState;
  isSharedMode: boolean;
} {
  loadSavedCommittees();
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const sharedParam = params.get('share');
    if (sharedParam) {
      const decoded = decodeSharePayload(sharedParam);
      if (decoded) {
        if (decoded.committees?.length) replaceCommittees(decoded.committees);
        return { db: decoded, isSharedMode: true };
      }
    }

    try {
      const saved = getAppStorage().getItem(STORAGE_KEY);
      if (saved) {
        const validated = parseAndValidateBackup(saved);
        if (validated.ok) {
          if (validated.data.committees?.length) persistCommittees(validated.data.committees);
          return {
            db: {
              committees: validated.data.committees,
              trustees: validated.data.trustees,
              representatives: validated.data.representatives,
              sessions: validated.data.sessions,
            },
            isSharedMode: false,
          };
        }
      }
    } catch {
      // Fallback to seed data
    }
  }

  return { db: INITIAL_SEED_STATE, isSharedMode: false };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);
  const [db, setDb] = useState<AppDatabaseState>(initial.db);
  const [isSharedMode, setIsSharedMode] = useState<boolean>(
    initial.isSharedMode
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<MeetingSession | null>(
    null
  );
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  // Subtle toast banner
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  useEffect(() => {
    if (isSharedMode) return;
    try {
      getAppStorage().setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore storage quota errors
    }
  }, [db, isSharedMode]);

  const filteredSessions = useMemo(
    () => filterSessions(db.sessions, filters, db.representatives),
    [db.sessions, filters, db.representatives]
  );

  const repStats = useMemo(
    () =>
      computeRepresentativeStats(
        filteredSessions,
        db.representatives,
        db.trustees
      ),
    [filteredSessions, db.representatives, db.trustees]
  );

  const trusteeStats = useMemo(
    () =>
      computeTrusteeStats(filteredSessions, db.trustees, db.representatives),
    [filteredSessions, db.trustees, db.representatives]
  );

  const committeeStats = useMemo(
    () => computeCommitteeStats(filteredSessions),
    [filteredSessions]
  );

  const monthlyTrend = useMemo(
    () => computeMonthlyTrend(filteredSessions),
    [filteredSessions]
  );

  // Session CRUD
  const handleSaveSession = (
    data: Omit<MeetingSession, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      setDb((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === existingId ? { ...s, ...data } : s
        ),
      }));
      showToast('تغییرات جلسه با موفقیت ذخیره شد.');
    } else {
      const newSession: MeetingSession = {
        ...data,
        id: `ses-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setDb((prev) => ({
        ...prev,
        sessions: [newSession, ...prev.sessions],
      }));
      showToast('جلسه جدید در تقویم شمسی ثبت شد.');
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setDb((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== sessionId),
    }));
    showToast('جلسه از فهرست حذف شد.');
  };

  // Trustee CRUD
  const handleAddTrustee = (data: Omit<Trustee, 'id'>) => {
    const newTrustee: Trustee = { ...data, id: `tr-${Date.now()}` };
    setDb((prev) => ({ ...prev, trustees: [...prev.trustees, newTrustee] }));
    showToast('عضو هیئت‌امنای جدید اضافه شد.');
  };

  const handleUpdateTrustee = (updated: Trustee) => {
    setDb((prev) => ({
      ...prev,
      trustees: prev.trustees.map((t) => (t.id === updated.id ? updated : t)),
    }));
    showToast('اطلاعات عضو هیئت‌امنا به‌روزرسانی شد.');
  };

  const handleDeleteTrustee = (id: string) => {
    setDb((prev) => ({
      ...prev,
      trustees: prev.trustees.filter((t) => t.id !== id),
    }));
    showToast('عضو هیئت‌امنا حذف شد.');
  };

  // Representative CRUD
  const handleAddRepresentative = (data: Omit<Representative, 'id'>) => {
    const newRep: Representative = { ...data, id: `rep-${Date.now()}` };
    setDb((prev) => ({
      ...prev,
      representatives: [...prev.representatives, newRep],
    }));
    showToast('نماینده جدید اضافه شد.');
  };

  const handleUpdateRepresentative = (updated: Representative) => {
    setDb((prev) => ({
      ...prev,
      representatives: prev.representatives.map((r) =>
        r.id === updated.id ? updated : r
      ),
    }));
    showToast('اطلاعات نماینده به‌روزرسانی شد.');
  };

  const handleDeleteRepresentative = (id: string) => {
    setDb((prev) => ({
      ...prev,
      representatives: prev.representatives.filter((r) => r.id !== id),
    }));
    showToast('نماینده حذف شد.');
  };

  // Backup & Restore
  const handleRestoreReplace = (data: AppDatabaseState) => {
    if (data.committees?.length) persistCommittees(data.committees);
    setDb(data);
    showToast('داده‌های فایل پشتیبان جایگزین شد.');
  };

  const handleRestoreMerge = (data: AppDatabaseState) => {
    setDb((prev) => {
      const mergeById = <T extends { id: string }>(
        current: T[],
        incoming: T[]
      ): T[] => {
        const map = new Map(current.map((item) => [item.id, item]));
        for (const item of incoming) {
          map.set(item.id, item);
        }
        return Array.from(map.values());
      };

      return {
        trustees: mergeById(prev.trustees, data.trustees),
        representatives: mergeById(prev.representatives, data.representatives),
        sessions: mergeById(prev.sessions, data.sessions),
      };
    });
    showToast('داده‌های فایل با اطلاعات فعلی ادغام شد.');
  };

  const handleResetToSeed = () => {
    setDb(INITIAL_SEED_STATE);
    setFilters(DEFAULT_FILTERS);
    showToast('داده‌ها به حالت نمونه اولیه بازگردانی شد.');
  };

  const handleExportExcel = () => {
    const filename = exportToExcel({
      sessions: filteredSessions,
      representatives: db.representatives,
      trustees: db.trustees,
      repStats,
      trusteeStats,
      committeeStats,
    });
    showToast(`فایل اکسل ${filename} صادر شد.`);
  };

  const handleExitSharedMode = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore history restriction in sandboxed or file origins
    }
    const reloaded = loadInitialState();
    setDb(reloaded.db);
    setIsSharedMode(false);
    showToast('به فضای کاری لوکال خود بازگشتید.');
  };

  const todayFormatted = formatJalaliWithWeekday(getTodayJalali().formatted);

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'dashboard',
      label: 'داشبورد مدیریتی',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'sessions',
      label: 'ثبت و لیست جلسات',
      icon: <CalendarDays className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'reports',
      label: 'گزارش تفکیکی حضور',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'directory',
      label: 'اعضا و کارگروه‌ها',
      icon: <Users className="w-4 h-4 shrink-0" />,
    },
  ];

  const activeTitle =
    navItems.find((n) => n.id === activeTab)?.label ?? 'داشبورد مدیریتی';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (RTL Right Side) */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-l border-slate-200 bg-white">
        <div className="h-16 px-5 flex items-center border-b border-slate-200">
          <span className="text-base font-extrabold text-slate-900 whitespace-nowrap">
            مدیریت کارگروه‌ها
          </span>
        </div>

        <nav
          aria-label="منوی اصلی سامانه"
          className="flex-1 p-3.5 space-y-1 overflow-y-auto"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2.5">
          <div className="text-xs text-slate-500 space-y-0.5 tabular-nums">
            <p className="font-medium text-slate-700">آفلاین · ذخیره لوکال و فایلی</p>
            <p>
              {toPersianDigits(db.sessions.length)} جلسه ·{' '}
              {toPersianDigits(db.representatives.length)} نماینده
            </p>
          </div>
          {!isSharedMode && (
            <button
              type="button"
              onClick={() => setBackupModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <FolderSync className="w-4 h-4 text-teal-700 shrink-0" />
              ذخیره و بازیابی فایلی
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[82vw] bg-white h-full flex flex-col border-l border-slate-200 shadow-xl">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-extrabold text-slate-900">
                مدیریت کارگروه‌ها
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="بستن منو"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium whitespace-nowrap ${
                      isActive
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleExportExcel();
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                خروجی اکسل
              </button>
              {!isSharedMode && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setBackupModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
                >
                  <FolderSync className="w-4 h-4 text-teal-700" />
                  ذخیره و بازیابی فایلی
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="no-print sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="باز کردن منوی ناوبری"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">
                {activeTitle}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-500 tabular-nums">
                {todayFormatted}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              خروجی اکسل
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              aria-label="گزارش PDF و اشتراک‌گذاری"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4 text-slate-700" />
              <span className="hidden sm:inline">گزارش PDF و اشتراک‌گذاری</span>
            </button>

            {!isSharedMode && (
              <button
                type="button"
                onClick={() => {
                  setEditingSession(null);
                  setSessionModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 sm:px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت جلسه</span>
                <span className="hidden sm:inline">جدید</span>
              </button>
            )}
          </div>
        </header>

        {/* Shared Read-Only Banner */}
        {isSharedMode && (
          <div className="no-print bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
            <span>
              شما در حال مشاهده یک گزارش اشتراک‌گذاری‌شده (فقط خواندنی) هستید.
            </span>
            <button
              type="button"
              onClick={handleExitSharedMode}
              className="rounded-md bg-amber-900 px-3 py-1 text-white font-medium hover:bg-amber-800 transition-colors"
            >
              بازگشت به فضای کاری لوکال
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="no-print flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              sessions={filteredSessions}
              trustees={db.trustees}
              representatives={db.representatives}
              repStats={repStats}
              trusteeStats={trusteeStats}
              committeeStats={committeeStats}
              monthlyTrend={monthlyTrend}
              filters={filters}
              onFiltersChange={setFilters}
              onNavigate={setActiveTab}
              onOpenNewSession={() => {
                setEditingSession(null);
                setSessionModalOpen(true);
              }}
              onEditSession={(session) => {
                setEditingSession(session);
                setSessionModalOpen(true);
              }}
              isReadOnlyShared={isSharedMode}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsView
              sessions={filteredSessions}
              trustees={db.trustees}
              representatives={db.representatives}
              filters={filters}
              onFiltersChange={setFilters}
              onOpenNewSession={() => {
                setEditingSession(null);
                setSessionModalOpen(true);
              }}
              onEditSession={(session) => {
                setEditingSession(session);
                setSessionModalOpen(true);
              }}
              onDeleteSession={handleDeleteSession}
              isReadOnlyShared={isSharedMode}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              repStats={repStats}
              trusteeStats={trusteeStats}
              committeeStats={committeeStats}
              trustees={db.trustees}
              representatives={db.representatives}
              filters={filters}
              onFiltersChange={setFilters}
              onExportExcel={handleExportExcel}
              onOpenSharePdf={() => setShareModalOpen(true)}
            />
          )}

          {activeTab === 'directory' && (
            <DirectoryView
              trustees={db.trustees}
              representatives={db.representatives}
              onAddTrustee={handleAddTrustee}
              onUpdateTrustee={handleUpdateTrustee}
              onDeleteTrustee={handleDeleteTrustee}
              onAddRepresentative={handleAddRepresentative}
              onUpdateRepresentative={handleUpdateRepresentative}
              onDeleteRepresentative={handleDeleteRepresentative}
              isReadOnlyShared={isSharedMode}
              onCommitteesChange={() => showToast('فهرست کارگروه‌ها ذخیره شد.')}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <SessionFormModal
        isOpen={sessionModalOpen}
        editingSession={editingSession}
        representatives={db.representatives}
        trustees={db.trustees}
        onClose={() => {
          setSessionModalOpen(false);
          setEditingSession(null);
        }}
        onSave={handleSaveSession}
      />

      <ShareAndPdfModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        sessions={filteredSessions}
        trustees={db.trustees}
        representatives={db.representatives}
        repStats={repStats}
        trusteeStats={trusteeStats}
        committeeStats={committeeStats}
        onExportExcel={handleExportExcel}
      />

      <BackupRestoreModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        currentState={db}
        onRestoreReplace={handleRestoreReplace}
        onRestoreMerge={handleRestoreMerge}
        onResetToSeed={handleResetToSeed}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
