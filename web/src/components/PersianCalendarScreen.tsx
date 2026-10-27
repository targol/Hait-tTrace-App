import React, { useState } from 'react';
import { AppTask, Habit, Category, Goal, CalendarEvent } from '../types';
import { 
  getTodayJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  PERSIAN_MONTHS, 
  WEEKDAYS, 
  WEEKDAYS_SHORT, 
  getDayOfWeek, 
  getDaysInJalaliMonth, 
  isDateHoliday,
  JalaliDate,
  compareJalaliDateStrings
} from '../calendar/jalali';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Circle, 
  Play, 
  Flame, 
  Check, 
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  Hourglass,
  Bell,
  Plus,
  Edit3,
  Trash2,
  Cake,
  Users,
  Repeat
} from 'lucide-react';


interface Props {
  tasks: AppTask[];
  habits: Habit[];
  categories: Category[];
  goals: Goal[];
  calendarEvents?: CalendarEvent[];
  onToggleTask: (taskId: string) => void;
  onToggleHabitDate: (habitId: string, dateStr: string) => void;
  onOpenTimer: (
    title: string,
    minutes: number,
    onDone?: (elapsedSeconds: number, isFullyCompleted: boolean) => void,
    options?: {
      entityType?: 'TASK' | 'HABIT';
      taskId?: string;
      habitId?: string;
      initialElapsedSeconds?: number;
      currentProgressPercent?: number;
    }
  ) => void;
  onNewTaskWithDate?: (dateStr: string) => void;
  onNewCalendarEvent?: (dateStr: string) => void;
  onEditCalendarEvent?: (event: CalendarEvent) => void;
  onDeleteCalendarEvent?: (eventId: string) => void;
}

