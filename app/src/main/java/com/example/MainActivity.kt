package com.example
 
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.AppRepository
import com.example.ui.screens.*
import com.example.ui.theme.MyApplicationTheme

enum class MainNavigationTab(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    TODAY("امروز", Icons.Filled.Spa, Icons.Outlined.Spa),
    TASKS("تسک‌ها", Icons.Filled.CheckCircle, Icons.Outlined.CheckCircle),
    HABITS("عادت‌ها", Icons.Filled.Loop, Icons.Outlined.Loop),
    GOALS("اهداف", Icons.Filled.TrackChanges, Icons.Outlined.TrackChanges),
    REPORTS("گزارش‌ها", Icons.Filled.BarChart, Icons.Outlined.BarChart),
    SETTINGS("تنظیمات", Icons.Filled.Settings, Icons.Outlined.Settings)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    val context = LocalContext.current
                    val repository = remember { AppRepository(context) }
                    var currentTab by remember { mutableStateOf(MainNavigationTab.TODAY) }

                    Scaffold(
                        bottomBar = {
                            NavigationBar(
                                containerColor = Color.White,
                                tonalElevation = 8.dp
                            ) {
                                MainNavigationTab.values().forEach { tab ->
                                    val isSelected = tab == currentTab
                                    NavigationBarItem(
                                        selected = isSelected,
                                        onClick = { currentTab = tab },
                                        icon = {
                                            Icon(
                                                imageVector = if (isSelected) tab.selectedIcon else tab.unselectedIcon,
                                                contentDescription = tab.title
                                            )
                                        },
                                        label = {
                                            Text(
                                                text = tab.title,
                                                fontSize = 11.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                            )
                                        },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Color(0xFF1B5E20),
                                            selectedTextColor = Color(0xFF1B5E20),
                                            indicatorColor = Color(0xFFE8F5E9),
                                            unselectedIconColor = Color(0xFF757575),
                                            unselectedTextColor = Color(0xFF757575)
                                        )
                                    )
                                }
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    ) { innerPadding ->
                        val screenModifier = Modifier.padding(innerPadding)
                        when (currentTab) {
                            MainNavigationTab.TODAY -> TodayScreen(
                                repository = repository,
                                onNavigateToTasks = { currentTab = MainNavigationTab.TASKS },
                                onNavigateToHabits = { currentTab = MainNavigationTab.HABITS },
                                modifier = screenModifier
                            )
                            MainNavigationTab.TASKS -> TasksScreen(
                                repository = repository,
                                modifier = screenModifier
                            )
                            MainNavigationTab.HABITS -> HabitsScreen(
                                repository = repository,
                                modifier = screenModifier
                            )
                            MainNavigationTab.GOALS -> GoalsScreen(
                                repository = repository,
                                modifier = screenModifier
                            )
                            MainNavigationTab.REPORTS -> ReportsScreen(
                                repository = repository,
                                modifier = screenModifier
                            )
                            MainNavigationTab.SETTINGS -> SettingsScreen(
                                repository = repository,
                                modifier = screenModifier
                            )
                        }
                    }
                }
            }
        }
    }
}

