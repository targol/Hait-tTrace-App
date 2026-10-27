package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.calendar.JalaliDate
import com.example.calendar.PersianCalendarHelper
import com.example.data.AppRepository
import com.example.model.*
import com.example.ui.components.PersianDatePickerDialog
import com.example.ui.components.TaskTimerDialog
import java.util.UUID

enum class TaskFilterTab(val title: String) {
    TODAY("امروز"),
    UPCOMING("آتی"),
    OVERDUE("معوقه"),
    RECURRING("تکرارشونده"),
    COMPLETED("تکمیل‌شده"),
    ALL("همه"),
    ARCHIVE("بایگانی")
}

@Composable
fun TasksScreen(
    repository: AppRepository,
    modifier: Modifier = Modifier
) {
    val tasks by repository.tasks.collectAsState()
    val categories by repository.categories.collectAsState()
    val goals by repository.goals.collectAsState()

    val today = remember { PersianCalendarHelper.getToday() }
    val todayStr = remember { today.toFormattedString() }
    val todayDow = remember { PersianCalendarHelper.getDayOfWeek(today) }

    var selectedTab by remember { mutableStateOf(TaskFilterTab.TODAY) }
    var selectedCategoryId by remember { mutableStateOf<String?>(null) }

    var showAddTaskDialog by remember { mutableStateOf(false) }

    // Timer dialog
    var activeTimerTask by remember { mutableStateOf<AppTask?>(null) }

    // Filter tasks
    val filteredTasks = tasks.filter { task ->
        val matchesCategory = selectedCategoryId == null || task.categoryId == selectedCategoryId
        val matchesTab = when (selectedTab) {
            TaskFilterTab.ALL -> !task.isArchived
            TaskFilterTab.TODAY -> !task.isArchived && (
                (!task.isCompleted && (task.dueDate.isBlank() || task.dueDate == todayStr || task.repeatDaysOfWeek.contains(todayDow))) ||
                (task.isCompleted && (task.dueDate == todayStr || task.dueDate.isBlank()))
            )
            TaskFilterTab.UPCOMING -> !task.isArchived && !task.isCompleted && (task.dueDate > todayStr || task.dueDate.isBlank()) && task.repeatType == TaskRepeatType.NONE
            TaskFilterTab.OVERDUE -> !task.isArchived && !task.isCompleted && task.dueDate.isNotBlank() && task.dueDate < todayStr && task.repeatType == TaskRepeatType.NONE
            TaskFilterTab.RECURRING -> !task.isArchived && task.repeatType != TaskRepeatType.NONE
            TaskFilterTab.COMPLETED -> !task.isArchived && task.isCompleted
            TaskFilterTab.ARCHIVE -> task.isArchived
        }
        matchesCategory && matchesTab
    }

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddTaskDialog = true },
                containerColor = Color(0xFF2E7D32),
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
                text = { Text("تسک جدید", fontWeight = FontWeight.Bold) },
                shape = RoundedCornerShape(16.dp)
            )
        },
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "مدیریت تسک‌ها",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1B5E20)
                )

                Text(
                    text = "${PersianCalendarHelper.toPersianDigits(tasks.count { it.isCompleted })} از ${PersianCalendarHelper.toPersianDigits(tasks.size)} انجام شده",
                    fontSize = 12.sp,
                    color = Color(0xFF689F38)
                )
            }

            // Tabs Row
            ScrollableTabRow(
                selectedTabIndex = selectedTab.ordinal,
                edgePadding = 16.dp,
                containerColor = Color.Transparent,
                contentColor = Color(0xFF2E7D32),
                divider = {}
            ) {
                TaskFilterTab.values().forEach { tab ->
                    val selected = tab == selectedTab
                    Tab(
                        selected = selected,
                        onClick = { selectedTab = tab },
                        text = {
                            Text(
                                text = tab.title,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                color = if (selected) Color(0xFF1B5E20) else Color(0xFF757575)
                            )
                        }
                    )
                }
            }

            // Categories Filter Pills
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedCategoryId == null,
                        onClick = { selectedCategoryId = null },
                        label = { Text("همه دسته‌ها") }
                    )
                }
                items(categories) { cat ->
                    FilterChip(
                        selected = selectedCategoryId == cat.id,
                        onClick = {
                            selectedCategoryId = if (selectedCategoryId == cat.id) null else cat.id
                        },
                        label = { Text(cat.title) }
                    )
                }
            }

            // Tasks List
            if (filteredTasks.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "🌱", fontSize = 48.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "تسکی در این بخش وجود ندارد",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF757575)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredTasks, key = { it.id }) { task ->
                        val category = categories.find { it.id == task.categoryId } ?: DefaultCategories.PERSONAL
                        val linkedGoal = goals.find { it.id == task.goalId }

                        TaskListItem(
                            task = task,
                            category = category,
                            linkedGoalTitle = linkedGoal?.title,
                            onToggle = { repository.toggleTaskCompletion(task.id) },
                            onToggleImportant = { repository.toggleImportantTask(task.id) },
                            onDuplicate = { repository.duplicateTask(task.id) },
                            onToggleArchive = { repository.toggleArchiveTask(task.id) },
                            onStartTimer = { activeTimerTask = task },
                            onDelete = { repository.deleteTask(task.id) }
                        )
                    }
                }
            }
        }
    }

    // Add Task Dialog
    if (showAddTaskDialog) {
        AddTaskDialog(
            categories = categories,
            goals = goals,
            onDismiss = { showAddTaskDialog = false },
            onSave = { newTask ->
                repository.addTask(newTask)
                showAddTaskDialog = false
            }
        )
    }

    // Timer Dialog
    if (activeTimerTask != null) {
        TaskTimerDialog(
            itemTitle = activeTimerTask!!.title,
            initialTargetMinutes = activeTimerTask!!.timerSecondsTarget / 60,
            onDismiss = { activeTimerTask = null },
            onComplete = { elapsed ->
                repository.updateTaskTimer(activeTimerTask!!.id, elapsed)
                repository.toggleTaskCompletion(activeTimerTask!!.id)
                activeTimerTask = null
            }
        )
    }
}

