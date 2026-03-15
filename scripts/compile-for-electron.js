/**
 * Compile main.js to bytecode using Electron's Node.js runtime.
 * This ensures the bytecode is compatible with the Electron version.
 */
const { spawn } = require('child_process');
const path = require('path');

const electronPath = require('electron');
const bytenodePath = require.resolve('bytenode/lib/cli.js');
const mainJsPath = path.join(__dirname, '..', 'electron', 'main.js');

console.log('Compiling main.js to bytecode using Electron runtime...');
console.log(`  Electron: ${electronPath}`);
console.log(`  Bytenode: ${bytenodePath}`);
console.log(`  Target:   ${mainJsPath}`);
console.log('');

const startTime = Date.now();

// Run Electron as a Node.js process (no GUI, no Electron-specific flags needed)
const child = spawn(electronPath, [
    bytenodePath,
    '--compile',
    mainJsPath
], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',  // Run Electron as a regular Node.js process
    },
});

child.on('error', (error) => {
    console.error('Failed to start Electron:', error.message);
    process.exit(1);
});

child.on('close', (code) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (code === 0) {
        console.log(`Bytecode compilation complete in ${elapsed}s!`);
        process.exit(0);
    } else {
        console.error(`Bytecode compilation failed with code ${code} after ${elapsed}s`);
        process.exit(code);
    }
});
