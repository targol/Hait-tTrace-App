export interface NotebookReview {
  text?: string;
  achievements?: string;
  rating?: number; // 1..5
}

export interface NotebookTracker {
  sport: number[]; // روزهای ماه که ورزش انجام شده
  book: number[]; // روزهای ماه که مطالعه انجام شده
}

export interface NotebookData {
  trackers: Record<string, NotebookTracker>; // کلید: "1404-03"
  // کلیدها: y-1404 | m-1404-03 | w-1404-03-2 | d-1404-03-15
  reviews: Record<string, NotebookReview>;
}

export const NOTEBOOK_STORAGE_KEY = 'javaneh_notebook';

export function emptyNotebook(): NotebookData {
  return { trackers: {}, reviews: {} };
}

export function sanitizeNotebook(raw: unknown): NotebookData {
  const out = emptyNotebook();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as any;
  const nums = (a: unknown) =>
    Array.isArray(a) ? a.filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 31) : [];
  if (r.trackers && typeof r.trackers === 'object') {
    for (const [k, v] of Object.entries<any>(r.trackers)) {
      if (v && typeof v === 'object') out.trackers[k] = { sport: nums(v.sport), book: nums(v.book) };
    }
  }
  if (r.reviews && typeof r.reviews === 'object') {
    for (const [k, v] of Object.entries<any>(r.reviews)) {
      if (v && typeof v === 'object') {
        out.reviews[k] = {
          text: typeof v.text === 'string' ? v.text : undefined,
          achievements: typeof v.achievements === 'string' ? v.achievements : undefined,
          rating: typeof v.rating === 'number' ? Math.max(0, Math.min(5, v.rating)) : undefined,
        };
      }
    }
  }
  return out;
}

export function loadNotebook(): NotebookData {
  try {
    const raw = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
    return raw ? sanitizeNotebook(JSON.parse(raw)) : emptyNotebook();
  } catch {
    return emptyNotebook();
  }
}

export function saveNotebook(data: NotebookData): void {
  try {
    localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}