@Composable
fun TaskListItem(
    task: AppTask,
    category: TaskCategory,
    linkedGoalTitle: String?,
    onToggle: () -> Unit,
    onToggleImportant: () -> Unit,
    onDuplicate: () -> Unit,
    onToggleArchive: () -> Unit,
    onStartTimer: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (task.isCompleted) Color(0xFFFAFAFA) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (task.isCompleted) 1.dp else 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggle() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Checkbox
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (task.isCompleted) Color(0xFF2E7D32) else Color(0xFFEEEEEE)),
                contentAlignment = Alignment.Center
            ) {
                if (task.isCompleted) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "تکمیل",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (task.isImportant) {
                        Text(text = "⭐ ", fontSize = 14.sp)
                    }
                    Text(
                        text = task.title,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (task.isCompleted) Color(0xFF9E9E9E) else Color(0xFF212121),
                        textDecoration = if (task.isCompleted) TextDecoration.LineThrough else TextDecoration.None
                    )
                }

                if (task.notes.isNotBlank()) {
                    Text(
                        text = task.notes,
                        fontSize = 12.sp,
                        color = Color(0xFF757575),
                        maxLines = 1,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Category
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color(category.colorHex).copy(alpha = 0.12f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = category.title,
                            fontSize = 10.sp,
                            color = Color(category.colorHex),
                            fontWeight = FontWeight.Medium
                        )
                    }

                    // Due Date
                    val dueDateLabel = if (task.dueDate.isNotBlank()) {
                        "📅 ${PersianCalendarHelper.toPersianDigits(task.dueDate)}"
                    } else {
                        "📅 بدون موعد (پایان سال)"
                    }
                    Text(
                        text = dueDateLabel,
                        fontSize = 10.sp,
                        color = Color(0xFF616161)
                    )

                    // Start Time
                    if (task.time != null && task.time.isNotBlank()) {
                        Text(
                            text = "⏰ ${PersianCalendarHelper.toPersianDigits(task.time)}",
                            fontSize = 10.sp,
                            color = Color(0xFF616161)
                        )
                    }

                    // Deadline Time
                    if (task.deadlineTime != null && task.deadlineTime.isNotBlank()) {
                        Text(
                            text = "⏳ مهلت: ${PersianCalendarHelper.toPersianDigits(task.deadlineTime)}",
                            fontSize = 10.sp,
                            color = Color(0xFFD32F2F),
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (linkedGoalTitle != null) {
                        Text(
                            text = "🎯 $linkedGoalTitle",
                            fontSize = 10.sp,
                            color = Color(0xFF2E7D32),
                            maxLines = 1
                        )
                    }
                }
            }

            // Important star toggle
            IconButton(
                onClick = onToggleImportant,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = if (task.isImportant) Icons.Default.Star else Icons.Outlined.Star,
                    contentDescription = "ستاره",
                    tint = if (task.isImportant) Color(0xFFFFA000) else Color(0xFFB0BEC5),
                    modifier = Modifier.size(18.dp)
                )
            }

            // Duplicate Button
            IconButton(
                onClick = onDuplicate,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ContentCopy,
                    contentDescription = "کپی تسک",
                    tint = Color(0xFF78909C),
                    modifier = Modifier.size(16.dp)
                )
            }

            // Timer Button
            IconButton(
                onClick = onStartTimer,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "تایمر",
                    tint = Color(0xFF2E7D32),
                    modifier = Modifier.size(18.dp)
                )
            }

            // Archive Button
            IconButton(
                onClick = onToggleArchive,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = if (task.isArchived) Icons.Default.Unarchive else Icons.Default.Archive,
                    contentDescription = "بایگانی",
                    tint = Color(0xFF78909C),
                    modifier = Modifier.size(16.dp)
                )
            }

            // Delete
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.DeleteOutline,
                    contentDescription = "حذف",
                    tint = Color(0xFFB0BEC5),
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

