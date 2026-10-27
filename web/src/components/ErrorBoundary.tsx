import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  private handleSafeModeBoot = () => {
    try {
      sessionStorage.setItem('javaneh_force_safe_offline_mode', 'true');
    } catch {}
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9F5] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl border border-rose-100 p-6 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">خطا در بارگذاری برنامه</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                اطلاعات شما در پایگاه داده امن محلی حفظ شده است. می‌توانید صفحه را مجدداً بارگذاری کنید یا برنامه را در «حالت آفلاین امن» اجرا نمایید.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={this.handleSafeModeBoot}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>🌱 اجرای مستقیم در حالت آفلاین امن</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بارگذاری مجدد صفحه</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
