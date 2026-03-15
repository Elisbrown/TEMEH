const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const staticSrc = path.join(projectRoot, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(projectRoot, 'public');
const publicDest = path.join(standaloneDir, 'public');

console.log('Preparing standalone build...');

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy .next/static
if (fs.existsSync(staticSrc)) {
    console.log(`Copying static assets: ${staticSrc} -> ${staticDest}`);
    copyDir(staticSrc, staticDest);
} else {
    console.warn(`Warning: Static assets not found at ${staticSrc}`);
}

// Copy public
if (fs.existsSync(publicSrc)) {
    console.log(`Copying public assets: ${publicSrc} -> ${publicDest}`);
    copyDir(publicSrc, publicDest);
} else {
    console.warn(`Warning: Public assets not found at ${publicSrc}`);
}

console.log('Standalone build preparation complete.');

// Download better-sqlite3 prebuilt for Electron
// We do NOT modify node_modules - that would break the system Node.js build
// Instead, we download to a temp location and then copy to the standalone/next directories

console.log('Downloading better-sqlite3 prebuilt for Electron...');

// Get Electron version
const electronPkg = require('electron/package.json');
const electronVersion = electronPkg.version;
console.log(`  Electron version: ${electronVersion}`);

// Get better-sqlite3 version
const betterSqlite3Pkg = require('better-sqlite3/package.json');
const betterSqlite3Version = betterSqlite3Pkg.version;
console.log(`  better-sqlite3 version: ${betterSqlite3Version}`);

// Create temp directory for download
const tempDir = path.join(projectRoot, '.temp-electron-rebuild');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Download using prebuild-install in temp directory (creates its own copy)
const tempBetterSqlite3 = path.join(tempDir, 'better-sqlite3');
if (!fs.existsSync(tempBetterSqlite3)) {
    fs.mkdirSync(tempBetterSqlite3, { recursive: true });
}

// Copy package.json to temp dir so prebuild-install knows what to download
fs.copyFileSync(
    path.join(projectRoot, 'node_modules', 'better-sqlite3', 'package.json'),
    path.join(tempBetterSqlite3, 'package.json')
);

// Also copy binding.gyp if it exists
const bindingGypSrc = path.join(projectRoot, 'node_modules', 'better-sqlite3', 'binding.gyp');
if (fs.existsSync(bindingGypSrc)) {
    fs.copyFileSync(bindingGypSrc, path.join(tempBetterSqlite3, 'binding.gyp'));
}

try {
    console.log(`  Downloading prebuilt binary for Electron ${electronVersion}...`);
    execSync(`npx prebuild-install --runtime electron --target ${electronVersion} --arch x64 --force`, {
        cwd: tempBetterSqlite3,
        stdio: 'inherit'
    });
    console.log('  ✓ Prebuilt binary downloaded');
} catch (error) {
    console.error('  Failed to download prebuilt:', error.message);

    // Fallback: use @electron/rebuild which WILL modify node_modules but we'll back it up first
    console.log('  Attempting fallback with @electron/rebuild...');

    // Back up the current native module
    const currentNodeFile = path.join(projectRoot, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
    const backupNodeFile = path.join(tempDir, 'better_sqlite3.node.backup');

    if (fs.existsSync(currentNodeFile)) {
        console.log('  Backing up current native module...');
        fs.copyFileSync(currentNodeFile, backupNodeFile);
    }

    try {
        execSync(`npx @electron/rebuild -v ${electronVersion} -m ${projectRoot} -o better-sqlite3 --force`, {
            cwd: projectRoot,
            stdio: 'inherit'
        });
        console.log('  ✓ better-sqlite3 rebuilt for Electron');

        // Copy the rebuilt module to temp
        const rebuildDir = path.join(tempBetterSqlite3, 'build', 'Release');
        if (!fs.existsSync(rebuildDir)) {
            fs.mkdirSync(rebuildDir, { recursive: true });
        }
        fs.copyFileSync(currentNodeFile, path.join(rebuildDir, 'better_sqlite3.node'));

        // Restore the backup so system Node.js still works
        if (fs.existsSync(backupNodeFile)) {
            console.log('  Restoring backup for system Node.js...');
            fs.copyFileSync(backupNodeFile, currentNodeFile);
        }
    } catch (fallbackError) {
        console.error('  Fallback also failed:', fallbackError.message);

        // Restore backup if it exists
        if (fs.existsSync(backupNodeFile) && fs.existsSync(currentNodeFile + '.failed')) {
            fs.copyFileSync(backupNodeFile, currentNodeFile);
        }

        console.error('This is a critical error - the app will not work without the correct native module');
        process.exit(1);
    }
}

// Find the downloaded/rebuilt native module
const electronNodeFile = path.join(tempBetterSqlite3, 'build', 'Release', 'better_sqlite3.node');

// Also check prebuilds directory (prebuild-install puts files here)
const prebuildsDir = path.join(tempBetterSqlite3, 'prebuilds', 'win32-x64');
let sourceNodeFile = null;

if (fs.existsSync(electronNodeFile)) {
    sourceNodeFile = electronNodeFile;
    console.log(`Found native module at: ${electronNodeFile}`);
} else if (fs.existsSync(prebuildsDir)) {
    // Look for .node file in prebuilds
    const files = fs.readdirSync(prebuildsDir);
    for (const file of files) {
        if (file.endsWith('.node')) {
            sourceNodeFile = path.join(prebuildsDir, file);
            console.log(`Found native module in prebuilds: ${sourceNodeFile}`);
            break;
        }
    }
}

if (!sourceNodeFile) {
    console.error('ERROR: Could not find the Electron native module after download/rebuild');
    console.error('Checked locations:');
    console.error(`  - ${electronNodeFile}`);
    console.error(`  - ${prebuildsDir}`);
    process.exit(1);
}

// Recursively find all better_sqlite3.node files
function findFiles(dir, filename, results = []) {
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findFiles(fullPath, filename, results);
        } else if (entry.name === filename) {
            results.push(fullPath);
        }
    }
    return results;
}

// Find all better_sqlite3.node files in .next directory (standalone and node_modules)
const nextDir = path.join(projectRoot, '.next');
const targetFiles = findFiles(nextDir, 'better_sqlite3.node');

console.log(`Found ${targetFiles.length} native module(s) to replace in .next/:`);

for (const targetFile of targetFiles) {
    console.log(`  Replacing: ${targetFile}`);
    try {
        fs.copyFileSync(sourceNodeFile, targetFile);
        console.log(`  ✓ Replaced successfully`);
    } catch (err) {
        console.error(`  ✗ Failed to replace: ${err.message}`);
        process.exit(1);
    }
}

if (targetFiles.length === 0) {
    // Fallback: copy to standard location
    const standardPath = path.join(standaloneDir, 'node_modules', 'better-sqlite3', 'build', 'Release');
    if (!fs.existsSync(standardPath)) {
        fs.mkdirSync(standardPath, { recursive: true });
    }
    const destFile = path.join(standardPath, 'better_sqlite3.node');
    console.log(`No existing .node files found. Copying to standard path: ${destFile}`);
    fs.copyFileSync(sourceNodeFile, destFile);
}

// Clean up temp directory
try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Cleaned up temp directory.');
} catch (e) {
    // Ignore cleanup errors
}

console.log('Native module replacement complete.');
