import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star, Dumbbell, BookOpen, Flag } from 'lucide-react';
import { AppTask, CalendarEvent, Category, Goal } from '../types';
import {
  PERSIAN_MONTHS,
  PERSIAN_SEASONS,
  WEEKDAYS_SHORT,
  getDaysInJalaliMonth,
  getJalaliMonthCalendar,
  getTodayJalali,
  getWeekOfMonth,
  isDateHoliday,
  jalaliToGregorian,
  normalizeJalaliDateStr,
  parseJalaliString,
  toLatinDigits,
  toPersianDigits,
} from '../calendar/jalali';
import {
  NotebookData,
  NotebookReview,
  loadNotebook,
  saveNotebook,
} from '../services/notebookService';

interface Props {
  tasks: AppTask[];
  goals: Goal[];
  categories: Category[];
  calendarEvents: CalendarEvent[];
}

const MONTH_COLORS = [
  '#22c55e', '#84cc16', '#14b8a6', // بهار
  '#f59e0b', '#f97316', '#ef4444', // تابستان
  '#e11d48', '#a855f7', '#8b5cf6', // پاییز
  '#3b82f6', '#06b6d4', '#64748b', // زمستان
];
const GREG_MONTHS = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
const WEEK_LABELS = ['هفتهٔ اول', 'هفتهٔ دوم', 'هفتهٔ سوم', 'هفتهٔ چهارم', 'هفتهٔ پنجم'];

const pad = (n: number) => String(n).padStart(2, '0');

function taskMonth(t: AppTask): { y: number; m: number } | null {
  const j = parseJalaliString(normalizeJalaliDateStr(toLatinDigits(t.dueDate || '')));
  return j ? { y: j.year, m: j.month } : null;
}

function goalPercent(g: Goal, tasks: AppTask[]): number {
  if (g.status === 'COMPLETED') return 100;
  if (g.isManualProgressActive && typeof g.manualProgress === 'number') return Math.round(g.manualProgress);
  const linked = tasks.filter(t => t.goalId === g.id && !t.isArchived);
  if (linked.length === 0) return 0;
  return Math.round((linked.filter(t => t.isCompleted).length / linked.length) * 100);
}

const Ring: React.FC<{ percent: number; color: string; size?: number; children?: React.ReactNode }> = ({
  percent,
  color,
  size = 52,
  children,
}) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#00000014" strokeWidth="5" />
        <circle
          cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(100, percent)) / 100} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-800">
        {children}
      </div>
    </div>
  );
};

