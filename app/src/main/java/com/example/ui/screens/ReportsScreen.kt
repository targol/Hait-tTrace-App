package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.calendar.PersianCalendarHelper
import com.example.data.AppRepository
import com.example.model.GoalPeriod

@Composable
fun ReportsScreen(
    repository: AppRepository,
    modifier: Modifier = Modifier
) {
    val tasks by repository.tasks.collectAsState()
    val habits by repository.habits.collectAsState()
    val goals by repository.goals.collectAsState()

    val totalTasks = tasks.size
    val completedTasks = tasks.count { it.isCompleted }
    val taskRate = if (totalTasks > 0) ((completedTasks.toDouble() / totalTasks) * 100).toInt() else 0

    val habitAdherences = habits.map { it to it.calculateAdherenceRate(28) }
    val avgHabitAdherence = if (habitAdherences.isNotEmpty()) {
        habitAdherences.map { it.second }.average().toInt()
    } else 0

    val annualGoals = goals.filter { it.period == GoalPeriod.ANNUAL }
    val avgGoalProgress = if (annualGoals.isNotEmpty()) {
        annualGoals.map { repository.getGoalProgress(it.id) }.average().toInt()
    } else 0

    // 7-day past trend
    val past7Days = remember { PersianCalendarHelper.getPastNDays(7) }
    val completionTrend = past7Days.map { date ->
        val dateStr = date.toFormattedString()
        val count = tasks.count { it.dueDate == dateStr && it.isCompleted }
        date to count
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 90.dp)
    ) {
        // Header
        item {
            Column {
                Text(
                    text = "گزارش‌ها و روند رشد 📊",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1B5E20)
                )
                Text(
                    text = "تحلیل پیوستگی عادات، اتمام تسک‌ها و پیشرفت اهداف",
                    fontSize = 11.sp,
                    color = Color(0xFF757575),
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }

        // Summary Metric Cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricCard(
                    title = "تسک‌های کامل",
                    value = "${PersianCalendarHelper.toPersianDigits(completedTasks)} / ${PersianCalendarHelper.toPersianDigits(totalTasks)}",
                    subtitle = "${PersianCalendarHelper.toPersianDigits(taskRate)}٪ انجام شده",
                    emoji = "✅",
                    color = Color(0xFF2E7D32),
                    modifier = Modifier.weight(1f)
                )

                MetricCard(
                    title = "میانگین عادات",
                    value = "${PersianCalendarHelper.toPersianDigits(avgHabitAdherence)}٪",
                    subtitle = "پایبندی ۲۸ روزه",
                    emoji = "🌿",
                    color = Color(0xFF388E3C),
                    modifier = Modifier.weight(1f)
                )

                MetricCard(
                    title = "اهداف سالانه",
                    value = "${PersianCalendarHelper.toPersianDigits(avgGoalProgress)}٪",
                    subtitle = "${PersianCalendarHelper.toPersianDigits(annualGoals.size)} هدف فعال",
                    emoji = "🎯",
                    color = Color(0xFFE65100),
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Weekly Activity Bar Chart
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp)
                ) {
                    Text(
                        text = "روند تکمیل تسک‌ها در ۷ روز گذشته",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    val maxCount = (completionTrend.maxOfOrNull { it.second } ?: 1).coerceAtLeast(4)

                    // Chart Canvas
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val w = size.width
                            val h = size.height
                            val barWidth = 24.dp.toPx()
                            val spacing = (w - (barWidth * 7)) / 8

                            for (i in 0 until 7) {
                                val (_, count) = completionTrend[i]
                                val barHeight = (count.toFloat() / maxCount.toFloat()) * (h - 28.dp.toPx())
                                val x = spacing + i * (barWidth + spacing)
                                val y = h - barHeight - 20.dp.toPx()

                                // Background track
                                drawRoundRect(
                                    color = Color(0xFFF1F8E9),
                                    topLeft = Offset(x, 10.dp.toPx()),
                                    size = Size(barWidth, h - 30.dp.toPx()),
                                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx())
                                )

                                // Active bar
                                if (count > 0) {
                                    drawRoundRect(
                                        color = Color(0xFF2E7D32),
                                        topLeft = Offset(x, y),
                                        size = Size(barWidth, barHeight),
                                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx())
                                    )
                                }
                            }
                        }

                        // Day names row at the bottom
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .align(Alignment.BottomCenter),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            completionTrend.forEach { (date, _) ->
                                val dow = PersianCalendarHelper.getDayOfWeek(date)
                                Text(
                                    text = PersianCalendarHelper.WEEKDAY_SHORT_NAMES[dow],
                                    fontSize = 11.sp,
                                    color = Color(0xFF757575)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Habit Adherence Breakdown
        item {
            Text(
                text = "پایبندی به عادات در ۲۸ روز گذشته",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1B5E20),
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        if (habits.isEmpty()) {
            item {
                Text(
                    text = "عادتی برای تحلیل ثبت نشده است.",
                    fontSize = 12.sp,
                    color = Color(0xFF757575)
                )
            }
        } else {
            items(habits, key = { it.id }) { habit ->
                val adherence = habit.calculateAdherenceRate(28)
                val streak = habit.calculateCurrentStreak()

                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFF1F8E9)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = "🌱", fontSize = 18.sp)
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = habit.title,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF212121)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            LinearProgressIndicator(
                                progress = { adherence / 100f },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = when {
                                    adherence >= 80 -> Color(0xFF2E7D32)
                                    adherence >= 50 -> Color(0xFFF57C00)
                                    else -> Color(0xFFE53935)
                                },
                                trackColor = Color(0xFFEEEEEE)
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "${PersianCalendarHelper.toPersianDigits(adherence)}٪",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF2E7D32)
                            )
                            Text(
                                text = "🔥 ${PersianCalendarHelper.toPersianDigits(streak)} روز",
                                fontSize = 10.sp,
                                color = Color(0xFFE65100)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricCard(
    title: String,
    value: String,
    subtitle: String,
    emoji: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = emoji, fontSize = 20.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF424242)
            )
            Text(
                text = subtitle,
                fontSize = 9.sp,
                color = Color(0xFF757575)
            )
        }
    }
}
