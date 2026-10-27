export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'
];

export const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const str = n.toString();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

// Gregorian to Jalali conversion algorithm
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { year: jy, month: jm, day: jd };
}

export function jalaliToFormattedString(j: JalaliDate): string {
  const m = j.month.toString().padStart(2, '0');
  const d = j.day.toString().padStart(2, '0');
  return `${j.year}/${m}/${d}`;
}

export function getTodayJalali(): JalaliDate {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function getDayOfWeek(j: JalaliDate): number {
  const g = jalaliToGregorian(j.year, j.month, j.day);
  const d = g.getDay(); // Sunday=0, Monday=1.. Saturday=6
  return (d + 1) % 7; // Saturday=0 (شنبه).. Friday=6 (جمعه)
}

/**
 * Formats a JalaliDate cleanly for headers / logo subtitles in Persian:
 * e.g. "دوشنبه، ۲۸ مهر ۱۴۰۵"
 * Uses accurate Persian day-of-week, Persian month name, and Persian digits.
 */
export function formatHeaderPersianDate(j: JalaliDate): string {
  const dow = getDayOfWeek(j);
  const weekdayName = WEEKDAYS[dow];
  const monthName = PERSIAN_MONTHS[j.month - 1];
  const dayStr = toPersianDigits(j.day);
  const yearStr = toPersianDigits(j.year);
  return `${weekdayName}، ${dayStr} ${monthName} ${yearStr}`;
}

// Iranian official holidays fixed in Solar Calendar (شمسی ثابت)
export const IRANIAN_SOLAR_HOLIDAYS: Record<string, string> = {
  '01/01': 'عید نوروز (آغاز سال نو)',
  '01/02': 'عید نوروز',
  '01/03': 'عید نوروز',
  '01/04': 'عید نوروز',
  '01/12': 'روز جمهوری اسلامی ایران',
  '01/13': 'روز طبیعت (سیزده‌بدر)',
  '03/14': 'رحلت حضرت امام خمینی (ره)',
  '03/15': 'قیام ۱۵ خرداد',
  '11/22': 'پیروزی انقلاب اسلامی ایران',
  '12/29': 'روز ملی شدن صنعت نفت'
};

// Iranian official lunar religious holidays mapped by Jalali year
// (1403, 1404, 1405 covering current and adjacent Iranian years)
export const IRANIAN_YEAR_LUNAR_HOLIDAYS: Record<number, Record<string, string>> = {
  1403: {
    '01/12': 'شهادت حضرت علی (ع)',
    '01/22': 'عید سعید فطر',
    '01/23': 'تعطیل به مناسبت عید سعید فطر',
    '02/15': 'شهادت امام جعفر صادق (ع)',
    '03/28': 'عید سعید قربان',
    '04/05': 'عید سعید غدیر خم',
    '04/25': 'تاسوعای حسینی',
    '04/26': 'عاشورای حسینی',
    '06/04': 'اربعین حسینی',
    '06/12': 'رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)',
    '06/14': 'شهادت امام رضا (ع)',
    '06/22': 'شهادت امام حسن عسکری (ع)',
    '06/31': 'میلاد پیامبر اکرم (ص) و ولادت امام جعفر صادق (ع)',
    '09/15': 'شهادت حضرت فاطمه زهرا (س)',
    '10/25': 'ولادت حضرت امام علی (ع)',
    '11/09': 'مبعث حضرت رسول اکرم (ص)',
    '11/26': 'ولادت حضرت قائم (عج) (نیمه شعبان)',
  },
  1404: {
    '01/01': 'شهادت حضرت علی (ع)',
    '01/11': 'عید سعید فطر',
    '01/12': 'تعطیل به مناسبت عید سعید فطر',
    '02/04': 'شهادت امام جعفر صادق (ع)',
    '03/16': 'عید سعید قربان',
    '03/24': 'عید سعید غدیر خم',
    '04/14': 'تاسوعای حسینی',
    '04/15': 'عاشورای حسینی',
    '05/23': 'اربعین حسینی',
    '05/31': 'رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)',
    '06/02': 'شهادت امام رضا (ع)',
    '06/11': 'شهادت امام حسن عسکری (ع)',
    '06/20': 'میلاد پیامبر اکرم (ص) و ولادت امام جعفر صادق (ع)',
    '09/04': 'شهادت حضرت فاطمه زهرا (س)',
    '10/14': 'ولادت حضرت امام علی (ع)',
    '10/28': 'مبعث حضرت رسول اکرم (ص)',
    '11/15': 'ولادت حضرت قائم (عج) (نیمه شعبان)',
    '12/21': 'شهادت حضرت علی (ع)',
  },
  1405: {
    '01/01': 'عید سعید فطر',
    '01/02': 'تعطیل به مناسبت عید سعید فطر',
    '01/24': 'شهادت امام جعفر صادق (ع)',
    '03/06': 'عید سعید قربان',
    '03/14': 'عید سعید غدیر خم',
    '04/04': 'تاسوعای حسینی',
    '04/05': 'عاشورای حسینی',
    '05/13': 'اربعین حسینی',
    '05/21': 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)',
    '05/23': 'شهادت امام رضا (ع)',
    '05/31': 'شهادت امام حسن عسکری (ع)',
    '06/09': 'میلاد رسول اکرم (ص) و امام جعفر صادق (ع)',
    '08/24': 'شهادت حضرت فاطمه زهرا (س)',
    '10/04': 'ولادت حضرت امام علی (ع)',
    '10/18': 'مبعث حضرت رسول اکرم (ص)',
    '11/05': 'ولادت حضرت قائم (عج) (نیمه شعبان)',
    '12/10': 'شهادت حضرت علی (ع)',
    '12/29': 'عید سعید فطر',
  }
};

