import { APP_VERSION_INFO } from '../version';

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface ApkDownloadResult {
  success: boolean;
  error?: string;
  isPwaRecommended?: boolean;
}

export async function checkApkAvailability(): Promise<{ available: boolean; size?: number; formattedSize?: string; error?: string }> {
  try {
    const res = await fetch(`/api/apk-info?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.available) {
        return { available: true, size: data.size, formattedSize: data.formattedSize };
      }
    }
  } catch {}
  return { 
    available: false, 
    error: 'فایل APK مستقیم روی سرور وب موجود نیست؛ برنامه جوانه یک وب‌اپلیکیشن استاندارد (PWA) است و مستقیماً روی صفحه گوشی نصب می‌شود.' 
  };
}

export async function downloadApkBlobSecure(
  onProgress?: (progress: DownloadProgress) => void,
  edition: 'PRIMARY' | 'LEGACY' = 'PRIMARY'
): Promise<ApkDownloadResult> {
  try {
    const cacheBuster = `v=${APP_VERSION_INFO.currentVersionCode}&t=${Date.now()}`;
    const targetFileName = edition === 'LEGACY' ? 'Javaneh-Update.apk' : APP_VERSION_INFO.apkFileName;
    const candidateUrls =
      edition === 'LEGACY'
        ? [
            `/Javaneh-Update.apk?${cacheBuster}`,
            `/javaneh-legacy.apk?${cacheBuster}`,
            `/api/download-apk?edition=legacy&${cacheBuster}`,
          ]
        : [
            `/${APP_VERSION_INFO.apkFileName}?${cacheBuster}`,
            `/javaneh-app.apk?${cacheBuster}`,
            `/api/download-apk?${cacheBuster}`,
            `/javaneh.apk?${cacheBuster}`,
          ];

    let response: Response | null = null;

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });
        const cType = (res.headers.get('content-type') || '').toLowerCase();
        // Strict validation: Must not be HTML or JSON (prevents 5KB proxy auth HTML page!)
        if (res.ok && !cType.includes('text/html') && !cType.includes('application/json')) {
          response = res;
          break;
        }
      } catch {}
    }

    if (!response || !response.ok) {
      return {
        success: false,
        isPwaRecommended: true,
        error: 'فایل نصبی APK دریافت نشد. لطفاً دوباره تلاش کنید.',
      };
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 1115000;

    // Reject anything suspiciously small (like an auth proxy HTML page under 200KB)
    if (contentLength && totalBytes > 0 && totalBytes < 200000) {
      return {
        success: false,
        isPwaRecommended: true,
        error: 'فایل دریافتی کمتر از حجم استاندارد بسته اندروید است. لطفاً مجدداً دکمه دانلود را بزنید.',
      };
    }

    if (!response.body) {
      const ab = await response.arrayBuffer();
      const bytes = new Uint8Array(ab);
      if (bytes.byteLength < 200000 || bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
        return {
          success: false,
          isPwaRecommended: true,
          error: 'فایل دریافتی معتبر نیست.',
        };
      }
      const blob = new Blob([ab], { type: 'application/vnd.android.package-archive' });
      triggerBlobSave(blob, targetFileName);
      return { success: true };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (onProgress && totalBytes > 0) {
          const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
          onProgress({ receivedBytes, totalBytes, percent });
        }
      }
    }

    // Verify ZIP magic bytes (0x50, 0x4B, 0x03, 0x04 = PK\x03\x04)
    if (chunks.length > 0 && chunks[0].length >= 4) {
      if (
        chunks[0][0] !== 0x50 ||
        chunks[0][1] !== 0x4B ||
        chunks[0][2] !== 0x03 ||
        chunks[0][3] !== 0x04
      ) {
        return {
          success: false,
          isPwaRecommended: true,
          error: 'قالب فایل دانلودشده با پکیج نصبی اندروید (APK) مطابقت ندارد.',
        };
      }
    }

    if (receivedBytes < 200000) {
      return {
        success: false,
        isPwaRecommended: true,
        error: 'حجم فایل دریافتی ناقص است. لطفاً دوباره تلاش کنید.',
      };
    }

    const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
    triggerBlobSave(blob, targetFileName);
    return { success: true };
  } catch (err: any) {
    console.error('APK Download error:', err);
    return {
      success: false,
      isPwaRecommended: true,
      error: err?.message || 'خطا در دانلود بسته نصبی',
    };
  }
}

function triggerBlobSave(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
    } catch {}
    URL.revokeObjectURL(url);
  }, 60000);
}


