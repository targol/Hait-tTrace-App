package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.calendar.IranianHolidays
import com.example.calendar.JalaliDate
import com.example.calendar.PersianCalendarHelper
import com.example.data.AppRepository
import com.example.model.AppTask
import com.example.model.DefaultCategories
import com.example.model.EncouragementQuotes
import com.example.model.Habit
import com.example.model.HabitFrequency
import com.example.model.PlantType
import com.example.model.TaskCategory
import com.example.ui.components.PlantGrowthCard
import com.example.ui.components.TaskTimerDialog

// Model to represent a completed blooming item in today's garden
data class CompletedBloomingItem(
    val id: String,
    val title: String,
    val flowerEmoji: String,
    val flowerName: String,
    val isHabit: Boolean,
    val categoryTitle: String? = null
)

fun getHabitFlower(plantType: PlantType): Pair<String, String> {
    return when (plantType) {
        PlantType.SPROUT -> "🌱" to "جوانه سبز امید"
        PlantType.ROSE -> "🌹" to "گل رز شکوفا"
        PlantType.SUNFLOWER -> "🌻" to "آفتابگردان زرین"
        PlantType.CACTUS -> "🌵" to "کاکتوس مقاوم"
        PlantType.BONSAI -> "🪴" to "بونسای صبور"
        PlantType.MONSTERA -> "🌿" to "برگ انجیری باطراوت"
    }
}

fun getTaskFlower(task: AppTask, category: TaskCategory?): Pair<String, String> {
    if (task.isImportant) {
        return "⭐🌸" to "شکوفه طلایی مهم"
    }
    return when (category?.id) {
        "cat_work" -> "🌺" to "گل کوکب سرخ"
        "cat_fitness" -> "🌷" to "لاله شاداب"
        "cat_study" -> "🪻" to "سنبل بنفش"
        "cat_home" -> "🌼" to "بابونه خورشیدی"
        "cat_health" -> "💐" to "دسته گل سلامتی"
        else -> "🌸" to "شکوفه بهاری"
    }
}