const Stars: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onChange(value === n ? 0 : n)} className="cursor-pointer">
        <Star className={`w-6 h-6 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      </button>
    ))}
  </div>
);


const PageShell: React.FC<{ refCb: (el: HTMLDivElement | null) => void; color: string; title: string; subtitle?: string; children: React.ReactNode }> = ({
  refCb, color, title, subtitle, children,
}) => (
  <div ref={refCb} className="min-w-full w-full snap-center shrink-0 px-1">
    <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <h2 className="text-base font-black">{title}</h2>
        {subtitle && <p className="text-[11px] opacity-90 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-3 space-y-4">{children}</div>
    </div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h3 className="text-xs font-black text-gray-800 mb-1.5">{title}</h3>
    {children}
  </section>
);

const ReviewBox: React.FC<{ rv: NotebookReview; onChange: (p: Partial<NotebookReview>) => void; label: string; showRating?: boolean }> = ({
  rv, onChange, label, showRating,
}) => (
  <div className="space-y-1.5">
    {showRating && <Stars value={rv.rating || 0} onChange={v => onChange({ rating: v })} />}
    <textarea
      rows={2}
      value={rv.text || ''}
      onChange={e => onChange({ text: e.target.value })}
      placeholder={label}
      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-gray-50 resize-none"
    />
    <textarea
      rows={2}
      value={rv.achievements || ''}
      onChange={e => onChange({ achievements: e.target.value })}
      placeholder="دستاوردها"
      className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-xs bg-emerald-50/50 resize-none"
    />
  </div>
);

const GoalRow: React.FC<{ g: Goal; percent: number; color: string }> = ({ g, percent, color }) => (
  <div className="flex items-center gap-2.5 rounded-xl border px-3 py-2" style={{ borderColor: color + '55', background: color + '12' }}>
    <Ring percent={percent} color={color} size={40}>{toPersianDigits(percent)}</Ring>
    <div className="min-w-0">
      <p className="text-xs font-bold text-gray-900 truncate">{g.title}</p>
      <p className="text-[10px] text-gray-500">
        {g.period === 'ANNUAL' ? 'سالانه' : g.period === 'SEASONAL' ? `فصل ${PERSIAN_SEASONS[g.seasonIndex ?? 0]?.name ?? ''}` : 'ماهانه'}
      </p>
    </div>
  </div>
);

const TrackerGrid: React.FC<{ days: number; selected: number[]; color: string; label: string; icon: React.ReactNode; onToggle: (d: number) => void }> = ({
  days, selected, color, label, icon, onToggle,
}) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="flex items-center gap-1 text-[11px] font-bold text-gray-700">{icon}{label}</span>
      <span className="text-[10px] text-gray-500">{toPersianDigits(selected.length)} روز</span>
    </div>
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: days }, (_, i) => i + 1).map(d => {
        const on = selected.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onToggle(d)}
            className="h-7 rounded-md text-[9px] font-bold cursor-pointer border"
            style={on ? { background: color, color: '#fff', borderColor: color } : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
          >
            {toPersianDigits(d)}
          </button>
        );
      })}
    </div>
  </div>
);

export const NotebookScreen: React.FC<Props> = ({ tasks, goals, categories, calendarEvents }) => {
  const today = useMemo(() => getTodayJalali(), []);
  const [year, setYear] = useState(today.year);
  const [data, setData] = useState<NotebookData>(() => loadNotebook());
  const [dayState, setDayState] = useState<Record<number, number>>({});
  const [pageIndex, setPageIndex] = useState(() => 2 + (today.month - 1));
  const scroller = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const update = (fn: (d: NotebookData) => NotebookData) => {
    setData(prev => {
      const next = fn(prev);
      saveNotebook(next);
      return next;
    });
  };

  const setReview = (key: string, patch: Partial<NotebookReview>) =>
    update(d => ({ ...d, reviews: { ...d.reviews, [key]: { ...d.reviews[key], ...patch } } }));

  const toggleTracker = (ym: string, kind: 'sport' | 'book', day: number) =>
    update(d => {
      const cur = d.trackers[ym] || { sport: [], book: [] };
      const list = cur[kind].includes(day) ? cur[kind].filter(x => x !== day) : [...cur[kind], day];
      return { ...d, trackers: { ...d.trackers, [ym]: { ...cur, [kind]: list } } };
    });

  const catColor = (id?: string) => categories.find(c => c.id === id)?.colorHex;
  const goalColor = (g: Goal) => g.colorHex || catColor(g.categoryId) || '#16a34a';

  const pages = ['مسیر سال', 'تقویم', ...PERSIAN_MONTHS, 'ارزیابی سال'];

  // jump to current month page on first render
  useEffect(() => {
    const el = pageRefs.current[pageIndex];
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const goTo = (i: number) => {
    const idx = Math.max(0, Math.min(pages.length - 1, i));
    pageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    setPageIndex(idx);
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    const idx = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (idx !== pageIndex) setPageIndex(Math.max(0, Math.min(pages.length - 1, idx)));
  };

  // ---------- derived data ----------
  const yearTasks = useMemo(
    () => tasks.filter(t => !t.isArchived && taskMonth(t)?.y === year),
    [tasks, year]
  );
  const monthStats = (m: number) => {
    const ts = yearTasks.filter(t => taskMonth(t)?.m === m);
    const done = ts.filter(t => t.isCompleted).length;
    return { total: ts.length, done, percent: ts.length ? Math.round((done / ts.length) * 100) : 0 };
  };
  const annualGoals = goals.filter(g => g.year === year && g.period === 'ANNUAL');

  const importantDays = useMemo(() => {
    const list: { dateStr: string; m: number; d: number; title: string; kind: 'holiday' | 'event' }[] = [];
    for (let m = 1; m <= 12; m++) {
      const n = getDaysInJalaliMonth(year, m);
      for (let d = 1; d <= n; d++) {
        const h = isDateHoliday({ year, month: m, day: d });
        if (h.title) list.push({ dateStr: `${year}/${pad(m)}/${pad(d)}`, m, d, title: h.title, kind: 'holiday' });
      }
    }
    for (const e of calendarEvents) {
      const j = parseJalaliString(normalizeJalaliDateStr(toLatinDigits(e.date || '')));
      if (!j) continue;
      if (j.year === year || e.repeatYearly) {
        list.push({ dateStr: `${year}/${pad(j.month)}/${pad(j.day)}`, m: j.month, d: j.day, title: e.title, kind: 'event' });
      }
    }
    return list.sort((a, b) => a.m - b.m || a.d - b.d);
  }, [year, calendarEvents]);

  // ---------- pages ----------
  // 0) Year path
  const yearPath = (
    <PageShell refCb={el => { pageRefs.current[0] = el; }} color="#16a34a" title={`مسیر سال ${toPersianDigits(year)}`} subtitle="هر ماه یک ایستگاه؛ حلقه درصد کارهای آن ماه است">
      <div className="space-y-3">
        {PERSIAN_SEASONS.map((s, si) => (
          <div key={si} className="rounded-2xl p-3" style={{ background: MONTH_COLORS[si * 3] + '14' }}>
            <p className="text-[11px] font-black mb-2" style={{ color: MONTH_COLORS[si * 3] }}>{s.name}</p>
            <div className="flex items-start justify-around relative">
              <div className="absolute top-6 left-8 right-8 h-0.5 border-t-2 border-dashed" style={{ borderColor: MONTH_COLORS[si * 3] + '66' }} />
              {[0, 1, 2].map(k => {
                const m = si * 3 + k + 1;
                const st = monthStats(m);
                const col = MONTH_COLORS[m - 1];
                const isNow = year === today.year && m === today.month;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => goTo(1 + m)}
                    className={`relative flex flex-col items-center gap-1 cursor-pointer ${isNow ? 'scale-110' : ''}`}
                  >
                    <div className="bg-white rounded-full">
                      <Ring percent={st.percent} color={col} size={52}>{st.total ? toPersianDigits(st.percent) : '·'}</Ring>
                    </div>
                    <span className="text-[11px] font-bold text-gray-800">{PERSIAN_MONTHS[m - 1]}</span>
                    <span className="text-[9px] text-gray-500">{toPersianDigits(st.done)}/{toPersianDigits(st.total)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Section title="اهداف سالانه">
        {annualGoals.length === 0 ? (
          <p className="text-[11px] text-gray-400">هنوز هدف سالانه‌ای برای این سال ثبت نشده؛ از تب «اهداف» اضافه کنید.</p>
        ) : (
          <div className="space-y-1.5">{annualGoals.map(g => <GoalRow key={g.id} g={g} percent={goalPercent(g, tasks)} color={goalColor(g)} />)}</div>
        )}
      </Section>
    </PageShell>
  );

  // 1) Year calendar
  const calendarPage = (
    <PageShell refCb={el => { pageRefs.current[1] = el; }} color="#0ea5e9" title={`تقویم سال ${toPersianDigits(year)}`} subtitle="شمسی و میلادی در یک نگاه؛ تعطیلات قرمز">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const grid = getJalaliMonthCalendar(year, m);
          const g1 = jalaliToGregorian(year, m, 1);
          const g2 = jalaliToGregorian(year, m, getDaysInJalaliMonth(year, m));
          const gl = g1.getMonth() === g2.getMonth() ? GREG_MONTHS[g1.getMonth()] : `${GREG_MONTHS[g1.getMonth()]}–${GREG_MONTHS[g2.getMonth()]}`;
          return (
            <button key={m} type="button" onClick={() => goTo(1 + m)} className="rounded-xl border p-1.5 text-right cursor-pointer" style={{ borderColor: MONTH_COLORS[m - 1] + '66' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black" style={{ color: MONTH_COLORS[m - 1] }}>{PERSIAN_MONTHS[m - 1]}</span>
                <span className="text-[8px] text-gray-400">{gl} {toPersianDigits(g1.getFullYear())}</span>
              </div>
              <div className="grid grid-cols-7 gap-px text-center">
                {WEEKDAYS_SHORT.map((w, i) => <span key={i} className="text-[7px] text-gray-400">{w}</span>)}
                {grid.map((d, i) => (
                  <span
                    key={i}
                    className={`text-[8px] leading-[13px] rounded-sm ${
                      !d.isCurrentMonth ? 'opacity-0' : d.isHoliday ? 'text-rose-600 font-black' : 'text-gray-700'
                    } ${d.isToday ? 'bg-emerald-600 text-white' : ''}`}
                  >
                    {toPersianDigits(d.day)}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <Section title="روزهای مهم سال">
        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
          {importantDays.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full ${d.kind === 'holiday' ? 'bg-rose-500' : 'bg-sky-500'}`} />
              <span className="text-gray-500 w-20 shrink-0">{toPersianDigits(d.d)} {PERSIAN_MONTHS[d.m - 1]}</span>
              <span className="text-gray-800 truncate">{d.title}</span>
            </div>
          ))}
        </div>
      </Section>
    </PageShell>
  );

  // 2..13) Month pages
  const monthPage = (m: number) => {
    const col = MONTH_COLORS[m - 1];
    const ym = `${year}-${pad(m)}`;
    const days = getDaysInJalaliMonth(year, m);
    const tr = data.trackers[ym] || { sport: [], book: [] };
    const st = monthStats(m);
    const monthGoals = goals.filter(g => g.year === year && ((g.period === 'MONTHLY' && g.monthIndex === m) || (g.period === 'SEASONAL' && g.seasonIndex === Math.floor((m - 1) / 3))));
    const monthTasks = yearTasks.filter(t => taskMonth(t)?.m === m).sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));
    const weeks = Math.ceil(days / 7);
    const isNowMonth = year === today.year && m === today.month;
    const [selDay, setSelDay] = [dayState[m] ?? (isNowMonth ? today.day : 1), (d: number) => setDayState(s => ({ ...s, [m]: d }))];
    const dayKey = `d-${year}-${pad(m)}-${pad(selDay)}`;

    return (
      <PageShell key={m} refCb={el => { pageRefs.current[1 + m] = el; }} color={col} title={`${PERSIAN_MONTHS[m - 1]} ${toPersianDigits(year)}`} subtitle={`${toPersianDigits(st.done)} از ${toPersianDigits(st.total)} کار این ماه انجام شده`}>
        <Section title="اهداف این ماه">
          {monthGoals.length === 0 ? (
            <p className="text-[11px] text-gray-400">هدفی برای این ماه یا فصل ثبت نشده.</p>
          ) : (
            <div className="space-y-1.5">{monthGoals.map(g => <GoalRow key={g.id} g={g} percent={goalPercent(g, tasks)} color={goalColor(g)} />)}</div>
          )}
        </Section>

        <Section title="کارهای ماه">
          {monthTasks.length === 0 ? (
            <p className="text-[11px] text-gray-400">کاری با موعد در این ماه نیست.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {monthTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-3 h-3 rounded-full border ${t.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} />
                  <span className={t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="ردیاب‌ها">
          <div className="space-y-3">
            <TrackerGrid days={days} selected={tr.sport} color={col} label="ورزش" icon={<Dumbbell className="w-3.5 h-3.5" style={{ color: col }} />} onToggle={d => toggleTracker(ym, 'sport', d)} />
            <TrackerGrid days={days} selected={tr.book} color={col} label="مطالعهٔ کتاب" icon={<BookOpen className="w-3.5 h-3.5" style={{ color: col }} />} onToggle={d => toggleTracker(ym, 'book', d)} />
          </div>
        </Section>

        <Section title="ارزیابی روزانه">
          <div className="flex gap-1 overflow-x-auto pb-1 mb-1.5">
            {Array.from({ length: days }, (_, i) => i + 1).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelDay(d)}
                className="shrink-0 w-7 h-7 rounded-full text-[10px] font-bold cursor-pointer border"
                style={d === selDay ? { background: col, color: '#fff', borderColor: col } : data.reviews[`d-${year}-${pad(m)}-${pad(d)}`]?.text ? { borderColor: col, color: col } : { borderColor: '#e5e7eb', color: '#6b7280' }}
              >
                {toPersianDigits(d)}
              </button>
            ))}
          </div>
          <ReviewBox rv={data.reviews[dayKey] || {}} onChange={p => setReview(dayKey, p)} label={`امروز (${toPersianDigits(selDay)} ${PERSIAN_MONTHS[m - 1]}) چطور گذشت؟`} />
        </Section>

        <Section title="ارزیابی هفتگی">
          <div className="space-y-3">
            {Array.from({ length: weeks }, (_, i) => i + 1).map(w => (
              <div key={w}>
                <p className="text-[10px] font-bold text-gray-500 mb-1">{WEEK_LABELS[w - 1]}</p>
                <ReviewBox rv={data.reviews[`w-${year}-${pad(m)}-${w}`] || {}} onChange={p => setReview(`w-${year}-${pad(m)}-${w}`, p)} label="ارزیابی این هفته" />
              </div>
            ))}
          </div>
        </Section>

        <Section title="ارزیابی ماه و دستاوردها">
          <ReviewBox rv={data.reviews[`m-${year}-${pad(m)}`] || {}} onChange={p => setReview(`m-${year}-${pad(m)}`, p)} label="این ماه چطور بود؟ چه چیزی را بهتر می‌کنید؟" showRating />
        </Section>
      </PageShell>
    );
  };

  // 14) Year review
  const yearPageIdx = 2 + 12;
  const yearDone = yearTasks.filter(t => t.isCompleted).length;
  const reviewPage = (
    <PageShell refCb={el => { pageRefs.current[yearPageIdx] = el; }} color="#7c3aed" title={`ارزیابی سال ${toPersianDigits(year)}`} subtitle="نگاهی به کل سال">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-violet-50 p-2"><p className="text-lg font-black text-violet-700">{toPersianDigits(yearDone)}</p><p className="text-[10px] text-gray-500">کار انجام‌شده</p></div>
        <div className="rounded-xl bg-emerald-50 p-2"><p className="text-lg font-black text-emerald-700">{toPersianDigits(annualGoals.filter(g => goalPercent(g, tasks) >= 100).length)}/{toPersianDigits(annualGoals.length)}</p><p className="text-[10px] text-gray-500">هدف سالانه</p></div>
        <div className="rounded-xl bg-sky-50 p-2"><p className="text-lg font-black text-sky-700">{toPersianDigits(Object.entries(data.trackers).filter(([k]) => k.startsWith(String(year))).reduce((a, [, v]) => a + v.sport.length, 0))}</p><p className="text-[10px] text-gray-500">روز ورزش</p></div>
      </div>
      <Section title="ارزیابی سال">
        <ReviewBox rv={data.reviews[`y-${year}`] || {}} onChange={p => setReview(`y-${year}`, p)} label="سال چطور گذشت؟ مهم‌ترین درس‌ها؟ برنامهٔ سال بعد؟" showRating />
      </Section>
      <Section title="اهداف سالانه">
        <div className="space-y-1.5">{annualGoals.map(g => <GoalRow key={g.id} g={g} percent={goalPercent(g, tasks)} color={goalColor(g)} />)}</div>
      </Section>
    </PageShell>
  );

  return (
    <div className="pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg bg-white border cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-black px-2">{toPersianDigits(year)}</span>
          <button type="button" onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg bg-white border cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
        </div>
        <span className="text-[11px] text-gray-500 flex items-center gap-1"><Flag className="w-3 h-3" />{pages[pageIndex]}</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-1">
        {pages.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${i === pageIndex ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div ref={scroller} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth items-start" style={{ scrollbarWidth: 'none' }}>
        {yearPath}
        {calendarPage}
        {Array.from({ length: 12 }, (_, i) => monthPage(i + 1))}
        {reviewPage}
      </div>
    </div>
  );
};