@Composable
fun AddTaskDialog(
    categories: List<TaskCategory>,
    goals: List<Goal>,
    onDismiss: () -> Unit,
    onSave: (AppTask) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf(categories.firstOrNull()?.id ?: "cat_personal") }
    var selectedGoalId by remember { mutableStateOf<String?>(null) }

    var hasSpecificDueDate by remember { mutableStateOf(false) } // Default: no specific due date (end of year)
    var selectedDate by remember { mutableStateOf(PersianCalendarHelper.getToday()) }
    var showDatePicker by remember { mutableStateOf(false) }

    var timeText by remember { mutableStateOf("") } // زمان شروع / انجام
    var deadlineTimeText by remember { mutableStateOf("") } // زمان نهایی که باید تموم بشه
    var isImportant by remember { mutableStateOf(false) }
    var reminderMinutes by remember { mutableStateOf<Int?>(null) }
    var repeatType by remember { mutableStateOf(TaskRepeatType.NONE) }
    var targetTimerMins by remember { mutableStateOf(25) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            modifier = Modifier
                .fillMaxWidth()
                .padding(4.dp)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    Text(
                        text = "افزودن تسک جدید 🌱",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                }

                item {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("عنوان تسک") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                item {
                    OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text("توضیحات یا یادداشت (اختیاری)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                // Important Star Switch
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isImportant) Color(0xFFFFF8E1) else Color(0xFFF5F5F5))
                            .clickable { isImportant = !isImportant }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (isImportant) Icons.Default.Star else Icons.Outlined.Star,
                                contentDescription = null,
                                tint = if (isImportant) Color(0xFFFFA000) else Color(0xFF757575)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "تسک با اولویت و مهم (ستاره‌دار)",
                                fontSize = 13.sp,
                                fontWeight = if (isImportant) FontWeight.Bold else FontWeight.Normal,
                                color = if (isImportant) Color(0xFFE65100) else Color(0xFF424242)
                            )
                        }
                        Switch(
                            checked = isImportant,
                            onCheckedChange = { isImportant = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFFFFA000), checkedTrackColor = Color(0xFFFFE082))
                        )
                    }
                }

                // Due Date Switch & Selector
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF1F8E9))
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (hasSpecificDueDate) "دارای موعد تاریخ مشخص" else "بدون موعد (پیش‌فرض پایان سال)",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                            Switch(
                                checked = hasSpecificDueDate,
                                onCheckedChange = { hasSpecificDueDate = it },
                                colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF2E7D32), checkedTrackColor = Color(0xFFC8E6C9))
                            )
                        }

                        if (hasSpecificDueDate) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color.White)
                                    .clickable { showDatePicker = true }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "تاریخ انتخابی: ${selectedDate.toPersianDisplayString()}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF2E7D32)
                                )
                                Icon(Icons.Default.CalendarToday, contentDescription = "تقویم", tint = Color(0xFF2E7D32), modifier = Modifier.size(16.dp))
                            }
                        } else {
                            Text(
                                text = "💡 در صورت عدم تعیین، تسک در تمام روزها تا پایان سال شمسی جاری در دسترس خواهد بود.",
                                fontSize = 11.sp,
                                color = Color(0xFF558B2F)
                            )
                        }
                    }
                }

                // Start Time & Deadline Time (ساعت انجام و زمان نهایی پایان)
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "زمان‌بندی روزانه (ساعت شروع و موعد نهایی):",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1B5E20)
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedTextField(
                                value = timeText,
                                onValueChange = { timeText = it },
                                label = { Text("زمان انجام (مثلاً 10:00)") },
                                placeholder = { Text("10:00") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            )

                            OutlinedTextField(
                                value = deadlineTimeText,
                                onValueChange = { deadlineTimeText = it },
                                label = { Text("مهلت نهایی (مثلاً 18:30)") },
                                placeholder = { Text("18:30") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }
                }

                // Timer Pomodoro
                item {
                    OutlinedTextField(
                        value = targetTimerMins.toString(),
                        onValueChange = { targetTimerMins = it.toIntOrNull() ?: 25 },
                        label = { Text("تایمر تمرکز پومودورو (دقیقه)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                // Category Selector
                item {
                    Column {
                        Text(
                            text = "دسته‌بندی تسک:",
                            fontSize = 12.sp,
                            color = Color(0xFF616161)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(categories) { cat ->
                                val isSelected = selectedCategoryId == cat.id
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedCategoryId = cat.id },
                                    label = { Text(cat.title) }
                                )
                            }
                        }
                    }
                }

                // Reminder selector
                item {
                    Column {
                        Text(
                            text = "یادآوری قبل از ساعت تسک:",
                            fontSize = 12.sp,
                            color = Color(0xFF616161)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(
                                null to "بدون یادآور",
                                10 to "۱۰ دقیقه",
                                30 to "۳۰ دقیقه"
                            ).forEach { (mins, label) ->
                                val selected = reminderMinutes == mins
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (selected) Color(0xFF2E7D32) else Color(0xFFF5F5F5))
                                        .clickable { reminderMinutes = mins }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 11.sp,
                                        color = if (selected) Color.White else Color(0xFF424242)
                                    )
                                }
                            }
                        }
                    }
                }

                // Goal linkage selector
                if (goals.isNotEmpty()) {
                    item {
                        Column {
                            Text(
                                text = "اتصال به هدف سالانه یا فصلی (اختیاری):",
                                fontSize = 12.sp,
                                color = Color(0xFF616161)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                item {
                                    FilterChip(
                                        selected = selectedGoalId == null,
                                        onClick = { selectedGoalId = null },
                                        label = { Text("بدون هدف") }
                                    )
                                }
                                items(goals) { g ->
                                    FilterChip(
                                        selected = selectedGoalId == g.id,
                                        onClick = { selectedGoalId = g.id },
                                        label = { Text(g.title) }
                                    )
                                }
                            }
                        }
                    }
                }

                // Actions
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("انصراف")
                        }

                        Button(
                            onClick = {
                                if (title.isNotBlank()) {
                                    val finalDueDate = if (hasSpecificDueDate) selectedDate.toFormattedString() else ""
                                    val newTask = AppTask(
                                        id = UUID.randomUUID().toString(),
                                        title = title.trim(),
                                        notes = notes.trim(),
                                        categoryId = selectedCategoryId,
                                        goalId = selectedGoalId,
                                        dueDate = finalDueDate,
                                        time = if (timeText.isNotBlank()) timeText.trim() else null,
                                        deadlineTime = if (deadlineTimeText.isNotBlank()) deadlineTimeText.trim() else null,
                                        isImportant = isImportant,
                                        reminderMinutesBefore = reminderMinutes,
                                        repeatType = repeatType,
                                        timerSecondsTarget = targetTimerMins * 60
                                    )
                                    onSave(newTask)
                                }
                            },
                            enabled = title.isNotBlank(),
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                        ) {
                            Text("ثبت تسک", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    if (showDatePicker) {
        PersianDatePickerDialog(
            initialDate = selectedDate,
            onDismiss = { showDatePicker = false },
            onDateSelected = { date ->
                selectedDate = date
            }
        )
    }
}
