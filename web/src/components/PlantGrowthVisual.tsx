import React from 'react';
import { PlantState } from '../types';
import { toPersianDigits } from '../calendar/jalali';
import { Sparkles } from 'lucide-react';

interface Props {
  plantState: PlantState;
}

export const PlantGrowthVisual: React.FC<Props> = ({ plantState }) => {
  const { stage, progressPercent, completedCount, totalCount } = plantState;

  const stageTitles: Record<string, { title: string; subtitle: string }> = {
    SEED: { title: 'بذر در خاک', subtitle: 'با انجام اولین فعالیت، جوانه شروع به رشد می‌کند' },
    SPROUT: { title: 'جوانه سبز', subtitle: 'نخستین گام‌های رشد پایدار برداشته شد' },
    SAPLING: { title: 'نهال جوان', subtitle: 'شاخه و برگ‌ها در حال اوج‌گیری هستند' },
    BUDDING: { title: 'غنچه‌دهی', subtitle: 'تلاش و پیوستگی شما به ثمر نشسته است' },
    FLOWERING: { title: 'شکوفایی', subtitle: 'تنها یک قدم تا گلدهی کامل باقیست' },
    FULL_BLOOM: { title: 'شکوفایی کامل', subtitle: 'آفرین! تمام برنامه‌های امروز شکوفا شدند' },
  };

  const current = stageTitles[stage] || stageTitles.SEED;

  // Render SVG illustration for stage
  const renderIllustration = () => {
    switch (stage) {
      case 'SEED':
        return (
          <svg viewBox="0 0 160 160" className="w-28 h-28 mx-auto drop-shadow-sm transition-transform duration-500 hover:scale-105">
            <ellipse cx="80" cy="125" rx="45" ry="12" fill="#D7CCC8" opacity="0.7" />
            {/* Soil pot mound */}
            <path d="M 45 125 Q 80 100 115 125 Z" fill="#8D6E63" />
            {/* Seed buried with tiny sparkle */}
            <ellipse cx="80" cy="115" rx="9" ry="6" fill="#5D4037" transform="rotate(-15 80 115)" />
            <circle cx="82" cy="113" r="2" fill="#A1887F" />
          </svg>
        );
      case 'SPROUT':
        return (
          <svg viewBox="0 0 160 160" className="w-28 h-28 mx-auto drop-shadow-sm transition-transform duration-500 hover:scale-105">
            <ellipse cx="80" cy="130" rx="45" ry="12" fill="#D7CCC8" opacity="0.7" />
            <path d="M 45 130 Q 80 110 115 130 Z" fill="#8D6E63" />
            {/* Stem */}
            <path d="M 80 120 Q 80 90 76 75" stroke="#4CAF50" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            {/* Leaves */}
            <path d="M 76 75 C 65 65 50 75 60 85 C 70 88 76 78 76 75" fill="#66BB6A" />
            <path d="M 77 75 C 88 65 103 75 93 85 C 83 88 77 78 77 75" fill="#81C784" />
          </svg>
        );
      case 'SAPLING':
        return (
          <svg viewBox="0 0 160 160" className="w-28 h-28 mx-auto drop-shadow-sm transition-transform duration-500 hover:scale-105">
            <ellipse cx="80" cy="135" rx="50" ry="12" fill="#D7CCC8" opacity="0.7" />
            <path d="M 40 135 Q 80 115 120 135 Z" fill="#8D6E63" />
            {/* Thicker stem with curve */}
            <path d="M 80 125 Q 77 85 82 55" stroke="#388E3C" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            {/* Lower branch leaves */}
            <path d="M 79 95 C 60 90 55 105 70 108 C 76 108 79 98 79 95" fill="#4CAF50" />
            <path d="M 81 85 C 100 80 105 95 90 98 C 84 98 81 88 81 85" fill="#66BB6A" />
            {/* Top leaves */}
            <path d="M 82 55 C 65 45 58 60 72 65 Z" fill="#43A047" />
            <path d="M 82 55 C 99 45 106 60 92 65 Z" fill="#81C784" />
            <path d="M 82 55 C 80 35 90 35 82 55" fill="#A5D6A7" />
          </svg>
        );
      case 'BUDDING':
        return (
          <svg viewBox="0 0 160 160" className="w-28 h-28 mx-auto drop-shadow-sm transition-transform duration-500 hover:scale-105">
            <ellipse cx="80" cy="135" rx="50" ry="12" fill="#D7CCC8" opacity="0.7" />
            <path d="M 40 135 Q 80 115 120 135 Z" fill="#8D6E63" />
            {/* Strong stem */}
            <path d="M 80 125 Q 76 80 80 45" stroke="#2E7D32" strokeWidth="6" strokeLinecap="round" fill="none" />
            {/* Foliage */}
            <path d="M 78 95 C 50 85 52 108 75 105" fill="#43A047" />
            <path d="M 81 80 C 109 70 107 93 84 90" fill="#4CAF50" />
            <path d="M 78 65 C 58 55 60 75 79 72" fill="#66BB6A" />
            {/* Bud */}
            <ellipse cx="80" cy="40" rx="9" ry="13" fill="#E91E63" />
            <path d="M 80 47 Q 75 40 80 32 Q 85 40 80 47" fill="#F48FB1" />
            {/* Calyx sepals */}
            <path d="M 72 45 C 75 40 80 46 80 46 C 80 46 85 40 88 45 C 85 51 75 51 72 45" fill="#2E7D32" />
          </svg>
        );
      case 'FLOWERING':
      case 'FULL_BLOOM':
        return (
          <svg viewBox="0 0 160 160" className="w-28 h-28 mx-auto drop-shadow-sm transition-transform duration-500 hover:scale-105">
            <ellipse cx="80" cy="138" rx="52" ry="12" fill="#D7CCC8" opacity="0.7" />
            <path d="M 38 138 Q 80 118 122 138 Z" fill="#8D6E63" />
            {/* Stem */}
            <path d="M 80 125 Q 75 75 80 42" stroke="#2E7D32" strokeWidth="6.5" strokeLinecap="round" fill="none" />
            {/* Leaves */}
            <path d="M 78 95 C 48 85 50 110 75 106" fill="#388E3C" />
            <path d="M 81 78 C 112 68 110 93 84 90" fill="#43A047" />
            {/* Flower Petals */}
            <circle cx="80" cy="22" r="12" fill="#E91E63" opacity="0.95" />
            <circle cx="80" cy="46" r="12" fill="#E91E63" opacity="0.95" />
            <circle cx="68" cy="34" r="12" fill="#F06292" opacity="0.95" />
            <circle cx="92" cy="34" r="12" fill="#F06292" opacity="0.95" />
            <circle cx="72" cy="26" r="11" fill="#EC407A" opacity="0.95" />
            <circle cx="88" cy="26" r="11" fill="#EC407A" opacity="0.95" />
            <circle cx="72" cy="42" r="11" fill="#EC407A" opacity="0.95" />
            <circle cx="88" cy="42" r="11" fill="#EC407A" opacity="0.95" />
            {/* Pistil */}
            <circle cx="80" cy="34" r="9" fill="#FDD835" />
            <circle cx="80" cy="34" r="6" fill="#FBC02D" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div id="plant-growth-card" className="bg-gradient-to-br from-emerald-50 via-white to-green-50/80 rounded-2xl border border-emerald-100/90 p-5 shadow-sm text-center relative overflow-hidden">
      <div className="absolute top-3 left-3 flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
        <Sparkles className="w-3.5 h-3.5" />
        <span>رشد امروز</span>
      </div>

      <div className="py-2 flex items-center justify-center">
        <div
          key={stage}
          className={`transform-gpu transition-all duration-700 ease-out origin-bottom ${
            stage === 'FULL_BLOOM' || stage === 'FLOWERING'
              ? 'animate-plant-bloom'
              : 'animate-plant-sway'
          }`}
        >
          {renderIllustration()}
        </div>
      </div>

      <div className="mt-1">
        <h3 className="text-lg font-bold text-emerald-950 flex items-center justify-center gap-2">
          <span>{current.title}</span>
          <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            {toPersianDigits(progressPercent)}٪
          </span>
        </h3>
        <p className="text-xs text-emerald-800/80 mt-1 max-w-sm mx-auto">
          {current.subtitle}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 max-w-md mx-auto">
        <div className="h-2.5 w-full bg-emerald-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-xs text-emerald-900/70 mt-1.5 px-0.5">
          <span>{toPersianDigits(completedCount)} از {toPersianDigits(totalCount)} فعالیت تکمیل شده</span>
          <span>هدف روزانه</span>
        </div>
      </div>
    </div>
  );
};
