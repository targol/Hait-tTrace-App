export const TAG_PALETTE = ['#16a34a', '#2563eb', '#db2777', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#65a30d', '#ea580c', '#475569'];
export const TAG_COLORS_KEY = 'javaneh_tag_colors';
export const SUGGESTED_TAGS = ['مهم', 'کار', 'خانه', 'شخصی', 'ورزش', 'خرید'];

export function loadTagColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TAG_COLORS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    const out: Record<string, string> = {};
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveTagColors(map: Record<string, string>): void {
  try {
    localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(map));
  } catch {}
}

export function setTagColor(name: string, color: string): void {
  saveTagColors({ ...loadTagColors(), [name]: color });
}

export function tagColor(name: string): string {
  const chosen = loadTagColors()[name];
  if (chosen) return chosen;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

export function normalizeTag(raw: string): string {
  return raw.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}