@Composable
fun TodayScreen(
    repository: AppRepository,
    onNavigateToTasks: () -> Unit,
    onNavigateToHabits: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tasks by repository.tasks.collectAsState()
    val habits by repository.habits.collectAsState()
    val categories by repository.categories.collectAsState()

    val today = remember { PersianCalendarHelper.getToday() }
    val todayStr = remember { today.toFormattedString() }
    val todayDayOfWeek = remember { PersianCalendarHelper.getDayOfWeek(today) }
    val (isHoliday, holidayTitle) = remember { IranianHolidays.getHolidayInfo(today) }

    // Today's tasks (due today, recurring today, or with no due date specified)
    val todayTasks = tasks.filter {
        !it.isArchived && (
            it.dueDate == todayStr ||
            it.repeatDaysOfWeek.contains(todayDayOfWeek) ||
            it.dueDate.isBlank()
        )
    }

    // Daily habits: ONLY DAILY (and not closed) or SPECIFIC_DAYS matching today. Exclude WEEKLY!
    val todayHabits = habits.filter {
        !it.isClosed && (
            (it.frequency == HabitFrequency.DAILY && (it.targetDaysOfWeek.isEmpty() || it.targetDaysOfWeek.contains(todayDayOfWeek))) ||
            (it.frequency == HabitFrequency.SPECIFIC_DAYS && it.targetDaysOfWeek.contains(todayDayOfWeek))
        )
    }

    // Weekly habits: frequency == WEEKLY
    val weeklyHabits = habits.filter {
        !it.isClosed && it.frequency == HabitFrequency.WEEKLY
    }

    // Completed flowers list for today's garden
    val completedFlowers = remember(todayHabits, weeklyHabits, todayTasks, categories) {
        val list = mutableListOf<CompletedBloomingItem>()
        todayHabits.filter { it.isCompletedOn(todayStr) }.forEach { h ->
            val (emoji, flowerName) = getHabitFlower(h.plantType)
            list.add(CompletedBloomingItem(h.id, h.title, emoji, flowerName, isHabit = true))
        }
        weeklyHabits.filter { it.isCompletedOn(todayStr) }.forEach { h ->
            val (emoji, flowerName) = getHabitFlower(h.plantType)
            list.add(CompletedBloomingItem(h.id, h.title, emoji, flowerName, isHabit = true))
        }
        todayTasks.filter { it.isCompleted }.forEach { t ->
            val cat = categories.find { it.id == t.categoryId }
            val (emoji, flowerName) = getTaskFlower(t, cat)
            list.add(CompletedBloomingItem(t.id, t.title, emoji, flowerName, isHabit = false, categoryTitle = cat?.title))
        }
        list
    }

    val (completedCount, totalCount, progressPercent) = repository.getTodayProgress()

    // Timer dialog state
    var timerItemTitle by remember { mutableStateOf<String?>(null) }
    var timerInitialMins by remember { mutableStateOf(25) }
    var activeTimerTaskId by remember { mutableStateOf<String?>(null) }

    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 90.dp)
        ) {
            // Header with Persian Date & Holiday Badge
            item {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "امروز، ${PersianCalendarHelper.WEEKDAY_NAMES[todayDayOfWeek]}",
                                fontSize = 14.sp,
                                color = Color(0xFF558B2F),
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = today.toPersianDisplayString(),
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                        }

                        // Holiday or normal day badge
                        if (isHoliday && holidayTitle != null) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFFFEBEE))
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFD32F2F))
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = holidayTitle,
                                        fontSize = 11.sp,
                                        color = Color(0xFFC62828),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    // Encouraging Quote
                    Spacer(modifier = Modifier.height(10.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0xFFF1F8E9))
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "💡", fontSize = 14.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = EncouragementQuotes.QUOTES[0],
                                fontSize = 12.sp,
                                color = Color(0xFF33691E)
                            )
                        }
                    }
                }
            }

            // Visual Plant Growth Card (باغچه رشد امروز)
            item {
                PlantGrowthCard(
                    progressPercent = progressPercent,
                    completedCount = completedCount,
                    totalCount = totalCount
                )
            }

            // Individual Blooming Flowers Section (گل‌های شکوفاشده منحصربه‌فرد)
            item {
                GardenOfBloomingFlowersCard(completedFlowers = completedFlowers)
            }

            // Daily Habits Section Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "🌿", fontSize = 18.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "عادت‌های روزانه امروز",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1B5E20)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFE8F5E9))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = PersianCalendarHelper.toPersianDigits(todayHabits.size),
                                fontSize = 12.sp,
                                color = Color(0xFF2E7D32),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    TextButton(onClick = onNavigateToHabits) {
                        Text(text = "مشاهده همه", fontSize = 12.sp, color = Color(0xFF2E7D32))
                    }
                }
            }

            // Daily Habits List
            if (todayHabits.isEmpty()) {
                item {
                    EmptySectionPlaceholder(
                        text = "هیچ عادت روزانه‌ای برای امروز تعریف نشده است.",
                        buttonText = "+ ثبت اولین عادت",
                        onClick = onNavigateToHabits
                    )
                }
            } else {
                items(todayHabits, key = { it.id }) { habit ->
                    val isDone = habit.isCompletedOn(todayStr)
                    val streak = habit.calculateCurrentStreak()
                    val (flowerEmoji, flowerName) = getHabitFlower(habit.plantType)

                    HabitTodayCard(
                        habit = habit,
                        isDone = isDone,
                        streak = streak,
                        flowerEmoji = flowerEmoji,
                        flowerName = flowerName,
                        onToggle = { repository.toggleHabitToday(habit.id) },
                        onStartTimer = {
                            timerItemTitle = habit.title
                            timerInitialMins = habit.timerMinutes
                            activeTimerTaskId = null
                        }
                    )
                }
            }

            // Weekly Habits Section (عادت‌های هفتگی - جداگانه در هفته)
            if (weeklyHabits.isNotEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "📅", fontSize = 18.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "عادت‌های هفتگی (پایش هفته جاری)",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFFE8F5E9))
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = PersianCalendarHelper.toPersianDigits(weeklyHabits.size),
                                    fontSize = 12.sp,
                                    color = Color(0xFF2E7D32),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                items(weeklyHabits, key = { it.id }) { habit ->
                    val isDoneToday = habit.isCompletedOn(todayStr)
                    val completedThisWeek = habit.getCompletedDaysThisWeek()
                    val (flowerEmoji, flowerName) = getHabitFlower(habit.plantType)

                    WeeklyHabitTodayCard(
                        habit = habit,
                        isDoneToday = isDoneToday,
                        completedDaysThisWeek = completedThisWeek,
                        flowerEmoji = flowerEmoji,
                        flowerName = flowerName,
                        onToggleToday = { repository.toggleHabitToday(habit.id) }
                    )
                }
            }

            // Tasks Section Header
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "✅", fontSize = 18.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "تسک‌های امروز",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1B5E20)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFE8F5E9))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = PersianCalendarHelper.toPersianDigits(todayTasks.size),
                                fontSize = 12.sp,
                                color = Color(0xFF2E7D32),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    TextButton(onClick = onNavigateToTasks) {
                        Text(text = "مدیریت تسک‌ها", fontSize = 12.sp, color = Color(0xFF2E7D32))
                    }
                }
            }

            // Tasks List
            if (todayTasks.isEmpty()) {
                item {
                    EmptySectionPlaceholder(
                        text = "همه تسک‌های امروز کامل شده یا تسکی نمانده است!",
                        buttonText = "+ افزودن تسک جدید",
                        onClick = onNavigateToTasks
                    )
                }
            } else {
                items(todayTasks, key = { it.id }) { task ->
                    val category = categories.find { it.id == task.categoryId } ?: DefaultCategories.PERSONAL
                    val (flowerEmoji, flowerName) = getTaskFlower(task, category)

                    TaskTodayCard(
                        task = task,
                        categoryTitle = category.title,
                        categoryColor = Color(category.colorHex),
                        flowerEmoji = flowerEmoji,
                        flowerName = flowerName,
                        onToggle = { repository.toggleTaskCompletion(task.id) },
                        onStartTimer = {
                            timerItemTitle = task.title
                            timerInitialMins = task.timerSecondsTarget / 60
                            activeTimerTaskId = task.id
                        }
                    )
                }
            }
        }

        // Active Timer Dialog
        if (timerItemTitle != null) {
            TaskTimerDialog(
                itemTitle = timerItemTitle!!,
                initialTargetMinutes = timerInitialMins,
                onDismiss = { timerItemTitle = null },
                onComplete = { elapsed ->
                    activeTimerTaskId?.let { tid ->
                        repository.updateTaskTimer(tid, elapsed)
                        repository.toggleTaskCompletion(tid)
                    }
                    timerItemTitle = null
                }
            )
        }
    }
}

