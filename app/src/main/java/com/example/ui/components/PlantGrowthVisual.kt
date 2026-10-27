package com.example.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.calendar.PersianCalendarHelper
import com.example.model.PlantGrowthStage

@Composable
fun PlantGrowthCard(
    progressPercent: Int,
    completedCount: Int,
    totalCount: Int,
    modifier: Modifier = Modifier
) {
    val stage = PlantGrowthStage.fromProgress(progressPercent)

    // Breathing / swaying animation for the leaves
    val infiniteTransition = rememberInfiniteTransition(label = "plantAnimation")
    val leafSway by infiniteTransition.animateFloat(
        initialValue = -5f,
        targetValue = 5f,
        animationSpec = infiniteRepeatable(
            animation = tween(2400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "leafSway"
    )

    val animatedProgress by animateFloatAsState(
        targetValue = progressPercent / 100f,
        animationSpec = tween(1000, easing = FastOutSlowInEasing),
        label = "progressAnim"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(24.dp))
            .clip(RoundedCornerShape(24.dp))
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFE8F5E9), // Light mint green
                        Color(0xFFF1F8E9), // Gentle herbal green
                        Color(0xFFFAFBF7)  // Soft warm white
                    )
                )
            )
            .padding(20.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "باغچه امروز من",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                    Text(
                        text = stage.subtitle,
                        fontSize = 13.sp,
                        color = Color(0xFF388E3C),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF2E7D32).copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "${PersianCalendarHelper.toPersianDigits(progressPercent)}٪ رشد",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Visual Plant Illustration inside progress ring
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(170.dp)
            ) {
                // Background & Progress Circle
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val strokeWidth = 10.dp.toPx()
                    val radius = (size.minDimension - strokeWidth) / 2
                    val center = Offset(size.width / 2, size.height / 2)

                    // Track
                    drawCircle(
                        color = Color(0xFFC8E6C9).copy(alpha = 0.5f),
                        radius = radius,
                        center = center,
                        style = Stroke(width = strokeWidth)
                    )

                    // Progress Arc
                    drawArc(
                        brush = Brush.sweepGradient(
                            listOf(
                                Color(0xFF81C784),
                                Color(0xFF4CAF50),
                                Color(0xFF2E7D32),
                                Color(0xFF81C784)
                            )
                        ),
                        startAngle = -90f,
                        sweepAngle = animatedProgress * 360f,
                        useCenter = false,
                        topLeft = Offset(center.x - radius, center.y - radius),
                        size = Size(radius * 2, radius * 2),
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                    )
                }

                // Inner Pot and Growing Plant
                Canvas(
                    modifier = Modifier
                        .size(130.dp)
                        .clip(CircleShape)
                ) {
                    val w = size.width
                    val h = size.height
                    val cx = w / 2

                    // Pot
                    val potTop = h * 0.72f
                    val potBottom = h * 0.94f
                    val potPath = Path().apply {
                        moveTo(cx - 32.dp.toPx(), potTop)
                        lineTo(cx + 32.dp.toPx(), potTop)
                        lineTo(cx + 24.dp.toPx(), potBottom)
                        lineTo(cx - 24.dp.toPx(), potBottom)
                        close()
                    }
                    drawPath(potPath, color = Color(0xFF8D6E63)) // Terracotta

                    // Pot rim
                    drawRoundRect(
                        color = Color(0xFF795548),
                        topLeft = Offset(cx - 36.dp.toPx(), potTop - 4.dp.toPx()),
                        size = Size(72.dp.toPx(), 8.dp.toPx()),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4.dp.toPx())
                    )

                    // Plant Stem & Leaves based on stage
                    val stemHeight = when (stage) {
                        PlantGrowthStage.SEED -> 10.dp.toPx()
                        PlantGrowthStage.SPROUT -> 26.dp.toPx()
                        PlantGrowthStage.SAPLING -> 44.dp.toPx()
                        PlantGrowthStage.BUDDING -> 58.dp.toPx()
                        PlantGrowthStage.FULL_BLOOM -> 72.dp.toPx()
                    }

                    // Main Stem
                    val stemStart = Offset(cx, potTop)
                    val stemEnd = Offset(cx + (leafSway * 0.5f).dp.toPx(), potTop - stemHeight)

                    drawLine(
                        color = Color(0xFF2E7D32),
                        start = stemStart,
                        end = stemEnd,
                        strokeWidth = 5.dp.toPx(),
                        cap = StrokeCap.Round
                    )

                    // Leaves
                    if (stage.level >= 1) {
                        // Left leaf
                        val leafLeft = Path().apply {
                            moveTo(stemEnd.x, stemEnd.y + 12.dp.toPx())
                            cubicTo(
                                stemEnd.x - 22.dp.toPx() + leafSway.dp.toPx(),
                                stemEnd.y + 2.dp.toPx(),
                                stemEnd.x - 28.dp.toPx(),
                                stemEnd.y - 10.dp.toPx(),
                                stemEnd.x - 5.dp.toPx(),
                                stemEnd.y - 4.dp.toPx()
                            )
                            close()
                        }
                        drawPath(leafLeft, color = Color(0xFF4CAF50))

                        // Right leaf
                        val leafRight = Path().apply {
                            moveTo(stemEnd.x, stemEnd.y + 16.dp.toPx())
                            cubicTo(
                                stemEnd.x + 22.dp.toPx() - leafSway.dp.toPx(),
                                stemEnd.y + 4.dp.toPx(),
                                stemEnd.x + 28.dp.toPx(),
                                stemEnd.y - 8.dp.toPx(),
                                stemEnd.x + 5.dp.toPx(),
                                stemEnd.y - 2.dp.toPx()
                            )
                            close()
                        }
                        drawPath(leafRight, color = Color(0xFF66BB6A))
                    }

                    if (stage.level >= 2) {
                        // Upper Leaves
                        drawOval(
                            color = Color(0xFF388E3C),
                            topLeft = Offset(stemEnd.x - 18.dp.toPx(), stemEnd.y - 20.dp.toPx()),
                            size = Size(18.dp.toPx(), 12.dp.toPx())
                        )
                        drawOval(
                            color = Color(0xFF43A047),
                            topLeft = Offset(stemEnd.x + 2.dp.toPx(), stemEnd.y - 22.dp.toPx()),
                            size = Size(18.dp.toPx(), 12.dp.toPx())
                        )
                    }

                    if (stage.level >= 3) {
                        // Buds / Flowers
                        val flowerColor = if (stage.level == 4) Color(0xFFE91E63) else Color(0xFFFF80AB)
                        drawCircle(
                            color = flowerColor,
                            radius = if (stage.level == 4) 11.dp.toPx() else 7.dp.toPx(),
                            center = Offset(stemEnd.x, stemEnd.y - 18.dp.toPx())
                        )
                        // Flower Center
                        drawCircle(
                            color = Color(0xFFFFEB3B),
                            radius = if (stage.level == 4) 4.5.dp.toPx() else 3.dp.toPx(),
                            center = Offset(stemEnd.x, stemEnd.y - 18.dp.toPx())
                        )
                    }

                    if (stage.level == 4) {
                        // Little sparkling stars/petals
                        drawCircle(
                            color = Color(0xFFFFD54F),
                            radius = 3.dp.toPx(),
                            center = Offset(stemEnd.x - 26.dp.toPx(), stemEnd.y - 28.dp.toPx())
                        )
                        drawCircle(
                            color = Color(0xFFFF80AB),
                            radius = 3.dp.toPx(),
                            center = Offset(stemEnd.x + 24.dp.toPx(), stemEnd.y - 24.dp.toPx())
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Bottom summary pill
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color.White.copy(alpha = 0.85f))
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                Text(
                    text = stage.emoji,
                    fontSize = 18.sp
                )
                Text(
                    text = "${PersianCalendarHelper.toPersianDigits(completedCount)} از ${PersianCalendarHelper.toPersianDigits(totalCount)} مورد امروز کامل شد",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF2E7D32)
                )
            }
        }
    }
}
