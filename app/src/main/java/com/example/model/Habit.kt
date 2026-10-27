package com.example.model

import com.example.calendar.IranianHolidays
import com.example.calendar.JalaliDate
import com.example.calendar.PersianCalendarHelper

enum class HabitFrequency {
    DAILY,
    WEEKLY,
    SPECIFIC_DAYS
}

enum class PlantType(val title: String, val iconResName: String) {
    SPROUT("جوانه سبز", "Sprout"),
    MONSTERA("برگ انجیری", "Monstera"),
    BONSAI("بونسای صبور", "Bonsai"),
    ROSE("رز شکوفا", "Rose"),
    CACTUS("کاکتوس مقاوم", "Cactus"),
    SUNFLOWER("آفتابگردان", "Sunflower")
}

data class Habit(
    val id: String,
    val title: String,
    val notes: String = "",
    val categoryId: String = "cat_personal",
    val goalId: String? = null,
    val frequency: HabitFrequency = HabitFrequency.DAILY,
    val targetDaysOfWeek: List<Int> = listOf(0, 1, 2, 3, 4, 5, 6), // 0=شنبه .. 6=جمعه
    val targetDaysPerWeek: Int = 3, // For WEEKLY frequency: e.g. 3 days per week
    val isClosed: Boolean = false, // Closed / Archived
    val time: String? = null,
    val timerMinutes: Int = 15,
    val exemptHolidays: Boolean = true, // تعطیلات رسمی معاف باشند
    val exemptWeekends: Boolean = false, // پنجشنبه و جمعه اختیاری معاف باشند
    val plantType: PlantType = PlantType.SPROUT,
    val history: Map<String, Boolean> = emptyMap(), // Key: "YYYY/MM/DD", Value: completed
    val createdAt: Long = System.currentTimeMillis()
) {
    /**
     * Checks if habit was completed on given Jalali date string
     */
    fun isCompletedOn(dateFormatted: String): Boolean {
        return history[dateFormatted] == true
    }

    /**
     * Checks if this date is exempt from breaking the streak
     */
    fun isDateExempt(date: JalaliDate): Boolean {
        if (exemptHolidays && IranianHolidays.getHolidayInfo(date).first) {
            return true
        }
        if (exemptWeekends && IranianHolidays.isThursdayOrFriday(date)) {
            return true
        }
        val dayOfWeek = PersianCalendarHelper.getDayOfWeek(date)
        if (frequency == HabitFrequency.SPECIFIC_DAYS && !targetDaysOfWeek.contains(dayOfWeek)) {
            return true // Day is not scheduled
        }
        return false
    }

    /**
     * Calculates current active streak in days (taking exemptions into account)
     */
    fun calculateCurrentStreak(): Int {
        val today = PersianCalendarHelper.getToday()
        val pastDays = PersianCalendarHelper.getPastNDays(60).reversed() // Today backwards

        var streak = 0
        var isFirstDay = true

        for (date in pastDays) {
            val dateStr = date.toFormattedString()
            val completed = history[dateStr] == true

            if (completed) {
                streak++
                isFirstDay = false
            } else {
                // If today is not done yet, don't break streak from yesterday
                if (isFirstDay && dateStr == today.toFormattedString()) {
                    isFirstDay = false
                    continue
                }

                // If exempt, streak continues through the holiday/weekend
                if (isDateExempt(date)) {
                    // streak is preserved
                    continue
                } else {
                    // Broken streak
                    break
                }
            }
        }
        return streak
    }

    /**
     * Calculates adherence percentage over past N days
     */
    fun calculateAdherenceRate(daysCount: Int = 30): Int {
        val pastDays = PersianCalendarHelper.getPastNDays(daysCount)
        var requiredDays = 0
        var completedDays = 0

        for (date in pastDays) {
            val dateStr = date.toFormattedString()
            val isExempt = isDateExempt(date)
            val isDone = history[dateStr] == true

            if (isDone) {
                completedDays++
                requiredDays++
            } else if (!isExempt) {
                requiredDays++
            }
        }

        if (requiredDays == 0) return 100
        return ((completedDays.toDouble() / requiredDays) * 100).toInt().coerceIn(0, 100)
    }

    /**
     * Counts how many days have been completed in the current Persian week (Saturday to today)
     */
    fun getCompletedDaysThisWeek(): Int {
        val today = PersianCalendarHelper.getToday()
        val dayOfWeek = PersianCalendarHelper.getDayOfWeek(today)
        val weekDays = PersianCalendarHelper.getPastNDays(dayOfWeek + 1)
        return weekDays.count { history[it.toFormattedString()] == true }
    }
}
