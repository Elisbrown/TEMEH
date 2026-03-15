const JavaScriptObfuscator = require("javascript-obfuscator");
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const nextDir = path.join(__dirname, "..", ".next");
const MAX_FILE_SIZE = 500 * 1024; // 500KB limit

console.log("Starting obfuscation of .next directory...");
console.log(`Skipping files larger than ${MAX_FILE_SIZE / 1024}KB\n`);

// Glob for all JS files in .next/static
const files = glob.sync("**/*.js", {
  cwd: nextDir,
  absolute: true,
  ignore: ["**/node_modules/**"],
});

const total = files.length;
let processed = 0;
let skipped = 0;
let errors = 0;

console.log(`Found ${total} JS files to process.\n`);

// Lighter obfuscation config for faster processing
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: false, // Disabled for speed
  deadCodeInjection: false, // Disabled for speed
  debugProtection: false,
  selfDefending: false,
  stringArray: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.5, // Reduced threshold
  transformObjectKeys: false, // Disabled for speed
  unicodeEscapeSequence: false,
};

const startTime = Date.now();

files.forEach((file, index) => {
  try {
    const stats = fs.statSync(file);

    // Skip large files
    if (stats.size > MAX_FILE_SIZE) {
      skipped++;
      processed++;
      return;
    }

    const code = fs.readFileSync(file, "utf8");
    const obfuscationResult = JavaScriptObfuscator.obfuscate(
      code,
      obfuscationOptions
    );
    fs.writeFileSync(file, obfuscationResult.getObfuscatedCode());
    processed++;
  } catch (e) {
    errors++;
    processed++;
  }

  // Show progress every 50 files or at the end
  if (processed % 50 === 0 || processed === total) {
    const percent = ((processed / total) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(
      `\rProgress: ${percent}% (${processed}/${total}) | Elapsed: ${elapsed}s | Skipped: ${skipped} | Errors: ${errors}`
    );
  }
});

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n\nObfuscation complete in ${totalTime}s`);
console.log(`  Processed: ${processed - skipped - errors}`);
console.log(`  Skipped (>500KB): ${skipped}`);
console.log(`  Errors: ${errors}`);
