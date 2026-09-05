/**
 * Мост к Electron-обёртке (выставляется через preload, см. electron/preload.cjs).
 * В браузере window.labelApp отсутствует — функции молча пропускаются.
 */

export function isElectron(): boolean {
  return typeof window !== "undefined" && window.labelApp?.platform === "electron";
}

/**
 * Через ~1.2 с после старта скачивания просит Electron показать файл
 * в папке «Загрузки» (или открыть саму папку, если имя изменилось).
 */
export function revealDownloaded(filename: string): void {
  if (!isElectron()) return;
  setTimeout(() => {
    window.labelApp?.openFolderFor(filename).catch(() => {
      /* не критично */
    });
  }, 1200);
}
