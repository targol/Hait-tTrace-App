import React, { useState, useRef, useEffect } from 'react';
import { ReminderSettings, AlarmSoundItem } from '../types';
import { DEFAULT_REMINDER_SETTINGS } from '../services/storageService';
import { 
  PRESET_ALARM_SOUNDS, 
  previewSound, 
  stopAllAlarmSounds, 
  playAlarmSound 
} from '../services/soundService';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendBrowserNotification 
} from '../services/reminderService';
import { toPersianDigits } from '../calendar/jalali';
import { 
  Bell, 
  Volume2, 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  Check, 
  Sliders, 
  FileAudio, 
  Music, 
  Sparkles, 
  AlertCircle,
  ExternalLink,
  Info,
  Clock,
  RotateCcw,
  Zap
} from 'lucide-react';

interface Props {
  reminderSettings?: ReminderSettings;
  onSaveSettings: (settings: ReminderSettings) => void;
  onNotify?: (msg: string) => void;
}

export const ReminderAlarmSettings: React.FC<Props> = ({
  reminderSettings,
  onSaveSettings,
  onNotify,
}) => {
  const current = reminderSettings || DEFAULT_REMINDER_SETTINGS;

  const [enabled, setEnabled] = useState(current.enabled ?? true);
  const [soundEnabled, setSoundEnabled] = useState(current.soundEnabled ?? true);
  const [selectedSoundId, setSelectedSoundId] = useState(current.selectedSoundId || 'serenity');
  const [volume, setVolume] = useState(current.volume ?? 0.8);
  const [customSounds, setCustomSounds] = useState<AlarmSoundItem[]>(current.customSounds || []);

  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Smart Snooze Intervals & Local Notification Settings
  const [snoozeIntervalMinutes, setSnoozeIntervalMinutes] = useState<number>(current.snoozeIntervalMinutes ?? 10);
  const [autoReNotifyCount, setAutoReNotifyCount] = useState<number>(current.autoReNotifyCount ?? 2);
  const [customSnoozeMinutes, setCustomSnoozeMinutes] = useState<string>('');
  const [availableSnoozeIntervals, setAvailableSnoozeIntervals] = useState<number[]>(
    current.availableSnoozeIntervals && current.availableSnoozeIntervals.length > 0
      ? current.availableSnoozeIntervals
      : [5, 10, 15, 30, 60]
  );

  // New custom audio form
  const [isAddingAudio, setIsAddingAudio] = useState(false);
  const [newAudioTitle, setNewAudioTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    return () => {
      stopAllAlarmSounds();
    };
  }, []);

  const handleTogglePreview = async (soundId: string, customDataUrl?: string) => {
    if (playingSoundId === soundId) {
      stopAllAlarmSounds();
      setPlayingSoundId(null);
    } else {
      stopAllAlarmSounds();
      setPlayingSoundId(soundId);
      try {
        await previewSound(soundId, customDataUrl);
      } catch (err) {
        console.warn('Playback error:', err);
      }
      // Auto reset after 8s if not manually stopped
      setTimeout(() => {
        setPlayingSoundId((prev) => (prev === soundId ? null : prev));
      }, 8000);
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      onNotify?.('دسترسی اعلان مرورگر با موفقیت فعال شد.');
    } else if (perm === 'denied') {
      onNotify?.('دسترسی اعلان توسط مرورگر مسدود است. لطفاً از تنظیمات مرورگر اجازه را فعال کنید.');
    }
  };

  const handleTestNotificationAndAlarm = async () => {
    // 1. Trigger sound
    if (soundEnabled) {
      const activeCustom = customSounds.find((c) => c.id === selectedSoundId);
      handleTogglePreview(selectedSoundId, activeCustom?.dataUrl);
    }

    // 2. Request permission if needed
    if (notifPermission !== 'granted') {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
    }

    // 3. Send test notification
    const success = sendBrowserNotification(
      'تست اعلان و آلارم جوانه 🌱',
      'سیستم یادآور مرورگر و زنگ ملایم با موفقیت فعال است.',
      'test-notification'
    );

    if (success) {
      onNotify?.('اعلان آزمایشی به همراه زنگ صوتی ارسال شد!');
    } else {
      onNotify?.('صدا پخش شد. در صورت تمایل به دریافت بنر، مجوز اعلان مرورگر را تایید فرمایید.');
    }
  };

  // Upload custom user audio file
  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 4MB to keep local storage performant)
    const MAX_SIZE_MB = 4;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      onNotify?.(`حجم فایل صوتی بیش از حد مجاز است (حداکثر ${toPersianDigits(MAX_SIZE_MB)} مگابایت).`);
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const title = newAudioTitle.trim() || file.name.replace(/\.[^/.]+$/, '');
      const newSound: AlarmSoundItem = {
        id: `custom-sound-${Date.now()}`,
        title,
        description: 'آهنگ اختصاصی کاربر',
        category: 'custom',
        dataUrl,
      };

      const updatedSounds = [...customSounds, newSound];
      setCustomSounds(updatedSounds);
      setSelectedSoundId(newSound.id);
      onSaveSettings({
        enabled,
        soundEnabled,
        selectedSoundId: newSound.id,
        volume,
        customSounds: updatedSounds,
        snoozeIntervalMinutes,
        autoReNotifyCount,
        availableSnoozeIntervals,
      });
      setNewAudioTitle('');
      setIsAddingAudio(false);
      setIsUploading(false);
      onNotify?.(`نغمه «${title}» با موفقیت اضافه، ذخیره و به عنوان زنگ انتخابی قرار گرفت.`);
    };

    reader.onerror = () => {
      setIsUploading(false);
      onNotify?.('خطا در بارگذاری فایل صوتی.');
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteCustomSound = (soundId: string, title: string) => {
    const updated = customSounds.filter((s) => s.id !== soundId);
    setCustomSounds(updated);
    if (selectedSoundId === soundId) {
      setSelectedSoundId('serenity');
    }
    if (playingSoundId === soundId) {
      stopAllAlarmSounds();
      setPlayingSoundId(null);
    }
    onNotify?.(`نغمه «${title}» حذف شد.`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ReminderSettings = {
      enabled,
      soundEnabled,
      selectedSoundId,
      volume,
      customSounds,
      snoozeIntervalMinutes,
      availableSnoozeIntervals,
      autoReNotifyCount,
      autoReNotifyIntervalMinutes: snoozeIntervalMinutes,
    };
    onSaveSettings(updated);
    setSavedSuccess(true);
    onNotify?.('تنظیمات یادآور، فواصل یادآوری هوشمند و آلارم با موفقیت ذخیره شد.');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const allSounds = [
    ...PRESET_ALARM_SOUNDS,
    ...customSounds,
  ];

  return (
    <div className="bg-white rounded-2xl border border-emerald-100/90 p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <span>تنظیمات سیستم یادآور، اعلان مرورگر و آلارم صوتی</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            انتخاب موسیقی‌های ملایم بدون کلام برای یادآوری تسک‌های مهم، تنظیم بلندی صدا و افزودن آهنگ‌های دلخواه.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 font-semibold">
            <Check className="w-3.5 h-3.5" />
            <span>تنظیمات ذخیره شد</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Master Toggles & Volume */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${soundEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-800 block">پخش آلارم صوتی</span>
                <span className="text-[10px] text-gray-500 block">پخش نغمه آرامش‌بخش هنگام فرارسیدن یادآور</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100/80 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>بلندی صدای آلارم</span>
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {toPersianDigits(Math.round(volume * 100))}٪
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={volume}
              disabled={!soundEnabled}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        {/* Browser Notification Status Banner */}
        <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50/60 rounded-xl border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-teal-600 text-white rounded-lg">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-teal-950 block">وضعیت دسترسی اعلان مرورگر (Notification API)</span>
              <span className="text-[11px] text-teal-800">
                {notifPermission === 'granted'
                  ? 'مجوز اعلان مرورگر فعال است. یادآورها به صورت بنر و پنجره پاپ‌آپ اعلام می‌شوند.'
                  : notifPermission === 'denied'
                  ? 'اعلان‌ها مسدود شده‌اند. برای دریافت، از علامت قفل در نوار آدرس مرورگر مجوز را باز کنید.'
                  : 'برای دریافت اعلان خودکار تسک‌های مهم، نیاز به تایید دسترسی اعلان مرورگر است.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {notifPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                فعال‌سازی مجوز اعلان
              </button>
            )}

            <button
              type="button"
              onClick={handleTestNotificationAndAlarm}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>تست هم‌زمان اعلان و زنگ 🔔🎵</span>
            </button>
          </div>
        </div>

        {/* Smart Snooze & Local Notification Intervals Section */}
        <div className="p-4 bg-gradient-to-br from-amber-50/70 via-emerald-50/30 to-teal-50/50 rounded-2xl border border-amber-200/80 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-2xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-950 block">فواصل یادآوری هوشمند و تعویق (Smart Snooze)</span>
                <span className="text-[11px] text-amber-800/80 block">مدیریت فواصل اعلان‌های محلی در صورت تعویق یا رسیدگی نکردن به تسک</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
              مدیریت با اعلانات محلی (Local Notifications)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Quick Default Interval Choice */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-100 space-y-2.5 shadow-2xs">
              <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>فاصله پیش‌فرض یادآوری دوباره (تعویق)</span>
                </span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {toPersianDigits(snoozeIntervalMinutes)} دقیقه بعد
                </span>
              </label>

              {/* Chips for choosing intervals */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {availableSnoozeIntervals.map((mins) => {
                  const isSelected = snoozeIntervalMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSnoozeIntervalMinutes(mins)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs scale-102 ring-2 ring-amber-400/40'
                          : 'bg-gray-50 hover:bg-amber-50 text-gray-700 border border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <span>{toPersianDigits(mins)} دقیقه</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>

              {/* Add custom snooze interval */}
              <div className="pt-2 flex items-center gap-2 border-t border-gray-100">
                <input
                  type="number"
                  min="1"
                  max="240"
                  placeholder="فاصله دلخواه (دقیقه)..."
                  value={customSnoozeMinutes}
                  onChange={(e) => setCustomSnoozeMinutes(e.target.value)}
                  className="px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs w-36 outline-hidden focus:border-amber-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseInt(customSnoozeMinutes, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      if (!availableSnoozeIntervals.includes(parsed)) {
                        const updated = [...availableSnoozeIntervals, parsed].sort((a, b) => a - b);
                        setAvailableSnoozeIntervals(updated);
                      }
                      setSnoozeIntervalMinutes(parsed);
                      setCustomSnoozeMinutes('');
                      onNotify?.(`فاصله ${toPersianDigits(parsed)} دقیقه به گزینه‌ها اضافه شد.`);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن فاصله</span>
                </button>
              </div>
            </div>

            {/* Auto Re-Notify Behavior */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-100 space-y-2.5 shadow-2xs">
              <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>تکرار خودکار اعلان در صورت عدم واکنش</span>
                </span>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {autoReNotifyCount === 0 ? 'غیرفعال' : `تا ${toPersianDigits(autoReNotifyCount)} مرتبه`}
                </span>
              </label>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                اگر هنگام پخش یادآور متوجه زنگ نشدید، سامانه پس از هر {toPersianDigits(snoozeIntervalMinutes)} دقیقه مجدداً از طریق اعلانات محلی مرورگر شما را باخبر می‌کند.
              </p>

              <div className="flex items-center gap-2 pt-1">
                {[0, 1, 2, 3, 5].map((cnt) => {
                  const isSelected = autoReNotifyCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setAutoReNotifyCount(cnt)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-700 text-white shadow-xs scale-102 ring-2 ring-teal-400/40'
                          : 'bg-gray-50 hover:bg-teal-50 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {cnt === 0 ? 'خاموش' : `${toPersianDigits(cnt)} بار`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Preset Instrumental Sounds Grid */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Music className="w-4 h-4 text-emerald-600" />
              <span>فهرست نغمه‌های ملایم بدون کلام (پیش‌فرض جوانه)</span>
            </label>
            <span className="text-[11px] text-gray-500">طراحی شده با الگوهای ملایم و ارگانیک ذهن‌آگاهی</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {PRESET_ALARM_SOUNDS.map((sound) => {
              const isSelected = selectedSoundId === sound.id;
              const isPlaying = playingSoundId === sound.id;

              return (
                <div
                  key={sound.id}
                  onClick={() => setSelectedSoundId(sound.id)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-2xs ring-1 ring-emerald-400/40'
                      : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-gray-50/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="radio"
                      name="selectedAlarm"
                      checked={isSelected}
                      onChange={() => setSelectedSoundId(sound.id)}
                      className="accent-emerald-600 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-900 block truncate">
                        {sound.title}
                      </span>
                      <span className="text-[10px] text-gray-500 block truncate">
                        {sound.description}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePreview(sound.id);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                      isPlaying
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                    }`}
                    title={isPlaying ? 'توقف پیش‌نمایش' : 'شنیدن نغمه'}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3 h-3 fill-amber-800" />
                        <span>توقف</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-emerald-800" />
                        <span>پیش‌نمایش</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Uploaded Sounds Section */}
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <FileAudio className="w-4 h-4 text-emerald-600" />
                <span>زنگ‌ها و آهنگ‌های دلخواه شما</span>
              </label>
              <p className="text-[11px] text-gray-500 mt-0.5">
                می‌توانید آهنگ‌های ملایم، آرام‌بخش یا صدای ضبط‌شده دلخواه خود را بارگذاری و به عنوان آلارم تعیین کنید.
              </p>
            </div>

            {!isAddingAudio && (
              <button
                type="button"
                onClick={() => setIsAddingAudio(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن آهنگ جدید</span>
              </button>
            )}
          </div>

          {/* Add custom audio modal/form */}
          {isAddingAudio && (
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3 animate-fade-in">
              <span className="text-xs font-bold text-emerald-950 block">افزودن فایل صوتی اختصاصی:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">نام نغمه یا آهنگ</label>
                  <input
                    type="text"
                    placeholder="مثلاً: نوای آرامش سنتور من"
                    value={newAudioTitle}
                    onChange={(e) => setNewAudioTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">انتخاب فایل صوتی (MP3, WAV, OGG)</label>
                  <input
                    type="file"
                    ref={audioFileInputRef}
                    accept="audio/*"
                    onChange={handleCustomAudioUpload}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingAudio(false)}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-xs cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

          {/* Custom Sounds List */}
          {customSounds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {customSounds.map((sound) => {
                const isSelected = selectedSoundId === sound.id;
                const isPlaying = playingSoundId === sound.id;

                return (
                  <div
                    key={sound.id}
                    onClick={() => setSelectedSoundId(sound.id)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-2xs ring-1 ring-emerald-400/40'
                        : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="radio"
                        name="selectedAlarm"
                        checked={isSelected}
                        onChange={() => setSelectedSoundId(sound.id)}
                        className="accent-emerald-600 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 block truncate flex items-center gap-1">
                          <span>{sound.title}</span>
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">سفارشی</span>
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          فایل بارگذاری شده توسط شما
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePreview(sound.id, sound.dataUrl);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          isPlaying
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                        title={isPlaying ? 'توقف پخش' : 'پخش آهنگ'}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-amber-800" />
                            <span>توقف</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-emerald-800" />
                            <span>پخش</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomSound(sound.id, sound.title);
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف این نغمه سفارشی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
              هنوز آهنگ سفارشی افزوده‌اید؟ می‌توانید با دکمه بالا فایل صوتی ملایم دلخواه خود را بارگذاری کنید.
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>ذخیره تنظیمات یادآور و صدا</span>
          </button>
        </div>
      </form>
    </div>
  );
};
