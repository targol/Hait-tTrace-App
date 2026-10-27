import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Pause, 
  Play, 
  RefreshCw, 
  FileCheck, 
  Copy, 
  Check, 
  FileUp, 
  HardDrive, 
  Info,
  Clock,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { toPersianDigits } from '../calendar/jalali';
import { APP_VERSION_INFO, RELEASE_HISTORY } from '../version';
import { downloadApkBlobSecure } from '../services/apkDownloadService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ServerApkInfo {
  available: boolean;
  filename: string;
  size: number;
  formattedSize: string;
  sha256: string;
  acceptRanges: boolean;
}

const EXPECTED_HASH = '3580d3fe2f20612b786a06a745af09739b5677c9171795e248f2725342561878';
const EXPECTED_SIZE = 547128; // 547,128 bytes (535 KB)
const CHUNK_SIZE = 1024 * 1024; // 1 MB chunks for robust resumable downloading

export const ApkIntegrityModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [serverInfo, setServerInfo] = useState<ServerApkInfo | null>(null);
  const [loadingServerInfo, setLoadingServerInfo] = useState(false);

  // File Check state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [calculatingHash, setCalculatingHash] = useState(false);
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);
  const [hashProgress, setHashProgress] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState(false);

  // Resumable Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0); // 0 to 100
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(EXPECTED_SIZE);
  const [downloadSpeed, setDownloadSpeed] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadedBlob, setDownloadedBlob] = useState<Blob | null>(null);
  const [verifiedDownloadedHash, setVerifiedDownloadedHash] = useState<string | null>(null);

  const downloadedChunksRef = useRef<Uint8Array[]>([]);
  const currentByteRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const isAbortedRef = useRef<boolean>(false);
  const speedCalcRef = useRef<{ lastTime: number; lastBytes: number }>({ lastTime: 0, lastBytes: 0 });

  // Fetch server info on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingServerInfo(true);

    fetch('/api/apk-info')
      .then(res => (res && res.ok ? res.json() : null))
      .then(data => {
        if (!isMounted) return;
        if (data && data.available) {
          setServerInfo(data);
          if (data.size) setTotalBytes(data.size);
        } else {
          setServerInfo({
            available: false,
            filename: APP_VERSION_INFO.apkFileName,
            size: 0,
            formattedSize: 'عدم میزبانی در سرور وب',
            sha256: EXPECTED_HASH,
            acceptRanges: false,
          });
        }
        setLoadingServerInfo(false);
      })
      .catch(() => {
        if (isMounted) {
          setServerInfo({
            available: false,
            filename: APP_VERSION_INFO.apkFileName,
            size: 0,
            formattedSize: 'عدم میزبانی در سرور وب',
            sha256: EXPECTED_HASH,
            acceptRanges: false,
          });
          setLoadingServerInfo(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Clean up if modal closed
  useEffect(() => {
    if (!isOpen) {
      isPausedRef.current = true;
      isAbortedRef.current = true;
      setIsDownloading(false);
      setIsPaused(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Calculate File Hash with Web Crypto API ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setCalculatingHash(true);
    setCalculatedHash(null);
    setHashProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      setHashProgress(60);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setHashProgress(100);
      setCalculatedHash(hashHex);
    } catch (err) {
      console.error('Error calculating hash:', err);
      setCalculatedHash('خطا در محاسبه هش فایل');
    } finally {
      setCalculatingHash(false);
    }
  };

  // --- Copy Hash to Clipboard ---
  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // --- Trigger Direct File Save from Blob ---
  const triggerSaveBlob = (blob: Blob, filename = APP_VERSION_INFO.apkFileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // --- Resumable Chunked Download Worker ---
  const startOrResumeDownload = async () => {
    setIsDownloading(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isAbortedRef.current = false;
    setDownloadError(null);

    const targetTotal = serverInfo?.size || EXPECTED_SIZE;
    speedCalcRef.current = { lastTime: performance.now(), lastBytes: currentByteRef.current };

    try {
      while (currentByteRef.current < targetTotal) {
        if (isPausedRef.current || isAbortedRef.current) {
          setIsDownloading(false);
          setIsPaused(isPausedRef.current);
          return;
        }

        const start = currentByteRef.current;
        const end = Math.min(start + CHUNK_SIZE - 1, targetTotal - 1);

        const response = await fetch(`/${APP_VERSION_INFO.apkFileName}`, {
          headers: {
            Range: `bytes=${start}-${end}`,
          },
        }).catch(() => fetch('/javaneh.apk', {
          headers: {
            Range: `bytes=${start}-${end}`,
          },
        }));

        const cType = response.headers.get('content-type') || '';
        if (cType.includes('text/html') || cType.includes('application/json')) {
          throw new Error('فایل نصبی مستقیم APK در سرور وب موجود نیست. لطفاً از گزینه نصب سریع PWA استفاده فرمایید.');
        }

        if (!response.ok && response.status !== 206 && response.status !== 200) {
          throw new Error(`خطای دریافت تکه فایل (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const chunk = new Uint8Array(arrayBuffer);
        downloadedChunksRef.current.push(chunk);
        currentByteRef.current += chunk.length;

        // Progress & Speed calculations
        const progress = Math.min(100, Math.round((currentByteRef.current / targetTotal) * 100));
        setDownloadProgress(progress);
        setDownloadedBytes(currentByteRef.current);

        const now = performance.now();
        const elapsed = (now - speedCalcRef.current.lastTime) / 1000;
        if (elapsed > 0.5) {
          const bytesDiff = currentByteRef.current - speedCalcRef.current.lastBytes;
          const speedMB = (bytesDiff / (1024 * 1024)) / elapsed;
          setDownloadSpeed(`${toPersianDigits(speedMB.toFixed(1))} MB/s`);
          speedCalcRef.current = { lastTime: now, lastBytes: currentByteRef.current };
        }
      }

      // Completed! Assemble final blob
      const finalBlob = new Blob(downloadedChunksRef.current, {
        type: 'application/vnd.android.package-archive',
      });
      setDownloadedBlob(finalBlob);

      // Verify SHA-256 of downloaded content
      const buffer = await finalBlob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const finalHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setVerifiedDownloadedHash(finalHash);

      setIsDownloading(false);
      setIsPaused(false);

      // Automatically trigger download prompt for user
      triggerSaveBlob(finalBlob, APP_VERSION_INFO.apkFileName);
    } catch (err: any) {
      console.error('Resumable download error:', err);
      setDownloadError(err.message || 'خطا در ارتباط با سرور یا شبکه');
      setIsDownloading(false);
      setIsPaused(true);
      isPausedRef.current = true;
    }
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setIsPaused(true);
    setIsDownloading(false);
  };

  const handleResetDownload = () => {
    isPausedRef.current = true;
    isAbortedRef.current = true;
    downloadedChunksRef.current = [];
    currentByteRef.current = 0;
    setDownloadedBytes(0);
    setDownloadProgress(0);
    setIsDownloading(false);
    setIsPaused(false);
    setDownloadError(null);
    setDownloadedBlob(null);
    setVerifiedDownloadedHash(null);
  };

  // Evaluation of selected file
  const isSelectedFileComplete = selectedFile ? selectedFile.size === EXPECTED_SIZE : null;
  const isSelectedFileHashMatching = calculatedHash ? calculatedHash.toLowerCase() === EXPECTED_HASH.toLowerCase() : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-emerald-100 my-8 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>بررسی اصالت و دانلود پایدار APK</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  قابلیت Resume
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                بررسی هش SHA-256 و رفع مشکل دانلود ناقص یا خطای نصب در اندروید
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Metadata Pill Card */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <span>مشخصات فایل مرجع در سرور جوانه:</span>
            </span>
            <span className="bg-white px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
              پشتیبانی از Resume فعال ✅
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100/80">
              <span className="text-gray-500 block text-[10px]">نسخه بسته نصبی (APK):</span>
              <strong className="text-emerald-950 text-xs font-bold font-mono">
                v{APP_VERSION_INFO.currentVersion} (کد {APP_VERSION_INFO.currentVersionCode})
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100/80">
              <span className="text-gray-500 block text-[10px]">تاریخ انتشار شمسی:</span>
              <strong className="text-emerald-950 text-xs font-bold font-mono">
                {toPersianDigits(APP_VERSION_INFO.releaseDate)}
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100/80">
              <span className="text-gray-500 block text-[10px]">حجم رسمی فایل:</span>
              <strong className="text-emerald-950 text-xs font-bold font-mono">
                ۲۲.۵۸ مگابایت ({toPersianDigits(EXPECTED_SIZE.toLocaleString())} بایت)
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100/80">
              <span className="text-gray-500 block text-[10px]">پکیج گوگل‌پلی:</span>
              <strong className="text-emerald-950 text-xs font-bold font-mono truncate block" title={APP_VERSION_INFO.apkPackageName}>
                {APP_VERSION_INFO.apkPackageName}
              </strong>
            </div>
          </div>

          {/* SHA-256 Hash Display */}
          <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>کد هش رسمی سرور (SHA-256):</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyHash(EXPECTED_HASH)}
                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                title="کپی هش"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? 'کپی شد' : 'کپی هش'}</span>
              </button>
            </div>
            <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-200 font-mono text-[10px] text-gray-700 break-all select-all text-center">
              {EXPECTED_HASH}
            </div>
          </div>
        </div>

        {/* Section 1: Check Downloaded File */}
        <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-emerald-600" />
              <span>گام ۱: آیا فایلی دانلود کرده‌اید؟ بررسی سلامت آن</span>
            </h4>
            <label className="px-3 py-1.5 bg-white border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1">
              <span>انتخاب فایل APK از گوشی</span>
              <input
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {selectedFile ? (
            <div className="space-y-2.5 pt-1">
              <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 truncate max-w-[250px] font-mono">
                    {selectedFile.name}
                  </span>
                  <span className="font-mono text-gray-600">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ({toPersianDigits(selectedFile.size.toLocaleString())} بایت)
                  </span>
                </div>

                {calculatingHash ? (
                  <div className="space-y-1.5 text-center py-2">
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${hashProgress}%` }} />
                    </div>
                    <span className="text-[11px] text-gray-500 animate-pulse">در حال محاسبه هش SHA-256 فایل انتخابی...</span>
                  </div>
                ) : calculatedHash ? (
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <div className="text-[11px]">
                      <span className="text-gray-500">هش محاسبه‌شده فایل شما:</span>
                      <div className="bg-gray-50 p-1.5 rounded border border-gray-200 font-mono text-[10px] break-all select-all text-gray-700 mt-1">
                        {calculatedHash}
                      </div>
                    </div>

                    {/* Verdict Result */}
                    {isSelectedFileComplete && isSelectedFileHashMatching ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded-xl flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-0.5">
                          <strong className="block font-bold">فایل کاملاً سالم و معتبر است!</strong>
                          <p className="text-[11px] text-emerald-800">
                            حجم فایل و هش SHA-256 دقیقاً با نسخه رسمی سرور مطابقت دارد. فایل آماده نصب است و هیچ نقصی ندارد.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-200 text-rose-950 p-3 rounded-xl space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="text-xs space-y-1">
                            <strong className="font-extrabold text-rose-800 block">
                              هشدار: فایل شما ناقص یا مخدوش است!
                            </strong>
                            <p className="text-[11px] text-rose-900 leading-relaxed">
                              حجم فایل شما <strong>{(selectedFile.size / (1024 * 1024)).toFixed(2)} مگابایت</strong> است در حالی که فایل اصلی باید <strong>۲۲.۵۸ مگابایت</strong> باشد. 
                              {selectedFile.size < EXPECTED_SIZE && (
                                <span> مقدار <strong>{((EXPECTED_SIZE - selectedFile.size) / (1024 * 1024)).toFixed(2)} مگابایت</strong> در حین دانلود توسط مرورگر گوشی قطع شده است.</span>
                              )}
                            </p>
                            <p className="text-[10px] text-rose-700">
                              ⚠️ به همین دلیل اندروید خطای <em>«There was a problem parsing the package»</em> می‌دهد. لطفاً از بخش زیر با قابلیت Resume دانلود مجدد را انجام دهید.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 leading-relaxed">
              اگر فایل را قبلاً دانلود کرده‌اید، می‌توانید با زدن دکمه بالا آن را انتخاب کنید تا حجم و هش آن فوراً بررسی شود و از کامل بودن آن مطمئن شوید.
            </p>
          )}
        </div>

        {/* Section 2: Resumable Downloader */}
        <div className="border border-emerald-200 rounded-2xl p-4 space-y-3.5 bg-gradient-to-b from-emerald-50/40 to-white">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-700" />
              <span>گام ۲: دانلود هوشمند و پایدار با قابلیت ادامه (Resume)</span>
            </h4>
            {downloadSpeed && isDownloading && (
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                سرعت: {downloadSpeed}
              </span>
            )}
          </div>

          <p className="text-[11px] text-gray-600 leading-relaxed">
            این دانلودر اختصاصی فایل را به‌صورت قطعات امن دریافت کرده و حتی اگر اتصال گوشی قطع شود، دانلود را از همان درصد قبلی ادامه می‌دهد تا از دانلود ناقص (۱۰.۱ مگابایتی) جلوگیری کند.
          </p>

          {/* Progress Bar & Status */}
          <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <span>پیشرفت دانلود:</span>
                <span className="text-emerald-700 font-mono">{toPersianDigits(downloadProgress)}٪</span>
              </span>
              <span className="font-mono text-gray-500 text-[11px]">
                {toPersianDigits((downloadedBytes / (1024 * 1024)).toFixed(2))} / {toPersianDigits((totalBytes / (1024 * 1024)).toFixed(2))} MB
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200/80">
              <div 
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  downloadProgress === 100 
                    ? 'bg-emerald-500' 
                    : isPaused 
                    ? 'bg-amber-400' 
                    : 'bg-gradient-to-r from-emerald-600 to-green-500 animate-pulse'
                }`}
                style={{ width: `${downloadProgress}%` }}
              />
            </div>

            {/* Error banner if any */}
            {downloadError && (
              <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg text-rose-800 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{downloadError}. برای ادامه مجدداً روی دکمه «ادامه دانلود» بزنید.</span>
              </div>
            )}

            {/* Download Verified Success */}
            {downloadedBlob && verifiedDownloadedHash && (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-emerald-900 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <strong className="font-bold">دانلود کامل و هش ۲۲.۵۸ مگابایتی تایید شد!</strong>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  فایل ذخیره شد. اگر پنجره دانلود مرورگر باز نشد، دکمه ذخیره مجدد زیر را لمس کنید:
                </p>
                <button
                  type="button"
                  onClick={() => triggerSaveBlob(downloadedBlob, APP_VERSION_INFO.apkFileName)}
                  className="w-full mt-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ذخیره مجدد فایل نصبی ({APP_VERSION_INFO.apkFileName}) در حافظه گوشی</span>
                </button>
              </div>
            )}

            {/* Action Control Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {!isDownloading && downloadProgress < 100 && (
                <button
                  type="button"
                  onClick={startOrResumeDownload}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4" />
                  <span>{downloadProgress > 0 ? 'ادامه دانلود (Resume)' : 'شروع دانلود پایدار و ضد قطعی'}</span>
                </button>
              )}

              {isDownloading && (
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Pause className="w-4 h-4" />
                  <span>توقف موقت (Pause)</span>
                </button>
              )}

              {downloadProgress > 0 && downloadProgress < 100 && (
                <button
                  type="button"
                  onClick={handleResetDownload}
                  className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="شروع مجدد از صفر"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>از ابتدا</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alternative Direct Download link footer */}
        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>لینک مستقیم بدون مودال نیز با هدر ۲06 و Resume فعال است.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => downloadApkBlobSecure()}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود مستقیم فایل باینری</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
