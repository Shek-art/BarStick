/**
 * Electron-обёртка «Генератор наклеек 4K» для Windows.
 *
 * ВАЖНО: сборка Vite использует абсолютные пути (/assets/...), поэтому
 * открывать dist/index.html через file:// НЕЛЬЗЯ — окно будет пустым.
 * Здесь поднимается локальный HTTP-сервер (чистый Node, без зависимостей),
 * который раздаёт папку dist/ на http://127.0.0.1:<свободный порт>.
 * Заодно это чинит localStorage и service worker (офлайн-режим).
 *
 * Запуск:  npx electron electron/main.cjs   (после npm run build)
 * Сборка:  npx electron-builder --config electron-builder.yml --win
 */
const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const http = require("http");
const path = require("path");
const fs = require("fs");

const DIST = path.join(__dirname, "..", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

/** Мини-сервер статики для папки dist/ */
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        let filePath = path.normalize(path.join(DIST, urlPath));

        // защита от выхода за пределы dist/
        if (!filePath.startsWith(DIST)) {
          res.writeHead(403); res.end("Forbidden"); return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(DIST, "index.html"); // SPA fallback
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500); res.end("Server error");
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}/` });
    });
  });
}

/** Иконка окна: Windows принимает только .ico/.png */
function resolveIcon() {
  if (process.platform === "win32") {
    for (const name of ["icon.ico", "icon.png"]) {
      const p = path.join(__dirname, "..", "build", name);
      if (fs.existsSync(p)) return p;
    }
    return undefined; // .svg на Windows не поддерживается — пропускаем
  }
  const svg = path.join(__dirname, "..", "public", "icon.svg");
  return fs.existsSync(svg) ? svg : undefined;
}

async function createWindow() {
  const indexPath = path.join(DIST, "index.html");
  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      "Файлы сборки не найдены",
      "Папка dist/ отсутствует. Сначала выполните в папке проекта:\n\n  npm install\n  npm run build"
    );
    app.quit();
    return;
  }

  const { server, url } = await startStaticServer();

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
    },
  });

  win.once("ready-to-show", () => win.show());

  // Ссылки наружу — в системный браузер
  win.webContents.setWindowOpenHandler(({ url: u }) => {
    shell.openExternal(u);
    return { action: "deny" };
  });

  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error(`Ошибка загрузки: ${code} ${desc}`);
  });

  // Ctrl+Shift+I — инструменты разработчика (для отладки)
  win.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  await win.loadURL(url);

  win.on("closed", () => server.close());
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow().catch((err) => {
    dialog.showErrorBox("Не удалось запустить приложение", String(err));
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
