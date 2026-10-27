import React, { useState } from 'react';
import { Goal, GoalStatus, AppTask } from '../types';
import { toPersianDigits, PERSIAN_MONTHS } from '../calendar/jalali';
import { 
  X, 
  Clock, 
  History, 
  Edit3, 
  Plus, 
  CheckCircle2, 
  PlayCircle, 
  PauseCircle, 
  Circle,
  Calendar,
  Sparkles,
  Layers,
  Flag,
  MessageSquare,
  ArrowUpDown,
  Filter,
  CheckCheck,
  Tag
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  goal: Goal | null;
  subGoals?: Goal[];
  linkedTasks?: AppTask[];
  onClose: () => void;
  onEdit: (goal: Goal) => void;
  onUpdateStatus: (goalId: string, status: GoalStatus, note?: string) => void;
  onAddNote: (goalId: string, note: string) => void;
  onAddMilestone?: (goalId: string, title: string) => void;
}

const SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];

type TimelineFilter = 'ALL' | 'STATUS' | 'NOTE' | 'MILESTONE';

export const GoalDetailHistoryModal: React.FC<Props> = ({
  isOpen,
  goal,
  subGoals = [],
  linkedTasks = [],
  onClose,
  onEdit,
  onUpdateStatus,
  onAddNote,
  onAddMilestone,
}) => {
  const [newNote, setNewNote] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [activeActionForm, setActiveActionForm] = useState<'NONE' | 'NOTE' | 'MILESTONE'>('NONE');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC'); // DESC: Newest first

  if (!isOpen || !goal) return null;

  const handleStatusClick = (status: GoalStatus) => {
    if (status === goal.status) return;
    onUpdateStatus(goal.id, status);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(goal.id, newNote.trim());
    setNewNote('');
    setActiveActionForm('NONE');
  };

  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    if (onAddMilestone) {
      onAddMilestone(goal.id, newMilestone.trim());
    } else {
      // Fallback: log as note with milestone prefix
      onAddNote(goal.id, `🏁 دستیابی به نقطه عطف: ${newMilestone.trim()}`);
    }
    setNewMilestone('');
    setActiveActionForm('NONE');
  };

  const getStatusBadge = (s: GoalStatus) => {
    switch (s) {
      case 'COMPLETED':
        return { label: 'تکمیل شده', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 };
      case 'IN_PROGRESS':
        return { label: 'در حال انجام', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: PlayCircle };
      case 'PAUSED':
        return { label: 'متوقف شده', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: PauseCircle };
      case 'NOT_STARTED':
      default:
        return { label: 'شروع نشده', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Circle };
    }
  };

  const currentStatus = getStatusBadge(goal.status);
  const StatusIcon = currentStatus.icon;

  // Filter history items
  const rawHistory = goal.history || [];
  const filteredHistory = rawHistory.filter(entry => {
    if (timelineFilter === 'ALL') return true;
    if (timelineFilter === 'STATUS') return entry.action === 'STATUS_CHANGED';
    if (timelineFilter === 'NOTE') return entry.action === 'NOTE_ADDED';
    if (timelineFilter === 'MILESTONE') return entry.action === 'MILESTONE_COMPLETED';
    return true;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    return sortOrder === 'DESC' ? 0 : 0; // The original history array is usually newest-first, slice().reverse() was oldest-first
  });
  const displayHistory = sortOrder === 'DESC' ? sortedHistory : [...sortedHistory].reverse();

  // Counts for filters
  const statusChangesCount = rawHistory.filter(e => e.action === 'STATUS_CHANGED').length;
  const notesCount = rawHistory.filter(e => e.action === 'NOTE_ADDED').length;
  const milestonesCount = rawHistory.filter(e => e.action === 'MILESTONE_COMPLETED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl border border-emerald-100 relative my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
              {goal.period === 'ANNUAL' ? `هدف سالانه ${toPersianDigits(goal.year)}` : goal.period === 'SEASONAL' ? 'هدف میانی فصلی' : 'هدف میانی ماهانه'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${currentStatus.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{currentStatus.label}</span>
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mt-1">{goal.title}</h3>

          {goal.visionWhy && (
            <div className="mt-2 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">چرا این هدف مهم است:</strong>
                <span>{goal.visionWhy}</span>
              </div>
            </div>
          )}

          {goal.description && (
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              {goal.description}
            </p>
          )}

          {/* Schedule metadata */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>تاریخ فعال‌سازی: {toPersianDigits(goal.startDate || goal.createdAt)}</span>
            </span>

            {goal.seasonIndex !== undefined && (
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>فصل: {SEASONS[goal.seasonIndex]}</span>
              </span>
            )}

            {goal.monthIndex !== undefined && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>ماه: {PERSIAN_MONTHS[goal.monthIndex - 1]}</span>
              </span>
            )}
          </div>
        </div>

        {/* Status quick changer */}
        <div className="py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-700">تغییر وضعیت هدف:</span>
          <div className="flex gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleStatusClick('IN_PROGRESS')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                goal.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              در حال انجام
            </button>
            <button
              type="button"
              onClick={() => handleStatusClick('COMPLETED')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                goal.status === 'COMPLETED' ? 'bg-emerald-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              تکمیل شده
            </button>
            <button
              type="button"
              onClick={() => handleStatusClick('PAUSED')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                goal.status === 'PAUSED' ? 'bg-amber-600 text-white font-bold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              متوقف
            </button>
          </div>
        </div>

        {/* Milestones / Sub-goals Summary (if any exist) */}
        {subGoals.length > 0 && (
          <div className="py-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-emerald-600" />
                <span>گام‌های میانی و نقاط عطف هدف ({toPersianDigits(subGoals.filter(s => s.status === 'COMPLETED').length)} از {toPersianDigits(subGoals.length)})</span>
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {[...subGoals].sort((a, b) => {
                if (a.period === 'SEASONAL' && b.period === 'SEASONAL') {
                  return (a.seasonIndex ?? 0) - (b.seasonIndex ?? 0);
                }
                if (a.period === 'MONTHLY' && b.period === 'MONTHLY') {
                  return (a.monthIndex ?? 1) - (b.monthIndex ?? 1);
                }
                return (a.startDate || a.createdAt || '').localeCompare(b.startDate || b.createdAt || '');
              }).map(sg => {
                const isDone = sg.status === 'COMPLETED';
                return (
                  <div
                    key={sg.id}
                    className={`shrink-0 px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                      isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {isDone ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Circle className="w-3 h-3 text-gray-400" />}
                    <span className="truncate max-w-[130px]">{sg.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dedicated Chronological Timeline Section */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {/* Section Header with Controls */}
          <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                <span>تایم‌لاین زمانی تحولات هدف</span>
                <span className="bg-emerald-200/80 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {toPersianDigits(rawHistory.length)}
                </span>
              </h4>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                  className="px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-[10px] font-semibold text-gray-700 flex items-center gap-1 transition-colors"
                  title="تغییر ترتیب نمایش زمانی"
                >
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                  <span>{sortOrder === 'DESC' ? 'جدیدترین اول' : 'قدیمی‌ترین اول'}</span>
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5 shrink-0 pl-1">
                <Filter className="w-3 h-3" />
                <span>فیلتر:</span>
              </span>
              <button
                type="button"
                onClick={() => setTimelineFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg border shrink-0 transition-colors ${
                  timelineFilter === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                همه ({toPersianDigits(rawHistory.length)})
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('STATUS')}
                className={`px-2 py-0.5 rounded-lg border shrink-0 transition-colors ${
                  timelineFilter === 'STATUS'
                    ? 'bg-purple-600 text-white font-bold border-purple-600 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                تغییر وضعیت ({toPersianDigits(statusChangesCount)})
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('NOTE')}
                className={`px-2 py-0.5 rounded-lg border shrink-0 transition-colors ${
                  timelineFilter === 'NOTE'
                    ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                یادداشت‌ها ({toPersianDigits(notesCount)})
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('MILESTONE')}
                className={`px-2 py-0.5 rounded-lg border shrink-0 transition-colors ${
                  timelineFilter === 'MILESTONE'
                    ? 'bg-teal-600 text-white font-bold border-teal-600 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                نقاط عطف ({toPersianDigits(milestonesCount)})
              </button>
            </div>
          </div>

          {/* Quick Action Buttons for adding Notes and Milestones */}
          {activeActionForm === 'NONE' && (
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveActionForm('NOTE')}
                className="flex-1 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                <span>افزودن یادداشت پیشرفت</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveActionForm('MILESTONE')}
                className="flex-1 py-1.5 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-teal-900 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-teal-700" />
                <span>ثبت نقطه عطف انجام شده</span>
              </button>
            </div>
          )}

          {/* Add Note Form */}
          {activeActionForm === 'NOTE' && (
            <form onSubmit={handleSaveNote} className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-2 text-xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-amber-950 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                  <span>ثبت یادداشت یا گزارش پیشرفت:</span>
                </label>
              </div>
              <textarea
                rows={2}
                required
                placeholder="توضیح پیشرفت کار، نتیجه بررسی یا نکته جدید را بنویسید..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-2 bg-white rounded-lg border border-amber-300 focus:outline-hidden text-xs text-gray-800 placeholder:text-gray-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveActionForm('NONE')}
                  className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs"
                >
                  ثبت یادداشت در تایم‌لاین
                </button>
              </div>
            </form>
          )}

          {/* Add Milestone Form */}
          {activeActionForm === 'MILESTONE' && (
            <form onSubmit={handleSaveMilestone} className="bg-teal-50/80 p-3 rounded-xl border border-teal-200 space-y-2 text-xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-teal-950 flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5 text-teal-700" />
                  <span>عنوان نقطه عطف یا گام تکمیل شده:</span>
                </label>
              </div>
              <input
                type="text"
                required
                placeholder="مثلاً: اتمام دوره مقدماتی، انتشار نگارش اول، پایان فصل..."
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                className="w-full p-2 bg-white rounded-lg border border-teal-300 focus:outline-hidden text-xs text-gray-800 placeholder:text-gray-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveActionForm('NONE')}
                  className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-xs"
                >
                  ثبت دستاورد نقطه عطف
                </button>
              </div>
            </form>
          )}

          {/* Chronological Timeline Entries */}
          <div className="space-y-3 pr-2 border-r-2 border-emerald-100 mr-2">
            {displayHistory.length === 0 ? (
              <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-xs">
                <Clock className="w-6 h-6 mx-auto text-gray-300 mb-1" />
                <p>هیچ رویدادی با فیلتر انتخابی ثبت نشده است.</p>
                {timelineFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setTimelineFilter('ALL')}
                    className="text-emerald-700 font-semibold mt-1 underline hover:text-emerald-800"
                  >
                    نمایش همه رویدادها
                  </button>
                )}
              </div>
            ) : (
              displayHistory.map((entry) => {
                let badgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
                let dotColor = 'bg-gray-400';
                let actionTitle = 'رویداد';
                let ActionIcon = Tag;

                if (entry.action === 'CREATED') {
                  badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  dotColor = 'bg-emerald-500';
                  actionTitle = 'ثبت و راه‌اندازی هدف';
                  ActionIcon = Sparkles;
                } else if (entry.action === 'EDITED') {
                  badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                  dotColor = 'bg-blue-500';
                  actionTitle = 'ویرایش اطلاعات';
                  ActionIcon = Edit3;
                } else if (entry.action === 'STATUS_CHANGED') {
                  badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                  dotColor = 'bg-purple-500';
                  actionTitle = 'تغییر وضعیت';
                  ActionIcon = CheckCircle2;
                } else if (entry.action === 'NOTE_ADDED') {
                  badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                  dotColor = 'bg-amber-500';
                  actionTitle = 'یادداشت پیشرفت';
                  ActionIcon = MessageSquare;
                } else if (entry.action === 'MILESTONE_COMPLETED') {
                  badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
                  dotColor = 'bg-teal-500';
                  actionTitle = 'دستیابی به نقطه عطف';
                  ActionIcon = Flag;
                }

                return (
                  <div key={entry.id} className="relative pr-5 pb-1 group">
                    {/* Visual Dot on Timeline Axis */}
                    <div className={`absolute -right-[23px] top-1.5 w-3 h-3 rounded-full ${dotColor} ring-4 ring-white shadow-xs`} />
                    
                    {/* Event Card */}
                    <div className="p-2.5 bg-gray-50/70 hover:bg-gray-50 rounded-xl border border-gray-200/80 transition-all">
                      <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border flex items-center gap-1 ${badgeColor}`}>
                          <ActionIcon className="w-3 h-3" />
                          <span>{actionTitle}</span>
                        </span>
                        <span className="text-gray-400 font-mono text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span>{toPersianDigits(entry.timestamp)}</span>
                        </span>
                      </div>

                      <p className="text-xs text-gray-800 leading-relaxed font-medium">
                        {entry.description}
                      </p>

                      {entry.previousValues?.status && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center gap-1.5 text-[10px] text-gray-500">
                          <span>وضعیت قبلی:</span>
                          <span className="px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 font-semibold">
                            {getStatusBadge(entry.previousValues.status).label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(goal);
            }}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>ویرایش کامل مشخصات هدف</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};

