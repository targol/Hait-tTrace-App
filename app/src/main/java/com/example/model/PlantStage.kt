package com.example.model

enum class PlantGrowthStage(
    val level: Int,
    val title: String,
    val subtitle: String,
    val emoji: String,
    val minPercentage: Int
) {
    SEED(0, "بذر تازه", "در انتظار اولین گام امروز", "🌱", 0),
    SPROUT(1, "جوانه امید", "دو برگچه شاداب سر برآورده‌اند", "🌿", 25),
    SAPLING(2, "نهال شاداب", "رشد پیوسته و با طراوت", "🪴", 50),
    BUDDING(3, "غنچه پرامید", "به ثمر نشستن تلاش‌های روزانه", "🌺", 75),
    FULL_BLOOM(4, "باغ شکوفا", "روزی سراسر پربار و درخشان", "🌸🌳", 100);

    companion object {
        fun fromProgress(progressPercent: Int): PlantGrowthStage {
            return when {
                progressPercent >= 100 -> FULL_BLOOM
                progressPercent >= 75 -> BUDDING
                progressPercent >= 50 -> SAPLING
                progressPercent >= 25 -> SPROUT
                else -> SEED
            }
        }
    }
}

object EncouragementQuotes {
    val QUOTES = listOf(
        "قطره قطره جمع گردد، وانگهی دریا شود.",
        "درخت تنومند، روزی بذری کوچک در دل خاک بود.",
        "استمرار کوچک امروز، تحول بزرگ فرداست.",
        "هر تسک انجام شده، آبیاری یک ریشه در باغ زندگی توست.",
        "پیوستگی از شدت مهم‌تر است؛ آرام و مداوم رشد کن.",
        "امروز بهترین زمان برای پرورش عادتهای خوب است."
    )

    fun getRandomQuote(): String {
        return QUOTES.random()
    }
}
