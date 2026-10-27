import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  X, 
  CheckCircle2, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Download, 
  AlertCircle,
  Loader2,
  FileCheck,
  HardDrive
} from 'lucide-react';
import { APP_VERSION_INFO } from '../version';
import { toPersianDigits } from '../calendar/jalali';
import { checkApkAvailability, downloadApkBlobSecure, DownloadProgress } from '../services/apkDownloadService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstallClick?: () => void;
}

export const ApkDownloadConfirmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallClick,
}) => {
  const [apkInfo, setApkInfo] = useState<{
    available: boolean;
    size?: number;
    formattedSize?: string;
    sha256?: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDownloadDone(false);
    setDownloadError(null);
    setDownloadProgress(null);

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    fetch(`/api/apk-info?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.available) {
          setApkInfo({
            available: true,
            size: data.size,
            formattedSize: data.formattedSize,
            sha256: data.sha256,
          });
        } else {
          checkApkAvailability().then(setApkInfo);
        }
      })
      .catch(() => {
        checkApkAvailability().then(setApkInfo);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const directApkUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/Javaneh-App.apk?v=${APP_VERSION_INFO.currentVersionCode}`
      : `/Javaneh-App.apk?v=${APP_VERSION_INFO.currentVersionCode}`;

  const handleVerifiedApkDownload = async (edition: 'PRIMARY' | 'LEGACY' = 'PRIMARY') => {
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadDone(false);
    setDownloadProgress({ receivedBytes: 0, totalBytes: apkInfo?.size || 1115000, percent: 0 });

    const result = await downloadApkBlobSecure((prog) => {
      setDownloadProgress(prog);
    }, edition);

    setIsDownloading(false);
    if (result.success) {
      setDownloadDone(true);
    } else {
      setDownloadError(result.error || 'خطا در دریافت فایل نصبی');
    }
  };

  const handleCopyApkLink = async () => {
    try {
      await navigator.clipboard.writeText(directApkUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-lg w-full overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-l from-emerald-900 via-emerald-800 to-teal-900 p-4 sm:p-5 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  بروزرسانی و نصب اپلیکیشن اندروید جوانه (APK)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  نسخه {toPersianDigits(APP_VERSION_INFO.currentVersion)} (Build {toPersianDigits(APP_VERSION_INFO.currentVersionCode)})
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 mt-1">
                قابل نصب مستقیم روی نسخه قبلی (Update) با حفظ ۱۰۰٪ اطلاعات فعلی گوشی شما
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Technical Verification Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-500 block">امضای یکسان</span>
                <span className="font-bold text-emerald-950 text-[11px] truncate block">
                  حفظ داده‌های قبلی
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200/80 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-teal-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-500 block">حجم بسته کامل</span>
                <span className="font-bold text-teal-950 text-[11px] truncate block" dir="ltr">
                  {apkInfo?.formattedSize || '1.06 MB'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-500 block">کد نسخه جدید</span>
                <span className="font-bold text-blue-950 text-[11px] truncate block">
                  v{toPersianDigits(APP_VERSION_INFO.currentVersion)} (کد {toPersianDigits(APP_VERSION_INFO.currentVersionCode)})
                </span>
              </div>
            </div>
          </div>

          {/* Primary APK Download Card */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-2 border-emerald-300 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-extrabold text-emerald-950 text-xs sm:text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>دریافت بسته نصبی استاندارد (Javaneh-App.apk)</span>
              </div>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800">
                {APP_VERSION_INFO.apkPackageName} • v{APP_VERSION_INFO.currentVersion}
              </span>
            </div>

            <p className="text-[11px] text-gray-700 leading-relaxed">
              در نسخه <strong>{toPersianDigits(APP_VERSION_INFO.currentVersion)} (Build {toPersianDigits(APP_VERSION_INFO.currentVersionCode)})</strong> مشکل بارگذاری عکس پروفایل، انتخاب و ذخیره فایل پشتیبان و خطای عدم باز شدن پکیج به طور کامل برطرف شده است. دانلود از طریق استریم تاییدشده باینری (حجم <strong>{apkInfo?.formattedSize || '1.06 MB'}</strong>) انجام می‌شود تا فایل ۵ کیلوبایتی ناقص دانلود نشود.
            </p>

            {/* Primary Download Buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Primary Verified Binary Download Button */}
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => handleVerifiedApkDownload('PRIMARY')}
                  className="py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-xs active:scale-98 text-center"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>
                        در حال دریافت ({toPersianDigits(downloadProgress?.percent || 0)}٪)
                      </span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 shrink-0" />
                      <span>دانلود مستقیم APK (۱.۰۶ مگابایت)</span>
                    </>
                  )}
                </button>

                {/* Verified Stream Download Button */}
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => handleVerifiedApkDownload('PRIMARY')}
                  className="py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-xs active:scale-98"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>
                        در حال دریافت ({toPersianDigits(downloadProgress?.percent || 0)}٪)
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>دانلود با بررسی سلامت فایل</span>
                    </>
                  )}
                </button>
              </div>

              {/* Secondary Legacy Package Update Option */}
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => handleVerifiedApkDownload('LEGACY')}
                className="w-full py-2 px-3 bg-emerald-100/70 hover:bg-emerald-100 disabled:opacity-60 text-emerald-950 border border-emerald-300 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>دانلود نسخه بروزرسانی شناسه قدیم (Javaneh-Update.apk • com.javaneh.habit)</span>
              </button>

              {/* Copy Direct APK Link for Mobile Browser */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyApkLink}
                  className="flex-1 py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>لینک مستقیم فایل APK کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-700" />
                      <span>کپی لینک مستقیم APK (برای باز کردن در مرورگر گوشی)</span>
                    </>
                  )}
                </button>

                {isInIframe && (
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                    title="باز کردن برنامه در تب مستقل مرورگر"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>تب مستقل</span>
                  </a>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {isDownloading && downloadProgress && (
              <div className="space-y-1 pt-1">
                <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200"
                    style={{ width: `${downloadProgress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>در حال دانلود بسته نصبی...</span>
                  <span dir="ltr">{downloadProgress.percent}%</span>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {downloadDone && (
              <div className="p-3 bg-emerald-100/90 border border-emerald-300 rounded-xl flex items-start gap-2 text-emerald-950 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>فایل Javaneh-App.apk با موفقیت دانلود شد!</strong> اکنون روی آن بزنید و گزینه <strong>Update (بروزرسانی / نصب)</strong> را انتخاب کنید تا بدون حذف داده‌های قبلی نصب شود.
                </div>
              </div>
            )}

            {/* Error Banner */}
            {downloadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-[11px]">{downloadError}</span>
              </div>
            )}
          </div>

          {/* Data-Preserving Upgrade Guide */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
            <div className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>راهنمای بروزرسانی امن بدون حذف اطلاعات گوشی:</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-emerald-900/90 leading-relaxed pr-1">
              <li className="flex items-start gap-1.5">
                <span className="font-black text-emerald-800">۱.</span>
                <span>
                  <strong>نیازی به حذف (Uninstall) نسخه فعلی نیست!</strong> کافی است فایل APK جدید را دانلود و مستقیماً روی نسخه فعلی نصب (Update) کنید تا تمام اهداف، عادت‌ها، تسک‌ها و رویدادهای شما دست‌نخورده باقی بمانند.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-black text-emerald-800">۲.</span>
                <span>
                  همچنین سیستم مهاجرت خودکار نسخه (Version Control Migration) در اولین اجرا، یک اسنپ‌شات امن از داده‌های نسخه قبلی شما در حافظه دائمی ایجاد می‌کند.
                </span>
              </li>
            </ul>
          </div>

          {/* Optional Secondary PWA Install Section */}
          {deferredPrompt && onInstallClick && (
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <span className="font-bold text-gray-800 block text-xs">نصب سریع وب‌اپ (PWA)</span>
                  <span className="text-[10px] text-gray-500">افزودن مستقیم به صفحه اصلی بدون نیاز به فایل APK</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onInstallClick();
                  onClose();
                }}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-[11px] cursor-pointer shrink-0"
              >
                نصب وب‌اپ
              </button>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
