import React, { useId } from 'react';

export interface PlantTypeOption {
  id: string;
  name: string;
  description: string;
}

export const ALL_PLANT_TYPES: PlantTypeOption[] = [
  { id: 'برگ انجیری', name: 'برگ انجیری (مونسترا)', description: 'نماد پشتکار، برگ‌های پهن و طراوت سبز پایدار' },
  { id: 'بونسای', name: 'بونسای خردمند', description: 'نماد صبر، مهارت، تسلط و آرامش پایدار' },
  { id: 'کاکتوس گلدار', name: 'کاکتوس گلدار', description: 'نماد سرسختی، مقاومت و امید در روزهای سخت' },
  { id: 'نیلوفر آبی', name: 'نیلوفر آبی صورتی', description: 'نماد پاکی، تمرکز، صلح درونی و شکوه' },
  { id: 'آفتابگردان', name: 'آفتابگردان شاداب', description: 'نماد شادابی، انگیزه، وفاداری و انرژی مثبت' },
  { id: 'گل سرخ', name: 'گل سرخ / رز', description: 'نماد شور، عشق به هدف، تعهد عمیق و زیبایی' },
  { id: 'بامبو شانس', name: 'بامبو شانس و ثروت', description: 'نماد انعطاف، صعود مداوم و برکت پایدار' },
  { id: 'پیچک رونده', name: 'پیچک رونده سبز', description: 'نماد پیوستگی، پشتکار و بالا رفتن مداوم' },
  { id: 'ریحان و نعنا', name: 'ریحان و نعنای معطر', description: 'نماد طراوت ذهن، شادابی و سلامتی روزانه' },
  { id: 'ارکیده', name: 'ارکیده باشکوه', description: 'نماد ظرافت، تمرکز عمیق و خلاقیت ناب' },
  { id: 'درختچه زیتون', name: 'درختچه زیتون بارور', description: 'نماد صلح، باروری، اصالت و موفقیت جاودان' },
];

interface Props {
  type?: string;
  plantType?: string;
  stage?: 'SEED' | 'SPROUT' | 'SAPLING' | 'BUDDING' | 'FLOWERING' | 'FULL_BLOOM';
  progressPercent?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  animated?: boolean;
}

