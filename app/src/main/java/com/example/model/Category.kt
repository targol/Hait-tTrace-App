package com.example.model

data class TaskCategory(
    val id: String,
    val title: String,
    val colorHex: Long, // Color ARGB
    val iconName: String
)

object DefaultCategories {
    val PERSONAL = TaskCategory("cat_personal", "شخصی", 0xFF3B82F6, "Person")
    val WORK = TaskCategory("cat_work", "کاری", 0xFF6366F1, "Work")
    val HOME = TaskCategory("cat_home", "خانه", 0xFFF59E0B, "Home")
    val FITNESS = TaskCategory("cat_fitness", "ورزشی", 0xFF10B981, "Fitness")
    val STUDY = TaskCategory("cat_study", "مطالعه و رشد", 0xFF8B5CF6, "Book")
    val HEALTH = TaskCategory("cat_health", "سلامت و آرامش", 0xFFEC4899, "Heart")

    val ALL = listOf(PERSONAL, WORK, HOME, FITNESS, STUDY, HEALTH)
}
