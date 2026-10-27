package com.example.calendar

import java.util.Calendar

data class JalaliDate(
    val year: Int,
    val month: Int, // 1..12
    val day: Int    // 1..31
) : Comparable<JalaliDate> {

    val monthName: String
        get() = PersianCalendarHelper.PERSIAN_MONTH_NAMES.getOrElse(month - 1) { "" }

    val dayName: String
        get() = PersianCalendarHelper.WEEKDAY_NAMES.getOrElse(PersianCalendarHelper.getDayOfWeek(this)) { "" }

    val seasonName: String
        get() = when (month) {
            in 1..3 -> "بهار"
            in 4..6 -> "تابستان"
            in 7..9 -> "پاییز"
            else -> "زمستان"
        }

    val seasonIndex: Int
        get() = when (month) {
            in 1..3 -> 0
            in 4..6 -> 1
            in 7..9 -> 2
            else -> 3
        }

    /**
     * ISO-like formatted string: "1403/07/15"
     */
    fun toFormattedString(): String {
        return "%04d/%02d/%02d".format(year, month, day)
    }

    /**
     * Persian formatted string: "۱۵ مهر ۱۴۰۳"
     */
    fun toPersianDisplayString(): String {
        return "${PersianCalendarHelper.toPersianDigits(day)} $monthName ${PersianCalendarHelper.toPersianDigits(year)}"
    }

    override fun compareTo(other: JalaliDate): Int {
        if (this.year != other.year) return this.year.compareTo(other.year)
        if (this.month != other.month) return this.month.compareTo(other.month)
        return this.day.compareTo(other.day)
    }
}

object PersianCalendarHelper {

    val PERSIAN_MONTH_NAMES = listOf(
        "فروردین", "اردیبهشت", "خرداد",
        "تیر", "مرداد", "شهریور",
        "مهر", "آبان", "آذر",
        "دی", "بهمن", "اسفند"
    )

    val WEEKDAY_NAMES = listOf(
        "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"
    )

    val WEEKDAY_SHORT_NAMES = listOf(
        "ش", "ی", "د", "س", "چ", "پ", "ج"
    )

    fun toPersianDigits(number: Any): String {
        val str = number.toString()
        val persianDigits = charArrayOf('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹')
        val sb = StringBuilder()
        for (ch in str) {
            if (ch in '0'..'9') {
                sb.append(persianDigits[ch - '0'])
            } else {
                sb.append(ch)
            }
        }
        return sb.toString()
    }

    /**
     * Checks if a Jalali year is a leap year.
     */
    fun isJalaliLeapYear(year: Int): Boolean {
        val breaks = listOf(
            -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
            1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
        )
        var jp = breaks[0]
        var jump = 0
        for (j in 1 until breaks.size) {
            val jm = breaks[j]
            jump = jm - jp
            if (year < jm) break
            jp = jm
        }
        var n = year - jp
        if (jump - n < 6) n = n - jump + (jump + 4) / 33 * 33
        var leap = ((n + 1) % 33) - 1
        if (leap == -1) leap = 32
        val isLeap = (leap % 4 == 0) && (leap / 4 != 0)
        return isLeap
    }

    fun getDaysInMonth(year: Int, month: Int): Int {
        return when (month) {
            in 1..6 -> 31
            in 7..11 -> 30
            12 -> if (isJalaliLeapYear(year)) 30 else 29
            else -> 30
        }
    }

