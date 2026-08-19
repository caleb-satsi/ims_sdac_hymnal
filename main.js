const { app, BrowserWindow, Menu, shell, ipcMain, screen } = require("electron");
const path = require("path");

const isMac = process.platform === "darwin";

// The hymnal has no 3D/WebGL content, so we don't need Chromium's software
// Vulkan fallback (SwiftShader). Turning it off here — combined with removing
// its DLLs at packaging time in build/afterPack.js — avoids the app bundling
// files that look like third-party graphics drivers, which Microsoft Store
// certification flags under policy 10.2.4.2.
app.commandLine.appendSwitch("disable-software-rasterizer");

const ICON_PATH = path.join(__dirname, "build", "icon.png");
const PRELOAD_PATH = path.join(__dirname, "preload.js");

let mainWindow = null;
let controlWindow = null;   // Presenter Console — stays on the presenter's own screen
let displayWindow = null;   // Congregation Display — fullscreen, targets the 2nd monitor

// ---------------------------------------------------------------------------
// Main app window
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 860,
    minHeight: 600,
    center: true,
    backgroundColor: "#eee6d3",
    title: "International Hymnal (SDAC)",
    icon: ICON_PATH,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    autoHideMenuBar: !isMac
  });

  mainWindow.loadFile(path.join(__dirname, "app", "index.html"));

  // Open any external link (http/https) in the system browser instead of
  // navigating the app window away from the hymnal.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Presentation mode — a Presenter Console window (controls, like PowerPoint's
// presenter view) plus a Congregation Display window that goes fullscreen on
// a second monitor when one is connected.
// ---------------------------------------------------------------------------
function pickDisplayTargets() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((d) => d.id !== primary.id) || null;
  return { primary, external };
}

function openPresentation(hymnId) {
  // Already presenting — just switch which hymn is showing.
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send("presentation:set-hymn", hymnId);
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.webContents.send("presentation:set-hymn", hymnId);
    }
    controlWindow.focus();
    return { alreadyOpen: true, hasSecondDisplay: !!pickDisplayTargets().external };
  }

  const { primary, external } = pickDisplayTargets();
  const query = { hymnId: String(hymnId) };

  controlWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 780,
    minHeight: 540,
    title: "Presenter Console — International Hymnal (SDAC)",
    backgroundColor: "#0e1620",
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  controlWindow.loadFile(path.join(__dirname, "app", "control.html"), { query });

  const target = external || primary;
  displayWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    frame: false,
    backgroundColor: "#0b1220",
    icon: ICON_PATH,
    show: false,
    skipTaskbar: !!external,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  displayWindow.loadFile(path.join(__dirname, "app", "presentation.html"), { query });
  displayWindow.once("ready-to-show", () => {
    displayWindow.show();
    displayWindow.setFullScreen(true);
  });

  controlWindow.on("closed", () => {
    controlWindow = null;
    if (displayWindow && !displayWindow.isDestroyed()) displayWindow.close();
  });
  displayWindow.on("closed", () => {
    displayWindow = null;
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send("presentation:closed");
    }
  });

  return { alreadyOpen: false, hasSecondDisplay: !!external };
}

function closePresentation() {
  if (controlWindow && !controlWindow.isDestroyed()) controlWindow.close();
  if (displayWindow && !displayWindow.isDestroyed()) displayWindow.close();
  controlWindow = null;
  displayWindow = null;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
}

// (display-removed handling is registered inside app.whenReady() below —
// the `screen` module can't be touched before the app is ready)

// ---------------------------------------------------------------------------
// IPC — relays between the Presenter Console and the Congregation Display
// ---------------------------------------------------------------------------
ipcMain.handle("presentation:open", (event, hymnId) => openPresentation(hymnId));

ipcMain.handle("presentation:status", () => {
  const { external } = pickDisplayTargets();
  return { isOpen: !!(controlWindow && !controlWindow.isDestroyed()), hasSecondDisplay: !!external };
});

ipcMain.on("presentation:verse-change", (event, index) => {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send("presentation:verse-change", index);
  }
});

ipcMain.on("presentation:blank", (event, mode) => {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send("presentation:blank", mode);
  }
});

ipcMain.on("presentation:exit", () => {
  closePresentation();
});

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
const menuTemplate = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        }
      ]
    : []),
  {
    label: "Edit",
    submenu: [{ role: "copy" }, { role: "selectAll" }]
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  },
  {
    label: "Window",
    submenu: [{ role: "minimize" }, { role: "close" }]
  }
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();

  // If a monitor is unplugged/replugged mid-presentation, keep the
  // congregation display on a sensible screen instead of leaving it
  // stranded off-canvas. Registered here (not at module scope) because the
  // `screen` module can't be used before the app is ready.
  screen.on("display-removed", () => {
    if (!displayWindow || displayWindow.isDestroyed()) return;
    const { primary, external } = pickDisplayTargets();
    const target = external || primary;
    displayWindow.setFullScreen(false);
    displayWindow.setBounds(target.bounds);
    displayWindow.setFullScreen(true);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});
