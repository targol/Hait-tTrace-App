import React, { useMemo, useState } from 'react';
import { AppTask, Habit, Category } from '../types';
import {
  getTodayJalali,
  jalaliToFormattedString,
  getDayOfWeek,
  getDaysInJalaliMonth,
  addDaysJalali,
  toPersianDigits,
  PERSIAN_MONTHS,
  WEEKDAYS,
  JalaliDate,
} from '../calendar/jalali';
import { taskOccursOn } from '../services/nativeAlarmService';
import { ChevronRight, ChevronLeft, Check, Circle, Hourglass } from 'lucide-react';

interface Props {
  tasks: AppTask[];
  habits: Habit[];
  categories: Category[];
}

type Mode = 'DAY' | 'MONTH' | 'YEAR';

export function formatDuration(sec: number): string {
  const minutes = Math.round(sec / 60);
  if (minutes <= 0) return sec > 0 ? 'کمتر از ۱ دقیقه' : '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${toPersianDigits(m)} دقیقه`;
  if (m === 0) return `${toPersianDigits(h)} ساعت`;
  return `${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه`;
}

const taskSecondsOn = (t: AppTask, dateStr: string) =>
  (t.focusSessions || []).reduce((s, x) => s + (x.dateStr === dateStr ? x.durationSeconds || 0 : 0), 0);

const habitSecondsOn = (h: Habit, dateStr: string) => {
  const direct = h.dailyElapsedSeconds?.[dateStr];
  if (typeof direct === 'number') return direct;
  return (h.focusSessions || []).reduce((s, x) => s + (x.dateStr === dateStr ? x.durationSeconds || 0 : 0), 0);
};

const taskDoneOn = (t: AppTask, dateStr: string) =>
  t.isCompleted && (t.completedAt === dateStr || (!t.completedAt && t.dueDate === dateStr));

interface Row {
  id: string;
  title: string;
  kind: 'TASK' | 'HABIT';
  color: string;
  done: boolean;
  doneText?: string;
  seconds: number;
}

