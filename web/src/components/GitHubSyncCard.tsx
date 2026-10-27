import React, { useState, useEffect } from 'react';
import { 
  GitHubSyncConfig, 
  Category, 
  Goal, 
  AppTask, 
  Habit, 
  UserProfile, 
  ReminderSettings 
} from '../types';
import { 
  loadGitHubSyncConfig, 
  saveGitHubSyncConfig, 
  testGitHubConnection, 
  pushDatabaseToGitHub, 
  pullDatabaseFromGitHub,
  parseGitHubRepoInput,
  DEFAULT_GITHUB_SYNC_CONFIG
} from '../services/githubSyncService';
import { toPersianDigits, getCurrentPersianDateTimeString } from '../calendar/jalali';
import { APP_VERSION_INFO } from '../version';
import { 
  GitBranch, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Upload, 
  Download, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Key, 
  FolderGit2, 
  HelpCircle, 
  Save, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileCode,
  Terminal
} from 'lucide-react';

interface Props {
  categories: Category[];
  goals: Goal[];
  tasks: AppTask[];
  habits: Habit[];
  userProfile?: UserProfile;
  reminderSettings?: ReminderSettings;
  onImportAllData?: (
    data: {
      categories: Category[];
      goals: Goal[];
      tasks: AppTask[];
      habits: Habit[];
      userProfile?: UserProfile;
      reminderSettings?: ReminderSettings;
    },
    mode?: 'REPLACE' | 'MERGE'
  ) => void;
  className?: string;
}

