const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hymnalBridge", {
  // Called from the main hymn-browsing window to start/switch presentation.
  openPresentation: (hymnId) => ipcRenderer.invoke("presentation:open", hymnId),
  getStatus: () => ipcRenderer.invoke("presentation:status"),

  // Called from the Presenter Console.
  sendVerseChange: (index) => ipcRenderer.send("presentation:verse-change", index),
  sendBlank: (mode) => ipcRenderer.send("presentation:blank", mode),
  exitPresentation: () => ipcRenderer.send("presentation:exit"),
  onClosedByDisplay: (cb) => ipcRenderer.on("presentation:closed", () => cb()),

  // Called from both the Presenter Console and the Congregation Display.
  onSetHymn: (cb) => ipcRenderer.on("presentation:set-hymn", (event, hymnId) => cb(hymnId)),
  onVerseChange: (cb) => ipcRenderer.on("presentation:verse-change", (event, index) => cb(index)),
  onBlank: (cb) => ipcRenderer.on("presentation:blank", (event, mode) => cb(mode))
});