export const TimeReport: React.FC<Props> = ({ tasks, habits, categories }) => {
  const today = getTodayJalali();
  const [mode, setMode] = useState<Mode>('DAY');
  const [day, setDay] = useState<JalaliDate>(today);
  const [ym, setYm] = useState({ year: today.year, month: today.month });
  const [year, setYear] = useState(today.year);

  const colorOf = (id?: string | null) => categories.find(c => c.id === id)?.colorHex || '#9ca3af';

  const days: JalaliDate[] = useMemo(() => {
    if (mode === 'DAY') return [day];
    if (mode === 'MONTH') {
      return Array.from({ length: getDaysInJalaliMonth(ym.year, ym.month) }, (_, i) => ({ year: ym.year, month: ym.month, day: i + 1 }));
    }
    const out: JalaliDate[] = [];
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= getDaysInJalaliMonth(year, m); d++) out.push({ year, month: m, day: d });
    }
    return out;
  }, [mode, day, ym, year]);

  const { rows, totalSeconds, perBucket } = useMemo(() => {
    const map = new Map<string, Row & { planned: number; doneCount: number }>();
    const bucket: number[] = mode === 'MONTH' ? new Array(days.length).fill(0) : mode === 'YEAR' ? new Array(12).fill(0) : [];
    let total = 0;

    days.forEach((d, idx) => {
      const ds = jalaliToFormattedString(d);
      const dow = getDayOfWeek(d);

      tasks.forEach(t => {
        const sec = taskSecondsOn(t, ds);
        const done = taskDoneOn(t, ds);
        const planned = taskOccursOn(t, d.year, d.month, d.day, dow);
        if (!sec && !done && !(planned && mode === 'DAY')) return;
        const key = 't' + t.id;
        const r = map.get(key) || { id: key, title: t.title, kind: 'TASK' as const, color: colorOf(t.categoryId), done: false, seconds: 0, planned: 0, doneCount: 0 };
        r.seconds += sec;
        if (done) { r.done = true; r.doneCount++; }
        if (planned || done) r.planned++;
        map.set(key, r);
        total += sec;
        if (mode === 'MONTH') bucket[idx] += sec; else if (mode === 'YEAR') bucket[d.month - 1] += sec;
      });

      habits.forEach(h => {
        if (h.createdAt && ds < h.createdAt.replace(/-/g, '/') && !h.completionHistory?.[ds]) return;
        const sec = habitSecondsOn(h, ds);
        const done = !!h.completionHistory?.[ds];
        const scheduled = h.frequency === 'DAILY' || (h.targetDaysOfWeek || []).includes(dow);
        if (ds > jalaliToFormattedString(today) && !sec && !done) return;
        if (!sec && !done && !(scheduled && (mode === 'DAY' || ds <= jalaliToFormattedString(today)))) return;
        const key = 'h' + h.id;
        const r = map.get(key) || { id: key, title: h.title, kind: 'HABIT' as const, color: colorOf(h.categoryId), done: false, seconds: 0, planned: 0, doneCount: 0 };
        r.seconds += sec;
        if (done) { r.done = true; r.doneCount++; }
        if (scheduled || done) r.planned++;
        map.set(key, r);
        total += sec;
        if (mode === 'MONTH') bucket[idx] += sec; else if (mode === 'YEAR') bucket[d.month - 1] += sec;
      });
    });

    const list = [...map.values()].map(r => ({
      ...r,
      doneText: r.kind === 'HABIT' && mode !== 'DAY'
        ? `${toPersianDigits(r.doneCount)} از ${toPersianDigits(r.planned)} روز`
        : undefined,
    }));
    list.sort((a, b) => Number(b.done) - Number(a.done) || b.seconds - a.seconds);
    return { rows: list as Row[], totalSeconds: total, perBucket: bucket };
  }, [days, tasks, habits, mode]);

  const doneTasks = rows.filter(r => r.kind === 'TASK' && r.done).length;
  const allTasks = rows.filter(r => r.kind === 'TASK').length;
  const habitDone = rows.filter(r => r.kind === 'HABIT').reduce((s, r) => s + (r as any).doneCount, 0);
  const maxBucket = Math.max(1, ...perBucket);

  const step = (dir: 1 | -1) => {
    if (mode === 'DAY') setDay(d => addDaysJalali(d, dir));
    else if (mode === 'MONTH') setYm(v => {
      let m = v.month + dir, y = v.year;
      if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
      return { year: y, month: m };
    });
    else setYear(y => y + dir);
  };

  const title = mode === 'DAY'
    ? `${WEEKDAYS[getDayOfWeek(day)]} ${toPersianDigits(day.day)} ${PERSIAN_MONTHS[day.month - 1]} ${toPersianDigits(day.year)}`
    : mode === 'MONTH' ? `${PERSIAN_MONTHS[ym.month - 1]} ${toPersianDigits(ym.year)}` : `سال ${toPersianDigits(year)}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-2xs">
      <div className="flex items-center gap-2">
        <Hourglass className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-bold text-gray-900">انجام‌شده‌ها و زمان صرف‌شده</h3>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {([['DAY', 'روز'], ['MONTH', 'ماه'], ['YEAR', 'سال']] as const).map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setMode(v)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${mode === v ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-500'}`}
          >{l}</button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer" aria-label="قبلی"><ChevronRight className="w-4 h-4" /></button>
        <span className="text-xs font-bold text-gray-800">{title}</span>
        <button type="button" onClick={() => step(1)} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer" aria-label="بعدی"><ChevronLeft className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-50 py-2">
          <div className="text-sm font-bold text-emerald-800">{toPersianDigits(doneTasks)} از {toPersianDigits(allTasks)}</div>
          <div className="text-[10px] text-gray-500">وظیفه انجام‌شده</div>
        </div>
        <div className="rounded-xl bg-amber-50 py-2">
          <div className="text-sm font-bold text-amber-800">{toPersianDigits(habitDone)}</div>
          <div className="text-[10px] text-gray-500">{mode === 'DAY' ? 'عادت انجام‌شده' : 'بار انجام عادت'}</div>
        </div>
        <div className="rounded-xl bg-sky-50 py-2">
          <div className="text-[11px] font-bold text-sky-800 leading-5">{formatDuration(totalSeconds)}</div>
          <div className="text-[10px] text-gray-500">زمان تمرکز</div>
        </div>
      </div>

      {mode !== 'DAY' && totalSeconds > 0 && (
        <div className="flex items-end gap-px h-12" aria-hidden>
          {perBucket.map((v, i) => (
            <div key={i} className="flex-1 bg-sky-100 rounded-t" style={{ height: `${Math.max(4, (v / maxBucket) * 100)}%`, opacity: v ? 1 : 0.4, backgroundColor: v ? '#38bdf8' : undefined }} />
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">برای این بازه موردی ثبت نشده است.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map(r => (
            <li key={r.id} className="flex items-center gap-2 py-2">
              {r.done ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <span className={`flex-1 min-w-0 truncate text-xs ${r.done ? 'text-gray-800' : 'text-gray-500'}`}>
                {r.title}
                {r.kind === 'HABIT' && <span className="text-[10px] text-amber-700 mr-1">(عادت)</span>}
              </span>
              {r.doneText && <span className="text-[10px] text-gray-500 shrink-0">{r.doneText}</span>}
              <span className="text-[11px] font-bold text-sky-700 shrink-0 min-w-[56px] text-left">{r.seconds > 0 ? formatDuration(r.seconds) : ''}</span>
              {!r.done && r.kind === 'TASK' && <span className="text-[10px] text-rose-600 shrink-0">انجام نشده</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