export const GitHubSyncCard: React.FC<Props> = ({
  categories,
  goals,
  tasks,
  habits,
  userProfile,
  reminderSettings,
  onImportAllData,
  className = ''
}) => {
  const [config, setConfig] = useState<GitHubSyncConfig>(loadGitHubSyncConfig);
  const [repoInput, setRepoInput] = useState<string>(`${config.owner}/${config.repo}`);
  const [showToken, setShowToken] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Operation States
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'INFO';
    text: string;
    commitUrl?: string;
    commitSha?: string;
  } | null>(null);

  // Sync state changes back to localStorage
  const handleSaveConfig = () => {
    const { owner, repo } = parseGitHubRepoInput(repoInput);
    const updated: GitHubSyncConfig = {
      ...config,
      owner,
      repo,
    };
    setConfig(updated);
    saveGitHubSyncConfig(updated);
    setStatusMessage({
      type: 'INFO',
      text: 'تنظیمات اتصال به گیت‌هاب با موفقیت ذخیره شد.',
    });
  };

  const handleTestConnection = async () => {
    const { owner, repo } = parseGitHubRepoInput(repoInput);
    const currentConfig: GitHubSyncConfig = {
      ...config,
      owner,
      repo,
    };
    setIsTesting(true);
    setStatusMessage(null);

    const res = await testGitHubConnection(currentConfig);
    setIsTesting(false);

    if (res.success) {
      saveGitHubSyncConfig(currentConfig);
      setConfig(currentConfig);
      setStatusMessage({
        type: 'SUCCESS',
        text: res.message,
      });
    } else {
      setStatusMessage({
        type: 'ERROR',
        text: res.message,
      });
    }
  };

  const handlePushData = async () => {
    const { owner, repo } = parseGitHubRepoInput(repoInput);
    const currentConfig: GitHubSyncConfig = {
      ...config,
      owner,
      repo,
    };

    if (!currentConfig.personalAccessToken.trim()) {
      setIsExpanded(true);
      setStatusMessage({
        type: 'ERROR',
        text: 'لطفاً ابتدا توکن شخصی گیت‌هاب (Personal Access Token) خود را وارد کنید.',
      });
      return;
    }

    setIsPushing(true);
    setStatusMessage(null);

    // Prepare complete application database payload
    const payload = {
      appName: 'جوانه',
      version: APP_VERSION_INFO.currentVersion,
      exportDate: new Date().toISOString(),
      exportPersianDate: getCurrentPersianDateTimeString(),
      userProfile,
      reminderSettings,
      counts: {
        categories: categories.length,
        goals: goals.length,
        tasks: tasks.length,
        habits: habits.length,
      },
      categories,
      goals,
      tasks,
      habits,
    };

    const res = await pushDatabaseToGitHub(currentConfig, payload);
    setIsPushing(false);

    if (res.success) {
      const updated = {
        ...currentConfig,
        lastSyncedAt: res.updatedAt,
        lastCommitSha: res.commitSha,
        lastCommitUrl: res.commitUrl,
        lastSyncStatus: 'SUCCESS' as const,
      };
      setConfig(updated);
      saveGitHubSyncConfig(updated);

      setStatusMessage({
        type: 'SUCCESS',
        text: res.message,
        commitUrl: res.commitUrl,
        commitSha: res.commitSha,
      });
    } else {
      setStatusMessage({
        type: 'ERROR',
        text: res.message,
      });
    }
  };

  const handlePullData = async () => {
    const { owner, repo } = parseGitHubRepoInput(repoInput);
    const currentConfig: GitHubSyncConfig = {
      ...config,
      owner,
      repo,
    };

    setIsPulling(true);
    setStatusMessage(null);

    const res = await pullDatabaseFromGitHub(currentConfig);
    setIsPulling(false);

    if (res.success && res.data) {
      if (onImportAllData) {
        const confirmRestore = window.confirm(
          `اطلاعات از مخزن گیت‌هاب دریافت شد (${toPersianDigits(res.data.goals?.length || 0)} هدف، ${toPersianDigits(res.data.tasks?.length || 0)} تسک، ${toPersianDigits(res.data.habits?.length || 0)} عادت).\n\nآیا مایل به جایگزینی و همگام‌سازی داده‌های کنونی برنامه هستید؟`
        );
        if (confirmRestore) {
          onImportAllData(res.data, 'REPLACE');
          setStatusMessage({
            type: 'SUCCESS',
            text: 'اطلاعات با موفقیت از گیت‌هاب دریافت و روی برنامه بارگذاری شد.',
          });
          return;
        }
      }
      setStatusMessage({
        type: 'SUCCESS',
        text: res.message,
      });
    } else {
      setStatusMessage({
        type: 'ERROR',
        text: res.message,
      });
    }
  };

  const isConfigured = Boolean(config.personalAccessToken.trim());

  return (
    <div className={`p-5 rounded-2xl border border-gray-200/90 bg-gradient-to-br from-slate-50 via-white to-gray-50 shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <FolderGit2 className="w-5 h-5 text-gray-100" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                همگام‌سازی با گیت‌هاب (Sync with GitHub)
              </h4>
              {isConfigured ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>متصل به {config.owner}/{config.repo}</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>نیازمند تنظیم توکن</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              اتصال مخزن و ارسال دستی فایل <code className="bg-gray-100 px-1 py-0.2 rounded font-mono text-gray-800 text-[10px]">data/javaneh_db.json</code> از طریق GitHub REST API
            </p>
          </div>
        </div>

        {/* Quick Action Button & Expand Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePushData}
            disabled={isPushing || isPulling}
            className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="ارسال دستی نسخه کنونی پایگاه داده به مخزن گیت‌هاب"
          >
            {isPushing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>در حال ارسال به GitHub...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>ارسال دستی (Push)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            title={isExpanded ? 'بستن تنظیمات مخزن' : 'مشاهده و ویرایش تنظیمات مخزن گیت‌هاب'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Status or Result Message Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-fade-in ${
            statusMessage.type === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'ERROR'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {statusMessage.type === 'SUCCESS' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : statusMessage.type === 'ERROR' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 space-y-1">
            <p className="font-semibold leading-relaxed">{statusMessage.text}</p>
            {statusMessage.commitUrl && (
              <div className="flex items-center gap-2 pt-1 text-[11px]">
                <a
                  href={statusMessage.commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-emerald-700 underline flex items-center gap-1 hover:text-emerald-900"
                >
                  <span>مشاهده کامیت در گیت‌هاب ({statusMessage.commitSha?.substring(0, 7) || 'مشاهده'})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Sync Info & Quick Pull Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-gray-200/70">
        <div className="flex items-center gap-2 text-gray-600">
          <GitBranch className="w-3.5 h-3.5 text-gray-500" />
          <span>
            مسیر همگام‌سازی: <code className="font-mono text-gray-800 text-[11px] font-bold">{config.owner}/{config.repo}</code> ({config.branch})
          </span>
          {config.lastSyncedAt && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] text-gray-500">
                آخرین همگام‌سازی: <span className="font-bold text-gray-700">{config.lastSyncedAt}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePullData}
            disabled={isPulling || isPushing}
            className="px-2.5 py-1 text-[11px] font-bold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="دریافت فایل javaneh_db.json از مخزن گیت‌هاب و بازگردانی در برنامه"
          >
            {isPulling ? (
              <RefreshCw className="w-3 h-3 animate-spin text-gray-600" />
            ) : (
              <Download className="w-3 h-3 text-gray-600" />
            )}
            <span>دریافت از مخزن (Pull)</span>
          </button>

          <a
            href={`https://github.com/${config.owner}/${config.repo}/blob/${config.branch}/${config.filePath}`}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center gap-1 transition-colors"
          >
            <span>مشاهده در GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Expandable Settings Section */}
      {isExpanded && (
        <div className="pt-2 border-t border-gray-100 space-y-4 animate-fade-in text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Repo Input */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-gray-500" />
                <span>نام یا آدرس کامل مخزن (Repository):</span>
              </label>
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="targol/Habit-Management یا https://github.com/..."
                dir="ltr"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 bg-white focus:outline-emerald-500 text-gray-900"
              />
              <span className="text-[10px] text-gray-400">
                فرمت معتبر: <code className="font-mono">owner/repo</code> یا لینک کامل گیتهاب
              </span>
            </div>

            {/* Branch and Path Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                  <span>شاخه (Branch):</span>
                </label>
                <input
                  type="text"
                  value={config.branch}
                  onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                  placeholder="main"
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 bg-white focus:outline-emerald-500 text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-gray-500" />
                  <span>مسیر فایل:</span>
                </label>
                <input
                  type="text"
                  value={config.filePath}
                  onChange={(e) => setConfig({ ...config, filePath: e.target.value })}
                  placeholder="data/javaneh_db.json"
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 bg-white focus:outline-emerald-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Personal Access Token (PAT) Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <span>توکن دسترسی شخصی گیت‌هاب (Personal Access Token / PAT):</span>
              </label>
              <button
                type="button"
                onClick={() => setShowHelpGuide(!showHelpGuide)}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>راهنمای ساخت توکن در گیت‌هاب</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.personalAccessToken}
                onChange={(e) => setConfig({ ...config, personalAccessToken: e.target.value })}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx 또는 github_pat_..."
                dir="ltr"
                className="w-full pl-10 pr-3 py-2.5 text-xs font-mono rounded-xl border border-gray-300 bg-white focus:outline-emerald-500 text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                title={showToken ? 'پنهان‌سازی' : 'نمایش توکن'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              این توکن تنها در مرورگر خود شما به صورت ایمن نگهداری می‌شود و مستقیماً برای فراخوانی REST API گیت‌هاب استفاده خواهد شد.
            </p>
          </div>

          {/* Help Guide Box */}
          {showHelpGuide && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-amber-950 text-xs">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>مراحل دریافت توکن شخصی گیت‌هاب (PAT) در ۲ دقیقه:</span>
                </span>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=Javaneh%20Sync"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                >
                  <span>ساخت مستقیم توکن در GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900/90 leading-relaxed pr-1">
                <li>وارد اکانت گیت‌هاب خود شوید.</li>
                <li>به بخش <strong>Settings &gt; Developer settings &gt; Personal access tokens &gt; Tokens (classic)</strong> بروید (یا روی دکمه بالا کلیک کنید).</li>
                <li>تیک دسترسی <strong>repo</strong> (یا برای مخازن پابلیک دسترسی <code className="bg-amber-100 px-1 rounded">public_repo</code>) را فعال کنید.</li>
                <li>روی دکمه <strong>Generate token</strong> در انتهای صفحه کلیک کرده و کد توکن تولیدشده (شروع با <code className="font-mono">ghp_...</code>) را کپی نمایید.</li>
                <li>کد را در فیلد بالا قرار داده و دکمه «ذخیره تنظیمات» یا «بررسی اتصال» را بزنید.</li>
              </ol>
            </div>
          )}

          {/* Bottom Action Buttons inside expanded view */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ذخیره تنظیمات</span>
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !config.personalAccessToken.trim()}
                className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-500" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>بررسی اتصال (Test)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setConfig(DEFAULT_GITHUB_SYNC_CONFIG);
                setRepoInput(`${DEFAULT_GITHUB_SYNC_CONFIG.owner}/${DEFAULT_GITHUB_SYNC_CONFIG.repo}`);
                saveGitHubSyncConfig(DEFAULT_GITHUB_SYNC_CONFIG);
                setStatusMessage({
                  type: 'INFO',
                  text: 'تنظیمات مخزن به مقدار پیش‌فرض targol/Habit-Management بازنشانی شد.',
                });
              }}
              className="text-[11px] text-gray-500 hover:text-gray-800 underline transition-colors"
            >
              بازنشانی به پیش‌فرض (targol/Habit-Management)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
