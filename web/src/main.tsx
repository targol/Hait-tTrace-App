import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initThemeOnStartup } from './services/themeService';
import './index.css';

// 🌐 Register Service Worker only on top-level HTTP(S) web origins (skip in Android file:// APK WebView and preview iframes)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const isIframe = window.self !== window.top;
    const isHttpOrigin = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!isIframe && isHttpOrigin) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  } catch {}
}

// 🌓 Immediately apply theme (system, schedule, or manual) to avoid flash
try {
  initThemeOnStartup();
} catch {}

// 🛡️ Global Exception Catcher for Android WebView and Mobile Browsers
// Prevents unhandled storage/network promise rejections from crashing the app process
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Javaneh SafeInit] Handled uncaught rejection gracefully:', event.reason);
    // Prevent default browser crash or error toast
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.warn('[Javaneh SafeInit] Handled global window error gracefully:', event.message);
  });
}

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (criticalBootError) {
    console.error('[Javaneh SafeInit] Root render failed, activating emergency offline UI:', criticalBootError);
    // Emergency static safe fallback if React initialization throws immediately
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #F8F9F5; font-family: system-ui, -apple-system, sans-serif; direction: rtl; padding: 1.5rem;">
        <div style="background: white; border-radius: 1.25rem; padding: 2rem; max-width: 420px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <div style="width: 52px; height: 52px; border-radius: 1rem; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; font-size: 1.75rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">🌱</div>
          <h2 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem;">راه‌اندازی در حالت امن آفلاین جوانه</h2>
          <p style="font-size: 0.85rem; color: #64748b; line-height: 1.6; margin: 0 0 1.5rem;">
            سیستم حفاظتی برای جلوگیری از توقف برنامه فعال شد. جهت بالا آمدن با داده‌های امن آفلاین، دکمه زیر را انتخاب کنید.
          </p>
          <button id="javaneh-safe-reboot-btn" style="width: 100%; padding: 0.85rem 1rem; background-color: #059669; color: white; border: none; border-radius: 0.75rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: background 0.2s;">
            ورود به برنامه با داده‌های آفلاین امن
          </button>
        </div>
      </div>
    `;

    const rebootBtn = document.getElementById('javaneh-safe-reboot-btn');
    if (rebootBtn) {
      rebootBtn.addEventListener('click', () => {
        try {
          sessionStorage.setItem('javaneh_force_safe_offline_mode', 'true');
        } catch {}
        window.location.reload();
      });
    }
  }
}
