import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarEventType } from '../types';
import { 
  getTodayJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  toLatinDigits, 
  PERSIAN_MONTHS, 
  addDaysJalali, 
  getDayOfWeek,
  WEEKDAYS
} from '../calendar/jalali';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  Bell, 
  Trash2, 
  Check, 
  Sparkles, 
  Cake, 
  Users, 
  Bookmark, 
  Heart, 
  PartyPopper, 
  HelpCircle,
  Repeat,
  Plus,
  Volume2
} from 'lucide-react';
import { previewSound } from '../services/soundService';
import { loadFromLocalStorage, STORAGE_KEYS, DEFAULT_REMINDER_SETTINGS } from '../services/storageService';
import { ReminderSettings } from '../types';

interface Props {
  isOpen: boolean;
  event?: CalendarEvent | null;
  initialDate?: string;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

const EVENT_TYPES: Array<{
  type: CalendarEventType;
  title: string;
  icon: string;
  colorHex: string;
  badgeClass: string;
}> = [
  { type: 'BIRTHDAY', title: 'تولد', icon: '🎂', colorHex: '#EC4899', badgeClass: 'bg-pink-50 text-pink-700 border-pink-200' },
  { type: 'MEETING', title: 'جلسه / قرار کاری', icon: '👥', colorHex: '#3B82F6', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'REMINDER', title: 'یادآوری مهم', icon: '🔔', colorHex: '#F59E0B', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'OCCASION', title: 'مناسبت شخصی', icon: '💐', colorHex: '#8B5CF6', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'ANNIVERSARY', title: 'سالگرد', icon: '🎉', colorHex: '#10B981', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'OTHER', title: 'سایر رویدادها', icon: '📌', colorHex: '#6B7280', badgeClass: 'bg-gray-50 text-gray-700 border-gray-200' },
];

const REMINDER_DAY_OPTIONS = [
  { value: 0, label: 'همان روز رویداد' },
  { value: 1, label: '۱ روز قبل' },
  { value: 2, label: '۲ روز قبل' },
  { value: 3, label: '۳ روز قبل' },
  { value: 7, label: '۱ هفته قبل' },
];

const QUICK_TIME_PRESETS = [
  { value: '08:00', label: '۰۸:۰۰ صبح' },
  { value: '10:00', label: '۱۰:۰۰ صبح' },
  { value: '12:00', label: '۱۲:۰۰ ظهر' },
  { value: '16:00', label: '۱۶:۰۰ عصر' },
  { value: '20:00', label: '۲۰:۰۰ شب' },
];

export const CalendarEventModal: React.FC<Props> = ({
  isOpen,
  event,
  initialDate,
  onClose,
  onSave,
  onDelete,
}) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEventType>('BIRTHDAY');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(initialDate || todayStr);
  const [hasTime, setHasTime] = useState(false);
  const [time, setTime] = useState('10:00');
  const [hasReminder, setHasReminder] = useState(true);
  // Multi-day reminder (up to 3 days)
  const [reminderDays, setReminderDays] = useState<number[]>([0]);
  // Multi-time reminder (up to 3 times HH:MM)
  const [reminderTimes, setReminderTimes] = useState<string[]>(['09:00']);
  const [repeatYearly, setRepeatYearly] = useState(true);
  const [error, setError] = useState('');

  // Date parts for manual picking
  const [dateYear, setDateYear] = useState<number>(today.year);
  const [dateMonth, setDateMonth] = useState<number>(today.month);
  const [dateDay, setDateDay] = useState<number>(today.day);

  useEffect(() => {
    if (!isOpen) return;
    setError('');

    if (event) {
      setTitle(event.title || '');
      setType(event.type || 'BIRTHDAY');
      setDescription(event.description || '');
      const d = event.date || initialDate || todayStr;
      setDateStr(d);
      
      const parts = d.split('/').map(p => parseInt(toLatinDigits(p), 10));
      if (parts.length === 3 && !isNaN(parts[0])) {
        setDateYear(parts[0]);
        setDateMonth(parts[1]);
        setDateDay(parts[2]);
      }

      setHasTime(Boolean(event.time));
      setTime(event.time || '10:00');
      setHasReminder(event.hasReminder !== false);
      setReminderDays(event.reminderDays && event.reminderDays.length > 0 ? event.reminderDays : [0]);
      setReminderTimes(event.reminderTimes && event.reminderTimes.length > 0 ? event.reminderTimes : (event.time ? [event.time] : ['09:00']));
      setRepeatYearly(event.repeatYearly ?? (event.type === 'BIRTHDAY' || event.type === 'ANNIVERSARY'));
    } else {
      // New Event
      const d = initialDate || todayStr;
      setTitle('');
      setType('BIRTHDAY');
      setDescription('');
      setDateStr(d);

      const parts = d.split('/').map(p => parseInt(toLatinDigits(p), 10));
      if (parts.length === 3 && !isNaN(parts[0])) {
        setDateYear(parts[0]);
        setDateMonth(parts[1]);
        setDateDay(parts[2]);
      }

      setHasTime(false);
      setTime('10:00');
      setHasReminder(true);
      setReminderDays([0]);
      setReminderTimes(['09:00']);
      setRepeatYearly(true);
    }
  }, [isOpen, event, initialDate, todayStr]);

