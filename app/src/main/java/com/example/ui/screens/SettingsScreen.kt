package com.example.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.calendar.PersianCalendarHelper
import com.example.data.AppRepository
import com.example.model.TaskCategory
import java.util.UUID

@Composable
fun SettingsScreen(
    repository: AppRepository,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val categories by repository.categories.collectAsState()
    val tasks by repository.tasks.collectAsState()
    val habits by repository.habits.collectAsState()
    val goals by repository.goals.collectAsState()

    var userName by remember { mutableStateOf(repository.getUserName()) }
    var userBio by remember { mutableStateOf(repository.getUserBio()) }
    var isProfileSaved by remember { mutableStateOf(false) }

    var showAddCategoryDialog by remember { mutableStateOf(false) }
    var showResetDialog by remember { mutableStateOf(false) }
    var showBackupDialog by remember { mutableStateOf(false) }
    var showImportDialog by remember { mutableStateOf(false) }
    var importJsonInput by remember { mutableStateOf("") }
    var importReplaceMode by remember { mutableStateOf(false) }
    var importStatusMessage by remember { mutableStateOf<String?>(null) }
    var showApkIntegrityDialog by remember { mutableStateOf(false) }
    var showWidgetGuideDialog by remember { mutableStateOf(false) }
    var backupJsonText by remember { mutableStateOf("") }

    Box(modifier = modifier.fillMaxSize().background(Color(0xFFF9FBF9))) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 90.dp)
        ) {
            // Header & App Branding Card
            item {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1B5E20)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF2E7D32)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Spa,
                                contentDescription = "جوانه",
                                tint = Color(0xFFFFE082),
                                modifier = Modifier.size(36.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = "جوانه • مدیریت رشد و هدف",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF2E7D32).copy(alpha = 0.8f)
                        ) {
                            Text(
                                text = "نسخه ۱.۰.۱ • کد ساخت ۱۰۱ (Google Play Ready)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFFC8E6C9),
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            // User Profile Section
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "پروفایل",
                                tint = Color(0xFF2E7D32)
                            )
                            Text(
                                text = "پروفایل و هویت کاربری",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                        }

                        OutlinedTextField(
                            value = userName,
                            onValueChange = {
                                userName = it
                                isProfileSaved = false
                            },
                            label = { Text("نام یا عنوان نمایشی") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = userBio,
                            onValueChange = {
                                userBio = it
                                isProfileSaved = false
                            },
                            label = { Text("شعار یا انگیزه روزانه") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )

                        Button(
                            onClick = {
                                repository.setUserName(userName)
                                repository.setUserBio(userBio)
                                isProfileSaved = true
                                Toast.makeText(context, "اطلاعات با موفقیت ذخیره شد", Toast.LENGTH_SHORT).show()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.align(Alignment.End)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (isProfileSaved) "ذخیره شد ✓" else "ذخیره تغییرات")
                        }
                    }
                }
            }

            // Task & Habit Rules Notice Card
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.CheckCircleOutline, contentDescription = null, tint = Color(0xFF2E7D32))
                            Text(
                                text = "قوانین هوشمند تسک و عادت",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                        }

                        Text(
                            text = "• زمان انجام و زمان نهایی اتمام تسک: برای هر تسک می‌توانید ساعت شروع و موعد نهایی را ثبت کنید. در صورت خالی ماندن، پیش‌فرض پایان سال در نظر گرفته شده و تسک در همه روزها نمایش داده می‌شود.",
                            fontSize = 12.sp,
                            color = Color(0xFF2E7D32),
                            lineHeight = 18.sp
                        )

                        Text(
                            text = "• تفکیک تسک‌ها: دارای فیلترهای تفکیک‌شده شامل امروز، آتی، معوقه، تکرارشونده، تکمیل‌شده و بایگانی.",
                            fontSize = 12.sp,
                            color = Color(0xFF2E7D32),
                            lineHeight = 18.sp
                        )

                        Text(
                            text = "• عادات هفتگی و معافیت تقویمی: عادات دارای تناوب روزانه و هفتگی (تعداد روز هدف در هفته) با معافیت هوشمند تعطیلات تقویم رسمی ایران هستند.",
                            fontSize = 12.sp,
                            color = Color(0xFF2E7D32),
                            lineHeight = 18.sp
                        )
                    }
                }
            }

            // Categories Management
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.Category, contentDescription = null, tint = Color(0xFF2E7D32))
                                Text(
                                    text = "دسته‌بندی‌های رشد",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1B5E20)
                                )
                            }

                            IconButton(onClick = { showAddCategoryDialog = true }) {
                                Icon(Icons.Default.AddCircle, contentDescription = "افزودن دسته", tint = Color(0xFF2E7D32))
                            }
                        }

                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(categories) { cat ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(cat.colorHex).copy(alpha = 0.12f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(cat.colorHex).copy(alpha = 0.3f)),
                                    modifier = Modifier.padding(vertical = 4.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(10.dp)
                                                .clip(CircleShape)
                                                .background(Color(cat.colorHex))
                                        )
                                        Text(
                                            text = cat.title,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = Color(cat.colorHex)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Google Play & Version Specification Card
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Shop, contentDescription = null, tint = Color(0xFF2E7D32))
                            Text(
                                text = "اطلاعات انتشار و بارگذاری در Google Play",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                        }

                        Divider(color = Color(0xFFEEEEEE))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("شناسه بسته (Application ID):", fontSize = 12.sp, color = Color(0xFF757575))
                            Text("com.javaneh.app", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("نسخه نمایشی (Version Name):", fontSize = 12.sp, color = Color(0xFF757575))
                            Text("1.0.1", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1B5E20))
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("کد ساخت (Version Code):", fontSize = 12.sp, color = Color(0xFF757575))
                            Text("101", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1B5E20))
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("حداقل نسخه اندروید (Min SDK):", fontSize = 12.sp, color = Color(0xFF757575))
                            Text("Android 7.0 (API 24)", fontSize = 12.sp, color = Color(0xFF424242))
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("نسخه هدف اندروید (Target SDK):", fontSize = 12.sp, color = Color(0xFF757575))
                            Text("Android 15 (API 36)", fontSize = 12.sp, color = Color(0xFF424242))
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("آیکون اپلیکیشن (Adaptive & Mipmaps):", fontSize = 12.sp, color = Color(0xFF757575))
                            Text("لوگوی رسمی جوانه سبز ✓", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                        }
                    }
                }
            }

            // APK Hash Verification & Resumable Download
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = Color(0xFF2E7D32))
                            Text(
                                text = "بررسی اصالت و هش فایل APK (دانلود مجدد و Resume)",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                        }

                        Text(
                            text = "اگر دانلود قبلی شما توسط مرورگر ناقص قطع شده یا با خطای «There was a problem parsing the package» روبرو شدید، هش و حجم ۲۲.۵۸ مگابایتی فایل را بررسی کنید.",
                            fontSize = 12.sp,
                            color = Color(0xFF616161),
                            lineHeight = 18.sp
                        )

                        Button(
                            onClick = { showApkIntegrityDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Security, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("بررسی هش SHA-256 و دریافت لینک Resume")
                        }
                    }
                }
            }

            // Home Screen Widget Configuration & Preview Card
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Widgets, contentDescription = null, tint = Color(0xFF2E7D32))
                            Text(
                                text = "ویجت صفحه اصلی (Home Screen Widget)",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                        }

                        Text(
                            text = "با افزودن ویجت جوانه به صفحه اصلی اندروید، درصد پیشرفت روزانه و تسک‌های اولویت‌دار و فوری خود را بدون نیاز به باز کردن کامل برنامه زیر نظر داشته باشید.",
                            fontSize = 12.sp,
                            color = Color(0xFF616161),
                            lineHeight = 18.sp
                        )

                        OutlinedButton(
                            onClick = { showWidgetGuideDialog = true },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.TouchApp, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("پیش‌نمایش زنده ویجت و راهنمای افزودن به صفحه")
                        }
                    }
                }
            }

            // Data Management, Backup & Reset
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Storage, contentDescription = null, tint = Color(0xFF2E7D32))
                            Text(
                                text = "مدیریت داده‌ها و نسخه پشتیبان",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    backupJsonText = repository.exportAllDataAsJson()
                                    showBackupDialog = true
                                },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("پشتیبان‌گیری")
                            }

                            Button(
                                onClick = {
                                    importJsonInput = ""
                                    importStatusMessage = null
                                    showImportDialog = true
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1.1f)
                            ) {
                                Icon(Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("انتقال به گوشی")
                            }

                            OutlinedButton(
                                onClick = { showResetDialog = true },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF5350)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            }
                        }

                        Text(
                            text = "آمار: ${PersianCalendarHelper.toPersianDigits(tasks.size)} تسک • ${PersianCalendarHelper.toPersianDigits(habits.size)} عادت • ${PersianCalendarHelper.toPersianDigits(goals.size)} هدف",
                            fontSize = 11.sp,
                            color = Color(0xFF757575)
                        )
                    }
                }
            }
        }
    }

    // Add Category Dialog
    if (showAddCategoryDialog) {
        var catTitle by remember { mutableStateOf("") }
        val colorOptions = listOf(
            0xFF2E7D32, 0xFF3B82F6, 0xFFF59E0B, 0xFFEC4899,
            0xFF8B5CF6, 0xFF10B981, 0xFFEF4444, 0xFF06B6D4
        )
        var selectedColor by remember { mutableStateOf(colorOptions[0]) }

        Dialog(onDismissRequest = { showAddCategoryDialog = false }) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth().padding(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "افزودن دسته‌بندی جدید 🌱",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )

                    OutlinedTextField(
                        value = catTitle,
                        onValueChange = { catTitle = it },
                        label = { Text("نام دسته") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    Text("رنگ نمادین دسته:", fontSize = 13.sp, fontWeight = FontWeight.Medium)

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(colorOptions) { color ->
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(Color(color))
                                    .clickable { selectedColor = color }
                                    .border(
                                        width = if (selectedColor == color) 3.dp else 0.dp,
                                        color = if (selectedColor == color) Color.Black else Color.Transparent,
                                        shape = CircleShape
                                    )
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { showAddCategoryDialog = false }) {
                            Text("انصراف")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                if (catTitle.isNotBlank()) {
                                    val newCat = TaskCategory(
                                        id = "cat_${UUID.randomUUID().toString().take(8)}",
                                        title = catTitle.trim(),
                                        colorHex = selectedColor,
                                        iconName = "Spa"
                                    )
                                    repository.addCategory(newCat)
                                    showAddCategoryDialog = false
                                    Toast.makeText(context, "دسته‌بندی افزوده شد", Toast.LENGTH_SHORT).show()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("افزودن")
                        }
                    }
                }
            }
        }
    }

    // Reset Data Confirmation Dialog
    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("بازنشانی داده‌ها به حالت اولیه") },
            text = { Text("آیا مطمئن هستید؟ با این کار تمامی تسک‌ها، عادات و اهداف ثبت‌شده پاک شده و اطلاعات پیش‌فرض اولیه جایگزین می‌شوند.") },
            confirmButton = {
                Button(
                    onClick = {
                        repository.resetToDefaultData()
                        userName = repository.getUserName()
                        userBio = repository.getUserBio()
                        showResetDialog = false
                        Toast.makeText(context, "اطلاعات پیش‌فرض بارگذاری شد", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF5350))
                ) {
                    Text("بله، بازنشانی شود")
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("انصراف")
                }
            }
        )
    }

    // Backup JSON Dialog
    if (showBackupDialog) {
        Dialog(onDismissRequest = { showBackupDialog = false }) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth().padding(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "نسخه پشتیبان داده‌ها (JSON) 📦",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )

                    OutlinedTextField(
                        value = backupJsonText,
                        onValueChange = {},
                        readOnly = true,
                        modifier = Modifier.fillMaxWidth().height(200.dp),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { showBackupDialog = false }) {
                            Text("بستن")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                val clip = ClipData.newPlainText("Javaneh Backup", backupJsonText)
                                clipboard.setPrimaryClip(clip)
                                Toast.makeText(context, "پشتیبان در کلیپ‌بورد کپی شد ✓", Toast.LENGTH_SHORT).show()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("کپی در کلیپ‌بورد")
                        }
                    }
                }
            }
        }
    }

    // Import / Transfer Data Dialog
    if (showImportDialog) {
        Dialog(onDismissRequest = { showImportDialog = false }) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth().padding(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "انتقال و بارگذاری اطلاعات در گوشی 📲",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1B5E20)
                    )

                    Text(
                        text = "کد نسخه پشتیبان (JSON) را در کادر زیر پیست کرده یا از کلیپ‌بورد بخوانید:",
                        fontSize = 12.sp,
                        color = Color(0xFF616161)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        OutlinedButton(
                            onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                val clip = clipboard.primaryClip
                                if (clip != null && clip.itemCount > 0) {
                                    val text = clip.getItemAt(0).text?.toString() ?: ""
                                    if (text.isNotBlank()) {
                                        importJsonInput = text
                                        Toast.makeText(context, "کد از کلیپ‌بورد پیست شد ✓", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, "کلیپ‌بورد خالی است", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.ContentPaste, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("پیست خودکار از حافظه", fontSize = 11.sp)
                        }
                    }

                    OutlinedTextField(
                        value = importJsonInput,
                        onValueChange = { importJsonInput = it },
                        placeholder = { Text("کد پشتیبان JSON را اینجا پیست کنید...", fontSize = 11.sp) },
                        modifier = Modifier.fillMaxWidth().height(160.dp),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.clickable { importReplaceMode = !importReplaceMode }
                    ) {
                        Checkbox(
                            checked = importReplaceMode,
                            onCheckedChange = { importReplaceMode = it }
                        )
                        Text(
                            text = if (importReplaceMode) "جایگزینی کامل (حذف قبلی‌ها)" else "ترکیب و ادغام با داده‌های فعلی (پیشنهادی)",
                            fontSize = 12.sp,
                            fontWeight = if (importReplaceMode) FontWeight.Bold else FontWeight.Normal,
                            color = if (importReplaceMode) Color(0xFFD32F2F) else Color(0xFF2E7D32)
                        )
                    }

                    if (importStatusMessage != null) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFF1F8E9),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = importStatusMessage ?: "",
                                fontSize = 11.sp,
                                color = Color(0xFF1B5E20),
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { showImportDialog = false }) {
                            Text("بستن")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                if (importJsonInput.isBlank()) {
                                    Toast.makeText(context, "لطفاً ابتدا کد JSON را وارد کنید", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                val result = repository.importAllDataFromJson(importJsonInput, importReplaceMode)
                                importStatusMessage = result.second
                                if (result.first) {
                                    Toast.makeText(context, "اطلاعات با موفقیت اعمال شد ✓", Toast.LENGTH_LONG).show()
                                } else {
                                    Toast.makeText(context, result.second, Toast.LENGTH_LONG).show()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("اعتبارسنجی و اعمال")
                        }
                    }
                }
            }
        }
    }
        if (showApkIntegrityDialog) {
            Dialog(onDismissRequest = { showApkIntegrityDialog = false }) {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                    modifier = Modifier.fillMaxWidth().padding(4.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "اصالت‌سنجی فایل APK و لینک Resume",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1B5E20)
                            )
                            IconButton(onClick = { showApkIntegrityDialog = false }) {
                                Icon(Icons.Default.Close, contentDescription = "بستن")
                            }
                        }

                        Divider(color = Color(0xFFEEEEEE))

                        // Server reference info
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFF1F8E9)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "📌 مشخصات رسمی نسخه نهایی در سرور:",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF2E7D32)
                                )
                                Text(
                                    text = "• حجم کامل فایل: ۲۲.۵۸ مگابایت (۲۲,۵۸۷,۶۶۰ بایت)",
                                    fontSize = 11.sp,
                                    color = Color(0xFF33691E)
                                )
                                Text(
                                    text = "• کد هش رسمی SHA-256:",
                                    fontSize = 11.sp,
                                    color = Color(0xFF33691E)
                                )
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color.White
                                ) {
                                    Text(
                                        text = "4aec4194adeeaa023f0f7453371a9ccc21d3d92d0b4afc8d9bbfb4cf824be280",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFF424242),
                                        modifier = Modifier.padding(6.dp)
                                    )
                                }
                            }
                        }

                        // Warning about incomplete download
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFFFF3E0)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFE65100), modifier = Modifier.size(20.dp))
                                Text(
                                    text = "اگر حجم فایل دانلودی شما کمتر از ۲۲.۵۸ مگابایت (مثلاً ۱۰.۱ مگابایت) باشد، دانلود ناقص مانده و اندروید خطای تجزیه پکیج می‌دهد. با لینک زیر فایل را با قابلیت Resume دریافت کنید.",
                                    fontSize = 11.sp,
                                    color = Color(0xFFE65100),
                                    lineHeight = 16.sp
                                )
                            }
                        }

                        // Action buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("APK SHA-256", "4aec4194adeeaa023f0f7453371a9ccc21d3d92d0b4afc8d9bbfb4cf824be280")
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "کد هش در کلیپ‌بورد کپی شد ✓", Toast.LENGTH_SHORT).show()
                                },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("کپی کد هش", fontSize = 11.sp)
                            }

                            Button(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("APK Download URL", "/javaneh.apk")
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "لینک دانلود Resume در کلیپ‌بورد کپی شد ✓", Toast.LENGTH_SHORT).show()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("کپی لینک دانلود", fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }
}