export interface HolidayCheckResult {
  isHoliday: boolean;
  isFriday: boolean;
  title?: string;
}

export function isDateHoliday(j: JalaliDate): HolidayCheckResult {
  const dow = getDayOfWeek(j);
  const isFriday = dow === 6;

  const m = j.month.toString().padStart(2, '0');
  const d = j.day.toString().padStart(2, '0');
  const key = `${m}/${d}`;

  // 1. Solar national holiday
  if (IRANIAN_SOLAR_HOLIDAYS[key]) {
    return {
      isHoliday: true,
      isFriday,
      title: IRANIAN_SOLAR_HOLIDAYS[key] + (isFriday ? ' (جمعه)' : '')
    };
  }

  // 2. Year-specific Lunar religious holiday
  const yearLunar = IRANIAN_YEAR_LUNAR_HOLIDAYS[j.year];
  if (yearLunar && yearLunar[key]) {
    return {
      isHoliday: true,
      isFriday,
      title: yearLunar[key] + (isFriday ? ' (جمعه)' : '')
    };
  }

  // 3. Friday (official Iranian weekend holiday)
  if (isFriday) {
    return {
      isHoliday: true,
      isFriday: true,
      title: 'جمعه (تعطیل رسمی هفتگی)'
    };
  }

  return { isHoliday: false, isFriday: false };
}

// Jalali to Gregorian conversion
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd +
    ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd_m = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && days >= gd_m[gm]) {
    days -= gd_m[gm];
    gm++;
  }
  return new Date(gy, gm - 1, days + 1);
}

// Add days to Jalali Date
export function addDaysJalali(j: JalaliDate, days: number): JalaliDate {
  const g = jalaliToGregorian(j.year, j.month, j.day);
  g.setDate(g.getDate() + days);
  return gregorianToJalali(g.getFullYear(), g.getMonth() + 1, g.getDate());
}

// Converts Persian/Arabic digits to Latin digits
export function toLatinDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str.toString();
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(persianDigits[i], i.toString()).replaceAll(arabicDigits[i], i.toString());
  }
  return res;
}

