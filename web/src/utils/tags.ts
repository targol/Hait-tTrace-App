const PALETTE = ['#16a34a', '#2563eb', '#db2777', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#65a30d', '#ea580c', '#475569'];

export function tagColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function normalizeTag(raw: string): string {
  return raw.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}
