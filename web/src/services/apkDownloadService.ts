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

export const APK_RELEASES_URL = 'https://github.com/targol/Hait-tTrace-App/releases/latest';

export async function checkApkAvailability(): Promise<{ available: boolean; size?: number; formattedSize?: string; error?: string }> {
  // The APK is published on GitHub Releases (built by GitHub Actions), not hosted by the web server.
  return { available: true, formattedSize: 'GitHub Releases' };
}

export async function downloadApkBlobSecure(
  _onProgress?: (progress: DownloadProgress) => void,
  _edition: 'PRIMARY' | 'LEGACY' = 'PRIMARY'
): Promise<ApkDownloadResult> {
  try {
    const w = window.open(APK_RELEASES_URL, '_blank', 'noopener');
    if (!w) window.location.href = APK_RELEASES_URL;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'باز کردن صفحهٔ دانلود ممکن نشد' };
  }
}

