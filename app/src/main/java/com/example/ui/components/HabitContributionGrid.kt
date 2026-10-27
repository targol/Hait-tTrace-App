package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.calendar.IranianHolidays
import com.example.calendar.JalaliDate
import com.example.calendar.PersianCalendarHelper
import com.example.model.Habit

@Composable
fun HabitContributionGrid(
    habit: Habit,
    onDayClick: ((JalaliDate) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    // Show past 28 days (4 full weeks)
    val pastDays = PersianCalendarHelper.getPastNDays(28)
    val currentStreak = habit.calculateCurrentStreak()
    val adherenceRate = habit.calculateAdherenceRate(28)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFF9FBF9))
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocalFireDepartment,
                    contentDescription = "زنجیره",
                    tint = Color(0xFFE65100),
                    modifier = Modifier.size(18.dp)
                )
                Text(
                    text = "${PersianCalendarHelper.toPersianDigits(currentStreak)} روز پیوستگی",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFE65100)
                )
            }

            Text(
                text = "${PersianCalendarHelper.toPersianDigits(adherenceRate)}٪ پایبندی (۲۸ روز اخیر)",
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF2E7D32)
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Weekday Short labels: ش, ی, د, س, چ, پ, ج
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            PersianCalendarHelper.WEEKDAY_SHORT_NAMES.forEach { dayName ->
                Box(
                    modifier = Modifier.width(36.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = dayName,
                        fontSize = 10.sp,
                        color = Color(0xFF757575),
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // 4 rows of 7 days
        val chunks = pastDays.chunked(7)
        Column(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            chunks.forEach { week ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    week.forEach { date ->
                        val dateStr = date.toFormattedString()
                        val isDone = habit.isCompletedOn(dateStr)
                        val isExempt = habit.isDateExempt(date)
                        val (isHoliday, _) = IranianHolidays.getHolidayInfo(date)

                        val cellColor = when {
                            isDone -> Color(0xFF2E7D32) // Emerald Done
                            isExempt -> Color(0xFFFFF3E0) // Light orange / holiday exempt
                            else -> Color(0xFFEEEEEE) // Missed
                        }

                        val borderColor = when {
                            isDone -> Color(0xFF1B5E20)
                            isHoliday -> Color(0xFFFFB74D)
                            else -> Color(0xFFE0E0E0)
                        }

                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(cellColor)
                                .clickable { onDayClick?.invoke(date) },
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = PersianCalendarHelper.toPersianDigits(date.day),
                                    fontSize = 10.sp,
                                    fontWeight = if (isDone) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isDone) Color.White else Color(0xFF424242)
                                )

                                if (isHoliday && !isDone) {
                                    Box(
                                        modifier = Modifier
                                            .size(4.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFE65100))
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Legend
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically
        ) {
            LegendItem(color = Color(0xFF2E7D32), label = "انجام شده")
            Spacer(modifier = Modifier.width(10.dp))
            LegendItem(color = Color(0xFFFFF3E0), label = "معاف از تعطیلی")
            Spacer(modifier = Modifier.width(10.dp))
            LegendItem(color = Color(0xFFEEEEEE), label = "انجام نشده")
        }
    }
}

@Composable
private fun LegendItem(color: Color, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(color)
        )
        Text(
            text = label,
            fontSize = 9.sp,
            color = Color(0xFF757575)
        )
    }
}
