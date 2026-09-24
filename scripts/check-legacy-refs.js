const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = [
  'public',
  'src',
  'scripts',
  'js'
];

const FILES_TO_SCAN = [
  'server.js'
];

const EXTENSIONS_TO_SCAN = ['.js', '.html'];
const PATTERN = /firebase/i;

const ALLOWLIST_FILES = [
  'migration_breakage_report.md',
  'audit_report.md',
  'patch',
  'check-legacy-refs.js' // This script itself
];

let foundLegacyRefs = false;

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  if (!EXTENSIONS_TO_SCAN.includes(ext)) return false;
  
  const baseName = path.basename(filePath);
  if (ALLOWLIST_FILES.some(allowed => baseName.includes(allowed))) {
    return false;
  }
  
  return true;
}

function scanFile(filePath) {
  if (!shouldScanFile(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (PATTERN.test(lines[i])) {
        // Skip some common false positives if needed, e.g. "firebase-admin" if it were allowed
        // But the user requested complete scrubbing of "firebase"
        console.error(`\x1b[31m[Legacy Ref Found]\x1b[0m ${filePath}:${i + 1}`);
        console.error(`  > ${lines[i].trim()}`);
        foundLegacyRefs = true;
      }
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

console.log('🔍 Scanning for legacy Firebase references...');

// Scan directories
DIRECTORIES_TO_SCAN.forEach(dir => {
  scanDirectory(path.resolve(__dirname, '..', dir));
});

// Scan specific files
FILES_TO_SCAN.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    scanFile(fullPath);
  }
});

if (foundLegacyRefs) {
  console.error('\n\x1b[31m❌ Legacy Firebase references found! Please remove them before committing.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m✅ No legacy Firebase references found.\x1b[0m');
  process.exit(0);
}
