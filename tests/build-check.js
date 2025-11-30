/**
 * Build Check
 * Verifies all required files exist for deployment
 */
import { existsSync, readFileSync, statSync } from 'fs';

const errors = [];
let passed = 0;

function checkFile(path, description) {
    if (existsSync(path)) {
        const size = statSync(path).size;
        console.log(`  ✓ ${description} (${formatSize(size)})`);
        passed++;
        return true;
    } else {
        console.log(`  ✗ ${description} - NOT FOUND`);
        errors.push(`Missing: ${path}`);
        return false;
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

console.log('🔍 Build Check\n');
console.log('═'.repeat(50));

// Core files
console.log('\n📁 Core Files:');
checkFile('index.html', 'Root index.html');
checkFile('README.md', 'README.md');
checkFile('package.json', 'package.json');

// Designer files
console.log('\n📁 Designer Application:');
checkFile('docs/designer/index.html', 'Designer HTML');
checkFile('docs/designer/styles.css', 'Designer CSS');
checkFile('docs/designer/params.json', 'Designer params');
checkFile('docs/designer/palette.json', 'Component palette');
checkFile('docs/designer/view.json', 'View config');

// Designer scripts
console.log('\n📁 Designer Scripts:');
checkFile('docs/designer/scripts/main.js', 'Main entry');
checkFile('docs/designer/scripts/state.js', 'State management');
checkFile('docs/designer/scripts/scene.js', 'Three.js scene');
checkFile('docs/designer/scripts/poles.js', 'Pole module');
checkFile('docs/designer/scripts/spans.js', 'Span module');
checkFile('docs/designer/scripts/analysis.js', 'Analysis module');
checkFile('docs/designer/scripts/ui.js', 'UI module');
checkFile('docs/designer/scripts/guys.js', 'Guy wire module');

// Designer specs
console.log('\n📁 Engineering Specs:');
checkFile('docs/designer/specs/poles.json', 'ANSI pole specs');
checkFile('docs/designer/specs/conductors.json', 'Conductor specs');
checkFile('docs/designer/specs/nesc.json', 'NESC clearances');

// Other modules
console.log('\n📁 Other Modules:');
checkFile('docs/index.html', 'App index');
checkFile('docs/core/index.html', 'Core modules');

// CI/CD
console.log('\n📁 CI/CD:');
checkFile('.github/workflows/ci.yml', 'CI workflow');
checkFile('.github/workflows/deploy.yml', 'Deploy workflow');

// Calculate total size
console.log('\n📊 Build Statistics:');
let totalSize = 0;
const countFiles = (dir) => {
    try {
        const { readdirSync, statSync } = require('fs');
        const { join } = require('path');
        let count = 0;
        const items = readdirSync(dir);
        for (const item of items) {
            if (item.startsWith('.') || item === 'node_modules') continue;
            const path = join(dir, item);
            const stat = statSync(path);
            if (stat.isDirectory()) {
                count += countFiles(path);
            } else {
                count++;
                totalSize += stat.size;
            }
        }
        return count;
    } catch { return 0; }
};

// Summary
console.log('\n' + '═'.repeat(50));
console.log(`Results: ${passed} files verified, ${errors.length} missing`);

if (errors.length > 0) {
    console.log('\n❌ Missing files:');
    errors.forEach(e => console.log(`   ${e}`));
    process.exit(1);
} else {
    console.log('\n✅ Build check passed - Ready for deployment!');
    process.exit(0);
}
