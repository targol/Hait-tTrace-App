/**
 * Image processing utilities for Javaneh app.
 * Enforces size and dimension limits on uploaded images
 * to keep LocalStorage, IndexedDB and backups lightweight (< 45KB per avatar).
 * Compatible with Android WebView content:// URIs where file.type may be empty or application/octet-stream.
 */

export interface ImageProcessingResult {
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

export const MAX_ALLOWED_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB raw limit for mobile camera photos
export const MAX_AVATAR_DIMENSION = 256; // Max 256x256 px
export const JPEG_COMPRESSION_QUALITY = 0.82; // High visual quality with tiny size

function compressLoadedImageElement(
  img: HTMLImageElement,
  originalSizeKb: number,
  maxDimension: number,
  quality: number
): ImageProcessingResult {
  let { width, height } = img;
  if (!width || !height) {
    width = maxDimension;
    height = maxDimension;
  } else if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.max(1, Math.round((height * maxDimension) / width));
      width = maxDimension;
    } else {
      width = Math.max(1, Math.round((width * maxDimension) / height));
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('عدم دسترسی به بستر پردازش گرافیکی مرورگر.');
  }

  // Fill white background in case of transparent PNG converted to JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const head = 'data:image/jpeg;base64,';
  const base64Len = Math.max(0, dataUrl.length - head.length);
  const compressedSizeBytes = Math.round((base64Len * 3) / 4);
  const compressedSizeKb = Math.max(1, Math.round(compressedSizeBytes / 1024));

  return {
    dataUrl,
    originalSizeKb,
    compressedSizeKb,
    width,
    height,
  };
}

/**
 * Validates and compresses an uploaded image file.
 * Works reliably in both Desktop/Mobile Web and Android WebView (content:// URIs).
 */
export async function processAndCompressImage(
  file: File,
  maxDimension = MAX_AVATAR_DIMENSION,
  quality = JPEG_COMPRESSION_QUALITY
): Promise<ImageProcessingResult> {
  // Check extension or MIME if available, but allow empty/octet-stream MIME from Android SAF picker
  const lowerName = (file.name || '').toLowerCase();
  const hasKnownNonImageMime =
    file.type &&
    !file.type.startsWith('image/') &&
    file.type !== 'application/octet-stream' &&
    !lowerName.match(/\.(jpg|jpeg|png|webp|gif|bmp|heic|heif|avif)$/);

  if (hasKnownNonImageMime) {
    throw new Error('فایل انتخاب‌شده یک تصویر معتبر (JPG, PNG, WebP) نیست.');
  }

  if (file.size > MAX_ALLOWED_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`حجم فایل (${sizeMb} مگابایت) بیش از سقف مجاز ۲۵ مگابایت است. لطفاً عکس سبک‌تری انتخاب کنید.`);
  }

  const originalSizeKb = Math.max(1, Math.round((file.size || 1024) / 1024));

  // Strategy 1: Read via FileReader DataURL
  return new Promise((resolve, reject) => {
    const tryObjectUrlFallback = () => {
      try {
        const objUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objUrl);
          try {
            resolve(compressLoadedImageElement(img, originalSizeKb, maxDimension, quality));
          } catch (err) {
            reject(err instanceof Error ? err : new Error('خطا در فشرده‌سازی تصویر.'));
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objUrl);
          reject(new Error('فایل انتخاب‌شده قابل نمایش به عنوان عکس نیست. لطفاً یک تصویر JPG یا PNG انتخاب کنید.'));
        };
        img.src = objUrl;
      } catch {
        reject(new Error('خطا در خواندن فایل تصویر از حافظه دستگاه.'));
      }
    };

    try {
      const reader = new FileReader();
      reader.onerror = () => {
        tryObjectUrlFallback();
      };
      reader.onload = (event) => {
        const resultStr = event.target?.result as string;
        if (!resultStr) {
          tryObjectUrlFallback();
          return;
        }
        const img = new Image();
        img.onerror = () => {
          tryObjectUrlFallback();
        };
        img.onload = () => {
          try {
            resolve(compressLoadedImageElement(img, originalSizeKb, maxDimension, quality));
          } catch (err) {
            reject(err instanceof Error ? err : new Error('خطا در فشرده‌سازی تصویر.'));
          }
        };
        // If Android SAF returned application/octet-stream in data URL header, normalize header to image/jpeg
        if (resultStr.startsWith('data:application/octet-stream;base64,')) {
          img.src = resultStr.replace('data:application/octet-stream;base64,', 'data:image/jpeg;base64,');
        } else if (resultStr.startsWith('data:;base64,')) {
          img.src = resultStr.replace('data:;base64,', 'data:image/jpeg;base64,');
        } else {
          img.src = resultStr;
        }
      };
      reader.readAsDataURL(file);
    } catch {
      tryObjectUrlFallback();
    }
  });
}
