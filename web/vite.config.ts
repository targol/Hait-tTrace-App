import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function apkApiMiddleware(): Plugin {
  return {
    name: 'apk-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';

        // Handle /api/data (robust file-based persistence outside /public and /dist)
        if (url === '/api/data') {
          const DB_DIR = path.resolve(__dirname, '..', 'data');
          const SNAPSHOTS_DIR = path.join(DB_DIR, 'snapshots');
          const mainDbFile = path.join(DB_DIR, 'javaneh_db.json');
          const backupDbFile = path.join(DB_DIR, 'javaneh_db_backup.json');

          if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
          if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

          res.setHeader('Content-Type', 'application/json; charset=utf-8');

          if (req.method === 'GET') {
            const candidateFiles = [mainDbFile, backupDbFile];
            for (const file of candidateFiles) {
              if (fs.existsSync(file)) {
                try {
                  const content = fs.readFileSync(file, 'utf-8');
                  const parsed = JSON.parse(content);
                  if (parsed && (parsed.goals?.length || parsed.tasks?.length || parsed.habits?.length || parsed.categories?.length)) {
                    res.statusCode = 200;
                    res.end(content);
                    return;
                  }
                } catch (e) {}
              }
            }
            // Check snapshots if primary files empty
            try {
              const snapshotFiles = fs.readdirSync(SNAPSHOTS_DIR)
                .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
                .sort().reverse();
              if (snapshotFiles.length > 0) {
                const latestSnap = path.join(SNAPSHOTS_DIR, snapshotFiles[0]);
                const snapContent = fs.readFileSync(latestSnap, 'utf-8');
                res.statusCode = 200;
                res.end(snapContent);
                return;
              }
            } catch (e) {}

            res.statusCode = 200;
            res.end(JSON.stringify({ initialized: false, tasks: [], goals: [], habits: [], categories: null }));
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                const hasValidContent = parsed && (
                  (Array.isArray(parsed.goals) && parsed.goals.length > 0) ||
                  (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) ||
                  (Array.isArray(parsed.habits) && parsed.habits.length > 0) ||
                  (Array.isArray(parsed.categories) && parsed.categories.length > 0) ||
                  (Array.isArray(parsed.calendarEvents) && parsed.calendarEvents.length > 0) ||
                  Boolean(parsed.userProfile?.name)
                );

                if (hasValidContent) {
                  const formatted = JSON.stringify(parsed, null, 2);
                  const tmpFile = path.join(DB_DIR, `javaneh_db.json.tmp.${Date.now()}`);

                  // 1. Write atomic temp file then rename
                  fs.writeFileSync(tmpFile, formatted, 'utf-8');
                  if (fs.existsSync(mainDbFile)) {
                    try {
                      fs.copyFileSync(mainDbFile, backupDbFile);
                    } catch (e) {}
                  }
                  fs.renameSync(tmpFile, mainDbFile);

                  // 2. Rolling snapshot in data/snapshots/
                  try {
                    const snapFile = path.join(SNAPSHOTS_DIR, `snapshot-${Date.now()}.json`);
                    fs.writeFileSync(snapFile, formatted, 'utf-8');
                    const allSnaps = fs.readdirSync(SNAPSHOTS_DIR)
                      .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
                      .sort();
                    if (allSnaps.length > 20) {
                      for (let i = 0; i < allSnaps.length - 20; i++) {
                        fs.unlinkSync(path.join(SNAPSHOTS_DIR, allSnaps[i]));
                      }
                    }
                  } catch (e) {}
                }

                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
              } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'INVALID_JSON' }));
              }
            });
            return;
          }
        }

        // Handle /api/snapshots (list available snapshots in data directory)
        if (url === '/api/snapshots') {
          const DB_DIR = path.resolve(__dirname, '..', 'data');
          const SNAPSHOTS_DIR = path.join(DB_DIR, 'snapshots');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            if (fs.existsSync(SNAPSHOTS_DIR)) {
              const files = fs.readdirSync(SNAPSHOTS_DIR)
                .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
                .sort().reverse();
              const list = files.slice(0, 15).map(f => {
                const stat = fs.statSync(path.join(SNAPSHOTS_DIR, f));
                const ts = parseInt(f.replace('snapshot-', '').replace('.json', ''), 10);
                return { filename: f, timestamp: ts, size: stat.size };
              });
              res.statusCode = 200;
              res.end(JSON.stringify({ snapshots: list }));
              return;
            }
          } catch (e) {}
          res.statusCode = 200;
          res.end(JSON.stringify({ snapshots: [] }));
          return;
        }

        const candidateApkPaths = [
          path.resolve(__dirname, 'public', 'Javaneh-App.apk'),
          path.resolve(__dirname, 'public', 'javaneh-app.apk'),
          path.resolve(__dirname, 'public', 'javaneh.apk'),
          path.resolve(__dirname, '..', 'public', 'Javaneh-App.apk'),
          path.resolve(__dirname, '..', 'public', 'javaneh-app.apk'),
          path.resolve(__dirname, '..', 'public', 'javaneh.apk'),
          path.resolve(__dirname, 'dist', 'Javaneh-App.apk'),
          path.resolve(__dirname, 'dist', 'javaneh-app.apk'),
          path.resolve(__dirname, 'dist', 'javaneh.apk'),
          path.resolve(__dirname, '..', 'dist', 'Javaneh-App.apk'),
          path.resolve(__dirname, '..', 'dist', 'javaneh-app.apk'),
          path.resolve(__dirname, '..', 'dist', 'javaneh.apk'),
        ];

        // Handle /api/apk-info
        if (url === '/api/apk-info') {
          let found = candidateApkPaths.find(p => fs.existsSync(p));

          if (!found) {
            const base64File = path.resolve(__dirname, '..', 'scripts', 'javaneh.apk.base64');
            if (fs.existsSync(base64File)) {
              try {
                const b64 = fs.readFileSync(base64File, 'utf-8').trim();
                const buffer = Buffer.from(b64, 'base64');
                const targetPath = path.resolve(__dirname, 'public', 'Javaneh-App.apk');
                fs.writeFileSync(targetPath, buffer);
                fs.writeFileSync(path.resolve(__dirname, 'public', 'javaneh.apk'), buffer);
                found = targetPath;
              } catch (e) {}
            }
          }

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          if (found) {
            try {
              const stat = fs.statSync(found);
              const fileBuf = fs.readFileSync(found);
              const sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
              res.statusCode = 200;
              res.end(JSON.stringify({
                available: true,
                filename: 'Javaneh-App.apk',
                packageName: 'com.javaneh.smart',
                version: '2.4.0',
                versionCode: 240,
                size: stat.size,
                formattedSize: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
                sha256,
                acceptRanges: true,
              }));
              return;
            } catch {}
          }
          res.statusCode = 404;
          res.end(JSON.stringify({
            available: false,
            error: 'فایل APK هنوز تولید نشده است.',
          }));
          return;
        }

        // Handle /Javaneh-App.apk, /Javaneh-Update.apk, /javaneh-app.apk, /javaneh.apk or /api/download-apk
        if (url.includes('Javaneh') || url === '/javaneh.apk' || url === '/javaneh-app.apk' || url === '/api/download-apk' || url.endsWith('.apk')) {
          const isLegacyUpdate = url.includes('Javaneh-Update') || (req.url || '').includes('edition=legacy');
          const legacyCandidates = [
            path.resolve(__dirname, 'public', 'Javaneh-Update.apk'),
            path.resolve(__dirname, '..', 'public', 'Javaneh-Update.apk'),
            path.resolve(__dirname, 'dist', 'Javaneh-Update.apk'),
            path.resolve(__dirname, '..', 'dist', 'Javaneh-Update.apk'),
          ];
          let found = (isLegacyUpdate ? legacyCandidates : candidateApkPaths).find(p => fs.existsSync(p))
            || candidateApkPaths.find(p => fs.existsSync(p));

          if (!found) {
            const base64File = path.resolve(__dirname, '..', 'scripts', 'javaneh.apk.base64');
            if (fs.existsSync(base64File)) {
              try {
                const b64 = fs.readFileSync(base64File, 'utf-8').trim();
                const buffer = Buffer.from(b64, 'base64');
                const targetPath = path.resolve(__dirname, 'public', 'Javaneh-App.apk');
                fs.writeFileSync(targetPath, buffer);
                fs.writeFileSync(path.resolve(__dirname, 'public', 'javaneh.apk'), buffer);
                found = targetPath;
              } catch (e) {}
            }
          }

          if (found) {
            try {
              const stat = fs.statSync(found);
              if (stat.size > 50000) {
                const total = stat.size;
                const rangeHeader = req.headers.range;
                const dlName = isLegacyUpdate ? 'Javaneh-Update.apk' : 'Javaneh-App.apk';

                res.setHeader('Content-Type', 'application/vnd.android.package-archive');
                res.setHeader('Content-Disposition', `attachment; filename="${dlName}"`);
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

                if (rangeHeader && rangeHeader.startsWith('bytes=')) {
                  const parts = rangeHeader.replace(/bytes=/, '').split('-');
                  const start = parseInt(parts[0], 10);
                  const end = parts[1] ? Math.min(parseInt(parts[1], 10), total - 1) : total - 1;

                  if (!isNaN(start) && !isNaN(end) && start >= 0 && start <= end && end < total) {
                    const chunkSize = end - start + 1;
                    res.statusCode = 206;
                    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
                    res.setHeader('Content-Length', chunkSize);
                    const readStream = fs.createReadStream(found, { start, end });
                    readStream.on('error', () => res.destroy());
                    readStream.pipe(res);
                    return;
                  }
                }

                res.statusCode = 200;
                res.setHeader('Content-Length', total);
                const readStream = fs.createReadStream(found);
                readStream.on('error', () => res.destroy());
                readStream.pipe(res);
                return;
              }
            } catch (err: any) {
              console.error('[APK Setup Error]:', err);
            }
          }

          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: 'APK_NOT_FOUND',
            message: 'فایل کامل APK روی این سرور وب موجود نیست.',
          }));
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    apkApiMiddleware(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'lucide-react', 'recharts'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});


