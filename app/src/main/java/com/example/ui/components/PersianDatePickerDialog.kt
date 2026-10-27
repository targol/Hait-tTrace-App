package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
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
import com.example.calendar.IranianHolidays
import com.example.calendar.JalaliDate
import com.example.calendar.PersianCalendarHelper

@Composable
fun PersianDatePickerDialog(
    initialDate: JalaliDate = PersianCalendarHelper.getToday(),
    onDismiss: () -> Unit,
    onDateSelected: (JalaliDate) -> Unit
) {
    var selectedYear by remember { mutableStateOf(initialDate.year) }
    var selectedMonth by remember { mutableStateOf(initialDate.month) }
    var selectedDay by remember { mutableStateOf(initialDate.day) }

    val daysInMonth = PersianCalendarHelper.getDaysInMonth(selectedYear, selectedMonth)
    if (selectedDay > daysInMonth) {
        selectedDay = daysInMonth
    }

    val currentSelectedDate = JalaliDate(selectedYear, selectedMonth, selectedDay)
    val (isCurrentHoliday, holidayTitle) = IranianHolidays.getHolidayInfo(currentSelectedDate)

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header Display
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF2E7D32))
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "انتخاب تاریخ شمسی",
                        fontSize = 12.sp,
                        color = Color(0xFFC8E6C9)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = currentSelectedDate.toPersianDisplayString(),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    if (isCurrentHoliday && holidayTitle != null) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFD32F2F))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "تعطیل رسمی: $holidayTitle",
                                fontSize = 11.sp,
                                color = Color.White,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Year & Month Navigator
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = {
                        if (selectedMonth > 1) {
                            selectedMonth--
                        } else {
                            selectedMonth = 12
                            selectedYear--
                        }
                    }) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "ماه قبل", tint = Color(0xFF2E7D32))
                    }

                    Text(
                        text = "${PersianCalendarHelper.PERSIAN_MONTH_NAMES[selectedMonth - 1]} ${PersianCalendarHelper.toPersianDigits(selectedYear)}",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )

                    IconButton(onClick = {
                        if (selectedMonth < 12) {
                            selectedMonth++
                        } else {
                            selectedMonth = 1
                            selectedYear++
                        }
                    }) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "ماه بعد", tint = Color(0xFF2E7D32))
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Days Grid (1 to daysInMonth)
                LazyVerticalGrid(
                    columns = GridCells.Fixed(7),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(230.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(daysInMonth) { index ->
                        val dayNumber = index + 1
                        val date = JalaliDate(selectedYear, selectedMonth, dayNumber)
                        val isSelected = dayNumber == selectedDay
                        val (isHoliday, _) = IranianHolidays.getHolidayInfo(date)
                        val isWeekend = IranianHolidays.isFriday(date)

                        Box(
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isSelected -> Color(0xFF2E7D32)
                                        isHoliday || isWeekend -> Color(0xFFFFEBEE)
                                        else -> Color(0xFFF5F5F5)
                                    }
                                )
                                .clickable { selectedDay = dayNumber },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = PersianCalendarHelper.toPersianDigits(dayNumber),
                                fontSize = 13.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = when {
                                    isSelected -> Color.White
                                    isHoliday || isWeekend -> Color(0xFFD32F2F)
                                    else -> Color(0xFF212121)
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(text = "انصراف")
                    }

                    Button(
                        onClick = {
                            onDateSelected(currentSelectedDate)
                            onDismiss()
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                    ) {
                        Text(text = "تأیید تاریخ", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
