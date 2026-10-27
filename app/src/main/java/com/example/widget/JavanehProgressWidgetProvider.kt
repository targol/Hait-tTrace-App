package com.example.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.example.MainActivity
import com.example.R
import com.example.calendar.PersianCalendarHelper
import com.example.data.AppRepository
import com.example.model.AppTask
import com.example.model.TaskRepeatType

/**
 * AppWidgetProvider for Javaneh Home Screen Widget.
 * Shows daily progress percentage and current urgent/important tasks.
 */
class JavanehProgressWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH_WIDGET) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, JavanehProgressWidgetProvider::class.java)
            val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            for (id in allWidgetIds) {
                updateAppWidget(context, appWidgetManager, id)
            }
        }
    }

    companion object {
        const val ACTION_REFRESH_WIDGET = "com.example.widget.ACTION_REFRESH_WIDGET"

        /**
         * Helper function to trigger widget update from anywhere in the app (e.g. after task/habit updates)
         */
        fun requestWidgetUpdate(context: Context) {
            val intent = Intent(context, JavanehProgressWidgetProvider::class.java).apply {
                action = ACTION_REFRESH_WIDGET
            }
            context.sendBroadcast(intent)
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_daily_progress)
            val repository = AppRepository(context)

            // Current Jalali date
            val today = PersianCalendarHelper.getToday()
            val todayStr = today.toFormattedString()
            val todayDayOfWeek = PersianCalendarHelper.getDayOfWeek(today)
            views.setTextViewText(R.id.widget_date_text, "${today.dayName}، ${today.day} ${today.monthName}")

            // Calculate progress (completed, total, percentage)
            val (completed, total, percent) = repository.getTodayProgress()
            val persianPercent = toPersianNumber("$percent٪")
            val persianSummary = toPersianNumber("$completed از $total مورد")

            views.setTextViewText(R.id.widget_progress_percent, persianPercent)
            views.setTextViewText(R.id.widget_progress_summary, persianSummary)
            views.setProgressBar(R.id.widget_progress_bar, 100, percent, false)

            val flowerStatus = when {
                percent == 100 && total > 0 -> "🌺 باغچه کامل شکوفا شد"
                percent >= 70 -> "🌻 شکوفا و شاداب"
                percent >= 40 -> "🌿 جوانه در حال رشد"
                percent > 0 -> "🌱 جوانه زد"
                else -> "🪴 منتظر آبیاری امروز"
            }
            views.setTextViewText(R.id.widget_flower_status, flowerStatus)

            // Find current uncompleted urgent/important tasks for today
            val allTasks = repository.tasks.value
            val todayUrgentTasks = allTasks.filter { task ->
                !task.isCompleted &&
                !task.isArchived &&
                (task.isImportant || task.deadlineTime != null) &&
                (task.dueDate.isEmpty() || task.dueDate == todayStr ||
                    (task.repeatType == TaskRepeatType.WEEKLY && task.repeatDaysOfWeek.contains(todayDayOfWeek)))
            }.sortedWith(
                compareByDescending<AppTask> { it.isImportant }
                    .thenBy { it.deadlineTime ?: it.time ?: "99:99" }
            )

            views.setTextViewText(R.id.widget_urgent_count, toPersianNumber(todayUrgentTasks.size.toString()))

            if (todayUrgentTasks.isEmpty()) {
                views.setViewVisibility(R.id.widget_empty_urgent, View.VISIBLE)
                views.setViewVisibility(R.id.widget_urgent_task_1, View.GONE)
                views.setViewVisibility(R.id.widget_urgent_task_2, View.GONE)
            } else {
                views.setViewVisibility(R.id.widget_empty_urgent, View.GONE)

                // Task 1
                val task1 = todayUrgentTasks.getOrNull(0)
                if (task1 != null) {
                    views.setViewVisibility(R.id.widget_urgent_task_1, View.VISIBLE)
                    val starPrefix = if (task1.isImportant) "★ " else ""
                    views.setTextViewText(R.id.widget_task1_title, "$starPrefix${task1.title}")
                    val timeText = task1.deadlineTime?.let { "تا $it" } ?: task1.time ?: "امروز"
                    views.setTextViewText(R.id.widget_task1_time, toPersianNumber(timeText))
                } else {
                    views.setViewVisibility(R.id.widget_urgent_task_1, View.GONE)
                }

                // Task 2
                val task2 = todayUrgentTasks.getOrNull(1)
                if (task2 != null) {
                    views.setViewVisibility(R.id.widget_urgent_task_2, View.VISIBLE)
                    val starPrefix = if (task2.isImportant) "★ " else ""
                    views.setTextViewText(R.id.widget_task2_title, "$starPrefix${task2.title}")
                    val timeText = task2.deadlineTime?.let { "تا $it" } ?: task2.time ?: "امروز"
                    views.setTextViewText(R.id.widget_task2_time, toPersianNumber(timeText))
                } else {
                    views.setViewVisibility(R.id.widget_urgent_task_2, View.GONE)
                }
            }

            // Click on widget root opens MainActivity
            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, openAppPendingIntent)

            // Click on refresh button refreshes widget
            val refreshIntent = Intent(context, JavanehProgressWidgetProvider::class.java).apply {
                action = ACTION_REFRESH_WIDGET
            }
            val refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, refreshPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun toPersianNumber(text: String): String {
            val persianDigits = charArrayOf('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹')
            val sb = java.lang.StringBuilder()
            for (ch in text) {
                if (ch in '0'..'9') {
                    sb.append(persianDigits[ch - '0'])
                } else {
                    sb.append(ch)
                }
            }
            return sb.toString()
        }
    }
}
