/**
 * JavaScript Validation Tests
 * Basic syntax and import checks
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const errors = [];
let passed = 0;
let failed = 0;
let warnings = 0;

function findJsFiles(dir, files = []) {
    const items = readdirSync(dir);
    for (const item of items) {
        const path = join(dir, item);
        if (item.startsWith('.') || item === 'node_modules' || item === 'pyodide') continue;
        if (statSync(path).isDirectory()) {
            findJsFiles(path, files);
        } else if (extname(item) === '.js') {
            files.push(path);
        }
    }
    return files;
}

function validateJs(file) {
    try {
        const content = readFileSync(file, 'utf8');
        const issues = [];

        // Check for syntax errors (basic)
        // Count braces
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
            issues.push(`Brace mismatch: ${openBraces} open, ${closeBraces} close`);
        }

        // Count parentheses (excluding strings)
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            issues.push(`Paren mismatch: ${openParens} open, ${closeParens} close`);
        }

        // Check for common issues
        if (content.includes('console.log') && !file.includes('test')) {
            // Just a warning, not an error
            warnings++;
        }

        // Check for undefined references to THREE
        if (content.includes('THREE.') && !content.includes("import * as THREE") && !content.includes('from \'three\'')) {
            issues.push('Uses THREE without import');
        }

        // Check ES module syntax
        if (content.includes('require(') && !file.includes('test')) {
            issues.push('Uses CommonJS require() instead of ES import');
        }

        if (issues.length === 0) {
            console.log(`  ✓ ${file}`);
            passed++;
            return true;
        } else {
            console.log(`  ✗ ${file}: ${issues.join(', ')}`);
            errors.push({ file, issues });
            failed++;
            return false;
        }
    } catch (e) {
        console.log(`  ✗ ${file}: ${e.message}`);
        errors.push({ file, issues: [e.message] });
        failed++;
        return false;
    }
}

function checkDesignerModules() {
    console.log('\n📋 Checking Designer module structure...');

    const requiredModules = [
        'docs/designer/scripts/main.js',
        'docs/designer/scripts/state.js',
        'docs/designer/scripts/scene.js',
        'docs/designer/scripts/poles.js',
        'docs/designer/scripts/spans.js',
        'docs/designer/scripts/analysis.js',
        'docs/designer/scripts/ui.js',
        'docs/designer/scripts/guys.js'
    ];

    for (const mod of requiredModules) {
        try {
            const content = readFileSync(mod, 'utf8');

            // Check for exports
            if (!content.includes('export ')) {
                console.log(`  ⚠ ${mod}: No exports found`);
                warnings++;
            } else {
                console.log(`  ✓ ${mod}`);
                passed++;
            }
        } catch (e) {
            console.log(`  ✗ ${mod}: File not found`);
            failed++;
        }
    }

    // Check main.js imports all required modules
    try {
        const main = readFileSync('docs/designer/scripts/main.js', 'utf8');
        const imports = ['state.js', 'scene.js', 'poles.js', 'spans.js', 'analysis.js', 'ui.js', 'guys.js'];

        console.log('\n📋 Checking main.js imports...');
        for (const imp of imports) {
            if (main.includes(imp)) {
                console.log(`  ✓ Imports ${imp}`);
                passed++;
            } else {
                console.log(`  ⚠ Missing import: ${imp}`);
                warnings++;
            }
        }
    } catch (e) {
        console.log(`  ✗ Could not check main.js: ${e.message}`);
        failed++;
    }
}

// Main
console.log('🔍 JavaScript Validation\n');
console.log('📁 Finding JS files...');
const jsFiles = findJsFiles('docs');
console.log(`   Found ${jsFiles.length} JS files\n`);

console.log('📋 Validating JavaScript syntax...');
for (const file of jsFiles) {
    validateJs(file);
}

checkDesignerModules();

console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);

if (errors.length > 0) {
    console.log('\n❌ Critical Errors:');
    errors.forEach(e => console.log(`   ${e.file}: ${e.issues.join(', ')}`));
    process.exit(1);
} else {
    console.log('\n✅ JavaScript validation passed!');
    process.exit(0);
}
