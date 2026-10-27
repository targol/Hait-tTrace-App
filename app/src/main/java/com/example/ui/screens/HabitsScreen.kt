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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.calendar.PersianCalendarHelper
import com.example.data.AppRepository
import com.example.model.*
import com.example.ui.components.HabitContributionGrid
import com.example.ui.components.TaskTimerDialog
import java.util.UUID

@Composable
fun HabitsScreen(
    repository: AppRepository,
    modifier: Modifier = Modifier
) {
    val habits by repository.habits.collectAsState()
    val categories by repository.categories.collectAsState()
    val goals by repository.goals.collectAsState()

    var showAddHabitDialog by remember { mutableStateOf(false) }
    var activeTimerHabit by remember { mutableStateOf<Habit?>(null) }

    val todayStr = remember { PersianCalendarHelper.getToday().toFormattedString() }

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddHabitDialog = true },
                containerColor = Color(0xFF2E7D32),
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
                text = { Text("عادت جدید", fontWeight = FontWeight.Bold) },
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
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "عادت‌ها و پیوستگی 🌱",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )

                    Text(
                        text = "${PersianCalendarHelper.toPersianDigits(habits.size)} عادت فعال",
                        fontSize = 12.sp,
                        color = Color(0xFF689F38)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "تعطیلات رسمی و اختیاری پایان هفته از حساب شکست عادت مستثنی هستند.",
                    fontSize = 11.sp,
                    color = Color(0xFF757575)
                )
            }

            if (habits.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "🌿", fontSize = 48.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "هنوز عادتی ثبت نشده است",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF757575)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = { showAddHabitDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("تعریف اولین عادت روزانه")
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 6.dp, bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(habits, key = { it.id }) { habit ->
                        val isDoneToday = habit.isCompletedOn(todayStr)
                        val category = categories.find { it.id == habit.categoryId } ?: DefaultCategories.PERSONAL

                        HabitDetailCard(
                            habit = habit,
                            category = category,
                            isDoneToday = isDoneToday,
                            onToggleToday = { repository.toggleHabitToday(habit.id) },
                            onToggleDate = { date -> repository.toggleHabitOnDate(habit.id, date.toFormattedString()) },
                            onStartTimer = { activeTimerHabit = habit },
                            onUpdateHabit = { updated -> repository.updateHabit(updated) },
                            onDelete = { repository.deleteHabit(habit.id) }
                        )
                    }
                }
            }
        }
    }

    if (showAddHabitDialog) {
        AddHabitDialog(
            categories = categories,
            goals = goals,
            onDismiss = { showAddHabitDialog = false },
            onSave = { newHabit ->
                repository.addHabit(newHabit)
                showAddHabitDialog = false
            }
        )
    }

    if (activeTimerHabit != null) {
        TaskTimerDialog(
            itemTitle = activeTimerHabit!!.title,
            initialTargetMinutes = activeTimerHabit!!.timerMinutes,
            onDismiss = { activeTimerHabit = null },
            onComplete = {
                repository.toggleHabitToday(activeTimerHabit!!.id)
                activeTimerHabit = null
            }
        )
    }
}

@Composable
fun HabitDetailCard(
    habit: Habit,
    category: TaskCategory,
    isDoneToday: Boolean,
    onToggleToday: () -> Unit,
    onToggleDate: (com.example.calendar.JalaliDate) -> Unit,
    onStartTimer: () -> Unit,
    onUpdateHabit: (Habit) -> Unit,
    onDelete: () -> Unit
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
                .padding(16.dp)
        ) {
            // Top Row: Habit Title, Category, Checkbox, Timer
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Today check button with plant emoji
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(if (isDoneToday) Color(0xFF2E7D32) else Color(0xFFF1F8E9))
                        .clickable { onToggleToday() },
                    contentAlignment = Alignment.Center
                ) {
                    if (isDoneToday) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "انجام شد",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    } else {
                        Text(text = "🌱", fontSize = 22.sp)
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = habit.title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )

                    Spacer(modifier = Modifier.height(3.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Category Pill
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
                    }
                }

                // Timer Button
                IconButton(
                    onClick = onStartTimer,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF5F5F5))
                ) {
                    Icon(Icons.Default.Timer, contentDescription = "تایمر", tint = Color(0xFF2E7D32), modifier = Modifier.size(18.dp))
                }

                // Delete
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = "حذف", tint = Color(0xFFB0BEC5), modifier = Modifier.size(18.dp))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // GitHub-style contribution graph
            HabitContributionGrid(
                habit = habit,
                onDayClick = onToggleDate
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Exemption Toggles Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFFAFAFA))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = habit.exemptHolidays,
                        onCheckedChange = { onUpdateHabit(habit.copy(exemptHolidays = it)) },
                        colors = CheckboxDefaults.colors(checkedColor = Color(0xFF2E7D32))
                    )
                    Text(text = "معافیت تعطیلات رسمی", fontSize = 11.sp, color = Color(0xFF424242))
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = habit.exemptWeekends,
                        onCheckedChange = { onUpdateHabit(habit.copy(exemptWeekends = it)) },
                        colors = CheckboxDefaults.colors(checkedColor = Color(0xFF2E7D32))
                    )
                    Text(text = "معافیت پنجشنبه/جمعه", fontSize = 11.sp, color = Color(0xFF424242))
                }
            }
        }
    }
}

