import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { DEFAULT_USER_PROFILE, saveUserProfileImmediate } from '../services/storageService';
import { processAndCompressImage } from '../utils/imageUtils';
import { toPersianDigits } from '../calendar/jalali';
import { 
  User, 
  Camera, 
  Check, 
  Trash2, 
  Sparkles, 
  UploadCloud,
  FileText,
  Smile,
} from 'lucide-react';

interface Props {
  userProfile?: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onNotify?: (msg: string) => void;
}

const BOTANICAL_AVATAR_PRESETS = [
  { id: 'sprout', emoji: '🌱', label: 'جوانه امید' },
  { id: 'flower', emoji: '🌸', label: 'شکوفه بهار' },
  { id: 'rose', emoji: '🌹', label: 'گل سرخ' },
  { id: 'cactus', emoji: '🌵', label: 'کاکتوس مقاوم' },
  { id: 'tree', emoji: '🌳', label: 'درخت تنومند' },
  { id: 'lotus', emoji: '🪷', label: 'نیلوفر آبی' },
  { id: 'sunflower', emoji: '🌻', label: 'آفتابگردان' },
  { id: 'olive', emoji: '🌿', label: 'شاخه زیتون' },
  { id: 'clover', emoji: '🍀', label: 'شبدر چهاربرگ' },
  { id: 'maple', emoji: '🍁', label: 'برگ پاییزی' },
  { id: 'palm', emoji: '🌴', label: 'نخل سبز' },
  { id: 'star', emoji: '🌟', label: 'ستاره هدف' },
];

