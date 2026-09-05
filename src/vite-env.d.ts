/// <reference types="vite/client" />

/** Мост, который выставляет electron/preload.cjs (contextBridge) */
interface LabelAppBridge {
  platform: "electron";
  /** Показать скачанный файл в папке «Загрузки» (или открыть саму папку) */
  openFolderFor: (filename: string) => Promise<boolean>;
}

interface Window {
  labelApp?: LabelAppBridge;
}
