package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import com.example.model.Goal
import com.example.model.GoalPeriod
import com.example.model.PlantGrowthStage
import java.util.UUID

@Composable
fun GoalsScreen(
    repository: AppRepository,
    modifier: Modifier = Modifier
) {
    val goals by repository.goals.collectAsState()
    val tasks by repository.tasks.collectAsState()
    val habits by repository.habits.collectAsState()

    val currentYear = remember { PersianCalendarHelper.getToday().year }
    var selectedYear by remember { mutableStateOf(currentYear) }
    var showAddGoalDialog by remember { mutableStateOf(false) }
    var parentGoalForChild by remember { mutableStateOf<Goal?>(null) }

    val annualGoals = goals.filter { it.period == GoalPeriod.ANNUAL && it.year == selectedYear }

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = {
                    parentGoalForChild = null
                    showAddGoalDialog = true
                },
                containerColor = Color(0xFF2E7D32),
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Add, contentDescription = "افزودن") },
                text = { Text("هدف سالانه جدید", fontWeight = FontWeight.Bold) },
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
                Column {
                    Text(
                        text = "اهداف و چشم‌انداز 🎯",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                    Text(
                        text = "شکستن اهداف سالانه به فصلی، ماهانه و تسک‌های روزانه",
                        fontSize = 11.sp,
                        color = Color(0xFF757575)
                    )
                }

                // Year selector
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFE8F5E9))
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "سال ${PersianCalendarHelper.toPersianDigits(selectedYear)}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                }
            }

            if (annualGoals.isEmpty()) {
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
                            text = "هنوز هدف سالانه‌ای برای سال ${PersianCalendarHelper.toPersianDigits(selectedYear)} تعریف نشده است",
                            fontSize = 14.sp,
                            color = Color(0xFF757575),
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = { showAddGoalDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("تعریف هدف سالانه جدید")
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 6.dp, bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(annualGoals, key = { it.id }) { annualGoal ->
                        val childGoals = goals.filter { it.parentId == annualGoal.id }
                        val progress = repository.getGoalProgress(annualGoal.id)
                        val linkedTasks = tasks.filter { it.goalId == annualGoal.id }
                        val linkedHabits = habits.filter { it.goalId == annualGoal.id }

                        AnnualGoalCard(
                            goal = annualGoal,
                            childGoals = childGoals,
                            progress = progress,
                            linkedTasksCount = linkedTasks.size,
                            completedTasksCount = linkedTasks.count { it.isCompleted },
                            linkedHabitsCount = linkedHabits.size,
                            onAddChildGoal = {
                                parentGoalForChild = annualGoal
                                showAddGoalDialog = true
                            },
                            onDelete = { repository.deleteGoal(annualGoal.id) }
                        )
                    }
                }
            }
        }
    }

    if (showAddGoalDialog) {
        AddGoalDialog(
            defaultYear = selectedYear,
            parentGoal = parentGoalForChild,
            annualGoals = annualGoals,
            onDismiss = { showAddGoalDialog = false },
            onSave = { newGoal ->
                repository.addGoal(newGoal)
                showAddGoalDialog = false
            }
        )
    }
}