@Composable
fun AddHabitDialog(
    categories: List<TaskCategory>,
    goals: List<Goal>,
    onDismiss: () -> Unit,
    onSave: (Habit) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf(categories.firstOrNull()?.id ?: "cat_personal") }
    var selectedGoalId by remember { mutableStateOf<String?>(null) }
    var selectedPlantType by remember { mutableStateOf(PlantType.SPROUT) }

    var timerMinutes by remember { mutableStateOf(15) }
    var exemptHolidays by remember { mutableStateOf(true) }
    var exemptWeekends by remember { mutableStateOf(false) }

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
                        text = "تعریف عادت جدید 🌿",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                }

                item {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("عنوان عادت (مثلا ۲۰ دقیقه مطالعه)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                // Plant Type Selector
                item {
                    Column {
                        Text(
                            text = "نماد گیاه این عادت:",
                            fontSize = 12.sp,
                            color = Color(0xFF616161)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(PlantType.values()) { pt ->
                                val isSelected = pt == selectedPlantType
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (isSelected) Color(0xFF2E7D32) else Color(0xFFF1F8E9))
                                        .clickable { selectedPlantType = pt }
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = pt.title,
                                        fontSize = 11.sp,
                                        color = if (isSelected) Color.White else Color(0xFF1B5E20),
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }
                }

                // Category Selector
                item {
                    Column {
                        Text(text = "دسته‌بندی:", fontSize = 12.sp, color = Color(0xFF616161))
                        Spacer(modifier = Modifier.height(4.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(categories) { cat ->
                                val isSelected = cat.id == selectedCategoryId
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedCategoryId = cat.id },
                                    label = { Text(cat.title) }
                                )
                            }
                        }
                    }
                }

                // Timer Minutes
                item {
                    OutlinedTextField(
                        value = timerMinutes.toString(),
                        onValueChange = { timerMinutes = it.toIntOrNull() ?: 15 },
                        label = { Text("زمان تمرکز (دقیقه)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                // Exemptions
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF9FBF9))
                            .padding(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = exemptHolidays,
                                onCheckedChange = { exemptHolidays = it },
                                colors = CheckboxDefaults.colors(checkedColor = Color(0xFF2E7D32))
                            )
                            Text(
                                text = "عدم شکست زنجیره در تعطیلات رسمی",
                                fontSize = 12.sp,
                                color = Color(0xFF212121)
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = exemptWeekends,
                                onCheckedChange = { exemptWeekends = it },
                                colors = CheckboxDefaults.colors(checkedColor = Color(0xFF2E7D32))
                            )
                            Text(
                                text = "عدم شکست زنجیره در پنجشنبه و جمعه",
                                fontSize = 12.sp,
                                color = Color(0xFF212121)
                            )
                        }
                    }
                }

                // Action Buttons
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
                                    val newHabit = Habit(
                                        id = UUID.randomUUID().toString(),
                                        title = title.trim(),
                                        notes = notes.trim(),
                                        categoryId = selectedCategoryId,
                                        goalId = selectedGoalId,
                                        timerMinutes = timerMinutes,
                                        exemptHolidays = exemptHolidays,
                                        exemptWeekends = exemptWeekends,
                                        plantType = selectedPlantType
                                    )
                                    onSave(newHabit)
                                }
                            },
                            enabled = title.isNotBlank(),
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                        ) {
                            Text("ثبت عادت", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
