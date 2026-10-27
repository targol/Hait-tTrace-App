package com.example.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.calendar.PersianCalendarHelper
import kotlinx.coroutines.delay

enum class TimerMode(val title: String) {
    COUNTDOWN("شمارش معکوس"),
    STOPWATCH("کرنومتر")
}

@Composable
fun TaskTimerDialog(
    itemTitle: String,
    initialTargetMinutes: Int = 25,
    onDismiss: () -> Unit,
    onComplete: (elapsedSeconds: Int) -> Unit
) {
    var mode by remember { mutableStateOf(TimerMode.COUNTDOWN) }
    var targetSeconds by remember { mutableStateOf(initialTargetMinutes * 60) }
    var remainingSeconds by remember { mutableStateOf(initialTargetMinutes * 60) }
    var elapsedSeconds by remember { mutableStateOf(0) }
    var isRunning by remember { mutableStateOf(false) }
    var isFinished by remember { mutableStateOf(false) }

    LaunchedEffect(isRunning) {
        while (isRunning) {
            delay(1000)
            if (mode == TimerMode.COUNTDOWN) {
                if (remainingSeconds > 0) {
                    remainingSeconds--
                    elapsedSeconds++
                } else {
                    isRunning = false
                    isFinished = true
                }
            } else {
                elapsedSeconds++
            }
        }
    }

    Dialog(onDismissRequest = {
        isRunning = false
        onDismiss()
    }) {
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = Color.White,
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "بستن", tint = Color.Gray)
                    }

                    Text(
                        text = "تایمر تمرکز و رشد",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )

                    Spacer(modifier = Modifier.size(24.dp))
                }

                Text(
                    text = itemTitle,
                    fontSize = 14.sp,
                    color = Color(0xFF616161),
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                )

                // Mode Selector
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFF1F8E9))
                        .padding(4.dp)
                ) {
                    TimerMode.values().forEach { m ->
                        val selected = m == mode
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (selected) Color(0xFF2E7D32) else Color.Transparent)
                                .clickable {
                                    if (!isRunning) {
                                        mode = m
                                    }
                                }
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = m.title,
                                fontSize = 12.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                color = if (selected) Color.White else Color(0xFF2E7D32)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Circular Progress Timer
                val displaySecs = if (mode == TimerMode.COUNTDOWN) remainingSeconds else elapsedSeconds
                val minutes = displaySecs / 60
                val seconds = displaySecs % 60
                val formattedTime = "%02d:%02d".format(minutes, seconds)

                val progressFraction = if (mode == TimerMode.COUNTDOWN) {
                    if (targetSeconds > 0) (remainingSeconds.toFloat() / targetSeconds.toFloat()).coerceIn(0f, 1f) else 0f
                } else {
                    ((elapsedSeconds % 60).toFloat() / 60f)
                }

                val animatedProgress by animateFloatAsState(targetValue = progressFraction, label = "timeProgress")

                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(190.dp)
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val strokeWidth = 10.dp.toPx()
                        val radius = (size.minDimension - strokeWidth) / 2
                        val center = Offset(size.width / 2, size.height / 2)

                        // Track
                        drawCircle(
                            color = Color(0xFFE8F5E9),
                            radius = radius,
                            center = center,
                            style = Stroke(width = strokeWidth)
                        )

                        // Progress Arc
                        drawArc(
                            color = if (isFinished) Color(0xFFE91E63) else Color(0xFF2E7D32),
                            startAngle = -90f,
                            sweepAngle = animatedProgress * 360f,
                            useCenter = false,
                            topLeft = Offset(center.x - radius, center.y - radius),
                            size = Size(radius * 2, radius * 2),
                            style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = PersianCalendarHelper.toPersianDigits(formattedTime),
                            fontSize = 36.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF212121)
                        )
                        Text(
                            text = if (isFinished) "زمان به پایان رسید! 🌸" else if (isRunning) "در حال تمرکز... 🌱" else "آماده شروع",
                            fontSize = 12.sp,
                            color = Color(0xFF689F38)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Presets for countdown (when stopped)
                if (mode == TimerMode.COUNTDOWN && !isRunning) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(bottom = 16.dp)
                    ) {
                        listOf(5, 15, 25, 45).forEach { mins ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (targetSeconds == mins * 60) Color(0xFFC8E6C9) else Color(0xFFF5F5F5))
                                    .clickable {
                                        targetSeconds = mins * 60
                                        remainingSeconds = mins * 60
                                        isFinished = false
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = "${PersianCalendarHelper.toPersianDigits(mins)} دقیقه",
                                    fontSize = 11.sp,
                                    color = Color(0xFF1B5E20)
                                )
                            }
                        }
                    }
                }

                // Controls: Reset, Play/Pause, Finish
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Reset
                    IconButton(
                        onClick = {
                            isRunning = false
                            isFinished = false
                            if (mode == TimerMode.COUNTDOWN) {
                                remainingSeconds = targetSeconds
                            } else {
                                elapsedSeconds = 0
                            }
                        },
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF5F5F5))
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "بازنشانی", tint = Color(0xFF616161))
                    }

                    // Play / Pause
                    Button(
                        onClick = {
                            isRunning = !isRunning
                            isFinished = false
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isRunning) Color(0xFFF57C00) else Color(0xFF2E7D32)
                        ),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.height(50.dp)
                    ) {
                        Icon(
                            imageVector = if (isRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isRunning) "توقف" else "شروع",
                            tint = Color.White
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isRunning) "توقف موقت" else "شروع تمرکز",
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Complete Task Button
                Button(
                    onClick = {
                        isRunning = false
                        onComplete(elapsedSeconds)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1B5E20)),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "ثبت پایان و رشد گیاه 🌱",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }
}
