import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AppTask, CalendarEvent } from '../types';
import {
  PERSIAN_MONTHS,
  WEEKDAYS,
  getDayOfWeek,
  getTodayJalali,
  gregorianToJalali,
  jalaliToFormattedString,
  jalaliToGregorian,
  normalizeJalaliDateStr,
  parseJalaliString,
  toLatinDigits,
  toPersianDigits,
} from '../calendar/jalali';
import { taskOccursOn } from '../services/nativeAlarmService';
import { loadNotebook, saveNotebook } from '../services/notebookService';

interface Props {
  tasks: AppTask[];
  calendarEvents: CalendarEvent[];
  onToggleTask: (taskId: string) => void;
  onMoveTask: (taskId: string, dateStr: string) => void;
  onClose: () => void;
}

const GREEN = '#16a34a';
const HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 06..24
const pad = (n: number) => String(n).padStart(2, '0');

function hourOf(time?: string | null): number | null {
  if (!time) return null;
  const h = parseInt(toLatinDigits(time).split(':')[0], 10);
  return isNaN(h) ? null : h;
}

export const DayPlanner: React.FC<Props> = ({ tasks, calendarEvents, onToggleTask, onMoveTask, onClose }) => {
  const today = useMemo(() => getTodayJalali(), []);
  const [tab, setTab] = useState<'TIMELINE' | 'REVIEW'>(new Date().getHours() >= 18 ? 'REVIEW' : 'TIMELINE');
  const dow = getDayOfWeek(today);
  const reviewKey = `d-${today.year}-${pad(today.month)}-${pad(today.day)}`;
  const [note, setNote] = useState(() => loadNotebook().reviews[reviewKey]?.text || '');
  const [win, setWin] = useState(() => loadNotebook().reviews[reviewKey]?.achievements || '');

  const saveReview = (text: string, achievements: string) => {
    const nb = loadNotebook();
    saveNotebook({ ...nb, reviews: { ...nb.reviews, [reviewKey]: { ...nb.reviews[reviewKey], text, achievements } } });
  };

  const todays = useMemo(
    () =>
      tasks.filter(t => {
        if (t.isArchived) return false;
        if (t.repeatType === 'DAILY' || t.repeatType === 'WEEKLY') return taskOccursOn(t, today.year, today.month, today.day, dow);
        return taskOccursOn(t, today.year, today.month, today.day, dow);
      }),
    [tasks, today, dow]
  );
  const events = useMemo(
    () =>
      calendarEvents.filter(e => {
        const j = parseJalaliString(normalizeJalaliDateStr(toLatinDigits(e.date || '')));
        return j && j.month === today.month && j.day === today.day && (j.year === today.year || e.repeatYearly);
      }),
    [calendarEvents, today]
  );

  const noTime = todays.filter(t => hourOf(t.time) === null && hourOf(t.deadlineTime) === null);
  const open = todays.filter(t => !t.isCompleted);

  const tomorrowStr = () => {
    const g = jalaliToGregorian(today.year, today.month, today.day);
    const next = new Date(g.getFullYear(), g.getMonth(), g.getDate() + 1);
    return jalaliToFormattedString(gregorianToJalali(next.getFullYear(), next.getMonth() + 1, next.getDate()));
  };

  const nowH = new Date().getHours();

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md max-h-[92vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 text-white flex items-center justify-between" style={{ background: GREEN }}>
          <div>
            <h2 className="text-sm font-black">{WEEKDAYS[dow]} {toPersianDigits(today.day)} {PERSIAN_MONTHS[today.month - 1]}</h2>
            <p className="text-[11px] opacity-90">برنامهٔ ساعتی و مرور پایان روز</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-white/20 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-1 p-2 border-b border-gray-100">
          {([['TIMELINE', 'خط زمانی'], ['REVIEW', 'مرور پایان روز']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex-1 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${tab === id ? 'text-white' : 'bg-gray-100 text-gray-600'}`} style={tab === id ? { background: GREEN } : undefined}>{label}</button>
          ))}
        </div>

        <div className="overflow-y-auto p-3 space-y-3 flex-1">
          {tab === 'TIMELINE' && (
            <>
              {noTime.length > 0 && (
                <div className="rounded-xl bg-gray-50 p-2">
                  <p className="text-[10px] font-bold text-gray-500 mb-1">بدون ساعت</p>
                  {noTime.map(t => (
                    <button key={t.id} type="button" onClick={() => onToggleTask(t.id)} className="flex items-center gap-2 text-xs w-full text-right py-0.5 cursor-pointer">
                      <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${t.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} />
                      <span className={t.isCompleted ? 'line-through text-gray-400' : ''}>{t.title}</span>
                    </button>
                  ))}
                </div>
              )}
              <div>
                {HOURS.map(h => {
                  const here = todays.filter(t => hourOf(t.time) === h);
                  const ends = todays.filter(t => hourOf(t.deadlineTime) === h && hourOf(t.time) !== h);
                  const evs = events.filter(e => hourOf(e.time) === h);
                  return (
                    <div key={h} className={`flex gap-2 border-t border-gray-100 min-h-[34px] ${h === nowH ? 'bg-emerald-50/70' : ''}`}>
                      <span className="w-9 shrink-0 text-[10px] text-gray-400 pt-1.5 text-center">{toPersianDigits(pad(h % 24))}:۰۰</span>
                      <div className="flex-1 py-1 space-y-1">
                        {evs.map(e => (
                          <div key={e.id} className="rounded-lg bg-sky-50 border border-sky-200 px-2 py-1 text-[11px] text-sky-800 font-bold">{e.title}{e.time ? ` • ${toPersianDigits(e.time)}` : ''}</div>
                        ))}
                        {here.map(t => (
                          <button key={t.id} type="button" onClick={() => onToggleTask(t.id)} className="flex items-center gap-2 w-full text-right rounded-lg border px-2 py-1 text-[11px] cursor-pointer" style={{ borderColor: t.isCompleted ? '#e5e7eb' : GREEN + '88', background: t.isCompleted ? '#f9fafb' : '#f0fdf4' }}>
                            <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${t.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} />
                            <span className={`flex-1 ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 font-bold'}`}>{t.title}</span>
                            <span className="text-[10px] text-gray-500">{toPersianDigits(t.time || '')}{t.deadlineTime ? ` تا ${toPersianDigits(t.deadlineTime)}` : ''}</span>
                          </button>
                        ))}
                        {ends.map(t => (
                          <div key={t.id + 'e'} className="text-[10px] text-rose-600 font-bold px-2">⌛ پایان مهلت: {t.title}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'REVIEW' && (
            <>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-sm font-black text-emerald-800">{toPersianDigits(todays.length - open.length)} از {toPersianDigits(todays.length)} کار امروز انجام شد</p>
              </div>
              {open.length > 0 ? (
                <div>
                  <p className="text-xs font-black text-gray-800 mb-1.5">کارهای انجام‌نشده</p>
                  <div className="space-y-1.5">
                    {open.map(t => {
                      const recurring = t.repeatType === 'DAILY' || t.repeatType === 'WEEKLY';
                      return (
                        <div key={t.id} className="rounded-xl border border-gray-200 p-2">
                          <p className="text-xs font-bold text-gray-900 mb-1.5">{t.title}</p>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => onToggleTask(t.id)} className="flex-1 py-1 rounded-lg text-[11px] font-bold text-white cursor-pointer" style={{ background: GREEN }}>انجام شد</button>
                            {!recurring && (
                              <button type="button" onClick={() => onMoveTask(t.id, tomorrowStr())} className="flex-1 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 cursor-pointer">به فردا</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-700 font-bold text-center">همهٔ کارهای امروز انجام شده است 🌸</p>
              )}
              <div className="space-y-1.5">
                <p className="text-xs font-black text-gray-800">یادداشت امروز</p>
                <textarea rows={3} value={note} onChange={e => { setNote(e.target.value); saveReview(e.target.value, win); }} placeholder="امروز چطور گذشت؟" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs resize-none" />
                <textarea rows={2} value={win} onChange={e => { setWin(e.target.value); saveReview(note, e.target.value); }} placeholder="دستاورد امروز" className="w-full rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs resize-none" />
                <p className="text-[10px] text-gray-400">این یادداشت در «دفتر ← هفته‌ها» هم دیده می‌شود.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
