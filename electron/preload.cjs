/**
 * Безопасный мост renderer → main (contextIsolation: true).
 * Выставляет window.labelApp — см. src/lib/electronBridge.ts.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("labelApp", {
  platform: "electron",
  /** Показать скачанный файл в папке «Загрузки» (или открыть папку) */
  openFolderFor: (filename) => ipcRenderer.invoke("open-folder-for", filename),
});