  // Sync date parts to dateStr
  const handleDatePartChange = (y: number, m: number, d: number) => {
    setDateYear(y);
    setDateMonth(m);
    setDateDay(d);
    const mStr = m.toString().padStart(2, '0');
    const dStr = d.toString().padStart(2, '0');
    setDateStr(`${y}/${mStr}/${dStr}`);
  };

  const handleTypeSelect = (newType: CalendarEventType) => {
    setType(newType);
    if (newType === 'BIRTHDAY' || newType === 'ANNIVERSARY') {
      setRepeatYearly(true);
    }
  };

  const handleQuickDate = (offsetDays: number) => {
    const target = addDaysJalali(today, offsetDays);
    handleDatePartChange(target.year, target.month, target.day);
  };

  const toggleReminderDay = (dayVal: number) => {
    setReminderDays(prev => {
      if (prev.includes(dayVal)) {
        if (prev.length <= 1) return prev; // keep at least 1 day
        return prev.filter(d => d !== dayVal);
      }
      if (prev.length >= 3) {
        // max 3 days: replace the first item and append new one
        return [...prev.slice(1), dayVal].sort((a, b) => a - b);
      }
      return [...prev, dayVal].sort((a, b) => a - b);
    });
  };

  const handleUpdateTime = (index: number, newTime: string) => {
    setReminderTimes(prev => {
      const next = [...prev];
      next[index] = newTime;
      return next;
    });
  };

  const handleAddTime = (presetTime?: string) => {
    if (reminderTimes.length >= 3) return;
    const defaultNewTime = presetTime || (reminderTimes.length === 1 ? '16:00' : '20:00');
    setReminderTimes(prev => [...prev, defaultNewTime]);
  };

