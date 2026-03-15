// electron-builder afterPack hook
// This runs AFTER electron-builder packages the app but BEFORE signing
// We use this to replace ALL native modules with Electron-compatible versions

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function (context) {
    console.log('afterPack: Replacing native modules with Electron-compatible versions...');

    const appOutDir = context.appOutDir;
    const resourcesDir = path.join(appOutDir, 'resources');
    const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked');

    console.log(`  App output dir: ${appOutDir}`);
    console.log(`  Unpacked dir: ${unpackedDir}`);

    // Get Electron version
    const electronPkg = require('electron/package.json');
    const electronVersion = electronPkg.version;
    console.log(`  Electron version: ${electronVersion}`);

    // First, we need to download the correct prebuilt for Electron
    // Use a temp directory
    const tempDir = path.join(__dirname, '..', '.temp-afterpack');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempBetterSqlite3 = path.join(tempDir, 'better-sqlite3');
    if (!fs.existsSync(tempBetterSqlite3)) {
        fs.mkdirSync(tempBetterSqlite3, { recursive: true });
    }

    // Copy package.json from the original module
    const betterSqlite3Src = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');
    fs.copyFileSync(
        path.join(betterSqlite3Src, 'package.json'),
        path.join(tempBetterSqlite3, 'package.json')
    );

    if (fs.existsSync(path.join(betterSqlite3Src, 'binding.gyp'))) {
        fs.copyFileSync(
            path.join(betterSqlite3Src, 'binding.gyp'),
            path.join(tempBetterSqlite3, 'binding.gyp')
        );
    }

    // Download the Electron prebuilt binary
    console.log(`  Downloading prebuilt for Electron ${electronVersion}...`);
    try {
        execSync(`npx prebuild-install --runtime electron --target ${electronVersion} --arch x64 --force`, {
            cwd: tempBetterSqlite3,
            stdio: 'inherit'
        });
    } catch (err) {
        console.error('  Failed to download prebuilt:', err.message);
        throw err;
    }

    // Find the downloaded .node file
    const electronNodeFile = path.join(tempBetterSqlite3, 'build', 'Release', 'better_sqlite3.node');

    if (!fs.existsSync(electronNodeFile)) {
        throw new Error(`Electron native module not found at: ${electronNodeFile}`);
    }

    console.log(`  Found Electron native module: ${electronNodeFile}`);

    // Now find ALL better_sqlite3.node files in the unpacked directory and replace them
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

    const targetFiles = findFiles(unpackedDir, 'better_sqlite3.node');
    console.log(`  Found ${targetFiles.length} native module(s) to replace:`);

    for (const targetFile of targetFiles) {
        console.log(`    Replacing: ${targetFile}`);
        fs.copyFileSync(electronNodeFile, targetFile);
        console.log(`    ✓ Replaced`);
    }

    // Cleanup temp dir
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
        // Ignore cleanup errors
    }

    console.log('afterPack: Native module replacement complete.');
};
