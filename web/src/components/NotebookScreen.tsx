import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { AppTask, CalendarEvent, Category, Goal, Habit } from '../types';
import {
  PERSIAN_MONTHS,
  PERSIAN_SEASONS,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  getDayOfWeek,
  getDaysInJalaliMonth,
  getJalaliMonthCalendar,
  getTodayJalali,
  isDateHoliday,
  jalaliToFormattedString,
  jalaliToGregorian,
  normalizeJalaliDateStr,
  parseJalaliString,
  toLatinDigits,
  toPersianDigits,
} from '../calendar/jalali';
import { NotebookData, NotebookReview, loadNotebook, saveNotebook } from '../services/notebookService';

interface Props {
  tasks: AppTask[];
  goals: Goal[];
  habits: Habit[];
  categories: Category[];
  calendarEvents: CalendarEvent[];
  onToggleTask: (taskId: string) => void;
  onToggleHabitDate: (habitId: string, dateStr: string) => void;
}

const GREEN = '#16a34a';
const GREG_MONTHS = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
const WEEK_NAMES = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'];
const DOTS = { backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '10px 10px' } as const;
const pad = (n: number) => String(n).padStart(2, '0');

type Section = 'PATH' | 'CAL' | 'MONTHS' | 'YEAR';

function parseDue(str?: string | null) {
  return parseJalaliString(normalizeJalaliDateStr(toLatinDigits(str || '')));
}

function goalPercent(g: Goal, tasks: AppTask[]): number {
  if (g.status === 'COMPLETED') return 100;
  if (g.isManualProgressActive && typeof g.manualProgress === 'number') return Math.round(g.manualProgress);
  const linked = tasks.filter(t => t.goalId === g.id && !t.isArchived);
  if (!linked.length) return 0;
  return Math.round((linked.filter(t => t.isCompleted).length / linked.length) * 100);
}

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'شروع نشده',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'انجام شد',
  PAUSED: 'متوقف',
};

// ---------- small presentational pieces (module-level so inputs never remount) ----------
const Bar: React.FC<{ left?: React.ReactNode; children: React.ReactNode; color?: string }> = ({ left, children, color = GREEN }) => (
  <div className="flex items-center justify-between rounded-full px-3 py-1 text-white text-[11px] font-black" style={{ background: color }}>
    <span>{children}</span>
    {left && <span className="text-[10px] font-bold opacity-90">{left}</span>}
  </div>
);

const Page: React.FC<{ refCb?: (el: HTMLDivElement | null) => void; children: React.ReactNode }> = ({ refCb, children }) => (
  <div ref={refCb} className="min-w-full w-full snap-center shrink-0 px-1">
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-3 space-y-3" style={DOTS}>
      {children}
    </div>
  </div>
);

const Ring: React.FC<{ percent: number; color: string; size?: number; label?: string }> = ({ percent, color, size = 44, label }) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0 bg-white rounded-full" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * Math.min(100, percent)) / 100} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-800">{label ?? toPersianDigits(percent)}</div>
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

