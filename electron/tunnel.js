const { spawn } = require("child_process");
const path = require("path");
const { app } = require("electron");
const log = require("electron-log");

let tunnelProcess = null;
let currentUrl = null; // Store the current tunnel URL

/**
 * Get the path to the bundled cloudflared binary.
 * In dev: resources/bin/cloudflared
 * In prod: resources/bin/cloudflared (relative to app executable)
 */
function getBinaryPath() {
  const isDev = !app.isPackaged;
  const binaryName = process.platform === "win32" ? "cloudflared.exe" : "cloudflared";
  if (isDev) {
    return path.join(process.cwd(), "resources", "bin", binaryName);
  } else {
    // In production, extraResources puts it in Contents/Resources/bin on Mac
    return path.join(process.resourcesPath, "bin", binaryName);
  }
}

/**
 * Start the Cloudflare Tunnel.
 * @param {string} localPort - The local port to expose (e.g. 2304)
 * @returns {Promise<string>} - The public URL
 */
function startTunnel(localPort) {
  return new Promise((resolve, reject) => {
    if (tunnelProcess) {
      reject(new Error("Tunnel is already running"));
      return;
    }

    const binaryPath = getBinaryPath();
    log.info(`Starting cloudflared from: ${binaryPath}`);

    // Command: cloudflared volume --url http://localhost:PORT
    // 'volume' ?? No, 'tunnel --url'. Old versions used 'tunnel'.
    // Command: cloudflared tunnel --url http://localhost:PORT

    tunnelProcess = spawn(binaryPath, [
      "tunnel",
      "--url",
      `http://localhost:${localPort}`,
    ], {
      cwd: path.dirname(binaryPath) // Ensure valid CWD
    });

    let resolved = false;

    tunnelProcess.stdout.on("data", (data) => {
      log.info(`[Cloudflared]: ${data}`);
    });

    tunnelProcess.stderr.on("data", (data) => {
      const output = data.toString();
      log.info(`[Cloudflared Stderr]: ${output}`); // Log stderr to see errors

      // Look for the URL in the output
      // Example: https://random-name.trycloudflare.com
      // We explicitly ignore api.trycloudflare.com which sometimes appears in logs
      const regex = /https?:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g;
      let match;

      while ((match = regex.exec(output)) !== null) {
        const url = match[0];
        if (!url.includes('api.trycloudflare.com') && !resolved) {
          resolved = true;
          currentUrl = url; // Store the URL
          log.info(`Tunnel started at: ${url}`);
          resolve(url);
          break;
        }
      }
    });

    tunnelProcess.on("close", (code) => {
      log.info(`cloudflared exited with code ${code}`);
      tunnelProcess = null;
      currentUrl = null; // Clear URL when tunnel stops
      if (!resolved) {
        reject(new Error(`Tunnel process exited with code ${code}`));
      }
    });

    tunnelProcess.on("error", (err) => {
      log.error("Failed to start cloudflared:", err);
      reject(err);
    });
  });
}

function stopTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    currentUrl = null; // Clear URL when stopped
    log.info("Tunnel stopped");
    return true;
  }
  return false;
}

function getTunnelStatus() {
  return {
    isRunning: !!tunnelProcess,
    url: currentUrl, // Include the URL in status
  };
}

module.exports = {
  startTunnel,
  stopTunnel,
  getTunnelStatus,
};
