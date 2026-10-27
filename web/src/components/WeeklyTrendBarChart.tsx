import React, { useState } from 'react';
import { AppTask, Habit } from '../types';
import { 
  getTodayJalali, 
  addDaysJalali, 
  jalaliToFormattedString, 
  toPersianDigits, 
  WEEKDAYS,
  jalaliToGregorian
} from '../calendar/jalali';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle, 
  Flame, 
  Star, 
  Calendar,
  Layers
} from 'lucide-react';

interface Props {
  tasks: AppTask[];
  habits: Habit[];
}

export const WeeklyTrendBarChart: React.FC<Props> = ({ tasks, habits }) => {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);

  // Mode: 'CURRENT_WEEK' (شنبه تا جمعه) or 'LAST_7_DAYS' (۷ روز گذشته)
  const [viewMode, setViewMode] = useState<'CURRENT_WEEK' | 'LAST_7_DAYS'>('CURRENT_WEEK');

  // Calculate day of week index for today (0: شنبه ... 6: جمعه)
  const gDate = jalaliToGregorian(today.year, today.month, today.day);
  const gDay = gDate.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  const todayWeekdayIndex = (gDay + 1) % 7; // 0: شنبه ... 6: جمعه

  // Generate data points
  interface DayBarData {
    dayName: string;
    dayLabel: string;
    dateStr: string;
    dayOfMonth: string;
    tasksDone: number;
    habitsDone: number;
    total: number;
    isToday: boolean;
  }

  const chartData: DayBarData[] = [];

  if (viewMode === 'CURRENT_WEEK') {
    // Current Week: From Saturday (index 0) to Friday (index 6)
    const startOfWeek = addDaysJalali(today, -todayWeekdayIndex);

    for (let i = 0; i < 7; i++) {
      const d = addDaysJalali(startOfWeek, i);
      const dateStr = jalaliToFormattedString(d);
      const tasksDone = tasks.filter(t => t.isCompleted && (t.completedAt === dateStr || t.dueDate === dateStr)).length;
      const habitsDone = habits.filter(h => !!h.completionHistory[dateStr]).length;

      chartData.push({
        dayName: WEEKDAYS[i],
        dayLabel: `${WEEKDAYS[i]} (${toPersianDigits(d.day)})`,
        dateStr,
        dayOfMonth: toPersianDigits(d.day),
        tasksDone,
        habitsDone,
        total: tasksDone + habitsDone,
        isToday: dateStr === todayStr,
      });
    }
  } else {
    // Rolling Last 7 Days (from 6 days ago up to today)
    for (let i = 6; i >= 0; i--) {
      const d = addDaysJalali(today, -i);
      const dateStr = jalaliToFormattedString(d);
      const gD = jalaliToGregorian(d.year, d.month, d.day);
      const wIdx = (gD.getDay() + 1) % 7;

      const tasksDone = tasks.filter(t => t.isCompleted && (t.completedAt === dateStr || t.dueDate === dateStr)).length;
      const habitsDone = habits.filter(h => !!h.completionHistory[dateStr]).length;

      chartData.push({
        dayName: WEEKDAYS[wIdx],
        dayLabel: `${WEEKDAYS[wIdx]} (${toPersianDigits(d.day)})`,
        dateStr,
        dayOfMonth: toPersianDigits(d.day),
        tasksDone,
        habitsDone,
        total: tasksDone + habitsDone,
        isToday: dateStr === todayStr,
      });
    }
  }

  // Summary Metrics
  const totalWeekTasks = chartData.reduce((acc, cur) => acc + cur.tasksDone, 0);
  const totalWeekHabits = chartData.reduce((acc, cur) => acc + cur.habitsDone, 0);
  const totalWeekActivities = totalWeekTasks + totalWeekHabits;
  const averageDaily = (totalWeekActivities / 7).toFixed(1);

  // Best day of week
  const bestDay = [...chartData].sort((a, b) => b.total - a.total)[0];

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload as DayBarData;
      return (
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-emerald-100 shadow-lg text-right text-xs space-y-1.5 min-w-[140px]">
          <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 flex items-center justify-between">
            <span>{dataItem.dayName}</span>
            <span className="text-[10px] text-gray-400 font-normal">{toPersianDigits(dataItem.dateStr)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-emerald-800">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              <span>تسک‌های انجام‌شده:</span>
            </span>
            <span className="font-bold">{toPersianDigits(dataItem.tasksDone)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-amber-800">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>عادت‌های ثبت‌شده:</span>
            </span>
            <span className="font-bold">{toPersianDigits(dataItem.habitsDone)}</span>
          </div>
          <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-gray-700 font-bold">
            <span>مجموع فعالیت‌ها:</span>
            <span>{toPersianDigits(dataItem.total)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>روند هفتگی تکمیل عادت‌ها و تسک‌ها (نمودار ستونی)</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            مقایسه روزانه عملکرد تسک‌ها و پیوستگی عادات در طول هفته
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('CURRENT_WEEK')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
              viewMode === 'CURRENT_WEEK'
                ? 'bg-white text-emerald-950 shadow-2xs'
                : 'text-gray-600 hover:text-emerald-800'
            }`}
          >
            هفته جاری (ش تا ج)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('LAST_7_DAYS')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
              viewMode === 'LAST_7_DAYS'
                ? 'bg-white text-emerald-950 shadow-2xs'
                : 'text-gray-600 hover:text-emerald-800'
            }`}
          >
            ۷ روز اخیر
          </button>
        </div>
      </div>

      {/* Quick Weekly Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block leading-tight">تسک‌های هفته</span>
            <span className="text-sm font-extrabold text-emerald-950 block leading-tight">
              {toPersianDigits(totalWeekTasks)} تسک
            </span>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block leading-tight">عادت‌های ثبت‌شده</span>
            <span className="text-sm font-extrabold text-amber-950 block leading-tight">
              {toPersianDigits(totalWeekHabits)} تکرار
            </span>
          </div>
        </div>

        <div className="bg-teal-50/60 border border-teal-200/60 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block leading-tight">میانگین روزانه</span>
            <span className="text-sm font-extrabold text-teal-950 block leading-tight">
              {toPersianDigits(averageDaily)} اقدام
            </span>
          </div>
        </div>

        <div className="bg-purple-50/60 border border-purple-200/60 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-100 text-purple-800 rounded-lg">
            <Star className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-[10px] text-gray-500 block leading-tight">بهترین روز هفته</span>
            <span className="text-sm font-extrabold text-purple-950 block leading-tight truncate">
              {bestDay && bestDay.total > 0 ? `${bestDay.dayName} (${toPersianDigits(bestDay.total)})` : 'هنوز ثبت نشده'}
            </span>
          </div>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="pt-3 pb-1 w-full h-64 min-h-[250px] dir-ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis 
              dataKey="dayLabel" 
              tick={{ fill: '#4B5563', fontSize: 11 }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
            <Legend 
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
              formatter={(value) => (
                <span className="text-gray-700 font-medium px-1">
                  {value === 'tasksDone' ? 'تسک‌های انجام‌شده' : 'عادت‌های انجام‌شده'}
                </span>
              )}
            />
            <Bar 
              dataKey="tasksDone" 
              name="tasksDone"
              fill="#10B981" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={28}
            />
            <Bar 
              dataKey="habitsDone" 
              name="habitsDone"
              fill="#F59E0B" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footnote & Today Indicator */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>روز مشخص‌شده با نشانگر امروز: <strong>{WEEKDAYS[todayWeekdayIndex]} {toPersianDigits(today.day)} {today.month}</strong></span>
        </span>
        <span className="text-gray-400">
          مجموع اقدامات ثبت‌شده این هفته: <strong>{toPersianDigits(totalWeekActivities)}</strong>
        </span>
      </div>
    </div>
  );
};