@Composable
fun AnnualGoalCard(
    goal: Goal,
    childGoals: List<Goal>,
    progress: Int,
    linkedTasksCount: Int,
    completedTasksCount: Int,
    linkedHabitsCount: Int,
    onAddChildGoal: () -> Unit,
    onDelete: () -> Unit
) {
    var isExpanded by remember { mutableStateOf(false) }
    val stage = PlantGrowthStage.fromProgress(progress)

    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFE8F5E9)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = stage.emoji, fontSize = 22.sp)
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = goal.title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                    Text(
                        text = "${goal.periodTitle} • وضعیت: ${stage.title}",
                        fontSize = 11.sp,
                        color = Color(0xFF558B2F),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                // Delete
                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = "حذف", tint = Color(0xFFB0BEC5), modifier = Modifier.size(18.dp))
                }
            }

            if (goal.description.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = goal.description,
                    fontSize = 12.sp,
                    color = Color(0xFF616161)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Progress Bar
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "پیشرفت به سوی هدف",
                        fontSize = 11.sp,
                        color = Color(0xFF757575)
                    )
                    Text(
                        text = "${PersianCalendarHelper.toPersianDigits(progress)}٪",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF2E7D32)
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { progress / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = Color(0xFF2E7D32),
                    trackColor = Color(0xFFE8F5E9)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Stats row (linked tasks & habits count)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFF1F8E9))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "✅ ${PersianCalendarHelper.toPersianDigits(completedTasksCount)} از ${PersianCalendarHelper.toPersianDigits(linkedTasksCount)} تسک",
                        fontSize = 11.sp,
                        color = Color(0xFF2E7D32)
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFF1F8E9))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "🌿 ${PersianCalendarHelper.toPersianDigits(linkedHabitsCount)} عادت مرتبط",
                        fontSize = 11.sp,
                        color = Color(0xFF2E7D32)
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFF1F8E9))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "📂 ${PersianCalendarHelper.toPersianDigits(childGoals.size)} زیرهدف",
                        fontSize = 11.sp,
                        color = Color(0xFF2E7D32)
                    )
                }
            }

            // Expand / Collapse Child Goals
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = { isExpanded = !isExpanded }) {
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        tint = Color(0xFF2E7D32),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isExpanded) "بستن زیر‌اهداف" else "مشاهده زیر‌اهداف فصلی و ماهانه",
                        fontSize = 12.sp,
                        color = Color(0xFF2E7D32)
                    )
                }

                TextButton(onClick = onAddChildGoal) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFF2E7D32), modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(text = "شکستن هدف", fontSize = 12.sp, color = Color(0xFF2E7D32))
                }
            }

            AnimatedVisibility(visible = isExpanded) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (childGoals.isEmpty()) {
                        Text(
                            text = "هنوز زیرهدفی (فصلی یا ماهانه) اضافه نکرده‌اید. با زدن «شکستن هدف» می‌توانید گام‌های فصلی تعریف کنید.",
                            fontSize = 12.sp,
                            color = Color(0xFF757575),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 6.dp)
                        )
                    } else {
                        childGoals.forEach { child ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFFAFAFA))
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = child.title,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF212121)
                                    )
                                    Text(
                                        text = child.periodTitle,
                                        fontSize = 10.sp,
                                        color = Color(0xFF757575)
                                    )
                                }

                                Text(
                                    text = "🎯",
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AddGoalDialog(
    defaultYear: Int,
    parentGoal: Goal?,
    annualGoals: List<Goal>,
    onDismiss: () -> Unit,
    onSave: (Goal) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var period by remember {
        mutableStateOf(if (parentGoal != null) GoalPeriod.SEASONAL else GoalPeriod.ANNUAL)
    }
    var selectedParentId by remember { mutableStateOf(parentGoal?.id) }
    var seasonIndex by remember { mutableStateOf(0) } // 0: بهار, 1: تابستان, 2: پاییز, 3: زمستان
    var monthIndex by remember { mutableStateOf(1) } // 1..12

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
                        text = if (parentGoal != null) "شکستن هدف به گام کوچک‌تر 🌱" else "تعریف هدف جدید 🎯",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                }

                item {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("عنوان هدف") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                item {
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("توضیحات و شاخص‌های کلیدی (اختیاری)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                // Period Selector (سالانه / فصلی / ماهانه)
                item {
                    Column {
                        Text(text = "دوره زمانی هدف:", fontSize = 12.sp, color = Color(0xFF616161))
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(
                                GoalPeriod.ANNUAL to "سالانه",
                                GoalPeriod.SEASONAL to "فصلی",
                                GoalPeriod.MONTHLY to "ماهانه"
                            ).forEach { (p, label) ->
                                val selected = p == period
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(if (selected) Color(0xFF2E7D32) else Color(0xFFF1F8E9))
                                        .clickable { period = p }
                                        .padding(horizontal = 14.dp, vertical = 8.dp)
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 12.sp,
                                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                        color = if (selected) Color.White else Color(0xFF1B5E20)
                                    )
                                }
                            }
                        }
                    }
                }

                // If seasonal, select Season
                if (period == GoalPeriod.SEASONAL) {
                    item {
                        Column {
                            Text(text = "انتخاب فصل:", fontSize = 12.sp, color = Color(0xFF616161))
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("بهار", "تابستان", "پاییز", "زمستان").forEachIndexed { idx, sName ->
                                    val selected = seasonIndex == idx
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (selected) Color(0xFF2E7D32) else Color(0xFFF5F5F5))
                                        .clickable { seasonIndex = idx }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            text = sName,
                                            fontSize = 11.sp,
                                            color = if (selected) Color.White else Color(0xFF424242)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // If monthly, select Month
                if (period == GoalPeriod.MONTHLY) {
                    item {
                        Column {
                            Text(text = "انتخاب ماه شمسی:", fontSize = 12.sp, color = Color(0xFF616161))
                            Spacer(modifier = Modifier.height(4.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(12) { idx ->
                                    val mIdx = idx + 1
                                    val selected = monthIndex == mIdx
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (selected) Color(0xFF2E7D32) else Color(0xFFF5F5F5))
                                            .clickable { monthIndex = mIdx }
                                            .padding(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            text = PersianCalendarHelper.PERSIAN_MONTH_NAMES[idx],
                                            fontSize = 11.sp,
                                            color = if (selected) Color.White else Color(0xFF424242)
                                        )
                                    }
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
                                    val newGoal = Goal(
                                        id = UUID.randomUUID().toString(),
                                        title = title.trim(),
                                        description = description.trim(),
                                        year = defaultYear,
                                        period = period,
                                        seasonIndex = if (period == GoalPeriod.SEASONAL) seasonIndex else null,
                                        monthIndex = if (period == GoalPeriod.MONTHLY) monthIndex else null,
                                        parentId = selectedParentId
                                    )
                                    onSave(newGoal)
                                }
                            },
                            enabled = title.isNotBlank(),
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                        ) {
                            Text("ثبت هدف", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
