const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getNetworkInfo: () => ipcRenderer.invoke("get-network-info"),
  openLogs: () => ipcRenderer.send("open-logs-window"),
  openDataFolder: () => ipcRenderer.send("open-data-folder"),
  getMachineId: () => ipcRenderer.invoke("get-machine-id"),
  getLicenseInfo: () => ipcRenderer.invoke("get-license-info"),
  deactivateLicense: () => ipcRenderer.invoke("deactivate-license"),
  startTunnel: () => ipcRenderer.invoke("start-tunnel"),
  stopTunnel: () => ipcRenderer.invoke("stop-tunnel"),
  getTunnelStatus: () => ipcRenderer.invoke("get-tunnel-status"),
  onServerLog: (callback) =>
    ipcRenderer.on("server-log", (event, data) => callback(data)),
});

