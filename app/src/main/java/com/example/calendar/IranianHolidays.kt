package com.example.calendar

object IranianHolidays {

    data class HolidayInfo(
        val title: String,
        val isNational: Boolean = true
    )

    // Specific year lunar / mapped holidays: Key = "YYYY/MM/DD"
    private val SPECIFIC_HOLIDAYS = mapOf(
        // 1403
        "1403/01/12" to "شهادت حضرت علی (ع)",
        "1403/01/22" to "عید سعید فطر",
        "1403/01/23" to "تعطیلی به مناسبت عید فطر",
        "1403/02/15" to "شهادت امام جعفر صادق (ع)",
        "1403/03/28" to "عید سعید قربان",
        "1403/04/05" to "عید سعید غدیر خم",
        "1403/04/25" to "تاسوعای حسینی",
        "1403/04/26" to "عاشورای حسینی",
        "1403/06/04" to "اربعین حسینی",
        "1403/06/12" to "رحلت حضرت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)",
        "1403/06/14" to "شهادت امام رضا (ع)",
        "1403/06/22" to "شهادت امام حسن عسکری (ع)",
        "1403/06/31" to "ولادت حضرت رسول اکرم (ص) و امام جعفر صادق (ع)",
        "1403/09/15" to "شهادت حضرت فاطمه زهرا (س)",
        "1403/10/25" to "ولادت حضرت امام علی (ع)",
        "1403/11/09" to "مبعث حضرت رسول اکرم (ص)",
        "1403/11/26" to "ولادت حضرت قائم (عج)",

        // 1404
        "1404/01/01" to "آغاز سال نو و شهادت حضرت علی (ع)",
        "1404/01/11" to "عید سعید فطر",
        "1404/01/12" to "تعطیلی به مناسبت عید فطر و روز جمهوری اسلامی",
        "1404/02/04" to "شهادت امام جعفر صادق (ع)",
        "1404/03/17" to "عید سعید قربان",
        "1404/03/25" to "عید سعید غدیر خم",
        "1404/04/14" to "تاسوعای حسینی",
        "1404/04/15" to "عاشورای حسینی",
        "1404/05/24" to "اربعین حسینی",
        "1404/06/01" to "رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)",
        "1404/06/03" to "شهادت امام رضا (ع)",
        "1404/06/11" to "شهادت امام حسن عسکری (ع)",
        "1404/06/20" to "ولادت حضرت رسول اکرم (ص) و امام صادق (ع)",
        "1404/09/04" to "شهادت حضرت فاطمه زهرا (س)",
        "1404/10/14" to "ولادت حضرت امام علی (ع)",
        "1404/10/28" to "مبعث حضرت رسول اکرم (ص)",
        "1404/11/15" to "ولادت حضرت قائم (عج)",

        // 1405
        "1405/01/01" to "آغاز نوروز و عید سعید فطر",
        "1405/01/02" to "تعطیلی نوروز و عید سعید فطر",
        "1405/01/24" to "شهادت امام جعفر صادق (ع)",
        "1405/03/06" to "عید سعید قربان",
        "1405/03/14" to "عید سعید غدیر خم و رحلت امام خمینی",
        "1405/04/04" to "تاسوعای حسینی",
        "1405/04/05" to "عاشورای حسینی",
        "1405/05/14" to "اربعین حسینی",
        "1405/05/22" to "رحلت رسول اکرم (ص)",
        "1405/05/24" to "شهادت امام رضا (ع)",
        "1405/08/23" to "شهادت حضرت فاطمه زهرا (س)",
        "1405/10/03" to "ولادت حضرت علی (ع)",
        "1405/10/17" to "مبعث رسول اکرم (ص)",
        "1405/11/05" to "ولادت حضرت مهدی (عج)",
        "1405/12/19" to "شهادت حضرت علی (ع)"
    )

    // Fixed Solar Holidays: Key = "MM/DD"
    private val FIXED_SOLAR_HOLIDAYS = mapOf(
        "01/01" to "عید نوروز",
        "01/02" to "عید نوروز",
        "01/03" to "عید نوروز",
        "01/04" to "عید نوروز",
        "01/12" to "روز جمهوری اسلامی ایران",
        "01/13" to "روز طبیعت (سیزده‌بدر)",
        "03/14" to "رحلت امام خمینی (ره)",
        "03/15" to "قیام خونین ۱۵ خرداد",
        "11/22" to "پیروزی انقلاب اسلامی ایران",
        "12/29" to "روز ملی شدن صنعت نفت ایران"
    )

    /**
     * Checks whether the given Jalali date is an official holiday in Iran.
     * Returns a pair of (isHoliday, holidayTitle).
     */
    fun getHolidayInfo(date: JalaliDate): Pair<Boolean, String?> {
        val specificKey = date.toFormattedString()
        if (SPECIFIC_HOLIDAYS.containsKey(specificKey)) {
            return true to SPECIFIC_HOLIDAYS[specificKey]
        }

        val monthDayKey = "%02d/%02d".format(date.month, date.day)
        if (FIXED_SOLAR_HOLIDAYS.containsKey(monthDayKey)) {
            return true to FIXED_SOLAR_HOLIDAYS[monthDayKey]
        }

        // Special case: 30 Esfand in leap years is also holiday
        if (date.month == 12 && date.day == 30) {
            return true to "تعطیلی پایان سال"
        }

        return false to null
    }

    /**
     * Checks if the day is Thursday (5) or Friday (6).
     */
    fun isThursdayOrFriday(date: JalaliDate): Boolean {
        val dow = PersianCalendarHelper.getDayOfWeek(date)
        return dow == 5 || dow == 6
    }

    /**
     * Friday (جمعه) is the official weekend day in Iran.
     */
    fun isFriday(date: JalaliDate): Boolean {
        return PersianCalendarHelper.getDayOfWeek(date) == 6
    }
}
