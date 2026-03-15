const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu,
  clipboard,
  dialog,
} = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const log = require("electron-log");
const { autoUpdater } = require("electron-updater");
const tunnel = require("./tunnel");
const crypto = require("crypto");

// Read version dynamically from package.json
function getAppVersion() {
  try {
    const pkgPath = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar", "package.json")
      : path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return pkg.version || "1.0.0";
  } catch (e) {
    log.error("Failed to read version from package.json:", e.message);
    return "1.0.0";
  }
}

// Determine if running in development mode
const isDev = !app.isPackaged;
const isProd = app.isPackaged;

function getBaseUrl() {
  return isDev ? "http://localhost:9002" : `http://localhost:${appPort}`;
}

// Configure logging
log.transports.file.level = "info";
console.log = log.info;
console.error = log.error;

let mainWindow;
let serverProcess;
let logsWindow;
let appPort = 2304; // Default port

function loadConfig() {
  try {
    const userDataPath = app.getPath("userData");
    const configPath = path.join(userDataPath, "config.json");

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.port) {
        appPort = config.port;
        log.info(`Loaded custom port from config: ${appPort}`);
      }
    } else {
      // Create default config
      fs.writeFileSync(configPath, JSON.stringify({ port: 2304 }, null, 2));
      log.info(`Created default config at ${configPath}`);
    }
  } catch (e) {
    log.error(`Failed to load config: ${e.message}`);
  }
}

function getNetworkAddress() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const k in interfaces) {
    for (const k2 in interfaces[k]) {
      const address = interfaces[k][k2];
      if (address.family === "IPv4" && !address.internal) {
        addresses.push(`http://${address.address}:${appPort}`);
      }
    }
  }
  return addresses;
}