/**
 * Card showing the individual blooming flower for every completed item today
 */
@Composable
fun GardenOfBloomingFlowersCard(
    completedFlowers: List<CompletedBloomingItem>
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(text = "🌸", fontSize = 18.sp)
                    Text(
                        text = "باغ گل‌های شکوفاشده امروز",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (completedFlowers.isNotEmpty()) Color(0xFFE8F5E9) else Color(0xFFF5F5F5))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = "${PersianCalendarHelper.toPersianDigits(completedFlowers.size)} گل شکوفا",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (completedFlowers.isNotEmpty()) Color(0xFF2E7D32) else Color(0xFF757575)
                    )
                }
            }

            if (completedFlowers.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFFF9FBF9))
                        .padding(vertical = 14.dp, horizontal = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "با انجام هر تسک یا عادت روزانه، گل اختصاصی آن در این باغچه شکوفا خواهد شد 🌱",
                        fontSize = 12.sp,
                        color = Color(0xFF757575),
                        fontWeight = FontWeight.Medium
                    )
                }
            } else {
                Text(
                    text = "با انجام هر مورد، گل آن رشد کرده و در باغچه امروز شکوفا شد:",
                    fontSize = 11.sp,
                    color = Color(0xFF558B2F)
                )

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(completedFlowers, key = { it.id }) { item ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color(0xFFF1F8E9),
                                            Color(0xFFE8F5E9)
                                        )
                                    )
                                )
                                .border(1.dp, Color(0xFFC8E6C9), RoundedCornerShape(16.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(CircleShape)
                                        .background(Color.White),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(text = item.flowerEmoji, fontSize = 22.sp)
                                }
                                Text(
                                    text = item.title,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1B5E20),
                                    maxLines = 1
                                )
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = Color(0xFF2E7D32).copy(alpha = 0.12f)
                                ) {
                                    Text(
                                        text = "شکوفا شد ✨",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF1B5E20),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HabitTodayCard(
    habit: Habit,
    isDone: Boolean,
    streak: Int,
    flowerEmoji: String,
    flowerName: String,
    onToggle: () -> Unit,
    onStartTimer: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isDone) Color(0xFFF1F8E9) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isDone) 1.dp else 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggle() }
            .then(
                if (isDone) Modifier.border(1.dp, Color(0xFFA5D6A7), RoundedCornerShape(18.dp))
                else Modifier
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Checkbox / Flower symbol
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(if (isDone) Color(0xFF2E7D32) else Color(0xFFF1F8E9)),
                contentAlignment = Alignment.Center
            ) {
                if (isDone) {
                    Text(text = flowerEmoji, fontSize = 24.sp)
                } else {
                    Text(text = "🌱", fontSize = 20.sp)
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = habit.title,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isDone) Color(0xFF2E7D32) else Color(0xFF212121),
                        textDecoration = if (isDone) TextDecoration.LineThrough else TextDecoration.None
                    )
                    if (isDone) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFC8E6C9)
                        ) {
                            Text(
                                text = "شکوفا شد ✨",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Streak tag
                    if (streak > 0) {
                        Text(
                            text = "🔥 ${PersianCalendarHelper.toPersianDigits(streak)} روز پیاپی",
                            fontSize = 11.sp,
                            color = Color(0xFFE65100),
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (habit.exemptHolidays) {
                        Text(
                            text = "• معاف در تعطیلات",
                            fontSize = 10.sp,
                            color = Color(0xFF757575)
                        )
                    }
                }
            }

            // Timer Button
            IconButton(
                onClick = onStartTimer,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFE8F5E9))
            ) {
                Icon(
                    imageVector = Icons.Default.Timer,
                    contentDescription = "تایمر عادت",
                    tint = Color(0xFF2E7D32),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

/**
 * Dedicated Card for Weekly Habits (عادت‌های هفتگی)
 */
@Composable
fun WeeklyHabitTodayCard(
    habit: Habit,
    isDoneToday: Boolean,
    completedDaysThisWeek: Int,
    flowerEmoji: String,
    flowerName: String,
    onToggleToday: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isDoneToday) Color(0xFFF1F8E9) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isDoneToday) 1.dp else 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (isDoneToday) Modifier.border(1.dp, Color(0xFFA5D6A7), RoundedCornerShape(18.dp))
                else Modifier
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(if (isDoneToday) Color(0xFF2E7D32) else Color(0xFFE8F5E9)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = if (isDoneToday) flowerEmoji else "🌱", fontSize = 22.sp)
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = habit.title,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF212121)
                        )
                        if (isDoneToday) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFFC8E6C9)
                            ) {
                                Text(
                                    text = "شکوفا شد ✨",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1B5E20),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = "هدف: ${PersianCalendarHelper.toPersianDigits(habit.targetDaysPerWeek)} روز در هفته • تا امروز: ${PersianCalendarHelper.toPersianDigits(completedDaysThisWeek)} روز انجام شده",
                        fontSize = 11.sp,
                        color = Color(0xFF558B2F),
                        fontWeight = FontWeight.Medium
                    )
                }

                // Action button to toggle today
                Button(
                    onClick = onToggleToday,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDoneToday) Color(0xFF2E7D32) else Color(0xFFE8F5E9),
                        contentColor = if (isDoneToday) Color.White else Color(0xFF2E7D32)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = if (isDoneToday) "ثبت شد ✓" else "ثبت امروز",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Progress bar for the week
            val target = habit.targetDaysPerWeek.coerceAtLeast(1)
            val fraction = (completedDaysThisWeek.toFloat() / target).coerceIn(0f, 1f)
            LinearProgressIndicator(
                progress = { fraction },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = Color(0xFF2E7D32),
                trackColor = Color(0xFFEEEEEE),
            )
        }
    }
}