    /**
     * Converts Gregorian Date to Jalali Date
     */
    fun gregorianToJalali(gy: Int, gm: Int, gd: Int): JalaliDate {
        val gDaysInMonth = intArrayOf(0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
        if (isGregorianLeap(gy)) gDaysInMonth[2] = 29

        var gy2 = gy
        var gm2 = gm
        var gd2 = gd

        var gyDays = 0
        for (i in 1 until gm2) {
            gyDays += gDaysInMonth[i]
        }
        gyDays += gd2

        var gDays = (gy2 - 1600) * 365 + (gy2 - 1597) / 4 - (gy2 - 1501) / 100 + (gy2 - 1601) / 400 + gyDays - 79
        val jnp = gDays / 12053
        gDays %= 12053

        var jy = 979 + 33 * jnp + 4 * (gDays / 1461)
        gDays %= 1461

        if (gDays >= 366) {
            jy += (gDays - 1) / 365
            gDays = (gDays - 1) % 365
        }

        var jm = 0
        var jd = 0
        if (gDays < 186) {
            jm = 1 + gDays / 31
            jd = 1 + (gDays % 31)
        } else {
            jm = 7 + (gDays - 186) / 30
            jd = 1 + ((gDays - 186) % 30)
        }

        return JalaliDate(jy, jm, jd)
    }

    private fun isGregorianLeap(year: Int): Boolean {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
    }

    /**
     * Converts Jalali Date to Gregorian (Year, Month 1..12, Day 1..31)
     */
    fun jalaliToGregorian(jy: Int, jm: Int, jd: Int): Triple<Int, Int, Int> {
        val jy2 = jy - 979
        var jDayNo = 365 * jy2 + (jy2 / 33) * 8 + ((jy2 % 33 + 3) / 4)
        for (i in 1 until jm) {
            jDayNo += if (i <= 6) 31 else 30
        }
        jDayNo += jd - 1

        var gDayNo = jDayNo + 79
        var gy = 1600 + 400 * (gDayNo / 146097)
        gDayNo %= 146097

        var leap = true
        if (gDayNo >= 36525) {
            gDayNo--
            gy += 100 * (gDayNo / 36524)
            gDayNo %= 36524

            if (gDayNo >= 365) {
                gDayNo++
            } else {
                leap = false
            }
        }

        gy += 4 * (gDayNo / 1461)
        gDayNo %= 1461

        if (gDayNo >= 366) {
            leap = false
            gDayNo--
            gy += gDayNo / 365
            gDayNo %= 365
        }

        val gDaysInMonth = intArrayOf(31, if (isGregorianLeap(gy)) 29 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
        var gm = 0
        var gd = 0
        for (i in 0 until 12) {
            if (gDayNo < gDaysInMonth[i]) {
                gm = i + 1
                gd = gDayNo + 1
                break
            }
            gDayNo -= gDaysInMonth[i]
        }
        return Triple(gy, gm, gd)
    }

    /**
     * Returns weekday: 0 = Saturday (شنبه), 1 = Sunday, ..., 5 = Thursday (پنجشنبه), 6 = Friday (جمعه)
     */
    fun getDayOfWeek(date: JalaliDate): Int {
        val (gy, gm, gd) = jalaliToGregorian(date.year, date.month, date.day)
        val cal = Calendar.getInstance().apply {
            set(gy, gm - 1, gd)
        }
        val javaDay = cal.get(Calendar.DAY_OF_WEEK) // 1: Sunday, 7: Saturday
        // Map to Persian week: Saturday=0, Sunday=1, ..., Friday=6
        return when (javaDay) {
            Calendar.SATURDAY -> 0
            Calendar.SUNDAY -> 1
            Calendar.MONDAY -> 2
            Calendar.TUESDAY -> 3
            Calendar.WEDNESDAY -> 4
            Calendar.THURSDAY -> 5
            Calendar.FRIDAY -> 6
            else -> 0
        }
    }

    fun getToday(): JalaliDate {
        val cal = Calendar.getInstance()
        return gregorianToJalali(
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH)
        )
    }

    fun parseFormatted(dateStr: String): JalaliDate? {
        val parts = dateStr.split("/")
        if (parts.size != 3) return null
        val y = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        val d = parts[2].toIntOrNull() ?: return null
        return JalaliDate(y, m, d)
    }

    /**
     * Returns a list of past N Jalali dates starting from today backwards.
     */
    fun getPastNDays(daysCount: Int): List<JalaliDate> {
        val list = mutableListOf<JalaliDate>()
        val cal = Calendar.getInstance()
        for (i in 0 until daysCount) {
            val c = Calendar.getInstance().apply {
                timeInMillis = cal.timeInMillis - (i * 24L * 60 * 60 * 1000)
            }
            list.add(
                gregorianToJalali(
                    c.get(Calendar.YEAR),
                    c.get(Calendar.MONTH) + 1,
                    c.get(Calendar.DAY_OF_MONTH)
                )
            )
        }
        return list.reversed()
    }
}
