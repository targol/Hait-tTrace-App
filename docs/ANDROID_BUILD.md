# ساخت APK جوانه

APK اکنون با **Capacitor** ساخته می‌شود (وب‌اپ داخل WebView رسمی اندروید) و با GitHub Actions به‌صورت خودکار بیلد می‌شود.

## گرفتن APK
- هر push به شاخه‌ها: تب **Actions** ← آخرین اجرا ← بخش Artifacts ← `Javaneh-APK`.
- انتشار رسمی: یک تگ مثل `v2.4.0` بسازید؛ APK در **Releases** قرار می‌گیرد.
- نسخه از `web/src/version.ts` خوانده می‌شود (`currentVersion` و `currentVersionCode`). برای هر آپدیت `currentVersionCode` را زیاد کنید.

## امضای ثابت (مهم برای آپدیت روی گوشی)
بدون کلید، فقط نسخهٔ debug ساخته می‌شود و امضایش با نسخهٔ release فرق دارد. برای امضای ثابت یک **کلید جدید** بسازید (کلید قبلی در تاریخچهٔ گیت لو رفته؛ از آن استفاده نکنید):

```bash
keytool -genkeypair -v -keystore release.keystore -alias javaneh \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.keystore   # خروجی را کپی کنید
```
در GitHub ← Settings ← Secrets and variables ← Actions این چهار Secret را بسازید:
`KEYSTORE_BASE64`، `STORE_PASSWORD`، `KEY_ALIAS` (مثلاً javaneh)، `KEY_PASSWORD`.
فایل `release.keystore` را جایی امن نگه دارید و در گیت نگذارید؛ اگر گم شود امکان آپدیت روی نصب‌های قبلی نیست.

## انتقال از APK قدیمی
ذخیره‌سازی نسخهٔ جدید از نسخهٔ قدیمی جداست (آدرس داخلی عوض شده)، پس:
1. در اپ قدیمی: تنظیمات ← پشتیبان‌گیری کامل ← خروجی بگیرید.
2. اپ قدیمی را حذف و APK جدید را نصب کنید.
3. در اپ جدید: همان فایل را وارد (Import) کنید.

حداقل اندروید ۷ (API 24) لازم است.

## ساخت محلی
نیاز: Node 22، JDK 21، Android SDK.
```bash
npm install && npm run cap:sync
cd android && ./gradlew assembleDebug
```
