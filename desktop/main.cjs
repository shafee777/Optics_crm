const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, utilityProcess, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const { LocalDatabase, freePort } = require('./local-database.cjs');
app.setName('Optics CRM');
app.setPath('userData', path.join(app.getPath('appData'), 'Optics CRM'));
const smoke = process.argv.includes('--smoke-test');
if (smoke) app.setPath('userData', path.join(app.getPath('temp'), 'optics-desktop-smoke-' + process.pid));
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
let win, db, config, api, origin, exiting = false, timer, shutdownAllowed = false, exitCode = 0;
const payload = app.isPackaged ? path.join(process.resourcesPath, 'payload') : path.join(__dirname, 'payload');
const pgRoot = app.isPackaged ? path.join(process.resourcesPath, 'pgsql') : path.join(__dirname, 'vendor', 'pgsql');
const requireBackend = createRequire(path.join(payload, 'backend', 'package.json'));
const setupUrl = pathToFileURL(path.join(__dirname, 'setup.html')).href;
const dataRoot = app.getPath('userData');
const secretFile = path.join(dataRoot, 'configuration.bin');
const log = async text => fs.appendFile(path.join(dataRoot, 'desktop.log'), new Date().toISOString() + ' ' + text + '\n').catch(() => {});
async function saveConfig() {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows credential protection is unavailable. Sign in to Windows normally and try again.');
  await fs.writeFile(secretFile + '.tmp', safeStorage.encryptString(JSON.stringify(config)));
  await fs.rename(secretFile + '.tmp', secretFile);
}
async function loadConfig() {
  await fs.mkdir(dataRoot, { recursive: true });
  try { config = JSON.parse(safeStorage.decryptString(await fs.readFile(secretFile))); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot unlock the local configuration. Use the Windows account that installed this app.');
    config = { database: 'optics_crm', password: crypto.randomBytes(32).toString('hex'), accessSecret: crypto.randomBytes(48).toString('hex'), refreshSecret: crypto.randomBytes(48).toString('hex') };
    await saveConfig();
  }
}
function trusted(event, setup = false) {
  const url = event.senderFrame?.url;
  if (event.sender !== win?.webContents || (setup ? url !== setupUrl : !url?.startsWith(origin + '/'))) throw new Error('Untrusted request');
}
async function requireOwner(token) {
  const decoded = requireBackend('jsonwebtoken').verify(token, config.accessSecret);
  const permitted = await db.client(config.database, client => client.query("SELECT 1 FROM users WHERE id=$1 AND store_id=$2 AND role='OWNER' AND active=true", [decoded.userId, decoded.storeId]));
  if (!permitted.rowCount) throw new Error('Sign in as the owner to manage backups.');
}
async function createOwner(details) {
  const { z } = requireBackend('zod');
  const data = z.object({ shop: z.string().trim().min(1).max(255), name: z.string().trim().min(1).max(255), email: z.string().trim().email().transform(s => s.toLowerCase()), password: z.string().min(10).max(72) }).parse(details);
  const hash = await requireBackend('bcrypt').hash(data.password, 12);
  await db.client(config.database, async client => {
    await client.query('BEGIN');
    try {
      await client.query('SELECT pg_advisory_xact_lock(904126)');
      if ((await client.query('SELECT 1 FROM users LIMIT 1')).rowCount) throw new Error('This shop is already set up. Sign in with its existing owner account.');
      const store = await client.query('INSERT INTO stores(name) VALUES($1) RETURNING id', [data.shop]);
      await client.query("INSERT INTO users(store_id,email,password_hash,full_name,role) VALUES($1,$2,$3,$4,'OWNER')", [store.rows[0].id, data.email, hash, data.name]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  });
  await db.backup();
}
async function startApi() {
  let port;
  try { port = await freePort(config.apiPort || 47853); } catch { port = await freePort(); }
  config.apiPort = port; await saveConfig(); origin = 'http://127.0.0.1:' + port;
  api = utilityProcess.fork(path.join(payload, 'backend', 'src', 'server.js'), [], {
    cwd: path.join(payload, 'backend'), stdio: 'pipe', serviceName: 'Optics local API',
    env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), DATABASE_URL: db.url(), FRONTEND_URL: origin, JWT_ACCESS_SECRET: config.accessSecret, JWT_REFRESH_SECRET: config.refreshSecret, LOG_LEVEL: 'warn' }
  });
  api.stderr?.on('data', chunk => log(chunk.toString()));
  api.stdout?.on('data', chunk => log(chunk.toString()));
  api.on('exit', code => { if (!exiting) { log('API stopped: ' + code); dialog.showErrorBox('Optics CRM stopped', 'The local service stopped. Close and reopen the app. Your saved records remain on this computer.'); app.quit(); } });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(origin + '/health/ready', { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Local API did not start. See desktop.log in the data folder.');
}
function createWindow() {
  win = new BrowserWindow({ width: 1280, height: 860, minWidth: 900, minHeight: 640, show: false, title: 'Optics CRM',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  win.webContents.setWindowOpenHandler(({ url }) => {
    try { const parsed = new URL(url); if (parsed.protocol === 'https:' && parsed.hostname === 'wa.me') shell.openExternal(url); } catch {}
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => { if (url !== setupUrl && !url.startsWith(origin + '/')) event.preventDefault(); });
  win.once('ready-to-show', () => win.show());
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Open data folder', click: () => shell.openPath(dataRoot) }, { type: 'separator' }, { role: 'quit' }] },
    { role: 'editMenu' }, { label: 'View', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] }
  ]));
}
ipcMain.handle('setup-owner', async (event, details) => { trusted(event, true); await createOwner(details); await win.loadURL(origin + '/login'); return true; });
ipcMain.handle('backup', async (event, token) => {
  trusted(event); await requireOwner(token);
  const result = await dialog.showSaveDialog(win, { title: 'Save shop backup', defaultPath: 'optics-' + new Date().toISOString().slice(0, 10) + '.dump', filters: [{ name: 'PostgreSQL backup', extensions: ['dump'] }] });
  if (result.canceled) return { cancelled: true };
  await db.backup(result.filePath); return { saved: true };
});
ipcMain.handle('restore', async (event, token) => {
  trusted(event); await requireOwner(token);
  const result = await dialog.showOpenDialog(win, { title: 'Restore shop backup', properties: ['openFile'], filters: [{ name: 'PostgreSQL backup', extensions: ['dump'] }] });
  if (result.canceled) return { cancelled: true };
  const confirmation = await dialog.showMessageBox(win, { type: 'question', buttons: ['Cancel', 'Restore and restart'], defaultId: 0, cancelId: 0, title: 'Restore backup?', message: 'The app will switch to the records in this backup.', detail: 'Your current database is backed up and retained. The app restarts and you must sign in using the restored owner account.' });
  if (confirmation.response !== 1) return { cancelled: true };
  await db.backup();
  const restored = await db.restore(result.filePaths[0]);
  config.database = restored;
  config.accessSecret = crypto.randomBytes(48).toString('hex'); config.refreshSecret = crypto.randomBytes(48).toString('hex');
  await saveConfig();
  app.relaunch(); app.quit(); return { restored: true };
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', event => {
  if (shutdownAllowed) return;
  event.preventDefault(); if (exiting) return; exiting = true; clearInterval(timer);
  (async () => {
    if (api) {
      const stopped = new Promise(resolve => api.once('exit', resolve));
      api.postMessage({ type: 'shutdown' });
      await Promise.race([stopped, new Promise(resolve => setTimeout(resolve, 12000))]);
      api.kill();
    }
    try { await db?.stop(); } catch (error) { await log('Database shutdown: ' + error.message); }
    shutdownAllowed = true; app.exit(exitCode);
  })();
});
if (single) app.whenReady().then(async () => {
  await loadConfig();
  db = new LocalDatabase({ dataRoot, pgRoot, migrations: path.join(payload, 'backend', 'database', 'migrations'), config });
  await db.start();
  await startApi();
  if (smoke) {
    await createOwner({shop:'Desktop smoke test',name:'Test owner',email:'owner@example.test',password:crypto.randomBytes(16).toString('hex')});
    const backup = await db.backup();
    const restored = await db.restore(backup);
    if (!await db.hasOwner(restored)) throw new Error('Restore verification failed');
    console.log('DESKTOP_SMOKE_OK: first run, migrations, backend health, owner setup, backup and restore');
    app.quit(); return;
  }
  createWindow();
  await win.loadURL(await db.hasOwner() ? origin + '/login' : setupUrl);
  timer = setInterval(() => db.backup().catch(error => { log(error.message); dialog.showErrorBox('Automatic backup failed', 'Use Settings → Desktop backups to save a backup. Check free disk space.'); }), 24 * 60 * 60 * 1000);
}).catch(async error => { await log(error.stack || error.message); if (smoke) { console.error('DESKTOP_SMOKE_FAILED:', error.message); exitCode = 1; } else dialog.showErrorBox('Optics CRM could not start', error.message); app.quit(); });