export const PlantIcon: React.FC<Props> = ({
  type,
  plantType,
  stage,
  progressPercent,
  size = 'md',
  className = '',
  animated = false,
}) => {
  const uid = useId().replace(/[:]/g, '');

  const sizeMap: Record<string, string> = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32',
  };

  const animClass = animated ? 'animate-bounce-subtle' : '';

  // Render refined, high-craft botanical vector icons
  const renderSVG = () => {
    // Normalize aliases
    let plantKey = type || plantType || 'برگ انجیری';
    if (plantKey === 'بامبو') plantKey = 'بامبو شانس';
    if (plantKey === 'زیتون') plantKey = 'درختچه زیتون';

    // If stage or progressPercent is explicitly specified, render the plant at its growth stage!
    const effectiveStage = stage || (progressPercent !== undefined ? (
      progressPercent >= 100 ? 'FULL_BLOOM' :
      progressPercent >= 80 ? 'FLOWERING' :
      progressPercent >= 60 ? 'BUDDING' :
      progressPercent >= 35 ? 'SAPLING' :
      progressPercent > 0 ? 'SPROUT' : 'SEED'
    ) : undefined);

    if (effectiveStage) {
      switch (effectiveStage) {
        case 'SEED':
          return (
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-xs transition-transform duration-500" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`seedPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EA580C" />
                  <stop offset="100%" stopColor="#9A3412" />
                </linearGradient>
              </defs>
              <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
              {/* Pot */}
              <path d="M20 44 L23 58 Q24 60 27 60 L37 60 Q40 60 41 58 L44 44 Z" fill={`url(#seedPot_${uid})`} />
              <rect x="18" y="41" width="28" height="4.5" rx="2" fill="#C2410C" />
              {/* Soil mound */}
              <ellipse cx="32" cy="43" rx="12" ry="3.5" fill="#5D4037" />
              <ellipse cx="32" cy="42" rx="10" ry="2.5" fill="#795548" />
              {/* Dormant Seed */}
              <ellipse cx="32" cy="40" rx="4" ry="2.8" fill="#8D6E63" transform="rotate(-15 32 40)" />
              <circle cx="33" cy="39" r="1.2" fill="#D7CCC8" />
            </svg>
          );

        case 'SPROUT':
          return (
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-xs transition-transform duration-500" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`sproutPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EA580C" />
                  <stop offset="100%" stopColor="#9A3412" />
                </linearGradient>
              </defs>
              <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
              <path d="M20 44 L23 58 Q24 60 27 60 L37 60 Q40 60 41 58 L44 44 Z" fill={`url(#sproutPot_${uid})`} />
              <rect x="18" y="41" width="28" height="4.5" rx="2" fill="#C2410C" />
              <ellipse cx="32" cy="43" rx="12" ry="3.2" fill="#5D4037" />
              {/* Young green stem */}
              <path d="M32 42 Q32 32 29 26" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" />
              {/* 2 baby leaves */}
              <path d="M29 26 C23 23 18 29 24 33 C28 34 30 30 29 26 Z" fill="#4ADE80" />
              <path d="M30 26 C36 22 42 27 36 32 C32 33 30 29 30 26 Z" fill="#86EFAC" />
            </svg>
          );

        case 'SAPLING':
          return (
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-xs transition-transform duration-500" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`saplingPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EA580C" />
                  <stop offset="100%" stopColor="#9A3412" />
                </linearGradient>
              </defs>
              <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
              <path d="M20 44 L23 58 Q24 60 27 60 L37 60 Q40 60 41 58 L44 44 Z" fill={`url(#saplingPot_${uid})`} />
              <rect x="18" y="41" width="28" height="4.5" rx="2" fill="#C2410C" />
              <ellipse cx="32" cy="43" rx="12" ry="3.2" fill="#5D4037" />
              {/* Main stem reaching higher */}
              <path d="M32 42 Q31 28 32 18" stroke="#16A34A" strokeWidth="2.6" strokeLinecap="round" />
              {/* Lower leaves */}
              <path d="M31 34 C24 32 22 40 28 41 C31 41 32 36 31 34 Z" fill="#22C55E" />
              <path d="M33 30 C40 28 42 36 36 37 C33 37 32 32 33 30 Z" fill="#4ADE80" />
              {/* Top expanding foliage */}
              <path d="M32 18 C25 14 22 22 29 24 Z" fill="#15803D" />
              <path d="M32 18 C39 14 42 22 35 24 Z" fill="#4ADE80" />
              <path d="M32 18 C30 11 34 11 32 18 Z" fill="#86EFAC" />
            </svg>
          );

        case 'BUDDING':
          return (
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-xs transition-transform duration-500" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`budPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EA580C" />
                  <stop offset="100%" stopColor="#9A3412" />
                </linearGradient>
              </defs>
              <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
              <path d="M20 44 L23 58 Q24 60 27 60 L37 60 Q40 60 41 58 L44 44 Z" fill={`url(#budPot_${uid})`} />
              <rect x="18" y="41" width="28" height="4.5" rx="2" fill="#C2410C" />
              <ellipse cx="32" cy="43" rx="12" ry="3.2" fill="#5D4037" />
              {/* Strong stem */}
              <path d="M32 42 Q30 26 32 16" stroke="#15803D" strokeWidth="2.8" strokeLinecap="round" />
              {/* Side Leaves */}
              <path d="M30 33 C22 31 20 39 27 40 C30 40 31 35 30 33 Z" fill="#16A34A" />
              <path d="M33 27 C41 25 43 33 37 34 C34 34 33 29 33 27 Z" fill="#22C55E" />
              <path d="M30 21 C24 18 23 25 29 26 Z" fill="#4ADE80" />
              {/* Elegant Flower Bud */}
              <ellipse cx="32" cy="14" rx="4.5" ry="6" fill="#E11D48" />
              <path d="M32 18 Q29 14 32 10 Q35 14 32 18" fill="#FB7185" />
              {/* Sepals */}
              <path d="M28 16 C29 14 32 17 32 17 C32 17 35 14 36 16 C34 19 30 19 28 16" fill="#15803D" />
            </svg>
          );

        case 'FLOWERING':
          return (
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-xs transition-transform duration-500" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`flowPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EA580C" />
                  <stop offset="100%" stopColor="#9A3412" />
                </linearGradient>
              </defs>
              <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
              <path d="M20 44 L23 58 Q24 60 27 60 L37 60 Q40 60 41 58 L44 44 Z" fill={`url(#flowPot_${uid})`} />
              <rect x="18" y="41" width="28" height="4.5" rx="2" fill="#C2410C" />
              <ellipse cx="32" cy="43" rx="12" ry="3.2" fill="#5D4037" />
              {/* Stem */}
              <path d="M32 42 Q30 27 32 16" stroke="#15803D" strokeWidth="2.8" strokeLinecap="round" />
              {/* Leaves */}
              <path d="M30 33 C21 31 19 39 26 40 C30 40 31 35 30 33 Z" fill="#16A34A" />
              <path d="M33 26 C42 24 44 32 38 33 C34 33 33 28 33 26 Z" fill="#22C55E" />
              {/* Blooming Petals */}
              <circle cx="32" cy="8" r="4.5" fill="#E11D48" />
              <circle cx="32" cy="18" r="4.5" fill="#E11D48" />
              <circle cx="27" cy="13" r="4.5" fill="#F43F5E" />
              <circle cx="37" cy="13" r="4.5" fill="#F43F5E" />
              <circle cx="29" cy="9" r="4" fill="#FB7185" />
              <circle cx="35" cy="9" r="4" fill="#FB7185" />
              <circle cx="29" cy="17" r="4" fill="#FB7185" />
              <circle cx="35" cy="17" r="4" fill="#FB7185" />
              {/* Golden Center */}
              <circle cx="32" cy="13" r="3.2" fill="#FBBF24" />
            </svg>
          );

        case 'FULL_BLOOM':
        default:
          return (
            <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm transition-transform duration-500 hover:scale-110" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`bloomPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EA580C" />
                  <stop offset="100%" stopColor="#9A3412" />
                </linearGradient>
                <linearGradient id={`bloomPetal_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FB7185" />
                  <stop offset="100%" stopColor="#BE123C" />
                </linearGradient>
              </defs>
              <ellipse cx="32" cy="59" rx="14" ry="2" fill="#000" opacity="0.1" />
              <path d="M20 44 L23 58 Q24 60 27 60 L37 60 Q40 60 41 58 L44 44 Z" fill={`url(#bloomPot_${uid})`} />
              <rect x="18" y="41" width="28" height="4.5" rx="2" fill="#C2410C" />
              <ellipse cx="32" cy="43" rx="12" ry="3.2" fill="#5D4037" />
              {/* Vibrant Stem */}
              <path d="M32 42 Q30 26 32 15" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
              {/* Rich Leaves */}
              <path d="M30 33 C20 31 18 40 26 41 C30 41 31 35 30 33 Z" fill="#15803D" />
              <path d="M33 25 C43 23 45 32 39 33 C34 33 33 27 33 25 Z" fill="#16A34A" />
              {/* Full Glory Flower Petals */}
              <circle cx="32" cy="6" r="5" fill={`url(#bloomPetal_${uid})`} />
              <circle cx="32" cy="20" r="5" fill={`url(#bloomPetal_${uid})`} />
              <circle cx="25" cy="13" r="5" fill={`url(#bloomPetal_${uid})`} />
              <circle cx="39" cy="13" r="5" fill={`url(#bloomPetal_${uid})`} />
              <circle cx="27" cy="8" r="4.5" fill="#FDA4AF" />
              <circle cx="37" cy="8" r="4.5" fill="#FDA4AF" />
              <circle cx="27" cy="18" r="4.5" fill="#FDA4AF" />
              <circle cx="37" cy="18" r="4.5" fill="#FDA4AF" />
              {/* Center */}
              <circle cx="32" cy="13" r="4" fill="#F59E0B" />
              <circle cx="32" cy="13" r="2.5" fill="#FEF08A" />
              {/* Sparkles */}
              <path d="M14 12 L15 9 L18 8 L15 7 L14 4 L13 7 L10 8 L13 9 Z" fill="#F59E0B" />
              <path d="M48 6 L49 4 L51 3 L49 2 L48 0 L47 2 L45 3 L47 4 Z" fill="#F59E0B" />
              <path d="M49 24 L50 22 L52 21 L50 20 L49 18 L48 20 L46 21 L48 22 Z" fill="#F59E0B" />
            </svg>
          );
      }
    }

    switch (plantKey) {
      case 'برگ انجیری':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`mPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EA580C" />
                <stop offset="60%" stopColor="#C2410C" />
                <stop offset="100%" stopColor="#9A3412" />
              </linearGradient>
              <linearGradient id={`mLeafMain_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4ADE80" />
                <stop offset="40%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#14532D" />
              </linearGradient>
              <linearGradient id={`mLeafSide_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#86EFAC" />
                <stop offset="60%" stopColor="#16A34A" />
                <stop offset="100%" stopColor="#14532D" />
              </linearGradient>
            </defs>
            {/* Ceramic Pot with Rim & Pedestal */}
            <ellipse cx="32" cy="59" rx="14" ry="2" fill="#000" opacity="0.1" />
            <path d="M19 45 L22 58 Q23 60 26 60 L38 60 Q41 60 42 58 L45 45 Z" fill={`url(#mPot_${uid})`} />
            <rect x="17" y="42" width="30" height="4.5" rx="2.2" fill="#C2410C" />
            <line x1="20" y1="43" x2="44" y2="43" stroke="#FDBA74" strokeWidth="0.8" opacity="0.6" />
            <ellipse cx="32" cy="44" rx="13" ry="2.2" fill="#3E2723" opacity="0.5" />
            {/* Stems */}
            <path d="M32 44 Q31 34 20 22" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M32 44 Q35 33 45 23" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M32 44 Q32 26 32 10" stroke="#16A34A" strokeWidth="2.8" strokeLinecap="round" />
            {/* Left Monstera Leaf with splits */}
            <path d="M20 22 C11 20 8 32 17 38 C21 39 25 37 25 33 C25 28 22 23 20 22 Z" fill={`url(#mLeafSide_${uid})`} />
            <path d="M20 22 Q21 32 18 36" stroke="#BBF7D0" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            <ellipse cx="14.5" cy="27.5" rx="1.5" ry="3.2" transform="rotate(-35 14.5 27.5)" fill="#FAF9F6" opacity="0.9" />
            <ellipse cx="19.5" cy="33.5" rx="1.2" ry="2.5" transform="rotate(-20 19.5 33.5)" fill="#FAF9F6" opacity="0.9" />
            {/* Right Monstera Leaf with splits */}
            <path d="M44 23 C53 21 56 33 47 39 C43 40 39 38 39 34 C39 29 42 24 44 23 Z" fill={`url(#mLeafSide_${uid})`} />
            <path d="M44 23 Q43 33 46 37" stroke="#BBF7D0" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            <ellipse cx="49.5" cy="28.5" rx="1.5" ry="3.2" transform="rotate(35 49.5 28.5)" fill="#FAF9F6" opacity="0.9" />
            <ellipse cx="44.5" cy="34.5" rx="1.2" ry="2.5" transform="rotate(20 44.5 34.5)" fill="#FAF9F6" opacity="0.9" />
            {/* Center Magnificent Master Leaf */}
            <path d="M32 8 C22 3 16 16 25 27 C29 31 35 31 39 27 C48 16 42 3 32 8 Z" fill={`url(#mLeafMain_${uid})`} />
            <path d="M32 9 L32 29" stroke="#86EFAC" strokeWidth="1.5" strokeLinecap="round" />
            {/* Fenestration Cuts */}
            <ellipse cx="26" cy="15" rx="1.4" ry="3.2" transform="rotate(-25 26 15)" fill="#FAF9F6" opacity="0.95" />
            <ellipse cx="38" cy="15" rx="1.4" ry="3.2" transform="rotate(25 38 15)" fill="#FAF9F6" opacity="0.95" />
            <ellipse cx="27" cy="22" rx="1.3" ry="2.8" transform="rotate(-30 27 22)" fill="#FAF9F6" opacity="0.95" />
            <ellipse cx="37" cy="22" rx="1.3" ry="2.8" transform="rotate(30 37 22)" fill="#FAF9F6" opacity="0.95" />
            <circle cx="32" cy="26" r="1.2" fill="#FAF9F6" opacity="0.9" />
          </svg>
        );

      case 'بونسای':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`bDish_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1F2937" />
                <stop offset="50%" stopColor="#374151" />
                <stop offset="100%" stopColor="#111827" />
              </linearGradient>
              <linearGradient id={`bCloud_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#86EFAC" />
                <stop offset="35%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#14532D" />
              </linearGradient>
              <linearGradient id={`bTrunk_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A16207" />
                <stop offset="50%" stopColor="#78350F" />
                <stop offset="100%" stopColor="#451A03" />
              </linearGradient>
            </defs>
            {/* Ground Shadow */}
            <ellipse cx="32" cy="61" rx="24" ry="2.5" fill="#000" opacity="0.12" />
            {/* Low-profile Zen Pot on 4 feet */}
            <ellipse cx="32" cy="56" rx="25" ry="4.5" fill={`url(#bDish_${uid})`} />
            <rect x="12" y="58" width="6" height="2.5" rx="1" fill="#111827" />
            <rect x="46" y="58" width="6" height="2.5" rx="1" fill="#111827" />
            <ellipse cx="32" cy="55" rx="21" ry="2.8" fill="#3E2723" />
            <ellipse cx="32" cy="54.2" rx="18" ry="2.2" fill="#4D7C0F" opacity="0.85" />
            {/* Sculpted Weathered Trunk with Limbs */}
            <path d="M31 55 Q38 46 29 37 Q21 29 27 22 Q32 15 36 12" stroke={`url(#bTrunk_${uid})`} strokeWidth="4.5" strokeLinecap="round" />
            <path d="M29 37 Q41 33 48 30" stroke={`url(#bTrunk_${uid})`} strokeWidth="3.2" strokeLinecap="round" />
            <path d="M27 23 Q19 20 16 18" stroke={`url(#bTrunk_${uid})`} strokeWidth="2.5" strokeLinecap="round" />
            {/* Foliage Cloud Tier 1: Left */}
            <circle cx="15" cy="18" r="6" fill="#14532D" />
            <circle cx="19" cy="16" r="6.5" fill="#16A34A" />
            <circle cx="15" cy="15" r="4.8" fill="#4ADE80" />
            {/* Foliage Cloud Tier 2: Right */}
            <circle cx="49" cy="29" r="6.5" fill="#14532D" />
            <circle cx="45" cy="26" r="7" fill="#16A34A" />
            <circle cx="49" cy="25" r="5" fill="#86EFAC" />
            {/* Foliage Cloud Tier 3: Top Crown */}
            <ellipse cx="36" cy="12" rx="11" ry="7.5" fill="#14532D" />
            <ellipse cx="35" cy="10" rx="9.5" ry="6.2" fill={`url(#bCloud_${uid})`} />
            <ellipse cx="33" cy="8" rx="7" ry="4.2" fill="#BBF7D0" opacity="0.9" />
          </svg>
        );

      case 'کاکتوس گلدار':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`cBody_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#065F46" />
                <stop offset="35%" stopColor="#059669" />
                <stop offset="70%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id={`cPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="50%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#C2410C" />
              </linearGradient>
              <radialGradient id={`cFlower_${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="30%" stopColor="#F43F5E" />
                <stop offset="100%" stopColor="#BE123C" />
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
            {/* Elegant Terracotta Pot */}
            <path d="M21 45 L23 58 Q24 60 27 60 L37 60 Q40 60 41 58 L43 45 Z" fill={`url(#cPot_${uid})`} />
            <rect x="19" y="42" width="26" height="4.2" rx="2" fill="#C2410C" />
            <line x1="22" y1="52" x2="42" y2="52" stroke="#FED7AA" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
            {/* Cactus Column */}
            <path d="M23 44 C23 20 41 20 41 44 Z" fill={`url(#cBody_${uid})`} />
            {/* Rib Lines */}
            <path d="M27 44 C27 24 29 22 32 20" stroke="#064E3B" strokeWidth="1.4" opacity="0.6" />
            <path d="M37 44 C37 24 35 22 32 20" stroke="#064E3B" strokeWidth="1.4" opacity="0.6" />
            <line x1="32" y1="44" x2="32" y2="19" stroke="#A7F3D0" strokeWidth="1.5" opacity="0.85" />
            {/* Side Arms */}
            <path d="M23 35 Q15 35 15 27 Q15 23 19 23 Q22 23 22 26 L23 36" fill="#059669" stroke="#064E3B" strokeWidth="1" />
            <path d="M41 33 Q49 33 49 25 Q49 22 45 22 Q42 22 42 25 L41 34" fill="#059669" stroke="#064E3B" strokeWidth="1" />
            {/* Spine Clusters */}
            <circle cx="27" cy="30" r="0.9" fill="#FEF9C3" />
            <circle cx="37" cy="30" r="0.9" fill="#FEF9C3" />
            <circle cx="32" cy="26" r="0.9" fill="#FEF9C3" />
            <circle cx="32" cy="35" r="0.9" fill="#FEF9C3" />
            <circle cx="18" cy="25" r="0.8" fill="#FEF9C3" />
            <circle cx="46" cy="24" r="0.8" fill="#FEF9C3" />
            {/* Crown Desert Blossom */}
            <circle cx="32" cy="18" r="6" fill={`url(#cFlower_${uid})`} />
            <circle cx="28" cy="16" r="4" fill="#FB7185" />
            <circle cx="36" cy="16" r="4" fill="#FB7185" />
            <circle cx="32" cy="13.5" r="4.2" fill="#FDA4AF" />
            <circle cx="32" cy="16.5" r="2.2" fill="#FACC15" />
          </svg>
        );

      case 'نیلوفر آبی':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`lotusWater_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id={`lotusPetal_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F43F5E" />
                <stop offset="50%" stopColor="#FB7185" />
                <stop offset="100%" stopColor="#FFF1F2" />
              </linearGradient>
            </defs>
            {/* Water Ripple Base */}
            <ellipse cx="32" cy="55" rx="27" ry="6" fill={`url(#lotusWater_${uid})`} />
            <ellipse cx="32" cy="55" rx="22" ry="4" stroke="#0284C7" strokeWidth="0.8" opacity="0.4" />
            {/* Rich Emerald Lily Pad */}
            <path d="M10 52 C10 44 54 44 54 52 C54 58 38 60 32 53 C26 60 10 58 10 52 Z" fill="#15803D" />
            <ellipse cx="32" cy="52" rx="19" ry="4" fill="#22C55E" />
            {/* Outer Deep Rose Petals */}
            <path d="M16 46 C19 32 30 46 30 46 Z" fill="#BE123C" opacity="0.9" />
            <path d="M48 46 C45 32 34 46 34 46 Z" fill="#BE123C" opacity="0.9" />
            <path d="M21 47 C25 28 36 47 36 47 Z" fill="#E11D48" />
            <path d="M43 47 C39 28 28 47 28 47 Z" fill="#E11D48" />
            {/* Center Glowing Blush Petals */}
            <path d="M25 47 C29 23 38 47 38 47 Z" fill={`url(#lotusPetal_${uid})`} />
            <path d="M39 47 C35 23 26 47 26 47 Z" fill={`url(#lotusPetal_${uid})`} />
            <path d="M32 47 C29 19 35 19 32 47 Z" fill="#FFF1F2" />
            {/* Golden Core & Receptacle */}
            <circle cx="32" cy="38" r="3.8" fill="#FACC15" />
            <circle cx="32" cy="38" r="2" fill="#EA580C" />
          </svg>
        );

      case 'آفتابگردان':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`sunPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4D7C0F" />
                <stop offset="100%" stopColor="#365314" />
              </linearGradient>
              <linearGradient id={`sunPetals_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="60%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <radialGradient id={`sunCore_${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#92400E" />
                <stop offset="70%" stopColor="#451A03" />
                <stop offset="100%" stopColor="#291102" />
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="59" rx="12" ry="2" fill="#000" opacity="0.1" />
            {/* Planter */}
            <path d="M23 46 L25 58 Q26 60 28 60 L36 60 Q38 60 39 58 L41 46 Z" fill={`url(#sunPot_${uid})`} />
            <rect x="21" y="43" width="22" height="4" rx="2" fill="#365314" />
            {/* Strong Stem & Leaves */}
            <path d="M32 45 L32 26" stroke="#15803D" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M32 39 Q20 36 22 29 Q27 32 32 36" fill="#16A34A" />
            <path d="M32 34 Q44 31 42 24 Q37 27 32 31" fill="#15803D" />
            {/* Sunflower Corona Petals */}
            <circle cx="32" cy="20" r="17" fill={`url(#sunPetals_${uid})`} />
            <circle cx="32" cy="20" r="14.5" fill="#FBBF24" />
            {/* Center Seed Disc with texture */}
            <circle cx="32" cy="20" r="9" fill={`url(#sunCore_${uid})`} />
            <circle cx="32" cy="20" r="7" stroke="#F59E0B" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
            <circle cx="30" cy="19" r="1" fill="#B45309" />
            <circle cx="34" cy="19" r="1" fill="#B45309" />
            <circle cx="32" cy="22" r="1" fill="#B45309" />
          </svg>
        );

      case 'گل سرخ':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`rosePot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A16207" />
                <stop offset="100%" stopColor="#713F12" />
              </linearGradient>
              <radialGradient id={`roseBlooms_${uid}`} cx="45%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#FDA4AF" />
                <stop offset="25%" stopColor="#F43F5E" />
                <stop offset="70%" stopColor="#E11D48" />
                <stop offset="100%" stopColor="#881337" />
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="59" rx="12" ry="2" fill="#000" opacity="0.1" />
            {/* Terracotta Urn */}
            <path d="M22 46 L24 58 Q25 60 28 60 L36 60 Q39 60 40 58 L42 46 Z" fill={`url(#rosePot_${uid})`} />
            <rect x="20" y="43" width="24" height="4" rx="2" fill="#713F12" />
            {/* Thorny Rose Stem */}
            <path d="M32 45 Q31 34 32 25" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
            {/* Serrated Leaves */}
            <path d="M32 39 Q22 36 24 42 Q28 40 32 40" fill="#16A34A" />
            <path d="M32 33 Q42 30 40 37 Q36 34 32 35" fill="#15803D" />
            {/* Lush Spiraled Velvety Rose */}
            <circle cx="32" cy="20" r="13" fill={`url(#roseBlooms_${uid})`} />
            <circle cx="30" cy="19" r="9.5" fill="#E11D48" />
            <circle cx="34" cy="19" r="8" fill="#F43F5E" />
            <circle cx="32" cy="18" r="5.5" fill="#FB7185" />
            <circle cx="32" cy="17" r="3.2" fill="#FDA4AF" />
            <path d="M30 17 Q32 14.5 34 17" stroke="#FFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
          </svg>
        );

      case 'بامبو شانس':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`bambooGlass_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <ellipse cx="32" cy="59" rx="14" ry="2" fill="#000" opacity="0.1" />
            {/* Crystal Glass Cylinder with Water & River Stones */}
            <rect x="20" y="40" width="24" height="20" rx="3.5" fill={`url(#bambooGlass_${uid})`} stroke="#38BDF8" strokeWidth="1.4" />
            <ellipse cx="26" cy="55" rx="3.8" ry="2.2" fill="#64748B" />
            <ellipse cx="38" cy="55" rx="3.8" ry="2.2" fill="#475569" />
            <ellipse cx="32" cy="56" rx="4.2" ry="2.4" fill="#94A3B8" />
            <line x1="21" y1="44" x2="43" y2="44" stroke="#7DD3FC" strokeWidth="1" strokeDasharray="3 2" />
            {/* Bamboo Stalk 1 (Left) */}
            <rect x="23" y="19" width="4.6" height="27" rx="1.8" fill="#16A34A" />
            <line x1="22" y1="28" x2="28" y2="28" stroke="#FDE047" strokeWidth="1.6" />
            <line x1="22" y1="36" x2="28" y2="36" stroke="#FDE047" strokeWidth="1.6" />
            {/* Bamboo Stalk 2 (Center tall) */}
            <rect x="29.7" y="10" width="4.8" height="36" rx="1.8" fill="#22C55E" />
            <line x1="28.7" y1="19" x2="35.5" y2="19" stroke="#FDE047" strokeWidth="1.6" />
            <line x1="28.7" y1="29" x2="35.5" y2="29" stroke="#FDE047" strokeWidth="1.6" />
            {/* Bamboo Stalk 3 (Right) */}
            <rect x="36.4" y="14" width="4.6" height="32" rx="1.8" fill="#15803D" />
            <line x1="35.4" y1="23" x2="42" y2="23" stroke="#FDE047" strokeWidth="1.6" />
            <line x1="35.4" y1="32" x2="42" y2="32" stroke="#FDE047" strokeWidth="1.6" />
            {/* Curled Lucky Bamboo Shoots */}
            <path d="M24 17 Q17 14 20 9 Q23 9 24 13" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M32 9 Q32 2 37 4 Q38 8 34 10" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M39 12 Q47 9 44 5 Q41 5 40 9" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        );

      case 'پیچک رونده':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`ivyPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#B45309" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>
            </defs>
            {/* Braided Macrame Hanging Cords */}
            <line x1="20" y1="38" x2="32" y2="6" stroke="#D97706" strokeWidth="1.5" />
            <line x1="44" y1="38" x2="32" y2="6" stroke="#D97706" strokeWidth="1.5" />
            <circle cx="32" cy="6" r="2.5" fill="#92400E" stroke="#FDE68A" strokeWidth="0.8" />
            {/* Clay Hanging Bowl */}
            <path d="M18 38 L22 49 Q24 52 27 52 L37 52 Q40 52 42 49 L46 38 Z" fill={`url(#ivyPot_${uid})`} />
            <rect x="16" y="36" width="32" height="3.5" rx="1.7" fill="#78350F" />
            {/* Cascading Vine Tendrils */}
            <path d="M22 44 Q14 50 16 62" stroke="#16A34A" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M32 46 Q34 54 30 63" stroke="#15803D" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M42 44 Q48 52 45 62" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" />
            {/* Variegated Ivy Leaves */}
            <circle cx="15" cy="51" r="3.6" fill="#4ADE80" />
            <circle cx="17" cy="59" r="3.2" fill="#16A34A" />
            <circle cx="32" cy="53" r="4" fill="#22C55E" />
            <circle cx="29" cy="61" r="3.2" fill="#14532D" />
            <circle cx="46" cy="52" r="3.8" fill="#86EFAC" />
            <circle cx="44" cy="60" r="3.2" fill="#16A34A" />
            {/* Leaf Vein Highlights */}
            <circle cx="15" cy="51" r="1.5" fill="#DCFCE7" />
            <circle cx="32" cy="53" r="1.8" fill="#DCFCE7" />
            <circle cx="46" cy="52" r="1.6" fill="#DCFCE7" />
          </svg>
        );

      case 'ارکیده':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`orchPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F1F5F9" />
                <stop offset="100%" stopColor="#94A3B8" />
              </linearGradient>
              <radialGradient id={`orchWing_${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FAF5FF" />
                <stop offset="60%" stopColor="#F0ABFC" />
                <stop offset="100%" stopColor="#C026D3" />
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
            {/* Porcelain Pot */}
            <path d="M22 46 L24 58 Q25 60 28 60 L36 60 Q39 60 40 58 L42 46 Z" fill={`url(#orchPot_${uid})`} />
            <rect x="20" y="43" width="24" height="4" rx="2" fill="#64748B" />
            {/* Broad Fleshy Base Leaves */}
            <ellipse cx="23" cy="46" rx="9" ry="3.8" transform="rotate(-18 23 46)" fill="#15803D" />
            <ellipse cx="41" cy="46" rx="9" ry="3.8" transform="rotate(18 41 46)" fill="#16A34A" />
            {/* Slender Bamboo Stake & Arching Stem */}
            <line x1="31" y1="45" x2="31" y2="18" stroke="#D97706" strokeWidth="1.5" />
            <path d="M31 44 Q30 28 36 18 Q41 10 48 12" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
            {/* Lower Blossom */}
            <circle cx="36" cy="19" r="6" fill={`url(#orchWing_${uid})`} />
            <ellipse cx="31" cy="19" rx="4.5" ry="2.6" transform="rotate(-25 31 19)" fill="#F0ABFC" />
            <ellipse cx="41" cy="19" rx="4.5" ry="2.6" transform="rotate(25 41 19)" fill="#F0ABFC" />
            <circle cx="36" cy="20" r="2.5" fill="#A21CAF" />
            <circle cx="36" cy="20" r="1.1" fill="#FACC15" />
            {/* Upper Blossom */}
            <circle cx="46" cy="12" r="5" fill={`url(#orchWing_${uid})`} />
            <ellipse cx="42" cy="12" rx="3.5" ry="2.2" transform="rotate(-25 42 12)" fill="#F0ABFC" />
            <ellipse cx="50" cy="12" rx="3.5" ry="2.2" transform="rotate(25 50 12)" fill="#F0ABFC" />
            <circle cx="46" cy="13" r="2" fill="#A21CAF" />
            <circle cx="46" cy="13" r="0.9" fill="#FACC15" />
          </svg>
        );

      case 'درختچه زیتون':
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`olivePot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#9A3412" />
              </linearGradient>
            </defs>
            <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
            {/* Terracotta Planter */}
            <path d="M22 46 L24 58 Q25 60 28 60 L36 60 Q39 60 40 58 L42 46 Z" fill={`url(#olivePot_${uid})`} />
            <rect x="20" y="43" width="24" height="4" rx="2" fill="#9A3412" />
            {/* Gnarled Olive Trunk */}
            <path d="M32 45 Q30 36 34 28 Q37 20 32 14" stroke="#78350F" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M34 28 Q24 24 20 20" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M34 24 Q44 21 47 18" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
            {/* Silvery-green Olive Foliage Clusters */}
            <ellipse cx="20" cy="18" rx="8" ry="5.5" fill="#4D7C0F" opacity="0.9" />
            <ellipse cx="46" cy="17" rx="8" ry="5.5" fill="#3F6212" opacity="0.9" />
            <ellipse cx="32" cy="12" rx="10" ry="7" fill="#65A30D" opacity="0.95" />
            <ellipse cx="32" cy="10" rx="7" ry="4.5" fill="#A3E635" opacity="0.75" />
            {/* Olives hanging */}
            <circle cx="23" cy="22" r="2" fill="#1E1B4B" />
            <circle cx="27" cy="25" r="1.8" fill="#4D7C0F" />
            <circle cx="39" cy="21" r="2" fill="#1E1B4B" />
            <circle cx="43" cy="23" r="1.8" fill="#365314" />
          </svg>
        );

      case 'ریحان و نعنا':
      default:
        return (
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`herbPot_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4D7C0F" />
                <stop offset="100%" stopColor="#365314" />
              </linearGradient>
            </defs>
            <ellipse cx="32" cy="59" rx="13" ry="2" fill="#000" opacity="0.1" />
            {/* Rustic Sage Pot */}
            <path d="M21 45 L23 58 Q24 60 27 60 L37 60 Q40 60 41 58 L43 45 Z" fill={`url(#herbPot_${uid})`} />
            <rect x="19" y="42" width="26" height="4.2" rx="2" fill="#365314" />
            {/* Stems */}
            <path d="M32 44 L32 22" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" />
            {/* Lush Paired Basil & Mint Leaves */}
            <ellipse cx="25" cy="37" rx="6.5" ry="4.8" transform="rotate(-25 25 37)" fill="#15803D" />
            <ellipse cx="39" cy="37" rx="6.5" ry="4.8" transform="rotate(25 39 37)" fill="#16A34A" />
            <ellipse cx="23" cy="27" rx="7.5" ry="5.2" transform="rotate(-30 23 27)" fill="#22C55E" />
            <ellipse cx="41" cy="27" rx="7.5" ry="5.2" transform="rotate(30 41 27)" fill="#15803D" />
            {/* Center Bushy Dome */}
            <circle cx="32" cy="18" r="7.5" fill="#4ADE80" />
            <circle cx="32" cy="12" r="5.5" fill="#86EFAC" />
            <path d="M32 10 L32 22" stroke="#F0FDF4" strokeWidth="1.2" opacity="0.7" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${sizeMap[size] || sizeMap.md} ${animClass} ${className}`}>
      {renderSVG()}
    </div>
  );
};
