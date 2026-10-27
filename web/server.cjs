const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 3000;
const HOST = '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.apk': 'application/vnd.android.package-archive',
};

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = req.url.split('?')[0];

  // Handle persistent storage API
  if (reqPath === '/api/apk-info') {
    const candidateApkPaths = [
      path.join(DIST_DIR, 'Javaneh-App.apk'),
      path.join(DIST_DIR, 'javaneh-app.apk'),
      path.join(DIST_DIR, 'javaneh.apk'),
      path.join(__dirname, 'public', 'Javaneh-App.apk'),
      path.join(__dirname, 'public', 'javaneh-app.apk'),
      path.join(__dirname, 'public', 'javaneh.apk'),
      path.join(__dirname, '..', 'dist', 'Javaneh-App.apk'),
      path.join(__dirname, '..', 'dist', 'javaneh.apk'),
      path.join(__dirname, '..', '.build-outputs', 'app-debug.apk'),
    ];
    const apkFile = candidateApkPaths.find(p => fs.existsSync(p));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (apkFile) {
      try {
        const stat = fs.statSync(apkFile);
        res.writeHead(200);
        res.end(JSON.stringify({
          available: true,
          filename: 'Javaneh-App.apk',
          version: '2.4.0',
          versionCode: 240,
          releaseDate: '۱۴۰۵/۰۸/۰۳',
          packageName: 'com.javaneh.smart',
          size: stat.size,
          formattedSize: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
          acceptRanges: true,
        }));
        return;
      } catch (e) {
        console.error('[ApkInfo] Error reading apk:', e);
      }
    }
    res.writeHead(404);
    res.end(JSON.stringify({ available: false, error: 'APK not found' }));
    return;
  }

  // Handle direct file download attachment for backup
  if (reqPath === '/api/download-backup') {
    const filename = `javaneh-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200);
        res.end(body || '{}');
      });
      return;
    }

    const DB_DIR = path.resolve(__dirname, '..', 'data');
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const rawUserId = req.headers['x-user-id'] || urlObj.searchParams.get('userId') || 'default_user';
    const safeUserId = String(rawUserId).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);
    const userDbFile = path.join(DB_DIR, `user_${safeUserId}.json`);
    const fallbackDbFile = path.join(DB_DIR, 'javaneh_db.json');
    const targetFile = fs.existsSync(userDbFile) ? userDbFile : (fs.existsSync(fallbackDbFile) ? fallbackDbFile : null);
    if (targetFile) {
      try {
        const content = fs.readFileSync(targetFile, 'utf-8');
        res.writeHead(200);
        res.end(content);
        return;
      } catch (e) {}
    }
    res.writeHead(200);
    res.end('{}');
    return;
  }

  // Handle persistent storage API
  if (reqPath === '/api/data') {
    const DB_DIR = path.resolve(__dirname, '..', 'data');
    if (!fs.existsSync(DB_DIR)) {
      try {
        fs.mkdirSync(DB_DIR, { recursive: true });
      } catch (err) {
        console.error('[Storage] Failed to create data dir:', err);
      }
    }

    const SNAPSHOTS_DIR = path.join(DB_DIR, 'snapshots');
    const mainDbFile = path.join(DB_DIR, 'javaneh_db.json');
    const backupDbFile = path.join(DB_DIR, 'javaneh_db_backup.json');

    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      try { fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true }); } catch (e) {}
    }

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const candidateFiles = [mainDbFile, backupDbFile];
      for (const file of candidateFiles) {
        if (fs.existsSync(file)) {
          try {
            const content = fs.readFileSync(file, 'utf-8');
            const parsed = JSON.parse(content);
            if (parsed && (parsed.goals?.length || parsed.tasks?.length || parsed.habits?.length || parsed.categories?.length)) {
              res.writeHead(200);
              res.end(content);
              return;
            }
          } catch (err) {}
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
          res.writeHead(200);
          res.end(snapContent);
          return;
        }
      } catch (e) {}

      res.writeHead(200);
      res.end(JSON.stringify({ initialized: false, tasks: [], goals: [], habits: [], categories: null }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const hasValidContent = parsed && (
            (Array.isArray(parsed.goals) && parsed.goals.length > 0) ||
            (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) ||
            (Array.isArray(parsed.habits) && parsed.habits.length > 0) ||
            (Array.isArray(parsed.categories) && parsed.categories.length > 0) ||
            Boolean(parsed.userProfile?.name)
          );

          if (hasValidContent) {
            const formatted = JSON.stringify(parsed, null, 2);
            const tmpFile = path.join(DB_DIR, `javaneh_db.json.tmp.${Date.now()}`);

            // 1. Write atomic temp file then rename
            fs.writeFileSync(tmpFile, formatted, 'utf-8');
            if (fs.existsSync(mainDbFile)) {
              try { fs.copyFileSync(mainDbFile, backupDbFile); } catch (e) {}
            }
            fs.renameSync(tmpFile, mainDbFile);

            // 2. Rolling snapshot
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

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
        } catch (err) {
          console.error('[Storage] Failed to write db:', err);
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
      return;
    }
  }

  // Handle /api/snapshots (list available snapshots in data directory)
  if (reqPath === '/api/snapshots') {
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
        res.writeHead(200);
        res.end(JSON.stringify({ snapshots: list }));
        return;
      }
    } catch (e) {}
    res.writeHead(200);
    res.end(JSON.stringify({ snapshots: [] }));
    return;
  }

  // Direct APK download route with HTTP Range (206 Partial Content) support
  if (
    reqPath === '/Javaneh-App.apk' ||
    reqPath === '/Javaneh-Update.apk' ||
    reqPath === '/javaneh-app.apk' ||
    reqPath === '/javaneh.apk' || 
    reqPath === '/api/download-apk' || 
    reqPath.endsWith('/Javaneh-App.apk') ||
    reqPath.endsWith('/Javaneh-Update.apk') ||
    reqPath.endsWith('/javaneh-app.apk') ||
    reqPath.endsWith('/javaneh.apk') ||
    reqPath.endsWith('/app-debug.apk')
  ) {
    const isLegacyUpdate = reqPath.includes('Javaneh-Update') || (req.url || '').includes('edition=legacy');
    const legacyCandidates = [
      path.join(DIST_DIR, 'Javaneh-Update.apk'),
      path.join(__dirname, 'public', 'Javaneh-Update.apk'),
      path.join(__dirname, '..', 'public', 'Javaneh-Update.apk'),
      path.join(__dirname, '..', 'dist', 'Javaneh-Update.apk'),
    ];
    const candidateApkPaths = [
      path.join(DIST_DIR, 'Javaneh-App.apk'),
      path.join(DIST_DIR, 'javaneh-app.apk'),
      path.join(DIST_DIR, 'javaneh.apk'),
      path.join(__dirname, 'public', 'Javaneh-App.apk'),
      path.join(__dirname, 'public', 'javaneh-app.apk'),
      path.join(__dirname, 'public', 'javaneh.apk'),
      path.join(__dirname, '..', 'public', 'Javaneh-App.apk'),
      path.join(__dirname, '..', 'public', 'javaneh.apk'),
      path.join(__dirname, '..', 'dist', 'Javaneh-App.apk'),
      path.join(__dirname, '..', 'dist', 'javaneh.apk'),
      path.join(__dirname, '..', '.build-outputs', 'app-debug.apk'),
    ];
    const apkFile = (isLegacyUpdate ? legacyCandidates : candidateApkPaths).find(p => fs.existsSync(p))
      || candidateApkPaths.find(p => fs.existsSync(p));
    if (apkFile) {
      try {
        const stat = fs.statSync(apkFile);
        const totalSize = stat.size;
        const rangeHeader = req.headers.range;
        const dlName = isLegacyUpdate ? 'Javaneh-Update.apk' : 'Javaneh-App.apk';

        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${dlName}"`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition, Content-Range');

        if (rangeHeader && rangeHeader.startsWith('bytes=')) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

          if (isNaN(start) || start >= totalSize || (parts[1] && end >= totalSize) || start > end) {
            res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
            res.end();
            return;
          }

          const chunkSize = end - start + 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Content-Length': chunkSize,
          });

          if (req.method === 'HEAD') {
            res.end();
            return;
          }

          const stream = fs.createReadStream(apkFile, { start, end });
          stream.pipe(res);
          return;
        }

        res.writeHead(200, { 'Content-Length': totalSize });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        const stream = fs.createReadStream(apkFile);
        stream.on('error', (streamErr) => {
          console.error('[Storage Error streaming apk]:', streamErr);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'APK_STREAMING_FAILED', message: 'خطا در استریم فایل APK: ' + (streamErr?.message || 'خطای سرور') }));
          } else {
            res.destroy(streamErr);
          }
        });
        res.on('error', () => stream.destroy());
        stream.pipe(res);
        return;
      } catch (e) {
        console.error('[Storage] Error streaming apk:', e);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'APK_STREAMING_FAILED', message: 'خطا در استریم فایل APK: ' + (e?.message || 'خطای سرور') }));
          return;
        }
      }
    }
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ available: false, error: 'فایل APK در سرور موجود نیست. از گزینه نصب PWA استفاده فرمایید.' }));
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // Prevent path traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    // If not found, fallback to index.html (SPA routing)
    if (err || !stats.isFile()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error loading application');
        return;
      }

      const headers = {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      };
      if (ext === '.apk') {
        headers['Content-Disposition'] = 'attachment; filename="javaneh.apk"';
      }

      res.writeHead(200, headers);
      res.end(content);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[Javaneh Web Server] Serving on http://${HOST}:${PORT}`);
});
