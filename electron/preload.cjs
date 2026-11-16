const { contextBridge, ipcRenderer } = require('electron');

// Keep the existing React application's localStorage API while persisting its
// contents as a JSON file in Electron's per-user application data directory.
const desktopStorage = {
  getItem(key) {
    const value = ipcRenderer.sendSync('desktop-store:get', String(key));
    return value === null || value === undefined ? null : String(value);
  },
  setItem(key, value) {
    ipcRenderer.sendSync('desktop-store:set', String(key), String(value));
  },
  removeItem(key) {
    ipcRenderer.sendSync('desktop-store:remove', String(key));
  },
  clear() {
    ipcRenderer.sendSync('desktop-store:clear');
  },
  key(index) {
    const keys = ipcRenderer.sendSync('desktop-store:keys') || [];
    return keys[Number(index)] ?? null;
  },
  get length() {
    const keys = ipcRenderer.sendSync('desktop-store:keys') || [];
    return keys.length;
  }
};

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  enumerable: true,
  value: desktopStorage
});