export const UserProfileSettings: React.FC<Props> = ({
  userProfile,
  onSaveProfile,
  onNotify,
}) => {
  const currentProfile = userProfile || DEFAULT_USER_PROFILE;

  const [name, setName] = useState(currentProfile.name || '');
  const [title, setTitle] = useState(currentProfile.title || '');
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatarUrl || '🌱');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [autoSaveActive, setAutoSaveActive] = useState(false);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageSizeInfo, setImageSizeInfo] = useState<{ originalKb: number; compressedKb: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirtyRef = useRef(false);

  // Sync local inputs if parent userProfile updates externally (e.g. after backup restore)
  useEffect(() => {
    if (!isDirtyRef.current && userProfile) {
      setName(userProfile.name || '');
      setTitle(userProfile.title || '');
      setAvatarUrl(userProfile.avatarUrl || '🌱');
      setBio(userProfile.bio || '');
    }
  }, [userProfile?.name, userProfile?.title, userProfile?.avatarUrl, userProfile?.bio]);

  // Helper that merges with currentProfile (preserving theme/darkMode settings) and persists immediately
  const persistProfileNow = (
    nextFields?: Partial<{ name: string; title: string; avatarUrl: string; bio: string }>,
    showToast = false
  ) => {
    const mergedName = (nextFields?.name !== undefined ? nextFields.name : name).trim() || 'باغبان جوانه';
    const mergedTitle = (nextFields?.title !== undefined ? nextFields.title : title).trim();
    const mergedAvatar = (nextFields?.avatarUrl !== undefined ? nextFields.avatarUrl : avatarUrl) || '🌱';
    const mergedBio = (nextFields?.bio !== undefined ? nextFields.bio : bio).trim();

    const updated: UserProfile = {
      ...currentProfile,
      name: mergedName,
      title: mergedTitle,
      avatarUrl: mergedAvatar,
      bio: mergedBio,
    };

    // 1. Synchronous multi-layer write to localStorage + IndexedDB + Snapshot
    const saved = saveUserProfileImmediate(updated);
    // 2. Update React parent state
    onSaveProfile(saved);
    isDirtyRef.current = false;
    setAutoSaveActive(true);

    if (showToast) {
      setSavedSuccess(true);
      onNotify?.('پروفایل کاربری با موفقیت در حافظه برنامه ذخیره شد ✓');
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  // Debounced auto-save whenever user types in name, title, or bio so changes are never lost on tab switch
  useEffect(() => {
    if (!isDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      persistProfileNow(undefined, false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [name, title, avatarUrl, bio]);

  // Compress & convert uploaded image to lightweight compact DataURL and save immediately
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const result = await processAndCompressImage(file, 256, 0.8);
      setAvatarUrl(result.dataUrl);
      setImageSizeInfo({
        originalKb: result.originalSizeKb,
        compressedKb: result.compressedSizeKb,
      });
      persistProfileNow({ avatarUrl: result.dataUrl }, false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onNotify?.(
        `تصویر پروفایل بهینه‌سازی و ذخیره شد (${toPersianDigits(result.originalSizeKb)} KB ➔ ${toPersianDigits(result.compressedSizeKb)} KB)`
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'خطا در بارگذاری و فشرده‌سازی تصویر';
      onNotify?.(errorMsg);
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    persistProfileNow(undefined, true);
  };

  const isImageAvatar = avatarUrl && (avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http'));

  return (
    <div className="bg-white rounded-2xl border border-emerald-100/90 p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>پروفایل و هویت کاربری من</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            نام، تصویر یا آواتار و یادداشت شخصی خود را برای نمایش در نوار بالای برنامه و صفحه امروز تنظیم کنید.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {autoSaveActive && !savedSuccess && (
            <span className="text-[11px] text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-200/80 flex items-center gap-1 font-medium">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>ذخیره خودکار انجام شد</span>
            </span>
          )}
          {savedSuccess && (
            <span className="text-xs text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 flex items-center gap-1 font-bold animate-fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>تغییرات پروفایل ذخیره شد ✓</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Avatar & Details Grid */}
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/70">
          {/* Avatar Preview & Upload */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative group">
              <div 
                className="w-20 h-20 rounded-full border-2 border-emerald-400 bg-white shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105"
              >
                {isImageAvatar ? (
                  <img 
                    src={avatarUrl} 
                    alt="آواتار کاربر" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-4xl select-none" role="img" aria-label="آواتار">
                    {avatarUrl || '🌱'}
                  </span>
                )}
              </div>
              <label
                htmlFor="javaneh-profile-avatar-input"
                className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md border-2 border-white transition-transform hover:scale-110 cursor-pointer"
                title="بارگذاری تصویر از گالری یا دوربین دستگاه"
              >
                <Camera className="w-3.5 h-3.5" />
              </label>
            </div>

            <input
              id="javaneh-profile-avatar-input"
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="sr-only"
              onChange={handleImageUpload}
              onClick={(e) => {
                (e.target as HTMLInputElement).value = '';
              }}
            />

            <div className="flex items-center gap-1.5">
              <label
                htmlFor="javaneh-profile-avatar-input"
                className={`text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer select-none ${
                  isProcessingImage ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <UploadCloud className="w-3 h-3" />
                <span>{isProcessingImage ? 'در حال بهینه‌سازی...' : 'بارگذاری عکس'}</span>
              </label>

              {isImageAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarUrl('🌱');
                    setImageSizeInfo(null);
                    persistProfileNow({ avatarUrl: '🌱' }, true);
                  }}
                  className="text-[11px] text-gray-500 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                  title="حذف تصویر و انتخاب آواتار پیش‌فرض"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Image upload limits hint */}
            <div className="text-[10px] text-gray-500 text-center max-w-[170px] leading-tight mt-0.5">
              <span className="text-emerald-700 font-medium">سقف حجم فایل: ۲۵ مگابایت</span>
              <span className="block text-gray-400 mt-0.5">فشرده‌سازی خودکار به کمتر از ۴۰KB</span>
              {imageSizeInfo && (
                <span className="block text-emerald-600 font-bold mt-0.5">
                  حجم ذخیره: {toPersianDigits(imageSizeInfo.compressedKb)} KB
                </span>
              )}
            </div>
          </div>

          {/* Botanical Preset Selector */}
          <div className="flex-1 w-full space-y-2">
            <span className="block text-[11px] font-semibold text-gray-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>انتخاب سریع از آواتارهای گیاهی جوانه (با لمس هر نماد بلافاصله ذخیره می‌شود):</span>
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {BOTANICAL_AVATAR_PRESETS.map((preset) => {
                const isSelected = avatarUrl === preset.emoji;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(preset.emoji);
                      setImageSizeInfo(null);
                      persistProfileNow({ avatarUrl: preset.emoji }, true);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-100/80 border-emerald-500 ring-2 ring-emerald-300/60 scale-105 shadow-2xs'
                        : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50'
                    }`}
                    title={preset.label}
                  >
                    <span className="text-xl">{preset.emoji}</span>
                    <span className="text-[9px] text-gray-600 mt-1 truncate max-w-full">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>نام یا نیک‌نیم (نام نمایشی شما)</span>
            </label>
            <input
              type="text"
              placeholder="مثلاً: تارگل، کیان، مریم یا هر نام دلخواه..."
              value={name}
              onChange={(e) => {
                isDirtyRef.current = true;
                setName(e.target.value);
              }}
              onBlur={() => persistProfileNow(undefined, false)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden transition-all bg-white text-xs font-medium"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              این نام در نوار بالای اپلیکیشن و کارت خوش‌آمدگویی صفحه امروز نمایش داده می‌شود.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-emerald-600" />
              <span>عنوان یا برچسب رشد</span>
            </label>
            <input
              type="text"
              placeholder="مثلاً: باغبان متعهد اهداف، پژوهشگر"
              value={title}
              onChange={(e) => {
                isDirtyRef.current = true;
                setTitle(e.target.value);
              }}
              onBlur={() => persistProfileNow(undefined, false)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden transition-all bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>شعار یا یادداشت تمرکز روزانه</span>
          </label>
          <textarea
            rows={2}
            placeholder="جمله‌ای انگیزشی یا یادآوری شخصی که در صفحه امروز نمایش داده می‌شود..."
            value={bio}
            onChange={(e) => {
              isDirtyRef.current = true;
              setBio(e.target.value);
            }}
            onBlur={() => persistProfileNow(undefined, false)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden transition-all bg-white text-xs"
          />
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <span className="text-[11px] text-gray-500">
            💡 تغییرات به صورت خودکار نیز در حافظه گوشی ذخیره می‌شوند.
          </span>
          <button
            type="button"
            onClick={() => handleSave()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>ذخیره مشخصات پروفایل</span>
          </button>
        </div>
      </form>
    </div>
  );
};
