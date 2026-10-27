import React, { useState, useEffect } from 'react';
import { Goal } from '../types';
import { toPersianDigits } from '../calendar/jalali';
import { X, Check, Sliders, RefreshCw, Sparkles, Target } from 'lucide-react';

interface Props {
  isOpen: boolean;
  goal: Goal | null;
  autoProgress: number;
  onClose: () => void;
  onSave: (goalId: string, manualProgress: number | null, isManualActive: boolean) => void;
}

export const GoalProgressModal: React.FC<Props> = ({
  isOpen,
  goal,
  autoProgress,
  onClose,
  onSave,
}) => {
  const [isManual, setIsManual] = useState<boolean>(false);
  const [percentage, setPercentage] = useState<number>(0);

  useEffect(() => {
    if (goal) {
      if (goal.isManualProgressActive && goal.manualProgress !== undefined && goal.manualProgress !== null) {
        setIsManual(true);
        setPercentage(goal.manualProgress);
      } else {
        setIsManual(false);
        setPercentage(autoProgress);
      }
    }
  }, [goal, autoProgress, isOpen]);

  if (!isOpen || !goal) return null;

  const handleSave = () => {
    onSave(goal.id, isManual ? percentage : null, isManual);
    onClose();
  };

  const handleSetPreset = (val: number) => {
    setIsManual(true);
    setPercentage(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-emerald-100 flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">تعیین درصد موفقیت هدف</h3>
              <p className="text-[11px] text-gray-500 truncate max-w-[240px]">{goal.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setIsManual(false)}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !isManual
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>محاسبه خودکار</span>
            </button>

            <button
              type="button"
              onClick={() => setIsManual(true)}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isManual
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ارزیابی دستی شما</span>
            </button>
          </div>

          {/* Auto Calculation Preview */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-gray-500 block">درصد محاسبه‌شده خودکار (تسک‌ها و عادات):</span>
              <span className="font-bold text-emerald-800 text-sm mt-0.5 inline-block">
                {toPersianDigits(autoProgress)}٪
              </span>
            </div>
            {!isManual && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                فعال در سیستم
              </span>
            )}
          </div>

          {/* Manual Slider & Input */}
          <div className={`space-y-4 transition-opacity ${!isManual ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-700">درصد دستی انتخابی شما:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentage(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  className="w-16 px-2 py-1 text-center font-bold text-base text-emerald-900 rounded-lg border border-emerald-300 bg-emerald-50/50 focus:outline-emerald-500"
                />
                <span className="font-bold text-gray-500">٪</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
            />

            {/* Preset quick buttons */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[0, 25, 50, 75, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSetPreset(val)}
                  className={`py-1 px-2.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    percentage === val
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {toPersianDigits(val)}٪
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 text-xs transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>ثبت درصد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
