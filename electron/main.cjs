/**
 * Electron-обёртка «Генератор наклеек 4K» для Windows.
 * Запуск:  npx electron electron/main.cjs   (после npm run build)
 * Сборка:  npx electron-builder --config electron-builder.yml
 */
const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const DIST = path.join(__dirname, "..", "dist");
const ICON_CANDIDATES = [
  path.join(__dirname, "..", "public", "icon.svg"),
  path.join(DIST, "icon.svg"),
];

function resolveIcon() {
  for (const p of ICON_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: "#141d17",
    autoHideMenuBar: true,
    title: "Генератор наклеек 4K",
    icon: resolveIcon(),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // локальные файлы наклеек (objectURL/dataURL) работают без ограничений
      webSecurity: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Ссылки наружу открываем в системном браузере, а не внутри приложения
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const indexPath = path.join(DIST, "index.html");
  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      "Файлы не найдены",
      "Папка dist/ отсутствует. Сначала выполните: npm run build"
    );
    app.quit();
    return;
  }

  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