// Safely normalize any Jalali date string to standard YYYY/MM/DD
export function normalizeJalaliDateStr(str?: string | null): string {
  if (!str) return '';
  const latin = toLatinDigits(str).trim();
  const parts = latin.split(/[\/\-]/).map(p => parseInt(p.trim(), 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const y = parts[0];
    const m = parts[1].toString().padStart(2, '0');
    const d = parts[2].toString().padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return latin;
}

// Safely compare two Jalali date strings (returns < 0 if d1 < d2, 0 if equal, > 0 if d1 > d2)
export function compareJalaliDateStrings(d1?: string | null, d2?: string | null): number {
  const norm1 = normalizeJalaliDateStr(d1);
  const norm2 = normalizeJalaliDateStr(d2);
  if (!norm1 && !norm2) return 0;
  if (!norm1) return -1;
  if (!norm2) return 1;
  return norm1.localeCompare(norm2);
}

export function isUpcomingJalaliDate(dueDate?: string | null, todayStr?: string): boolean {
  if (!dueDate || !todayStr) return false;
  return compareJalaliDateStrings(dueDate, todayStr) > 0;
}

export function isOverdueJalaliDate(dueDate?: string | null, todayStr?: string): boolean {
  if (!dueDate || !todayStr) return false;
  return compareJalaliDateStrings(dueDate, todayStr) < 0;
}

export function isTodayJalaliDate(dueDate?: string | null, todayStr?: string): boolean {
  if (!dueDate || !todayStr) return false;
  return compareJalaliDateStrings(dueDate, todayStr) === 0;
}

export function parseJalaliString(str: string): JalaliDate | null {
  const latin = toLatinDigits(str).trim();
  const parts = latin.split(/[\/\-]/).map(p => parseInt(p.trim(), 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  return null;
}

export function isJalaliLeapYear(jy: number): boolean {
  // Common 33-year cycle leap year remainder test:
  // Remainder in [1, 5, 9, 13, 17, 22, 26, 30] of (jy % 33)
  const rem = (jy + 38) % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(rem);
}

export function getDaysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  // Esfand leap year check
  return isJalaliLeapYear(year) ? 30 : 29;
}

export const WEEKS_OF_MONTH = [
  'هفته اول',
  'هفته دوم',
  'هفته سوم',
  'هفته چهارم',
  'هفته پنجم',
];

export function getWeekOfMonth(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

export const PERSIAN_SEASONS = [
  { index: 0, name: 'بهار', months: ['فروردین', 'اردیبهشت', 'خرداد'], iconName: 'Sprout', colorHex: '#10B981', bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { index: 1, name: 'تابستان', months: ['تیر', 'مرداد', 'شهریور'], iconName: 'Sun', colorHex: '#F59E0B', bgClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { index: 2, name: 'پاییز', months: ['مهر', 'آبان', 'آذر'], iconName: 'Flame', colorHex: '#EA580C', bgClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  { index: 3, name: 'زمستان', months: ['دی', 'بهمن', 'اسفند'], iconName: 'Snowflake', colorHex: '#3B82F6', bgClass: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export function getCurrentPersianDateTimeString(): string {
  const now = new Date();
  const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const dateStr = jalaliToFormattedString(j);
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${dateStr} - ${toPersianDigits(`${hours}:${minutes}`)}`;
}

export function getSeasonByMonth(month: number): number {
  if (month >= 1 && month <= 3) return 0;
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  return 3;
}

export interface WeekDayInfo {
  dayOfWeek: number; // 0=Saturday (شنبه) .. 6=Friday (جمعه)
  weekdayName: string;
  shortName: string;
  date: JalaliDate;
  dateStr: string;
  isToday: boolean;
}

export function getCurrentWeekJalaliDays(baseDate?: JalaliDate): WeekDayInfo[] {
  const today = baseDate || getTodayJalali();
  const currentDOW = getDayOfWeek(today); // 0..6
  const days: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const offset = i - currentDOW;
    const date = addDaysJalali(today, offset);
    const dateStr = jalaliToFormattedString(date);
    days.push({
      dayOfWeek: i,
      weekdayName: WEEKDAYS[i],
      shortName: WEEKDAYS_SHORT[i],
      date,
      dateStr,
      isToday: offset === 0,
    });
  }
  return days;
}

// Check if a season has completely ended
export function isSeasonPast(year: number, seasonIndex: number, currentJalali?: JalaliDate): boolean {
  const now = currentJalali || getTodayJalali();
  if (year < now.year) return true;
  if (year > now.year) return false;
  const currentSeason = getSeasonByMonth(now.month);
  return seasonIndex < currentSeason;
}

// Check if a month has completely ended
export function isMonthPast(year: number, monthIndex: number, currentJalali?: JalaliDate): boolean {
  const now = currentJalali || getTodayJalali();
  if (year < now.year) return true;
  if (year > now.year) return false;
  return monthIndex < now.month;
}

// Check if a year has completely ended
export function isYearPast(year: number, currentJalali?: JalaliDate): boolean {
  const now = currentJalali || getTodayJalali();
  return year < now.year;
}

export interface JalaliMonthDay {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  dayOfWeek: number; // 0=Sat (شنبه) .. 6=Fri (جمعه)
  isToday: boolean;
  isHoliday: boolean;
  isFriday: boolean;
  holidayTitle?: string;
  isCurrentMonth: boolean;
}

/**
 * Returns a complete grid of calendar days for a given Jalali month (year, month).
 * Includes padding days from previous and next months to form aligned 7-column rows (starting on شنبه).
 */
export function getJalaliMonthCalendar(year: number, month: number): JalaliMonthDay[] {
  const today = getTodayJalali();
  const todayStr = jalaliToFormattedString(today);
  const daysInMonth = getDaysInJalaliMonth(year, month);
  
  // Day of week for the 1st of this month (0: Sat, ... 6: Fri)
  const firstDayDOW = getDayOfWeek({ year, month, day: 1 });

  const grid: JalaliMonthDay[] = [];

  // Padding days from previous month
  if (firstDayDOW > 0) {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const daysInPrevMonth = getDaysInJalaliMonth(prevYear, prevMonth);
    const startPrevDay = daysInPrevMonth - firstDayDOW + 1;

    for (let d = startPrevDay; d <= daysInPrevMonth; d++) {
      const jDate: JalaliDate = { year: prevYear, month: prevMonth, day: d };
      const dStr = jalaliToFormattedString(jDate);
      const hol = isDateHoliday(jDate);
      const dow = getDayOfWeek(jDate);
      grid.push({
        year: prevYear,
        month: prevMonth,
        day: d,
        dateStr: dStr,
        dayOfWeek: dow,
        isToday: dStr === todayStr,
        isHoliday: hol.isHoliday,
        isFriday: hol.isFriday,
        holidayTitle: hol.title,
        isCurrentMonth: false,
      });
    }
  }

  // Days of the current month
  for (let d = 1; d <= daysInMonth; d++) {
    const jDate: JalaliDate = { year, month, day: d };
    const dStr = jalaliToFormattedString(jDate);
    const hol = isDateHoliday(jDate);
    const dow = getDayOfWeek(jDate);
    grid.push({
      year,
      month,
      day: d,
      dateStr: dStr,
      dayOfWeek: dow,
      isToday: dStr === todayStr,
      isHoliday: hol.isHoliday,
      isFriday: hol.isFriday,
      holidayTitle: hol.title,
      isCurrentMonth: true,
    });
  }

  // Padding days for next month to complete the row (multiples of 7)
  const remainder = grid.length % 7;
  if (remainder !== 0) {
    const nextPaddingNeeded = 7 - remainder;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    for (let d = 1; d <= nextPaddingNeeded; d++) {
      const jDate: JalaliDate = { year: nextYear, month: nextMonth, day: d };
      const dStr = jalaliToFormattedString(jDate);
      const hol = isDateHoliday(jDate);
      const dow = getDayOfWeek(jDate);
      grid.push({
        year: nextYear,
        month: nextMonth,
        day: d,
        dateStr: dStr,
        dayOfWeek: dow,
        isToday: dStr === todayStr,
        isHoliday: hol.isHoliday,
        isFriday: hol.isFriday,
        holidayTitle: hol.title,
        isCurrentMonth: false,
      });
    }
  }

  return grid;
}