function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              {
                label: "Device Info...",
                click: () => createDeviceInfoWindow(),
              },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),

    // Navigate Menu - Direct access to all sections
    {
      label: "Navigate",
      submenu: [
        {
          label: "Dashboard",
          accelerator: "CmdOrCtrl+1",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard`),
        },
        {
          label: "Tables",
          accelerator: "CmdOrCtrl+2",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard/tables`),
        },
        {
          label: "Menu",
          accelerator: "CmdOrCtrl+3",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard/menu`),
        },
        { type: "separator" },
        {
          label: "Kitchen",
          accelerator: "CmdOrCtrl+4",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard/kitchen`),
        },
        {
          label: "Bar",
          accelerator: "CmdOrCtrl+5",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard/bar`),
        },
        {
          label: "Orders",
          accelerator: "CmdOrCtrl+6",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard/orders`),
        },
        { type: "separator" },
        {
          label: "Inventory",
          accelerator: "CmdOrCtrl+7",
          click: () =>
            mainWindow?.loadURL(`${getBaseUrl()}/dashboard/inventory`),
        },
        {
          label: "Accounting",
          accelerator: "CmdOrCtrl+8",
          click: () =>
            mainWindow?.loadURL(`${getBaseUrl()}/dashboard/accounting`),
        },
        {
          label: "Staff",
          accelerator: "CmdOrCtrl+9",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard/staff`),
        },
        {
          label: "Notifications",
          accelerator: "CmdOrCtrl+N",
          click: () =>
            mainWindow?.loadURL(`${getBaseUrl()}/dashboard/notifications`),
        },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () =>
            mainWindow?.loadURL(`${getBaseUrl()}/dashboard/configuration`),
        },
      ],
    },

    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },

    // Support Menu
    {
      label: "Support",
      submenu: [
        {
          label: "Tickets",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard/support`),
        },
        {
          label: "Knowledge Base",
          click: () =>
            mainWindow?.loadURL(`${getBaseUrl()}/dashboard/knowledge-base`),
        },
        { type: "separator" },
        {
          label: "Contact Developer",
          click: () => shell.openExternal("https://wa.me/237679690703"),
        },
      ],
    },

    // Help Menu
    {
      label: "Help",
      submenu: [
        { label: "About TEMEH", click: () => app.showAboutPanel() },
        {
          label: "Credits",
          click: () => mainWindow?.loadURL(`${getBaseUrl()}/dashboard/credits`),
        },
        { label: "Device Info...", click: () => createDeviceInfoWindow() },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Set About Panel Options (done after app is ready to get dynamic version)
function setupAboutPanel() {
  const version = getAppVersion();
  app.setAboutPanelOptions({
    applicationName: "TEMEH",
    applicationVersion: version,
    copyright: "© 2026 TEMEH",
    version: version,
    credits: "Developed by Sunyin Elisbrown",
  });
}

// ============================================
// ACTIVATION WINDOW (Paywall)
// ============================================
function createActivationWindow(errorMessage) {
  const machineId = license.getMachineId() || "Unknown";

  activationWindow = new BrowserWindow({
    width: 500,
    height: 600,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    title: "Activate TEMEH",
    icon: path.join(__dirname, "../public/logo.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const activationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Activate TEMEH</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          min-height: 100vh;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .logo { font-size: 48px; margin-bottom: 20px; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        .subtitle { color: #888; margin-bottom: 30px; }
        .error-box {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #ef4444;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
          width: 100%;
          font-size: 14px;
        }
        .machine-id {
          background: #2a2a3a;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          width: 100%;
        }
        .machine-id label { font-size: 12px; color: #888; display: block; margin-bottom: 8px; }
        .machine-id code {
          font-family: monospace;
          font-size: 13px;
          word-break: break-all;
          color: #6366f1;
        }
        .copy-btn {
          background: #6366f1;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 10px;
          font-size: 13px;
        }
        .copy-btn:hover { background: #818cf8; }
        .input-group { width: 100%; margin-bottom: 16px; }
        .input-group label { display: block; font-size: 14px; margin-bottom: 8px; }
        .input-group textarea {
          width: 100%;
          height: 100px;
          background: #2a2a3a;
          border: 1px solid #3a3a4a;
          border-radius: 8px;
          color: white;
          padding: 12px;
          font-family: monospace;
          font-size: 12px;
          resize: none;
        }
        .input-group textarea:focus { outline: none; border-color: #6366f1; }
        .activate-btn {
          width: 100%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 16px;
        }
        .activate-btn:hover { opacity: 0.9; }
        .contact-link {
          color: #6366f1;
          text-decoration: none;
          font-size: 14px;
        }
        .contact-link:hover { text-decoration: underline; }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        #status { margin-top: 10px; font-size: 14px; min-height: 20px; }
      </style>
    </head>
    <body>
      <div class="logo">🔐</div>
      <h1>Activate TEMEH</h1>
      <p class="subtitle">Enter your license key to unlock the software</p>
      
      ${errorMessage ? '<div class="error-box">' + errorMessage + "</div>" : ""}
      
      <div class="machine-id">
        <label>Your Machine ID (send this to the vendor):</label>
        <code id="machineId">${machineId}</code>
        <br>
        <button class="copy-btn" onclick="copyMachineId()">Copy Machine ID</button>
      </div>
      
      <div class="input-group">
        <label>License Key:</label>
        <textarea id="licenseKey" placeholder="Paste your license key here..."></textarea>
      </div>
      
      <button class="activate-btn" onclick="activate()">Activate License</button>
      
      <div id="status"></div>
      
      <a href="https://wa.me/237679690703" class="contact-link" onclick="require('electron').shell.openExternal(this.href); return false;">
        Contact vendor for a license key
      </a>
      
      <script>
        const { ipcRenderer, clipboard, shell } = require('electron');
        
        function copyMachineId() {
          const machineId = document.getElementById('machineId').textContent;
          clipboard.writeText(machineId);
          document.querySelector('.copy-btn').textContent = 'Copied!';
          setTimeout(() => document.querySelector('.copy-btn').textContent = 'Copy Machine ID', 2000);
        }
        
        function activate() {
          const key = document.getElementById('licenseKey').value.trim();
          if (!key) {
            document.getElementById('status').innerHTML = '<span class="error">Please enter a license key.</span>';
            return;
          }
          ipcRenderer.send('activate-license', key);
        }
        
        ipcRenderer.on('activation-result', (event, result) => {
          if (result.success) {
            document.getElementById('status').innerHTML = '<span class="success">License activated successfully! Restarting...</span>';
            setTimeout(() => ipcRenderer.send('restart-app'), 1500);
          } else {
            document.getElementById('status').innerHTML = '<span class="error">' + result.error + '</span>';
          }
        });
      </script>
    </body>
    </html>
  `;

  activationWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(activationHtml),
  );

  activationWindow.on("closed", () => {
    activationWindow = null;
    // If no main window exists, quit the app
    if (!mainWindow) {
      app.quit();
    }
  });
}

// ============================================
// DEVICE INFO WINDOW
// ============================================
function createDeviceInfoWindow() {
  const machineId = license.getMachineId() || "Unknown";
  const licenseInfo = license.getLicenseInfo();
  const osInfo = `${os.type()} ${os.release()}`;
  const cpuInfo = os.cpus()[0]?.model || "Unknown";

  const infoWindow = new BrowserWindow({
    width: 450,
    height: 400,
    resizable: false,
    title: "Device Info",
    icon: path.join(__dirname, "../public/logo.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const statusHtml = licenseInfo
    ? `<span style="color: #22c55e;">✓ ${licenseInfo.type} (Expires: ${new Date(
        licenseInfo.expiresAt,
      ).toLocaleDateString()})</span>`
    : `<span style="color: #f59e0b;">⚠ Unlicensed</span>`;

  const deviceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #1a1a2e;
          color: #fff;
          padding: 30px;
          margin: 0;
        }
        h2 { margin-bottom: 24px; font-size: 20px; }
        .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #2a2a3a; }
        .row:last-child { border-bottom: none; }
        .label { color: #888; }
        .value { font-weight: 500; text-align: right; max-width: 60%; word-break: break-all; }
        .machine-id { font-family: monospace; font-size: 11px; color: #6366f1; }
        .copy-btn {
          background: #6366f1;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          margin-top: 20px;
        }
        .copy-btn:hover { background: #818cf8; }
      </style>
    </head>
    <body>
      <h2>📱 Device Information</h2>
      <div class="row">
        <span class="label">Machine ID</span>
        <span class="value machine-id">${machineId}</span>
      </div>
      <div class="row">
        <span class="label">Operating System</span>
        <span class="value">${osInfo}</span>
      </div>
      <div class="row">
        <span class="label">CPU</span>
        <span class="value">${cpuInfo}</span>
      </div>
      <div class="row">
        <span class="label">App Version</span>
        <span class="value">${getAppVersion()}</span>
      </div>
      <div class="row">
        <span class="label">License Status</span>
        <span class="value">${statusHtml}</span>
      </div>
      <button class="copy-btn" onclick="copyId()">Copy Machine ID</button>
      <script>
        const { clipboard } = require('electron');
        function copyId() {
          clipboard.writeText('${machineId}');
          document.querySelector('.copy-btn').textContent = 'Copied!';
          setTimeout(() => document.querySelector('.copy-btn').textContent = 'Copy Machine ID', 2000);
        }
      </script>
    </body>
    </html>
  `;

  infoWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(deviceHtml),
  );
  infoWindow.setMenu(null);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show immediately with loading screen
    fullscreen: false, // Explicitly disable fullscreen
    fullscreenable: true, // Allow user to toggle fullscreen manually
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false, // Allow audio and timers when window is inactive
    },
    title: `TEMEH v${getAppVersion()}`,
    icon: path.join(__dirname, "../public/logo.png"),
  });

  // In Dev mode, connect to the external Next.js dev server (port 9002)
  // In Prod mode, connect to the internal production server (appPort)
  const startUrl = isDev
    ? "http://localhost:9002"
    : `http://localhost:${appPort}`;

  // Show loading screen first
  const loadingHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>TEMEH - Starting...</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          color: white;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .logo { font-size: 3rem; font-weight: bold; margin-bottom: 2rem; }
        .logo span { color: #e94560; }
        .spinner {
          width: 50px; height: 50px;
          border: 4px solid rgba(255,255,255,0.2);
          border-top-color: #e94560;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1.5rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status { font-size: 1.1rem; color: #aaa; margin-bottom: 0.5rem; }
        .detail { font-size: 0.9rem; color: #666; }
        .retry-btn {
          display: none;
          margin-top: 1.5rem;
          padding: 0.8rem 2rem;
          background: #e94560;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s;
        }
        .retry-btn:hover { background: #d63050; }
        .error { color: #ff6b6b; }
      </style>
    </head>
    <body>
      <div class="logo">Lounge<span>OS</span></div>
      <div class="spinner" id="spinner"></div>
      <div class="status" id="status">Starting server...</div>
      <div class="detail" id="detail">Please wait</div>
      <button class="retry-btn" id="retryBtn" onclick="window.location.reload()">Retry</button>
    </body>
    </html>
  `;

  mainWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(loadingHtml),
  );

  log.info(`Loading URL: ${startUrl}`);

  // Wait for server to be ready
  waitForServer(startUrl, 60000) // 60 second timeout
    .then(() => {
      log.info("Server is ready, loading app...");
      mainWindow.loadURL(startUrl);
    })
    .catch((err) => {
      log.error("Failed to connect to server:", err.message);
      // Show error in loading screen
      mainWindow.webContents.executeJavaScript(`
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('status').className = 'status error';
        document.getElementById('status').textContent = 'Failed to start server';
        document.getElementById('detail').textContent = 'Check logs for details or click Retry';
        document.getElementById('retryBtn').style.display = 'block';
      `);
    });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Helper function to poll server until ready
function waitForServer(url, timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const http = require("http");

    const checkServer = () => {
      if (Date.now() - startTime > timeout) {
        return reject(new Error("Server startup timeout"));
      }

      const urlObj = new URL(url);
      const req = http.get(
        {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: "/",
          timeout: 2000,
        },
        (res) => {
          // Server responded (any status means it's running)
          log.info(`Server responded with status: ${res.statusCode}`);
          resolve();
        },
      );

      req.on("error", (err) => {
        log.info(
          `Waiting for server... (${Math.round((Date.now() - startTime) / 1000)}s)`,
        );
        // Update loading screen status
        if (mainWindow && !mainWindow.isDestroyed()) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          mainWindow.webContents.executeJavaScript(
            "document.getElementById('detail').textContent = 'Connecting... " +
              elapsed +
              "s';",
          );
        }
        setTimeout(checkServer, 500);
      });

      req.on("timeout", () => {
        req.destroy();
        setTimeout(checkServer, 500);
      });
    };

    // Start checking after a brief delay
    setTimeout(checkServer, 500);
  });
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize database by copying a template database
 */
function initializeDatabase(dbPath, templatePath) {
  log.info(`Initializing database at: ${dbPath}`);
  log.info(`Using template from: ${templatePath}`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template database not found at: ${templatePath}`);
  }

  try {
    fs.copyFileSync(templatePath, dbPath);
    log.info("Database template copied successfully");
  } catch (err) {
    throw new Error(`Failed to copy template: ${err.message}`);
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    log.info(`Starting Next.js server on port ${appPort}...`);

    // Ensure DB and Backups are in UserData to persist across updates
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "temeh.db");
    const backupDir = path.join(userDataPath, "backups");

    // In packaged app, use the unpacked directory (files extracted from asar)
    // The asarUnpack config in package.json extracts .next and node_modules
    const appPath = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked")
      : path.join(__dirname, "..");

    // For DB template, read from template.db in the root
    const templatePath = path.join(__dirname, "..", "template.db");

    // If database doesn't exist, create it from template
    if (!fs.existsSync(dbPath)) {
      log.info("Database not found. Initializing from template...");
      try {
        initializeDatabase(dbPath, templatePath);
        log.info(`Initialized new database at ${dbPath}`);
      } catch (err) {
        log.error(`Failed to initialize database: ${err.message}`);
      }
    } else {
      log.info(`Using existing database at ${dbPath}`);
    }

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // In packaged app, we use the standalone build
    // server.js is at the root of the unpacked app
    const serverScript = path.join(appPath, "server.js");

    // Use the bundled Node.js from Electron
    const nodeExecutable = process.execPath;

    let args;
    if (app.isPackaged) {
      // In standalone mode, we just run 'node server.js'
      args = [serverScript];
    } else {
      // In development or unpacked testing, use standard next start
      const nextBin = path.join(
        appPath,
        "node_modules",
        "next",
        "dist",
        "bin",
        "next",
      );
      args = [nextBin, "start", "-p", String(appPort)];
    }

    log.info(`App path: ${appPath}`);
    log.info(`Server script: ${serverScript}`);
    log.info(`Node executable: ${nodeExecutable}`);
    log.info(`Running: ${nodeExecutable} ${args.join(" ")}`);
    log.info(`Working directory: ${appPath}`);

    // Check if script/bin exists
    const targetScript = app.isPackaged ? serverScript : args[0];
    if (!fs.existsSync(targetScript)) {
      log.error(`Server script/binary not found at: ${targetScript}`);
    }

    serverProcess = spawn(nodeExecutable, args, {
      cwd: appPath,
      env: {
        ...process.env,
        PORT: String(appPort),
        NODE_ENV: "production",
        SQLITE_DB_PATH: dbPath,
        BACKUP_DIR: backupDir,
        UPLOAD_DIR: path.join(userDataPath, "uploads"), // Store uploads in userData for persistence
        ELECTRON_RUN_AS_NODE: "1", // Make Electron act as Node.js
      },
    });

    let serverReady = false;
    const serverTimeout = setTimeout(() => {
      if (!serverReady) {
        log.warn("Server startup timeout (30s), proceeding anyway...");
        resolve(); // Proceed anyway, retry logic in createWindow will handle it
      }
    }, 30000); // 30 second timeout

    serverProcess.on("error", (err) => {
      log.error(`Failed to start server process: ${err.message}`);
      log.error(`Error code: ${err.code}`);
      clearTimeout(serverTimeout);
      reject(err);
    });

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      log.info(`[Server]: ${output}`);
      if (logsWindow) {
        logsWindow.webContents.send("server-log", output);
      }
      // Detect when server is ready
      if (!serverReady && output.includes("Ready")) {
        serverReady = true;
        clearTimeout(serverTimeout);
        log.info("Server is ready, proceeding to create window...");
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      const output = data.toString();
      log.error(`[Server Error]: ${output}`);
      if (logsWindow) {
        logsWindow.webContents.send("server-log", `ERROR: ${output}`);
      }
    });

    serverProcess.on("exit", (code) => {
      log.info(`Server process exited with code ${code}`);
    });
  });
}

app.on("ready", async () => {
  loadConfig();
  buildMenu();
  setupAboutPanel();

  // App runs freely without license verification
  log.info("Starting TEMEH application...");
  {
    // Only start the internal server in production
    // In dev, we use the external 'npm run dev' server
    if (!isDev) {
      try {
        await startServer(); // Wait for server to be ready
        log.info("Server started successfully, creating window...");
      } catch (err) {
        log.error("Failed to start server:", err.message);
        // Proceed anyway - retry logic in createWindow will handle connection issues
      }
    } else {
      // In dev mode, send a log message explaining why logs aren't streaming
      // (because the server is running in a separate process we don't control here)
      setTimeout(() => {
        if (logsWindow) {
          logsWindow.webContents.send(
            "server-log",
            "DEV MODE: Application is running via 'npm run dev'.",
          );
          logsWindow.webContents.send(
            "server-log",
            "Server logs are visible in your terminal, not here.",
          );
          logsWindow.webContents.send(
            "server-log",
            "----------------------------------------",
          );
          logsWindow.webContents.send(
            "server-log",
            `Next.js Dev Server: http://localhost:9002`,
          );
          logsWindow.webContents.send("server-log", `Electron Wrapper: Active`);
        }
      }, 2000);
    }

    createWindow();
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error("Auto-updater error:", err.message);
    });
  }
});

app.on("window-all-closed", () => {
  tunnel.stopTunnel(); // Ensure tunnel process is killed
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle("get-network-info", () => {
  return {
    addresses: getNetworkAddress(),
    port: appPort,
  };
});

ipcMain.handle("start-tunnel", async () => {
  try {
    // In dev mode, we tunnel to 9002 (dev server). In prod, to appPort.
    const tunnelPort = isDev ? 9002 : appPort;
    const url = await tunnel.startTunnel(tunnelPort);
    return { success: true, url };
  } catch (error) {
    log.error("Failed to start tunnel:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("stop-tunnel", async () => {
  try {
    const stopped = tunnel.stopTunnel();
    return { success: true, stopped };
  } catch (error) {
    log.error("Failed to stop tunnel:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-tunnel-status", async () => {
  return tunnel.getTunnelStatus();
});

ipcMain.on("open-data-folder", async () => {
  const userDataPath = app.getPath("userData");
  await shell.openPath(userDataPath);
});

// Restart app handler
ipcMain.on("restart-app", () => {
  app.relaunch();
  app.quit();
});

ipcMain.on("open-logs-window", () => {
  if (logsWindow) {
    logsWindow.focus();
    return;
  }

  logsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "System Logs & Network",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Simple HTML for logs
  const logHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>TEMEH Logs</title>
            <style>
                body { background: #1e1e1e; color: #d4d4d4; font-family: monospace; padding: 20px; }
                #logs { white-space: pre-wrap; height: 400px; overflow-y: auto; border: 1px solid #333; padding: 10px; margin-top: 10px; }
                .address { color: #4ec9b0; font-weight: bold; }
                h2 { color: #569cd6; }
            </style>
        </head>
        <body>
            <h2>TEMEH Server Info</h2>
            <div>Active Port: <b>${appPort}</b></div>
            <div>Network Addresses: <span id="addresses" class="address">Loading...</span></div>
            <div id="logs">Waiting for logs...</div>
            <script>
                const { ipcRenderer } = require('electron');
                const logsDiv = document.getElementById('logs');
                const addrDiv = document.getElementById('addresses');

                ipcRenderer.invoke('get-network-info').then(info => {
                    addrDiv.innerText = info.addresses.join(', ');
                });

                ipcRenderer.on('server-log', (event, data) => {
                    const p = document.createElement('div');
                    p.innerText = data;
                    logsDiv.appendChild(p);
                    logsDiv.scrollTop = logsDiv.scrollHeight;
                });
            </script>
        </body>
        </html>
    `;

  logsWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(logHtml)}`,
  );
  logsWindow.on("closed", () => {
    logsWindow = null;
  });
});
