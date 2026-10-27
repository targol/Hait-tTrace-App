import React, { useState } from 'react';
import { AppTask, Category, ReminderSettings, CalendarEvent } from '../types';
import { toPersianDigits } from '../calendar/jalali';
import { PRESET_ALARM_SOUNDS, playAlarmSound } from '../services/soundService';
import { Bell, Check, Clock, Volume2, X, RotateCcw, ChevronDown, Calendar } from 'lucide-react';

interface Props {
  isOpen: boolean;
  task: AppTask | null;
  calendarEvent?: CalendarEvent | null;
  category?: Category;
  soundTitle?: string;
  reminderSettings?: ReminderSettings;
  holidayNotice?: string | null;
  onDismiss: () => void;
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
  onSnoozeCalendarEvent?: (eventId: string, minutes: number) => void;
  onViewCalendarEvent?: (event: CalendarEvent) => void;
}

const EVENT_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  BIRTHDAY: { icon: '🎂', label: 'یادآور تولد' },
  MEETING: { icon: '👥', label: 'یادآور جلسه / قرار کاری' },
  REMINDER: { icon: '🔔', label: 'یادآوری مهم تقویم' },
  OCCASION: { icon: '💐', label: 'مناسبت شخصی' },
  ANNIVERSARY: { icon: '🎉', label: 'سالگرد' },
  OTHER: { icon: '📌', label: 'رویداد تقویم' },
};

