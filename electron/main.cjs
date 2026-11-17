const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const STORAGE_FILE = () => path.join(app.getPath('userData'), 'database.json');

function readStore() {
  try {
    const file = STORAGE_FILE();
    if (!fs.existsSync(file)) return {};
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error('Could not read local JSON database:', error);
    return {};
  }
}

function writeStore(value) {
  const file = STORAGE_FILE();
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryFile = file + '.tmp';
  fs.writeFileSync(temporaryFile, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(temporaryFile, file);
}

let store = {};

ipcMain.on('desktop-share', (_event, text) => { clipboard.writeText(String(text ?? '')); });

ipcMain.on('desktop-print', (event) => {
  const target = BrowserWindow.fromWebContents(event.sender);
  if (!target || target.isDestroyed()) return;
  target.webContents.print({ silent: false, printBackground: true, color: true }, (success, failureReason) => {
    if (!success) console.error('Print failed:', failureReason);
  });
});

ipcMain.on('desktop-store:get', (event, key) => {
  event.returnValue = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
});

ipcMain.on('desktop-store:set', (event, key, value) => {
  store[key] = String(value);
  try {
    writeStore(store);
    event.returnValue = true;
  } catch (error) {
    console.error('Could not persist local JSON database:', error);
    event.returnValue = false;
  }
});

ipcMain.on('desktop-store:remove', (event, key) => {
  delete store[key];
  try { writeStore(store); event.returnValue = true; }
  catch (error) { console.error(error); event.returnValue = false; }
});

ipcMain.on('desktop-store:clear', (event) => {
  store = {};
  try { writeStore(store); event.returnValue = true; }
  catch (error) { console.error(error); event.returnValue = false; }
});

ipcMain.on('desktop-store:keys', (event) => {
  event.returnValue = Object.keys(store);
});

ipcMain.handle('desktop-print-preview', async (event, html) => {
  const preview = new BrowserWindow({ width: 1100, height: 850, show: true, autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  const safeHtml = String(html ?? '');
  await preview.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(safeHtml));
  try {
    const pdf = await preview.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 } });
    const pdfPath = path.join(app.getPath('temp'), `heyatomana-report-${Date.now()}.pdf`);
    fs.writeFileSync(pdfPath, pdf);
    const openError = await shell.openPath(pdfPath);
    if (openError) console.error('Could not open PDF preview:', openError);
  } catch (error) { console.error('PDF preview failed:', error); preview.close(); }
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  window.once('ready-to-show', () => window.show());
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  app.setAppUserModelId('ir.heyatomana.meetings');
  store = readStore();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
