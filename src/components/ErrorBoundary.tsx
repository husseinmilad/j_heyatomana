import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'خطای ناشناخته';
    return { hasError: true, errorMessage: message };
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocalData = () => {
    try {
      localStorage.removeItem('kargoroh_dashboard_db_v2');
    } catch {
      // Ignore storage errors
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      window.location.href = url.toString();
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          lang="fa"
          className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h1 className="text-lg font-bold text-slate-900">
              خطا در اجرای برنامه
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              متاسفانه مشکلی در بارگذاری اطلاعات رخ داده است. می‌توانید صفحه را
              بازنشانی کنید یا داده‌های ذخیره‌شده محلی را به حالت اولیه برگردانید.
            </p>
            {this.state.errorMessage && (
              <pre
                dir="ltr"
                className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700 overflow-x-auto"
              >
                {this.state.errorMessage}
              </pre>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 transition-colors"
              >
                بارگذاری مجدد صفحه
              </button>
              <button
                type="button"
                onClick={this.handleResetLocalData}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                بازنشانی داده‌های محلی
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
