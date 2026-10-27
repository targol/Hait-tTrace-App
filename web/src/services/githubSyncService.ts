import { GitHubSyncConfig } from '../types';
import { getCurrentPersianDateTimeString } from '../calendar/jalali';

export const GITHUB_STORAGE_KEY = 'javaneh_github_sync_config';

export const DEFAULT_GITHUB_SYNC_CONFIG: GitHubSyncConfig = {
  owner: 'targol',
  repo: 'Habit-Management',
  branch: 'main',
  filePath: 'data/javaneh_db.json',
  personalAccessToken: '',
  lastSyncStatus: 'IDLE',
};

/**
 * Standard browser UTF-8 to Base64 encoder that handles Persian, unicode & emojis.
 */
export function utf8ToBase64(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  } catch (e) {
    // Fallback using TextEncoder if available
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Standard browser Base64 to UTF-8 decoder.
 */
export function base64ToUtf8(b64Str: string): string {
  try {
    const cleanB64 = b64Str.replace(/\s+/g, '');
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(b64Str.replace(/\s+/g, '')), function (c: string) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  }
}

/**
 * Normalize and parse input that might be a full GitHub URL (e.g. https://github.com/owner/repo)
 * or a short "owner/repo" string.
 */
export function parseGitHubRepoInput(input: string): { owner: string; repo: string } {
  let clean = input.trim();
  clean = clean.replace(/^https?:\/\/github\.com\//i, '');
  clean = clean.replace(/\.git$/i, '');
  clean = clean.replace(/^\/+|\/+$/g, '');

  const parts = clean.split('/');
  if (parts.length >= 2) {
    return {
      owner: parts[0].trim(),
      repo: parts[1].trim(),
    };
  }
  return {
    owner: parts[0] || 'targol',
    repo: parts[1] || 'Habit-Management',
  };
}

/**
 * Load saved GitHub sync configuration from localStorage.
 */
export function loadGitHubSyncConfig(): GitHubSyncConfig {
  try {
    const raw = localStorage.getItem(GITHUB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_GITHUB_SYNC_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('[GitHubSyncService] Error loading config from localStorage:', e);
  }
  return { ...DEFAULT_GITHUB_SYNC_CONFIG };
}

/**
 * Save GitHub sync configuration to localStorage.
 */
export function saveGitHubSyncConfig(config: GitHubSyncConfig): void {
  try {
    localStorage.setItem(GITHUB_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[GitHubSyncService] Error saving config to localStorage:', e);
  }
}

/**
 * Test connectivity and token authorization against the GitHub REST API.
 */
export async function testGitHubConnection(config: GitHubSyncConfig): Promise<{
  success: boolean;
  message: string;
  repoInfo?: {
    fullName: string;
    description?: string;
    isPrivate: boolean;
    defaultBranch: string;
    updatedAt: string;
  };
}> {
  const token = config.personalAccessToken.trim();
  if (!token) {
    return {
      success: false,
      message: 'توکن دسترسی گیت‌هاب (Personal Access Token) وارد نشده است.',
    };
  }

  const owner = config.owner.trim() || 'targol';
  const repo = config.repo.trim() || 'Habit-Management';

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      return {
        success: false,
        message: 'توکن گیت‌هاب نامعتبر یا منقضی شده است (خطای ۴۰۱). لطفاً توکن جدیدی با دسترسی repo ایجاد کنید.',
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        message: `مخزن ${owner}/${repo} یافت نشد (خطای ۴۰۴). نام مالک و ریپازیتوری یا سطح دسترسی توکن را بررسی کنید.`,
      };
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        message: `خطای اتصال به گیت‌هاب (${res.status}): ${errBody.message || res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      message: `اتصال با موفقیت برقرار شد. مخزن «${data.full_name}» آماده همگام‌سازی است.`,
      repoInfo: {
        fullName: data.full_name,
        description: data.description,
        isPrivate: data.private,
        defaultBranch: data.default_branch,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `خطا در برقراری ارتباط شبکه با api.github.com: ${err.message || 'عدم دسترسی به اینترنت'}`,
    };
  }
}

/**
 * Manually push `javaneh_db.json` to the GitHub repository using the GitHub REST API contents endpoint.
 * (PUT /repos/{owner}/{repo}/contents/{path})
 */
export async function pushDatabaseToGitHub(
  config: GitHubSyncConfig,
  dbData: any,
  customCommitMessage?: string
): Promise<{
  success: boolean;
  message: string;
  commitSha?: string;
  commitUrl?: string;
  updatedAt?: string;
}> {
  const token = config.personalAccessToken.trim();
  if (!token) {
    return {
      success: false,
      message: 'لطفاً ابتدا توکن شخصی گیت‌هاب (PAT) خود را در تنظیمات وارد و ذخیره نمایید.',
    };
  }

  const owner = config.owner.trim() || 'targol';
  const repo = config.repo.trim() || 'Habit-Management';
  const branch = config.branch.trim() || 'main';
  const filePath = (config.filePath.trim() || 'data/javaneh_db.json').replace(/^\/+/, '');

  try {
    // 1. Fetch current file info to retrieve its SHA if it already exists
    let existingSha: string | undefined = undefined;
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (getRes.status === 200) {
      const getJson = await getRes.json();
      existingSha = getJson.sha;
    } else if (getRes.status === 401) {
      return {
        success: false,
        message: 'توکن گیت‌هاب فاقد اعتبار است یا دسترسی آن منقضی شده است (۴۰۱).',
      };
    } else if (getRes.status === 403) {
      return {
        success: false,
        message: 'مجوز توکن برای نوشتن در این مخزن کافی نیست (۴۰۳). توکن باید دسترسی repo (یا contents:write) داشته باشد.',
      };
    } else if (getRes.status !== 404 && !getRes.ok) {
      const errBody = await getRes.json().catch(() => ({}));
      return {
        success: false,
        message: `خطا در دریافت وضعیت فایل از گیت‌هاب (${getRes.status}): ${errBody.message || getRes.statusText}`,
      };
    }

    // 2. Format JSON and convert to UTF-8 safe Base64
    const formattedJson = JSON.stringify(dbData, null, 2);
    const contentB64 = utf8ToBase64(formattedJson);

    // 3. Prepare Commit message
    const nowPersian = getCurrentPersianDateTimeString();
    const commitMsg = customCommitMessage || `sync: به روزرسانی پایگاه داده javaneh_db.json (${nowPersian})`;

    // 4. PUT file content via GitHub REST API
    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMsg,
        content: contentB64,
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      const errBody = await putRes.json().catch(() => ({}));
      return {
        success: false,
        message: `خطای ارسال به گیت‌هاب (${putRes.status}): ${errBody.message || putRes.statusText}`,
      };
    }

    const putResult = await putRes.json();
    const commitSha = putResult.commit?.sha || putResult.content?.sha;
    const commitUrl = putResult.commit?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;

    // 5. Update and persist configuration state
    const updatedConfig: GitHubSyncConfig = {
      ...config,
      lastSyncedAt: nowPersian,
      lastCommitSha: commitSha,
      lastCommitUrl: commitUrl,
      lastSyncStatus: 'SUCCESS',
      lastSyncError: undefined,
    };
    saveGitHubSyncConfig(updatedConfig);

    // 6. Also synchronize locally to /api/data if running dev/server
    try {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: formattedJson,
      }).catch(() => {});
    } catch {}

    return {
      success: true,
      message: `فایل javaneh_db.json با موفقیت به شاخه ${branch} در مخزن ${owner}/${repo} ارسال شد.`,
      commitSha,
      commitUrl,
      updatedAt: nowPersian,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `خطای غیرمنتظره در ارسال به گیت‌هاب: ${err.message || String(err)}`,
    };
  }
}

/**
 * Pull the latest `javaneh_db.json` file from the connected GitHub repository.
 */
export async function pullDatabaseFromGitHub(config: GitHubSyncConfig): Promise<{
  success: boolean;
  message: string;
  data?: any;
  sha?: string;
}> {
  const token = config.personalAccessToken.trim();
  const owner = config.owner.trim() || 'targol';
  const repo = config.repo.trim() || 'Habit-Management';
  const branch = config.branch.trim() || 'main';
  const filePath = (config.filePath.trim() || 'data/javaneh_db.json').replace(/^\/+/, '');

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
      { method: 'GET', headers }
    );

    if (res.status === 404) {
      return {
        success: false,
        message: `فایل ${filePath} در شاخه ${branch} مخزن یافت نشد.`,
      };
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        message: `خطای دریافت از گیت‌هاب (${res.status}): ${errBody.message || res.statusText}`,
      };
    }

    const json = await res.json();
    if (!json.content) {
      return {
        success: false,
        message: 'محتوای فایل در پاسخ گیت‌هاب خالی بود.',
      };
    }

    const utf8Str = base64ToUtf8(json.content);
    const parsedData = JSON.parse(utf8Str);

    return {
      success: true,
      message: `اطلاعات با موفقیت از گیت‌هاب واکشی شد (SHA: ${json.sha?.substring(0, 7)}).`,
      data: parsedData,
      sha: json.sha,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `خطا در خواندن فایل از گیت‌هاب: ${err.message || String(err)}`,
    };
  }
}