const ReviewBox: React.FC<{ rv: NotebookReview; onChange: (p: Partial<NotebookReview>) => void; label: string; showRating?: boolean }> = ({ rv, onChange, label, showRating }) => (
  <div className="space-y-1.5">
    {showRating && <Stars value={rv.rating || 0} onChange={v => onChange({ rating: v })} />}
    <textarea rows={3} value={rv.text || ''} onChange={e => onChange({ text: e.target.value })} placeholder={label} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white/90 resize-none" />
    <textarea rows={2} value={rv.achievements || ''} onChange={e => onChange({ achievements: e.target.value })} placeholder="دستاوردها" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-xs bg-emerald-50/70 resize-none" />
  </div>
);

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`} style={active ? { background: GREEN } : undefined}>
    {children}
  </button>
);

const GoalRow: React.FC<{ g: Goal; percent: number; color: string }> = ({ g, percent, color }) => (
  <div className="flex items-center gap-2.5 rounded-xl border bg-white/90 px-2.5 py-1.5" style={{ borderColor: color + '66' }}>
    <Ring percent={percent} color={color} size={36} />
    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold text-gray-900 truncate">{g.title}</p>
      <p className="text-[10px] text-gray-500">
        {g.period === 'ANNUAL' ? 'سالانه' : g.period === 'SEASONAL' ? `فصل ${PERSIAN_SEASONS[g.seasonIndex ?? 0]?.name ?? ''}` : 'ماهانه'}
        {g.targetDate ? ` • مهلت ${toPersianDigits(g.targetDate)}` : ''}
      </p>
    </div>
    <span className="text-[10px] font-bold text-gray-600 shrink-0">{STATUS_LABEL[g.status] || ''}</span>
  </div>
);

// ---------- main ----------
export const NotebookScreen: React.FC<Props> = ({ tasks, goals, habits, categories, calendarEvents, onToggleTask, onToggleHabitDate }) => {
  const today = useMemo(() => getTodayJalali(), []);
  const [year, setYear] = useState(today.year);
  const [section, setSection] = useState<Section>('MONTHS');
  const [month, setMonth] = useState(today.month);
  const [sub, setSub] = useState(0);
  const [data, setData] = useState<NotebookData>(() => loadNotebook());
  const scroller = useRef<HTMLDivElement>(null);
  const subRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setReview = (key: string, patch: Partial<NotebookReview>) =>
    setData(prev => {
      const next = { ...prev, reviews: { ...prev.reviews, [key]: { ...prev.reviews[key], ...patch } } };
      saveNotebook(next);
      return next;
    });
  const rv = (k: string) => data.reviews[k] || {};

  const catColor = (id?: string) => categories.find(c => c.id === id)?.colorHex;
  const goalColor = (g: Goal) => g.colorHex || catColor(g.categoryId) || GREEN;

  const activeTasks = useMemo(() => tasks.filter(t => !t.isArchived), [tasks]);
  const tasksByDay = useMemo(() => {
    const map = new Map<string, AppTask[]>();
    for (const t of activeTasks) {
      const j = parseDue(t.dueDate);
      if (!j) continue;
      const k = `${j.year}-${j.month}-${j.day}`;
      map.set(k, [...(map.get(k) || []), t]);
    }
    return map;
  }, [activeTasks]);
  const dayTasks = (y: number, m: number, d: number) => tasksByDay.get(`${y}-${m}-${d}`) || [];

  const monthStats = (m: number) => {
    const n = getDaysInJalaliMonth(year, m);
    let total = 0, done = 0;
    for (let d = 1; d <= n; d++) for (const t of dayTasks(year, m, d)) { total++; if (t.isCompleted) done++; }
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  };

  const activeHabits = habits.filter(h => !h.isClosed);
  const habitRate = (m: number) => {
    const n = getDaysInJalaliMonth(year, m);
    const upto = year === today.year && m === today.month ? today.day : year < today.year || (year === today.year && m < today.month) ? n : 0;
    if (!activeHabits.length || !upto) return 0;
    let done = 0;
    for (let d = 1; d <= upto; d++) {
      const ds = jalaliToFormattedString({ year, month: m, day: d });
      done += activeHabits.filter(h => h.completionHistory?.[ds]).length;
    }
    return Math.round((done / (activeHabits.length * upto)) * 100);
  };

  const annualGoals = goals.filter(g => g.year === year && g.period === 'ANNUAL');

  const importantDays = useMemo(() => {
    const out: { m: number; d: number; title: string; kind: 'holiday' | 'event' }[] = [];
    for (let m = 1; m <= 12; m++) {
      const n = getDaysInJalaliMonth(year, m);
      for (let d = 1; d <= n; d++) {
        const h = isDateHoliday({ year, month: m, day: d });
        if (h.title && !h.title.includes('هفتگی')) out.push({ m, d, title: h.title, kind: 'holiday' });
      }
    }
    for (const e of calendarEvents) {
      const j = parseDue(e.date);
      if (j && (j.year === year || e.repeatYearly)) out.push({ m: j.month, d: j.day, title: e.title, kind: 'event' });
    }
    return out.sort((a, b) => a.m - b.m || a.d - b.d);
  }, [year, calendarEvents]);

  // weeks (Saturday-based) of the selected month
  const weeks = useMemo(() => {
    const n = getDaysInJalaliMonth(year, month);
    const dow1 = getDayOfWeek({ year, month, day: 1 });
    const list: { from: number; to: number }[] = [];
    let from = 1;
    let to = Math.min(n, 7 - dow1);
    while (from <= n) {
      list.push({ from, to });
      from = to + 1;
      to = Math.min(n, from + 6);
    }
    return list;
  }, [year, month]);

  const subTitles = ['برنامهٔ ماه', ...weeks.map((_, i) => `هفتهٔ ${WEEK_NAMES[i]}`), 'عادت‌ها', 'ارزیابی ماه'];

  const jumpSub = (i: number) => {
    const idx = Math.max(0, Math.min(subTitles.length - 1, i));
    subRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    setSub(idx);
  };
  const onSubScroll = () => {
    const el = scroller.current;
    if (!el?.clientWidth) return;
    const idx = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (idx !== sub) setSub(Math.max(0, Math.min(subTitles.length - 1, idx)));
  };
  const pickMonth = (m: number) => { setMonth(m); setSub(0); };

  const gdate = (m: number, d: number) => jalaliToGregorian(year, m, d);

  // ---------- sections ----------
  const pathView = (
    <Page>
      <Bar left={`${toPersianDigits(year)}`}>مسیر سال</Bar>
      <p className="text-[10px] text-gray-500">هر ایستگاه یک ماه است؛ حلقه درصد کارهای آن ماه را نشان می‌دهد.</p>
      <div className="space-y-2.5">
        {PERSIAN_SEASONS.map((s, si) => (
          <div key={si} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-2.5">
            <p className="text-[11px] font-black mb-1.5" style={{ color: GREEN }}>{s.name}</p>
            <div className="flex items-start justify-around relative">
              <div className="absolute top-5 left-8 right-8 border-t-2 border-dashed border-emerald-300" />
              {[0, 1, 2].map(k => {
                const m = si * 3 + k + 1;
                const st = monthStats(m);
                const now = year === today.year && m === today.month;
                return (
                  <button key={m} type="button" onClick={() => { pickMonth(m); setSection('MONTHS'); }} className={`relative flex flex-col items-center gap-0.5 cursor-pointer ${now ? 'scale-110' : ''}`}>
                    <Ring percent={st.percent} color={GREEN} size={46} label={st.total ? toPersianDigits(st.percent) : '·'} />
                    <span className="text-[11px] font-bold text-gray-800">{PERSIAN_MONTHS[m - 1]}</span>
                    <span className="text-[9px] text-gray-500">{toPersianDigits(st.done)}/{toPersianDigits(st.total)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Bar>اهداف سالانه</Bar>
      {annualGoals.length === 0 ? (
        <p className="text-[11px] text-gray-400">هدف سالانه‌ای برای این سال ثبت نشده؛ از تب «اهداف» اضافه کنید.</p>
      ) : (
        <div className="space-y-1.5">{annualGoals.map(g => <GoalRow key={g.id} g={g} percent={goalPercent(g, tasks)} color={goalColor(g)} />)}</div>
      )}
    </Page>
  );

  const calView = (
    <Page>
      <Bar left="شمسی و میلادی">{`تقویم سال ${toPersianDigits(year)}`}</Bar>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const grid = getJalaliMonthCalendar(year, m);
          const g1 = gdate(m, 1);
          const g2 = gdate(m, getDaysInJalaliMonth(year, m));
          const gl = g1.getMonth() === g2.getMonth() ? GREG_MONTHS[g1.getMonth()] : `${GREG_MONTHS[g1.getMonth()]}–${GREG_MONTHS[g2.getMonth()]}`;
          return (
            <button key={m} type="button" onClick={() => { pickMonth(m); setSection('MONTHS'); }} className="rounded-xl border border-emerald-200 bg-white/90 p-1.5 text-right cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black" style={{ color: GREEN }}>{PERSIAN_MONTHS[m - 1]}</span>
                <span className="text-[8px] text-gray-400">{gl}</span>
              </div>
              <div className="grid grid-cols-7 gap-px text-center">
                {WEEKDAYS_SHORT.map((w, i) => <span key={i} className="text-[7px] text-gray-400">{w}</span>)}
                {grid.map((d, i) => (
                  <span key={i} className={`text-[8px] leading-[13px] rounded-sm ${!d.isCurrentMonth ? 'opacity-0' : d.isHoliday ? 'text-rose-600 font-black' : 'text-gray-700'} ${d.isToday ? 'bg-emerald-600 text-white' : ''}`}>{toPersianDigits(d.day)}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <Bar>روزهای مهم سال</Bar>
      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
        {importantDays.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.kind === 'holiday' ? 'bg-rose-500' : 'bg-sky-500'}`} />
            <span className="text-gray-500 w-20 shrink-0">{toPersianDigits(d.d)} {PERSIAN_MONTHS[d.m - 1]}</span>
            <span className="text-gray-800 truncate">{d.title}</span>
          </div>
        ))}
      </div>
    </Page>
  );

  // monthly planning page
  const monthPlanPage = () => {
    const grid = getJalaliMonthCalendar(year, month);
    const g1 = gdate(month, 1);
    const g2 = gdate(month, getDaysInJalaliMonth(year, month));
    const mGoals = goals.filter(g => g.year === year && ((g.period === 'MONTHLY' && g.monthIndex === month) || (g.period === 'SEASONAL' && g.seasonIndex === Math.floor((month - 1) / 3))));
    const events = importantDays.filter(d => d.m === month);
    const st = monthStats(month);
    return (
      <Page refCb={el => { subRefs.current[0] = el; }}>
        <Bar left={`${GREG_MONTHS[g1.getMonth()]}${g1.getMonth() !== g2.getMonth() ? '–' + GREG_MONTHS[g2.getMonth()] : ''}`}>{`برنامه‌ریزی ${PERSIAN_MONTHS[month - 1]}`}</Bar>
        <div className="rounded-xl border border-gray-200 bg-white/90 p-1.5">
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS_SHORT.map((w, i) => <span key={i} className="text-[10px] font-bold text-gray-500">{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d.isCurrentMonth) return <span key={i} />;
              const ts = dayTasks(d.year, d.month, d.day);
              const g = gdate(d.month, d.day);
              return (
                <div key={i} className={`rounded-lg border px-0.5 py-0.5 text-center min-h-[40px] ${d.isToday ? 'border-emerald-600 bg-emerald-50' : 'border-gray-100 bg-white'}`}>
                  <div className={`text-[11px] font-black leading-none ${d.isHoliday ? 'text-rose-600' : 'text-gray-800'}`}>{toPersianDigits(d.day)}</div>
                  <div className="text-[8px] text-gray-400 leading-none mt-0.5">{g.getDate()}</div>
                  {ts.length > 0 && (
                    <div className="flex justify-center gap-px mt-0.5 flex-wrap">
                      {ts.slice(0, 4).map(t => <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.isCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-gray-400 mt-1">نقطهٔ سبز: انجام‌شده • نارنجی: باقی‌مانده • عدد کوچک: روز میلادی</p>
        </div>
        <Bar left={`${toPersianDigits(st.done)}/${toPersianDigits(st.total)} کار`}>اهداف و اولویت‌های این ماه</Bar>
        {mGoals.length === 0 ? <p className="text-[11px] text-gray-400">هدفی برای این ماه یا فصل ثبت نشده.</p> : (
          <div className="space-y-1.5">{mGoals.map(g => <GoalRow key={g.id} g={g} percent={goalPercent(g, tasks)} color={goalColor(g)} />)}</div>
        )}
        <Bar>مناسبت‌های این ماه</Bar>
        {events.length === 0 ? <p className="text-[11px] text-gray-400">مناسبتی ثبت نشده.</p> : (
          <div className="space-y-1">
            {events.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full ${d.kind === 'holiday' ? 'bg-rose-500' : 'bg-sky-500'}`} />
                <span className="text-gray-500 w-6 shrink-0">{toPersianDigits(d.d)}</span>
                <span className="text-gray-800">{d.title}</span>
              </div>
            ))}
          </div>
        )}
      </Page>
    );
  };

  // weekly page
  const weekPage = (wi: number) => {
    const w = weeks[wi];
    const days = Array.from({ length: w.to - w.from + 1 }, (_, i) => w.from + i);
    const mGoals = goals.filter(g => g.year === year && g.status !== 'COMPLETED' && ((g.period === 'MONTHLY' && g.monthIndex === month) || (g.period === 'SEASONAL' && g.seasonIndex === Math.floor((month - 1) / 3))));
    const weekTasks = days.flatMap(d => dayTasks(year, month, d));
    const wdone = weekTasks.filter(t => t.isCompleted).length;
    return (
      <Page key={wi} refCb={el => { subRefs.current[1 + wi] = el; }}>
        <Bar left={`${toPersianDigits(w.from)} تا ${toPersianDigits(w.to)} ${PERSIAN_MONTHS[month - 1]}`}>{`هفتهٔ ${WEEK_NAMES[wi]}`}</Bar>
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>{toPersianDigits(wdone)} از {toPersianDigits(weekTasks.length)} کار انجام شده</span>
        </div>
        {mGoals.length > 0 && (
          <>
            <Bar>اهداف در جریان</Bar>
            <div className="space-y-1.5">{mGoals.slice(0, 4).map(g => <GoalRow key={g.id} g={g} percent={goalPercent(g, tasks)} color={goalColor(g)} />)}</div>
          </>
        )}
        <div className="space-y-2">
          {days.map(d => {
            const dow = getDayOfWeek({ year, month, day: d });
            const hol = isDateHoliday({ year, month, day: d });
            const g = gdate(month, d);
            const ts = dayTasks(year, month, d);
            const isToday = year === today.year && month === today.month && d === today.day;
            const dk = `d-${year}-${pad(month)}-${pad(d)}`;
            return (
              <div key={d} className="rounded-xl bg-white/90">
                <div className="flex items-center justify-between rounded-full px-3 py-0.5 text-[11px] font-black text-white" style={{ background: hol.isHoliday ? '#e11d48' : isToday ? '#047857' : GREEN }}>
                  <span>{WEEKDAYS[dow]} {toPersianDigits(d)} {PERSIAN_MONTHS[month - 1]}</span>
                  <span className="text-[9px] font-bold opacity-90">{hol.title && !hol.title.includes('هفتگی') ? hol.title + ' • ' : ''}{g.getDate()} {GREG_MONTHS[g.getMonth()]}</span>
                </div>
                <div className="px-2 pt-1 space-y-0.5">
                  {ts.map(t => (
                    <button key={t.id} type="button" onClick={() => onToggleTask(t.id)} className="flex items-center gap-2 text-[11px] w-full text-right cursor-pointer">
                      <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${t.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} />
                      <span className={t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}>{t.title}</span>
                    </button>
                  ))}
                  <input
                    value={rv(dk).text || ''}
                    onChange={e => setReview(dk, { text: e.target.value })}
                    placeholder="یادداشت / ارزیابی روز"
                    className="w-full border-0 border-b border-dotted border-gray-300 bg-transparent text-[11px] py-1 focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <Bar>ارزیابی هفته</Bar>
        <ReviewBox rv={rv(`w-${year}-${pad(month)}-${wi + 1}`)} onChange={p => setReview(`w-${year}-${pad(month)}-${wi + 1}`, p)} label="این هفته چطور بود؟" showRating />
      </Page>
    );
  };

  // habits page
  const habitsPage = () => {
    const n = getDaysInJalaliMonth(year, month);
    const dayList = Array.from({ length: n }, (_, i) => i + 1);
    const score = (d: number) => {
      if (!activeHabits.length) return 0;
      const ds = jalaliToFormattedString({ year, month, day: d });
      return Math.round((activeHabits.filter(h => h.completionHistory?.[ds]).length / activeHabits.length) * 100);
    };
    return (
      <Page refCb={el => { subRefs.current[1 + weeks.length] = el; }}>
        <Bar left={`میانگین ${toPersianDigits(habitRate(month))}٪`}>پیگیری عادت‌ها</Bar>
        {activeHabits.length === 0 ? (
          <p className="text-[11px] text-gray-400">عادت فعالی نیست؛ از تب «عادت‌ها» اضافه کنید.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="text-[9px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky right-0 bg-white z-10 px-2 py-1 text-right min-w-[84px]">عادت</th>
                  {dayList.map(d => (
                    <th key={d} className={`w-5 py-1 font-bold ${isDateHoliday({ year, month, day: d }).isHoliday ? 'text-rose-600' : 'text-gray-500'}`}>{toPersianDigits(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeHabits.map(h => (
                  <tr key={h.id} className="border-t border-gray-100">
                    <td className="sticky right-0 bg-white z-10 px-2 py-1 font-bold text-gray-800 max-w-[110px] truncate">{h.title}</td>
                    {dayList.map(d => {
                      const ds = jalaliToFormattedString({ year, month, day: d });
                      const on = !!h.completionHistory?.[ds];
                      return (
                        <td key={d} className="p-0.5">
                          <button type="button" onClick={() => onToggleHabitDate(h.id, ds)} className="w-4 h-4 rounded-sm border cursor-pointer block" style={on ? { background: GREEN, borderColor: GREEN } : { background: '#f3f4f6', borderColor: '#e5e7eb' }} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t border-gray-300 bg-emerald-50/60">
                  <td className="sticky right-0 bg-emerald-50 z-10 px-2 py-1 font-black text-emerald-800">امتیاز روز</td>
                  {dayList.map(d => <td key={d} className="text-center text-emerald-800 font-bold">{toPersianDigits(Math.round(score(d) / 10))}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-gray-500">امتیاز روز: از ۱۰ (درصد عادت‌های انجام‌شده). برای تحلیل، در «ارزیابی ماه» بنویسید چرا بعضی عادت‌ها متوقف شد.</p>
      </Page>
    );
  };

  const monthReviewPage = () => {
    const st = monthStats(month);
    const k = `m-${year}-${pad(month)}`;
    return (
      <Page refCb={el => { subRefs.current[2 + weeks.length] = el; }}>
        <Bar>{`ارزیابی ${PERSIAN_MONTHS[month - 1]}`}</Bar>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-50 p-2"><p className="text-base font-black text-emerald-700">{toPersianDigits(st.percent)}٪</p><p className="text-[10px] text-gray-500">کارها</p></div>
          <div className="rounded-xl bg-emerald-50 p-2"><p className="text-base font-black text-emerald-700">{toPersianDigits(habitRate(month))}٪</p><p className="text-[10px] text-gray-500">عادت‌ها</p></div>
          <div className="rounded-xl bg-emerald-50 p-2"><p className="text-base font-black text-emerald-700">{toPersianDigits(st.done)}</p><p className="text-[10px] text-gray-500">کار انجام‌شده</p></div>
        </div>
        <ReviewBox rv={rv(k)} onChange={p => setReview(k, p)} label="این ماه چطور بود؟ چه چیزی را بهتر می‌کنید؟ چرا بعضی عادت‌ها متوقف شد؟" showRating />
      </Page>
    );
  };

  const yearView = () => {
    const yDone = Array.from({ length: 12 }, (_, i) => monthStats(i + 1).done).reduce((a, b) => a + b, 0);
    const k = `y-${year}`;
    return (
      <Page>
        <Bar left={toPersianDigits(year)}>ارزیابی سال</Bar>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-50 p-2"><p className="text-base font-black text-emerald-700">{toPersianDigits(yDone)}</p><p className="text-[10px] text-gray-500">کار انجام‌شده</p></div>
          <div className="rounded-xl bg-emerald-50 p-2"><p className="text-base font-black text-emerald-700">{toPersianDigits(annualGoals.filter(g => goalPercent(g, tasks) >= 100).length)}/{toPersianDigits(annualGoals.length)}</p><p className="text-[10px] text-gray-500">هدف سالانه</p></div>
          <div className="rounded-xl bg-emerald-50 p-2"><p className="text-base font-black text-emerald-700">{toPersianDigits(Math.round(Array.from({ length: 12 }, (_, i) => habitRate(i + 1)).reduce((a, b) => a + b, 0) / 12))}٪</p><p className="text-[10px] text-gray-500">میانگین عادت‌ها</p></div>
        </div>
        <ReviewBox rv={rv(k)} onChange={p => setReview(k, p)} label="سال چطور گذشت؟ مهم‌ترین درس‌ها؟ برنامهٔ سال بعد؟" showRating />
        <Bar>اهداف سالانه</Bar>
        <div className="space-y-1.5">{annualGoals.map(g => <GoalRow key={g.id} g={g} percent={goalPercent(g, tasks)} color={goalColor(g)} />)}</div>
      </Page>
    );
  };

  const sections: { id: Section; label: string }[] = [
    { id: 'PATH', label: 'مسیر سال' },
    { id: 'CAL', label: 'تقویم' },
    { id: 'MONTHS', label: 'ماه‌ها' },
    { id: 'YEAR', label: 'ارزیابی سال' },
  ];

  return (
    <div className="pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg bg-white border cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-black px-2">{toPersianDigits(year)}</span>
          <button type="button" onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg bg-white border cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1">
          {sections.map(s => <Chip key={s.id} active={section === s.id} onClick={() => setSection(s.id)}>{s.label}</Chip>)}
        </div>
      </div>

      {section === 'PATH' && pathView}
      {section === 'CAL' && calView}
      {section === 'YEAR' && yearView()}

      {section === 'MONTHS' && (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1.5">
            {PERSIAN_MONTHS.map((n, i) => <Chip key={i} active={month === i + 1} onClick={() => pickMonth(i + 1)}>{n}</Chip>)}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {subTitles.map((t, i) => (
              <button key={i} type="button" onClick={() => jumpSub(i)} className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer border ${i === sub ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white border-gray-200 text-gray-500'}`}>{t}</button>
            ))}
          </div>
          <div key={`${year}-${month}`} ref={scroller} onScroll={onSubScroll} className="flex overflow-x-auto snap-x snap-mandatory items-start" style={{ scrollbarWidth: 'none' }}>
            {monthPlanPage()}
            {weeks.map((_, i) => weekPage(i))}
            {habitsPage()}
            {monthReviewPage()}
          </div>
        </>
      )}
    </div>
  );
};