  const handleRemoveTime = (index: number) => {
    if (reminderTimes.length <= 1) return;
    setReminderTimes(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleHasTime = (checked: boolean) => {
    setHasTime(checked);
    if (checked && time) {
      setHasReminder(true);
      setReminderTimes(prev => {
        if (prev.includes(time)) return prev;
        // Replace default 09:00 with the chosen event time so alarm rings at event time
        if (prev.length === 1 && prev[0] === '09:00') {
          return [time];
        }
        if (prev.length < 3) {
          return [time, ...prev];
        }
        return [time, ...prev.slice(1)];
      });
    }
  };

  const handleEventTimeChange = (newEventTime: string) => {
    const oldTime = time;
    setTime(newEventTime);
    if (newEventTime) {
      setReminderTimes(prev => {
        if (prev.includes(newEventTime)) return prev;
        const idx = prev.indexOf(oldTime);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = newEventTime;
          return next;
        }
        if (prev.length === 1 && prev[0] === '09:00') {
          return [newEventTime];
        }
        return [newEventTime, ...prev.slice(0, 2)];
      });
    }
  };

  const handleTestEventAlarm = () => {
    const settings = loadFromLocalStorage<ReminderSettings>(
      STORAGE_KEYS.REMINDER_SETTINGS,
      DEFAULT_REMINDER_SETTINGS
    );
    previewSound(
      settings.selectedSoundId || 'birds-chirp',
      settings.customSounds || [],
      settings.volume ?? 0.8
    );
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('لطفاً عنوان رویداد یا یادآوری را وارد کنید.');
      return;
    }

    const mStr = dateMonth.toString().padStart(2, '0');
    const dStr = dateDay.toString().padStart(2, '0');
    const formattedDate = `${dateYear}/${mStr}/${dStr}`;

    const effectiveTime = hasTime && time.trim() ? toLatinDigits(time.trim()) : null;
    let finalReminderTimes = hasReminder && reminderTimes.length > 0
      ? reminderTimes.map(t => toLatinDigits(t.trim())).filter(Boolean)
      : (effectiveTime ? [effectiveTime] : ['09:00']);

    if (hasReminder && effectiveTime && !finalReminderTimes.includes(effectiveTime)) {
      finalReminderTimes = [effectiveTime, ...finalReminderTimes].slice(0, 3);
    }

    const newEvent: CalendarEvent = {
      id: event?.id || `calevent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      type,
      date: formattedDate,
      time: effectiveTime,
      description: description.trim() || undefined,
      colorHex: EVENT_TYPES.find(t => t.type === type)?.colorHex || '#10B981',
      hasReminder,
      reminderDays: hasReminder ? [...reminderDays].sort((a, b) => a - b) : [0],
      reminderTimes: finalReminderTimes,
      reminderMinutesBefore: reminderDays.includes(1) ? 1440 : 0,
      repeatYearly,
      notified: false,
      createdAt: event?.createdAt || todayStr,
    };

    onSave(newEvent);
    onClose();
  };

  const selectedTypeMeta = EVENT_TYPES.find(t => t.type === type) || EVENT_TYPES[0];
  const dow = getDayOfWeek({ year: dateYear, month: dateMonth, day: dateDay });
  const weekdayName = WEEKDAYS[dow];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="bg-white rounded-3xl border border-emerald-100 shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{selectedTypeMeta.icon}</span>
            <div>
              <h2 className="text-base sm:text-lg font-black">
                {event ? 'ویرایش رویداد / یادآوری تقویم' : 'افزودن رویداد تقویم (تولد، جلسه، یادآور)'}
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                مستقل از تسک‌ها و عادت‌ها؛ یادآوری اختصاصی روی تقویم شمسی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* Event Type Grid */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              نوع رویداد:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map(item => {
                const isSelected = type === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleTypeSelect(item.type)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 font-black shadow-2xs ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[11px] leading-tight text-center">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              عنوان رویداد یا یادآوری <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تولد همسر، جلسه ارزیابی، تمدید بیمه ماشین..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white font-medium text-gray-900 transition-colors"
              autoFocus
            />
          </div>

          {/* Jalali Date Selection */}
          <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                <span>تاریخ رویداد:</span>
                <span className="text-emerald-700 font-extrabold mr-1">
                  {weekdayName}، {toPersianDigits(dateDay)} {PERSIAN_MONTHS[dateMonth - 1]} {toPersianDigits(dateYear)}
                </span>
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {toPersianDigits(`${dateYear}/${dateMonth.toString().padStart(2, '0')}/${dateDay.toString().padStart(2, '0')}`)}
              </span>
            </div>

            {/* Quick date buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickDate(0)}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-gray-200 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 cursor-pointer transition-colors"
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(1)}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-gray-200 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 cursor-pointer transition-colors"
              >
                فردا
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(7)}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-gray-200 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 cursor-pointer transition-colors"
              >
                هفته آینده
              </button>
            </div>

            {/* Dropdown selectors for Year, Month, Day */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Year */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">سال شمسی</label>
                <select
                  value={dateYear}
                  onChange={(e) => handleDatePartChange(parseInt(e.target.value, 10), dateMonth, dateDay)}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-hidden focus:border-emerald-500"
                >
                  {[today.year - 1, today.year, today.year + 1, today.year + 2].map(y => (
                    <option key={y} value={y}>{toPersianDigits(y)}</option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">ماه</label>
                <select
                  value={dateMonth}
                  onChange={(e) => handleDatePartChange(dateYear, parseInt(e.target.value, 10), dateDay)}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-hidden focus:border-emerald-500"
                >
                  {PERSIAN_MONTHS.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {toPersianDigits(idx + 1)} - {mName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day */}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">روز</label>
                <select
                  value={dateDay}
                  onChange={(e) => handleDatePartChange(dateYear, dateMonth, parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-hidden focus:border-emerald-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{toPersianDigits(d)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Time Picker Toggle */}
          <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTime}
                  onChange={(e) => handleToggleHasTime(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>تعیین ساعت مشخص برای رویداد</span>
              </label>
              {hasTime && (
                <span className="text-xs font-mono font-bold text-emerald-700">
                  ساعت: {toPersianDigits(time)}
                </span>
              )}
            </div>

            {hasTime && (
              <div className="pt-1 flex items-center gap-3">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleEventTimeChange(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-hidden focus:border-emerald-500"
                />
                <span className="text-[11px] text-gray-500">
                  (ساعت هشدار به طور خودکار با ساعت رویداد هماهنگ می‌شود)
                </span>
              </div>
            )}
          </div>

          {/* Reminder & Notification Settings (پشتیبانی از تا ۳ روز مختلف و تا ۳ ساعت و دقیقه) */}
          <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReminder}
                  onChange={(e) => setHasReminder(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
                <Bell className="w-4 h-4 text-emerald-700" />
                <span>فعال‌سازی یادآور و هشدار صوتی رویداد</span>
              </label>
              <button
                type="button"
                onClick={handleTestEventAlarm}
                className="text-[10px] text-emerald-900 font-extrabold bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="تست پخش صدای زنگ هشدار روی گوشی"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>تست صدای زنگ</span>
              </button>
            </div>

            {hasReminder && (
              <div className="pt-1 space-y-3.5">
                {/* 1. Multiple Days Selection (up to 3 days) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                      <span>۱. روزهای ارسال یادآور:</span>
                      <span className="text-[10px] text-gray-500 font-normal">(تا ۳ روز می‌توانید انتخاب کنید)</span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      {toPersianDigits(reminderDays.length)} از ۳ روز فعال
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {REMINDER_DAY_OPTIONS.map(opt => {
                      const isSelected = reminderDays.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleReminderDay(opt.value)}
                          className={`px-2.5 py-1.5 text-xs rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white font-extrabold shadow-2xs ring-1 ring-emerald-500'
                              : 'border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Multiple Times Selection (up to 3 times HH:MM) */}
                <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>۲. ساعت و دقیقه هشدارها:</span>
                      <span className="text-[10px] text-gray-500 font-normal">(تا ۳ زمان مشخص)</span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      {toPersianDigits(reminderTimes.length)} از ۳ زمان فعال
                    </span>
                  </div>

                  {/* List of active reminder times */}
                  <div className="space-y-1.5">
                    {reminderTimes.map((tStr, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-800 shrink-0 w-16">
                          یادآور {toPersianDigits(idx + 1)}:
                        </span>
                        <input
                          type="time"
                          value={tStr}
                          onChange={(e) => handleUpdateTime(idx, e.target.value)}
                          className="px-2.5 py-1 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-hidden focus:border-emerald-600"
                        />
                        <span className="text-[10px] text-gray-500 flex-1 truncate">
                          (ساعت {toPersianDigits(tStr)})
                        </span>
                        {reminderTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTime(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف این ساعت"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add additional time button (if < 3) */}
                  {reminderTimes.length < 3 && (
                    <button
                      type="button"
                      onClick={() => handleAddTime()}
                      className="w-full py-1.5 border border-dashed border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ افزودن زمان یادآور دیگر (ساعت {toPersianDigits(reminderTimes.length + 1)})</span>
                    </button>
                  )}

                  {/* Quick Preset Times */}
                  <div className="pt-1">
                    <span className="text-[10px] text-gray-500 block mb-1">پیش‌فرض‌های سریع ساعت:</span>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_TIME_PRESETS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            if (!reminderTimes.includes(p.value)) {
                              if (reminderTimes.length < 3) {
                                handleAddTime(p.value);
                              } else {
                                handleUpdateTime(0, p.value);
                              }
                            }
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            reminderTimes.includes(p.value)
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                      {hasTime && time && !reminderTimes.includes(time) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (reminderTimes.length < 3) {
                              handleAddTime(time);
                            } else {
                              handleUpdateTime(0, time);
                            }
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 font-bold cursor-pointer"
                        >
                          ساعت رویداد ({toPersianDigits(time)})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Repeat Yearly Toggle (For Birthdays / Anniversaries) */}
          <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200/80">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={repeatYearly}
                onChange={(e) => setRepeatYearly(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 mt-0.5 cursor-pointer"
              />
              <div className="text-xs text-purple-950">
                <span className="font-extrabold flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5 text-purple-600" />
                  <span>تکرار سالانه در همین روز و ماه (برای همیشه)</span>
                </span>
                <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                  مناسب برای سالروز تولد، سالگردها و مناسبت‌های هرساله که در سال‌های بعد نیز در همین تاریخ روی تقویم نمایش داده و یادآوری شوند.
                </p>
              </div>
            </label>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              یادداشت یا توضیحات تکمیلی (اختیاری):
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً: هدیه خریداری شود، دستور جلسه بررسی گزارش، لینک جلسه آنلاین..."
              rows={2}
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white text-gray-900 transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
            {event && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('آیا از حذف این رویداد مطمئن هستید؟')) {
                    onDelete(event.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف رویداد</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{event ? 'ذخیره تغییرات' : 'ثبت در تقویم'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
