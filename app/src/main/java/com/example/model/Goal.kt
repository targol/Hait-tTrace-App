package com.example.model

enum class GoalPeriod {
    ANNUAL,   // سالانه
    SEASONAL, // فصلی
    MONTHLY   // ماهانه
}

data class Goal(
    val id: String,
    val title: String,
    val description: String = "",
    val year: Int, // e.g., 1404
    val period: GoalPeriod,
    val seasonIndex: Int? = null, // 0: بهار, 1: تابستان, 2: پاییز, 3: زمستان
    val monthIndex: Int? = null,  // 1..12
    val parentId: String? = null, // Link seasonal to annual, or monthly to seasonal
    val colorHex: Long = 0xFF2E7D32,
    val iconName: String = "Target",
    val targetCount: Int = 10,
    val createdAt: Long = System.currentTimeMillis()
) {
    val periodTitle: String
        get() = when (period) {
            GoalPeriod.ANNUAL -> "هدف سال $year"
            GoalPeriod.SEASONAL -> when (seasonIndex) {
                0 -> "فصل بهار $year"
                1 -> "فصل تابستان $year"
                2 -> "فصل پاییز $year"
                else -> "فصل زمستان $year"
            }
            GoalPeriod.MONTHLY -> {
                val mName = if (monthIndex != null && monthIndex in 1..12) {
                    com.example.calendar.PersianCalendarHelper.PERSIAN_MONTH_NAMES[monthIndex - 1]
                } else "ماه"
                "$mName $year"
            }
        }
}