export const ReminderAlertModal: React.FC<Props> = ({
  isOpen,
  task,
  calendarEvent,
  category,
  soundTitle = 'serenity',
  reminderSettings,
  holidayNotice,
  onDismiss,
  onComplete,
  onSnooze,
  onSnoozeCalendarEvent,
  onViewCalendarEvent,
}) => {
  const [isChoosingInterval, setIsChoosingInterval] = useState(false);

  if (!isOpen || (!task && !calendarEvent)) return null;

  const defaultInterval = reminderSettings?.snoozeIntervalMinutes || 10;
  const availableIntervals =
    reminderSettings?.availableSnoozeIntervals && reminderSettings.availableSnoozeIntervals.length > 0
      ? reminderSettings.availableSnoozeIntervals
      : [5, 10, 15, 30, 60];

  const matchedSound =
    PRESET_ALARM_SOUNDS.find((s) => s.id === (task?.customAlarmSound || soundTitle)) ||
    reminderSettings?.customSounds?.find((s) => s.id === (task?.customAlarmSound || soundTitle));
  const displaySoundName = matchedSound ? matchedSound.title : 'آرامش صبحگاهی';

  const isEventMode = Boolean(calendarEvent && !task);
  const eventMeta = calendarEvent
    ? EVENT_TYPE_LABELS[calendarEvent.type] || { icon: '📅', label: 'رویداد تقویم' }
    : null;

  const handleReplaySound = () => {
    const soundId = task?.customAlarmSound || reminderSettings?.selectedSoundId || 'serenity';
    playAlarmSound(soundId, reminderSettings?.customSounds || [], reminderSettings?.volume ?? 0.8, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-emerald-300 text-right overflow-hidden animate-scale-up">
        {/* Glowing Animated Top Header */}
        <div
          className={`p-5 sm:p-6 relative text-white ${
            isEventMode
              ? 'bg-gradient-to-l from-purple-700 via-indigo-700 to-teal-700'
              : holidayNotice
              ? 'bg-gradient-to-l from-rose-600 via-amber-600 to-emerald-700'
              : 'bg-gradient-to-l from-emerald-600 to-teal-700'
          }`}
        >
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 left-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner animate-bounce">
              <Bell className="w-6 h-6 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-100 bg-white/15 px-2.5 py-0.5 rounded-full inline-block mb-1">
                {isEventMode
                  ? `${eventMeta?.icon} ${eventMeta?.label}`
                  : holidayNotice
                  ? '🗓️ اطلاع‌رسانی تسک در روز تعطیل'
                  : '🔔 یادآور و آلارم جوانه'}
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                {isEventMode
                  ? 'زمان یادآور رویداد تقویم فرا رسید!'
                  : holidayNotice
                  ? 'پیش‌اعلام تسک در روز تعطیل رسمی'
                  : 'زمان انجام تسک فرا رسید!'}
              </h3>
            </div>
          </div>
        </div>

        {/* Details Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {holidayNotice && !isEventMode && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-900">
              <span className="text-base shrink-0">🎈</span>
              <div className="space-y-0.5 leading-relaxed">
                <strong className="text-xs font-black block">توجه: امروز تعطیل رسمی است!</strong>
                <p className="text-[11px] text-rose-800">
                  مناسبت امروز: <span className="font-bold underline decoration-rose-300">{holidayNotice}</span>. این
                  تسک برای امروز برنامه‌ریزی شده است.
                </p>
              </div>
            </div>
          )}

          {/* Main Card for Task or Calendar Event */}
          {isEventMode && calendarEvent ? (
            <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-200/90 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-purple-950 leading-snug flex items-center gap-2">
                  <span>{eventMeta?.icon}</span>
                  <span>{calendarEvent.title}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                  {eventMeta?.label}
                </span>
              </div>

              {calendarEvent.description && (
                <p className="text-xs text-gray-600 leading-relaxed pt-1.5 border-t border-purple-100">
                  {calendarEvent.description}
                </p>
              )}

              <div className="flex items-center flex-wrap gap-3 text-[11px] text-gray-600 pt-1">
                <span className="flex items-center gap-1 font-semibold text-purple-900">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>تاریخ: {toPersianDigits(calendarEvent.date)}</span>
                </span>
                {calendarEvent.time && (
                  <span className="flex items-center gap-1 font-semibold text-emerald-800">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ساعت رویداد: {toPersianDigits(calendarEvent.time)}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleReplaySound}
                  className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold bg-white px-2 py-0.5 rounded-md border border-teal-200 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>نغمه: {displaySoundName} (پخش مجدد)</span>
                </button>
              </div>
            </div>
          ) : task ? (
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100/90 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-emerald-950 leading-snug">{task.title}</span>
                {category && (
                  <span
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: `${category.colorHex}20`, color: category.colorHex }}
                  >
                    {category.title}
                  </span>
                )}
              </div>

              {task.notes && (
                <p className="text-xs text-gray-600 leading-relaxed pt-1 border-t border-emerald-100/60">
                  {task.notes}
                </p>
              )}

              <div className="flex items-center flex-wrap gap-3 text-[11px] text-gray-500 pt-1">
                {(task.time || task.reminderTime) && (
                  <span className="flex items-center gap-1 font-semibold text-emerald-800">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>زمان موعد: {toPersianDigits(task.time || task.reminderTime || '')}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleReplaySound}
                  className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold bg-white px-2 py-0.5 rounded-md border border-teal-200 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>نغمه: {displaySoundName} (پخش مجدد)</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {isEventMode && calendarEvent ? (
              <button
                type="button"
                onClick={() => {
                  onViewCalendarEvent?.(calendarEvent);
                  onDismiss();
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <Check className="w-4 h-4" />
                <span>متوجه شدم (مشاهده در تقویم)</span>
              </button>
            ) : task ? (
              <button
                type="button"
                onClick={() => {
                  onComplete(task.id);
                  onDismiss();
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <Check className="w-4 h-4" />
                <span>انجام شد (ثبت تکمیل تسک)</span>
              </button>
            ) : null}

            {/* Smart Snooze Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isEventMode && calendarEvent && onSnoozeCalendarEvent) {
                      onSnoozeCalendarEvent(calendarEvent.id, defaultInterval);
                    } else if (task) {
                      onSnooze(task.id, defaultInterval);
                    }
                    onDismiss();
                  }}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>{toPersianDigits(defaultInterval)} دقیقه بعد یادآوری کن</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsChoosingInterval(!isChoosingInterval)}
                  className="py-2.5 px-3 bg-amber-50/60 hover:bg-amber-100/70 text-amber-800 border border-amber-200/60 font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer text-xs"
                >
                  <span>سایر فواصل هوشمند</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isChoosingInterval ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Extended smart intervals popup row */}
              {isChoosingInterval && (
                <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 animate-fade-in flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-[10px] text-amber-900 w-full text-center font-bold pb-1">
                    انتخاب فاصله یادآوری مجدد:
                  </span>
                  {availableIntervals.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        if (isEventMode && calendarEvent && onSnoozeCalendarEvent) {
                          onSnoozeCalendarEvent(calendarEvent.id, mins);
                        } else if (task) {
                          onSnooze(task.id, mins);
                        }
                        onDismiss();
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-amber-500 hover:text-white text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {toPersianDigits(mins)} دقیقه
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={onDismiss}
                className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <span>قطع صدای آلارم و بستن</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
