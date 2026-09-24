const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dirsToCheck = [
  path.join(__dirname, '../public/js'),
  path.join(__dirname, '../js')
];

let hasError = false;

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      try {
        // Run node --check
        // On Windows we must quote paths, though execSync handles simple ones well if wrapped
        execSync(`node --check "${fullPath}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (err) {
        console.error(`\n❌ Syntax Error in: ${fullPath}`);
        // Log the stderr from node --check which has the exact error
        if (err.stderr) {
          console.error(err.stderr.toString());
        } else {
          console.error(err.message);
        }
        hasError = true;
      }
    }
  }
}

console.log('🔍 Running syntax checks on frontend JS files...');
dirsToCheck.forEach(checkDir);

if (hasError) {
  console.error('🚨 Syntax errors found! Pre-commit check failed.');
  process.exit(1);
} else {
  console.log('✅ All JS files passed syntax check.');
  process.exit(0);
}