export const PersianCalendarScreen: React.FC<Props> = ({
  tasks,
  habits,
  categories,
  goals,
  calendarEvents = [],
  onToggleTask,
  onToggleHabitDate,
  onOpenTimer,
  onNewTaskWithDate,
  onNewCalendarEvent,
  onEditCalendarEvent,
  onDeleteCalendarEvent,
}) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);

  const [currentYear, setCurrentYear] = useState<number>(today.year);
  const [currentMonth, setCurrentMonth] = useState<number>(today.month);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const daysInMonth = getDaysInJalaliMonth(currentYear, currentMonth);

  // First day of month weekday index: 0=Sat (شنبه) .. 6=Fri (جمعه)
  const firstDayOfMonthDow = getDayOfWeek({ year: currentYear, month: currentMonth, day: 1 });

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.year);
    setCurrentMonth(today.month);
    setSelectedDateStr(todayStr);
  };

  // Build calendar grid days
  const calendarCells = React.useMemo(() => {
    const cells = [];
    // Empty prefix cells for days before the 1st
    for (let i = 0; i < firstDayOfMonthDow; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const jDate: JalaliDate = { year: currentYear, month: currentMonth, day };
      const dateStr = jalaliToFormattedString(jDate);
      const holCheck = isDateHoliday(jDate);
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDateStr;

      // Filter tasks for this date
      const dateTasks = tasks.filter(t => {
        if (t.isArchived) return false;
        if (t.dueDate === dateStr) return true;
        if (t.completedAt === dateStr) return true;
        if (t.repeatType === 'DAILY') return true;
        if (t.repeatType === 'WEEKLY' && t.repeatDaysOfWeek?.includes(getDayOfWeek(jDate))) return true;
        return false;
      });

      // Filter habits active or done on this date
      const dow = getDayOfWeek(jDate);
      const dateHabits = habits.filter(h => {
        if (h.isClosed) return false;
        if (h.completionHistory?.[dateStr]) return true;
        const targetDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
        return targetDays.includes(dow);
      });

      // Filter calendar events for this date (birthdays, meetings, reminders)
      const dateEvents = calendarEvents.filter(e => {
        if (e.repeatYearly) {
          return e.date.slice(5) === dateStr.slice(5);
        }
        return e.date === dateStr;
      });

      cells.push({
        empty: false,
        key: dateStr,
        day,
        dateStr,
        jDate,
        isToday,
        isSelected,
        holiday: holCheck,
        taskCount: dateTasks.length,
        doneTaskCount: dateTasks.filter(t => t.isCompleted).length,
        habitCount: dateHabits.length,
        doneHabitCount: dateHabits.filter(h => !!h.completionHistory?.[dateStr]).length,
        eventCount: dateEvents.length,
        events: dateEvents,
        hasBirthday: dateEvents.some(e => e.type === 'BIRTHDAY'),
        hasMeeting: dateEvents.some(e => e.type === 'MEETING'),
      });
    }
    return cells;
  }, [currentYear, currentMonth, daysInMonth, firstDayOfMonthDow, tasks, habits, calendarEvents, selectedDateStr, todayStr]);

  // Selected Date details
  const selectedJDate = React.useMemo(() => {
    const parts = selectedDateStr.split('/').map(p => parseInt(p, 10));
    return { year: parts[0] || today.year, month: parts[1] || today.month, day: parts[2] || today.day };
  }, [selectedDateStr, today]);

  // Selected date calendar events
  const selectedEvents = React.useMemo(() => {
    return calendarEvents.filter(e => {
      if (e.repeatYearly) {
        return e.date.slice(5) === selectedDateStr.slice(5);
      }
      return e.date === selectedDateStr;
    });
  }, [calendarEvents, selectedDateStr]);

  const selectedHolidayInfo = React.useMemo(() => {
    return isDateHoliday(selectedJDate);
  }, [selectedJDate]);

  const selectedDow = getDayOfWeek(selectedJDate);

  // Selected date tasks
  const selectedTasks = React.useMemo(() => {
    return tasks.filter(t => {
      if (t.isArchived) return false;
      if (t.dueDate === selectedDateStr) return true;
      if (t.completedAt === selectedDateStr) return true;
      if (t.repeatType === 'DAILY') return true;
      if (t.repeatType === 'WEEKLY' && t.repeatDaysOfWeek?.includes(selectedDow)) return true;
      return false;
    });
  }, [tasks, selectedDateStr, selectedDow]);

  // Selected date habits
  const selectedHabits = React.useMemo(() => {
    return habits.filter(h => {
      if (h.isClosed) return false;
      if (h.completionHistory?.[selectedDateStr]) return true;
      const targetDays = h.targetDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
      return targetDays.includes(selectedDow);
    });
  }, [habits, selectedDateStr, selectedDow]);

  const getCategory = (catId: string) => categories.find(c => c.id === catId);

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Calendar Header Card */}
      <div className="bg-white rounded-2xl border border-emerald-100/90 p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Navigation & Month Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-emerald-950 flex items-center gap-2">
                <span>{PERSIAN_MONTHS[currentMonth - 1]}</span>
                <span className="text-emerald-700">{toPersianDigits(currentYear)}</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                تقویم رسمی شمسی ایران همراه با تعطیلات رسمی و وضعیت تسک‌ها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
            >
              برو به امروز
            </button>
            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="ماه قبل"
                className="p-1.5 hover:bg-white text-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="ماه بعد"
                className="p-1.5 hover:bg-white text-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend / Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-2xs"></span>
              <span>تعطیلات رسمی ایران و جمعه‌ها (قرمز)</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-purple-700">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-2xs"></span>
              <span>رویدادها (تولد، جلسه، یادآور)</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              <span>روز کاری عادی</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              <span>دارای تسک / برنامه</span>
            </span>
          </div>

          <div className="text-gray-400 text-[10px]">
            با کلیک روی هر روز، تسک‌ها، رویدادها و تعطیلات آن روز نمایش داده می‌شود
          </div>
        </div>

        {/* Weekday Names Header (شنبه تا جمعه) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-gray-500 pt-1">
          {WEEKDAYS_SHORT.map((wName, idx) => {
            const isFriday = idx === 6;
            return (
              <div
                key={wName}
                className={`py-2 rounded-lg text-center ${
                  isFriday ? 'text-rose-600 bg-rose-50/60 font-extrabold' : 'text-gray-600 bg-gray-50/70'
                }`}
              >
                {wName}
              </div>
            );
          })}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map(cell => {
            if (cell.empty) {
              return <div key={cell.key} className="h-16 sm:h-20 rounded-xl bg-transparent"></div>;
            }

            const isHoliday = cell.holiday?.isHoliday;
            const holidayTitle = cell.holiday?.title;

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDateStr(cell.dateStr)}
                className={`h-16 sm:h-20 rounded-xl p-1 sm:p-1.5 text-right transition-all flex flex-col justify-between cursor-pointer border relative select-none ${
                  cell.isSelected
                    ? isHoliday
                      ? 'border-rose-500 ring-2 ring-rose-400/50 bg-rose-50/90 shadow-xs'
                      : 'border-emerald-600 ring-2 ring-emerald-400/50 bg-emerald-50/90 shadow-xs'
                    : isHoliday
                    ? 'border-rose-200/80 bg-rose-50/40 hover:bg-rose-100/60'
                    : cell.isToday
                    ? 'border-emerald-400 bg-emerald-50/50 hover:bg-emerald-100/50'
                    : 'border-gray-200/80 bg-white hover:border-emerald-200 hover:bg-gray-50/60'
                }`}
                title={isHoliday ? `تعطیل رسمی: ${holidayTitle}` : cell.dateStr}
              >
                {/* Header: Day number + Holiday badge */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs sm:text-sm font-extrabold ${
                      isHoliday
                        ? 'text-rose-600'
                        : cell.isToday
                        ? 'text-emerald-700'
                        : 'text-gray-800'
                    }`}
                  >
                    {toPersianDigits(cell.day)}
                  </span>

                  {cell.isToday && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-emerald-600 text-white shrink-0">
                      امروز
                    </span>
                  )}
                </div>

                {/* Holiday Name Label (truncate) */}
                {isHoliday && holidayTitle && (
                  <div className="w-full">
                    <span className="block text-[9px] sm:text-[10px] font-bold text-rose-700 bg-rose-100/90 border border-rose-200/70 px-1 py-0.5 rounded truncate text-center leading-tight">
                      {holidayTitle}
                    </span>
                  </div>
                )}

                {/* Indicators: Task Dots / Counts / Events */}
                <div className="flex items-center justify-between w-full mt-auto text-[10px] gap-1">
                  <div className="flex items-center gap-1 min-w-0 flex-wrap">
                    {cell.taskCount > 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-bold text-[9px] ${
                          cell.doneTaskCount === cell.taskCount
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        <span>{toPersianDigits(cell.doneTaskCount)}/{toPersianDigits(cell.taskCount)}</span>
                        <span className="hidden sm:inline">تسک</span>
                      </span>
                    )}

                    {cell.eventCount > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-bold text-[9px] bg-purple-100 text-purple-900 border border-purple-200"
                        title={`${toPersianDigits(cell.eventCount)} رویداد یا یادآور`}
                      >
                        <span>{cell.hasBirthday ? '🎂' : cell.hasMeeting ? '👥' : '🔔'}</span>
                        <span>{toPersianDigits(cell.eventCount)}</span>
                      </span>
                    )}
                  </div>

                  {cell.habitCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title={`${toPersianDigits(cell.habitCount)} عادت`}></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Section */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Header of selected day */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-gray-900">
                برنامه {WEEKDAYS[selectedDow]}، {toPersianDigits(selectedJDate.day)} {PERSIAN_MONTHS[selectedJDate.month - 1]} {toPersianDigits(selectedJDate.year)}
              </h3>
              {selectedDateStr === todayStr && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                  امروز
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {toPersianDigits(selectedEvents.length)} رویداد تقویم • {toPersianDigits(selectedTasks.length)} تسک • {toPersianDigits(selectedHabits.length)} عادت
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNewCalendarEvent && (
              <button
                type="button"
                onClick={() => onNewCalendarEvent(selectedDateStr)}
                className="text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ رویداد / یادآور</span>
              </button>
            )}
            {onNewTaskWithDate && (
              <button
                type="button"
                onClick={() => onNewTaskWithDate(selectedDateStr)}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + تسک جدید
              </button>
            )}
          </div>
        </div>

        {/* Holiday Warning Notice if holiday */}
        {selectedHolidayInfo.isHoliday && (
          <div className="p-3.5 bg-rose-50/90 border border-rose-200 rounded-xl flex items-start gap-3">
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs text-rose-950">
              <div className="font-bold flex items-center gap-2">
                <span>توجه: این روز در تقویم رسمی کشور تعطیل است!</span>
                <span className="text-[11px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-extrabold">
                  {selectedHolidayInfo.title}
                </span>
              </div>
              <p className="text-rose-800 leading-relaxed text-[11px]">
                اگر برای این روز کاری برنامه‌ریزی می‌کنید، در نظر داشته باشید که ادارات، دانشگاه‌ها یا کسب‌وکارها تعطیل هستند. برای حفظ آرامش و تجدید قوا یا انجام پروژه‌های شخصی برنامه‌ریزی کنید.
              </p>
            </div>
          </div>
        )}

        {/* Calendar Events & Reminders for Selected Day (تولد، جلسه، یادآور تقویم) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-purple-600" />
              <span>رویدادها و یادآوری‌های این روز ({toPersianDigits(selectedEvents.length)})</span>
              <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">(تولد، جلسه، مناسبت و یادآور تقویم با هشدار)</span>
            </h4>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 bg-purple-50/20 rounded-xl border border-dashed border-purple-200/80 text-center">
              هیچ رویدادی (تولد، جلسه یا یادآوری مستقل) برای این تاریخ ثبت نشده است. برای ثبت رویداد یا یادآور جدید از دکمه «+ رویداد / یادآور» در بالای صفحه استفاده کنید.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedEvents.map(ev => {
                const typeIcons: Record<string, string> = {
                  BIRTHDAY: '🎂',
                  MEETING: '👥',
                  REMINDER: '🔔',
                  OCCASION: '💐',
                  ANNIVERSARY: '🎉',
                  OTHER: '📌',
                };
                const typeTitles: Record<string, string> = {
                  BIRTHDAY: 'تولد',
                  MEETING: 'جلسه / قرار کاری',
                  REMINDER: 'یادآوری مهم',
                  OCCASION: 'مناسبت شخصی',
                  ANNIVERSARY: 'سالگرد',
                  OTHER: 'سایر رویدادها',
                };

                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50/50 to-indigo-50/30 hover:border-purple-300 transition-all flex items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{typeIcons[ev.type] || '📅'}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-bold text-gray-900 truncate">
                            {ev.title}
                          </h5>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-white text-purple-800 border border-purple-200">
                            {typeTitles[ev.type] || 'رویداد'}
                          </span>
                          {ev.repeatYearly && (
                            <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-purple-100 text-purple-800">
                              تکرار سالانه
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5 flex-wrap">
                          {ev.time && (
                            <span className="font-mono text-purple-700 font-bold">
                              ساعت {toPersianDigits(ev.time)}
                            </span>
                          )}
                          {ev.hasReminder && (
                            <span className="text-emerald-700 flex items-center gap-0.5">
                              <Bell className="w-2.5 h-2.5" />
                              <span>
                                {ev.reminderMinutesBefore === 0
                                  ? 'هم‌زمان'
                                  : `${toPersianDigits(ev.reminderMinutesBefore || 15)} د. قبل`}
                              </span>
                            </span>
                          )}
                          {ev.description && (
                            <span className="text-gray-600 truncate max-w-[150px]">
                              • {ev.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onEditCalendarEvent && (
                        <button
                          type="button"
                          onClick={() => onEditCalendarEvent(ev)}
                          className="p-1 text-gray-400 hover:text-purple-700 hover:bg-white rounded-md transition-colors cursor-pointer"
                          title="ویرایش رویداد"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteCalendarEvent && (
                        <button
                          type="button"
                          onClick={() => onDeleteCalendarEvent(ev.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                          title="حذف رویداد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks List for Selected Day */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>تسک‌های این روز ({toPersianDigits(selectedTasks.filter(t => t.isCompleted).length)} از {toPersianDigits(selectedTasks.length)} انجام شده)</span>
            </span>
          </h4>

          {selectedTasks.length === 0 ? (
            <div className="p-5 text-center text-xs text-gray-500 bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
              هیچ تسکی برای تاریخ {toPersianDigits(selectedDateStr)} ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map(t => {
                const cat = getCategory(t.categoryId);
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      t.isCompleted
                        ? 'border-gray-200 bg-gray-50/70 opacity-80'
                        : 'border-emerald-100/90 bg-white hover:border-emerald-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleTask(t.id)}
                        className="cursor-pointer text-gray-300 hover:text-emerald-600 transition-colors shrink-0"
                      >
                        {t.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
                        ) : (
                          <Circle className="w-5 h-5 hover:text-emerald-500" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${t.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {t.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-gray-500">
                          {cat && (
                            <span
                              className="px-1.5 py-0.2 rounded-md font-medium text-[10px]"
                              style={{ backgroundColor: `${cat.colorHex}15`, color: cat.colorHex }}
                            >
                              {cat.name}
                            </span>
                          )}
                          {t.time && (
                            <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              <span>{toPersianDigits(t.time)}</span>
                            </span>
                          )}
                          {t.focusProgressPercent !== undefined && t.focusProgressPercent > 0 && (
                            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-bold">
                              پیشرفت تمرکز: {toPersianDigits(t.focusProgressPercent)}٪
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!t.isCompleted && (
                      <button
                        type="button"
                        onClick={() => {
                          // If holiday, notify user before start!
                          if (selectedHolidayInfo.isHoliday) {
                            const proceed = window.confirm(`توجه: امروز به دلیل «${selectedHolidayInfo.title}» تعطیل رسمی است. آیا مایل به شروع جلسه تمرکز هستید؟`);
                            if (!proceed) return;
                          }
                          onOpenTimer(
                            t.title,
                            Math.floor(t.timerSecondsTarget / 60) || 25,
                            (elapsed, isDone) => {
                              if (isDone) onToggleTask(t.id);
                            },
                            {
                              entityType: 'TASK',
                              taskId: t.id,
                              initialElapsedSeconds: t.timerSecondsElapsed || 0,
                              currentProgressPercent: t.focusProgressPercent || 0,
                            }
                          );
                        }}
                        title="شروع ساعت شنی تمرکز"
                        className="py-1.5 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Hourglass className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تمرکز</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Habits List for Selected Day */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>عادات ثبت شده برای این روز</span>
          </h4>

          {selectedHabits.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500 bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
              هیچ عادتی برای این روز تعریف نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedHabits.map(h => {
                const isDone = !!h.completionHistory?.[selectedDateStr];
                return (
                  <div
                    key={h.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                      isDone
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-gray-200 bg-white hover:border-emerald-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{h.title}</p>
                      <span className="text-[10px] text-gray-500">
                        {isDone ? '✓ در این روز انجام شده' : 'هنوز انجام نشده'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleHabitDate(h.id, selectedDateStr)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>انجام شد</span>
                        </>
                      ) : (
                        <span>ثبت انجام</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