@Composable
fun TaskTodayCard(
    task: AppTask,
    categoryTitle: String,
    categoryColor: Color,
    flowerEmoji: String,
    flowerName: String,
    onToggle: () -> Unit,
    onStartTimer: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (task.isCompleted) Color(0xFFF1F8E9) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (task.isCompleted) 1.dp else 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggle() }
            .then(
                if (task.isCompleted) Modifier.border(1.dp, Color(0xFFA5D6A7), RoundedCornerShape(18.dp))
                else Modifier
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Checkbox / Flower
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (task.isCompleted) Color(0xFF2E7D32) else Color(0xFFEEEEEE)),
                contentAlignment = Alignment.Center
            ) {
                if (task.isCompleted) {
                    Text(text = flowerEmoji, fontSize = 20.sp)
                } else {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "انجام شد",
                        tint = Color.Transparent,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (task.isImportant) {
                        Text(text = "⭐ ", fontSize = 13.sp)
                    }
                    Text(
                        text = task.title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (task.isCompleted) Color(0xFF2E7D32) else Color(0xFF212121),
                        textDecoration = if (task.isCompleted) TextDecoration.LineThrough else TextDecoration.None
                    )
                    if (task.isCompleted) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFC8E6C9)
                        ) {
                            Text(
                                text = "شکوفا شد ✨",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Category pill
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(categoryColor.copy(alpha = 0.12f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = categoryTitle,
                            fontSize = 10.sp,
                            color = categoryColor,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (task.time != null && task.time.isNotBlank()) {
                        Text(
                            text = "⏰ ${PersianCalendarHelper.toPersianDigits(task.time)}",
                            fontSize = 11.sp,
                            color = Color(0xFF757575)
                        )
                    }

                    if (task.deadlineTime != null && task.deadlineTime.isNotBlank()) {
                        Text(
                            text = "⏳ تا ${PersianCalendarHelper.toPersianDigits(task.deadlineTime)}",
                            fontSize = 10.sp,
                            color = Color(0xFFD32F2F),
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (task.reminderMinutesBefore != null) {
                        Text(
                            text = "🔔 ${PersianCalendarHelper.toPersianDigits(task.reminderMinutesBefore)} د",
                            fontSize = 10.sp,
                            color = Color(0xFF9E9E9E)
                        )
                    }
                }
            }

            // Timer Button
            IconButton(
                onClick = onStartTimer,
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFF5F5F5))
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "شروع تایمر",
                    tint = Color(0xFF424242),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
fun EmptySectionPlaceholder(
    text: String,
    buttonText: String,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFF9FBF9))
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = "🌱", fontSize = 28.sp)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = text,
            fontSize = 13.sp,
            color = Color(0xFF757575)
        )
        Spacer(modifier = Modifier.height(10.dp))
        OutlinedButton(
            onClick = onClick,
            shape = RoundedCornerShape(10.dp)
        ) {
            Text(text = buttonText, fontSize = 12.sp, color = Color(0xFF2E7D32))
        }
    }
}
