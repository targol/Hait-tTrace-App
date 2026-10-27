import React from 'react';
import { X, Clock, Calendar, CheckCircle2, Hourglass, Flame, History, Award } from 'lucide-react';
import { FocusSessionLog } from '../types';
import { toPersianDigits } from '../calendar/jalali';

interface Props {
  isOpen: boolean;
  title: string;
  entityType: 'TASK' | 'HABIT';
  sessions: FocusSessionLog[];
  timerTargetMinutes?: number;
  currentElapsedSeconds?: number;
  currentProgressPercent?: number;
  onClose: () => void;
  onOpenTimerNow?: () => void;
}

export const FocusHistoryModal: React.FC<Props> = ({
  isOpen,
  title,
  entityType,
  sessions = [],
  timerTargetMinutes = 25,
  currentElapsedSeconds = 0,
  currentProgressPercent = 0,
  onClose,
  onOpenTimerNow,
}) => {
  if (!isOpen) return null;

  const totalSecondsAllSessions = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) + (currentElapsedSeconds || 0);
  const totalMinutesAllSessions = Math.floor(totalSecondsAllSessions / 60);
  const completedSessionsCount = sessions.filter(s => s.completed100 || s.progressPercent >= 100).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-emerald-100/90 relative text-right flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Hourglass className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 truncate max-w-[240px] sm:max-w-xs">{title}</h3>
              <p className="text-[11px] text-gray-500">تاریخچه جلسات و پیشرفت ساعت شنی تمرکز</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-2.5 my-4 shrink-0">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2.5 text-center">
            <span className="block text-[10px] text-emerald-800 font-medium">مجموع تمرکز</span>
            <span className="text-base font-black text-emerald-950 mt-0.5 block">
              {toPersianDigits(totalMinutesAllSessions)} <span className="text-[10px] font-normal">دقیقه</span>
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-2.5 text-center">
            <span className="block text-[10px] text-amber-800 font-medium">پیشرفت امروز</span>
            <span className="text-base font-black text-amber-950 mt-0.5 block">
              {toPersianDigits(currentProgressPercent)}٪
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-2.5 text-center">
            <span className="block text-[10px] text-blue-800 font-medium">جلسات ۱۰۰٪</span>
            <span className="text-base font-black text-blue-950 mt-0.5 block">
              {toPersianDigits(completedSessionsCount)} <span className="text-[10px] font-normal">بار</span>
            </span>
          </div>
        </div>

        {/* Current State / Resume Banner */}
        <div className="bg-gradient-to-r from-amber-50/90 to-emerald-50/90 p-3.5 rounded-2xl border border-amber-200/70 mb-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>وضعیت ساعت شنی امروز:</span>
            </span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              currentProgressPercent >= 100 
                ? 'bg-emerald-600 text-white'
                : currentProgressPercent > 0 
                ? 'bg-amber-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}>
              {currentProgressPercent >= 100 ? '۱۰۰٪ تکمیل شده' : currentProgressPercent > 0 ? `نصفه مانده (${toPersianDigits(currentProgressPercent)}٪)` : 'هنوز شروع نشده'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200/80 rounded-full h-2.5 mt-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                currentProgressPercent >= 100 ? 'bg-emerald-600' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, currentProgressPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-600">
            <span>تمرکز هدف: {toPersianDigits(timerTargetMinutes)} دقیقه</span>
            <span>تمرکز تا کنون: {toPersianDigits(Math.floor(currentElapsedSeconds / 60))} دقیقه و {toPersianDigits(currentElapsedSeconds % 60)} ثانیه</span>
          </div>

          {currentProgressPercent < 100 && onOpenTimerNow && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTimerNow();
              }}
              className="w-full mt-2.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>{currentElapsedSeconds > 0 ? 'ادامه دادن ساعت شنی در بقیه روز' : 'روشن کردن ساعت شنی تمرکز'}</span>
            </button>
          )}
        </div>

        {/* Sessions List */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2 shrink-0">
          <span className="flex items-center gap-1">
            <History className="w-3.5 h-3.5 text-emerald-600" />
            <span>گزارش جلسات ثبت‌شده ({toPersianDigits(sessions.length)})</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
              هنوز جلسه تمرکزی برای این {entityType === 'HABIT' ? 'عادت' : 'تسک'} ذخیره نشده است. با فعال کردن ساعت شنی، تاریخچه تمرکز شما در اینجا ثبت می‌شود.
            </div>
          ) : (
            sessions.map((s, idx) => {
              const minutes = Math.floor((s.durationSeconds || 0) / 60);
              const seconds = (s.durationSeconds || 0) % 60;
              const dateDisplay = s.dateStr || 'نامشخص';
              const timeDisplay = s.timestamp ? new Date(s.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div
                  key={s.id || idx}
                  className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-3 hover:border-emerald-200 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      s.completed100 || s.progressPercent >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {s.completed100 || s.progressPercent >= 100 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Hourglass className="w-4 h-4 text-amber-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {toPersianDigits(minutes)} دقیقه {seconds > 0 ? `و ${toPersianDigits(seconds)} ثانیه` : ''}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                          s.completed100 || s.progressPercent >= 100
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {toPersianDigits(s.progressPercent)}٪
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{toPersianDigits(dateDisplay)}</span>
                        {timeDisplay && <span>• ساعت {toPersianDigits(timeDisplay)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {s.completed100 || s.progressPercent >= 100 ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>۱۰۰٪ تکمیل</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        جلسه نصفه
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 flex justify-end shrink-0 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            بستن پنجره تاریخچه
          </button>
        </div>
      </div>
    </div>
  );
};
