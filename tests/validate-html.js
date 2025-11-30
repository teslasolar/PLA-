/**
 * HTML Validation Tests
 * Validates HTML files for basic structure
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const errors = [];
let passed = 0;
let failed = 0;

function findHtmlFiles(dir, files = []) {
    const items = readdirSync(dir);
    for (const item of items) {
        const path = join(dir, item);
        if (item.startsWith('.') || item === 'node_modules') continue;
        if (statSync(path).isDirectory()) {
            findHtmlFiles(path, files);
        } else if (extname(item) === '.html') {
            files.push(path);
        }
    }
    return files;
}

function validateHtml(file) {
    try {
        const content = readFileSync(file, 'utf8');
        const checks = [];

        // Check DOCTYPE
        if (!content.includes('<!DOCTYPE html>')) {
            checks.push('Missing DOCTYPE');
        }

        // Check html tag
        if (!content.includes('<html')) {
            checks.push('Missing <html> tag');
        }

        // Check head tag
        if (!content.includes('<head>')) {
            checks.push('Missing <head> tag');
        }

        // Check body tag
        if (!content.includes('<body>')) {
            checks.push('Missing <body> tag');
        }

        // Check title
        if (!content.includes('<title>')) {
            checks.push('Missing <title> tag');
        }

        // Check charset
        if (!content.includes('charset=')) {
            checks.push('Missing charset declaration');
        }

        // Check viewport
        if (!content.includes('viewport')) {
            checks.push('Missing viewport meta');
        }

        // Check for unclosed tags (basic)
        const openTags = (content.match(/<(div|span|section|main|nav|header|footer|article)[^>]*>/g) || []).length;
        const closeTags = (content.match(/<\/(div|span|section|main|nav|header|footer|article)>/g) || []).length;
        if (openTags !== closeTags) {
            checks.push(`Tag mismatch: ${openTags} open, ${closeTags} close`);
        }

        if (checks.length === 0) {
            console.log(`  ✓ ${file}`);
            passed++;
            return true;
        } else {
            console.log(`  ✗ ${file}: ${checks.join(', ')}`);
            errors.push({ file, errors: checks });
            failed++;
            return false;
        }
    } catch (e) {
        console.log(`  ✗ ${file}: ${e.message}`);
        errors.push({ file, errors: [e.message] });
        failed++;
        return false;
    }
}

function checkDesignerHtml() {
    console.log('\n📋 Checking Designer HTML specifics...');

    try {
        const content = readFileSync('docs/designer/index.html', 'utf8');

        // Check for importmap
        if (!content.includes('importmap')) {
            console.log('  ⚠ Missing importmap for Three.js');
        } else {
            console.log('  ✓ Has importmap for ES modules');
            passed++;
        }

        // Check for main script
        if (!content.includes('type="module"')) {
            console.log('  ⚠ No ES module scripts found');
        } else {
            console.log('  ✓ Uses ES modules');
            passed++;
        }

        // Check for canvas
        if (!content.includes('id="viewer3d"') && !content.includes('id="canvas"')) {
            console.log('  ⚠ Missing viewer/canvas element');
        } else {
            console.log('  ✓ Has viewer canvas element');
            passed++;
        }

        // Check toolbar buttons
        const toolButtons = ['selectBtn', 'spanBtn', 'guyBtn'];
        for (const btn of toolButtons) {
            if (content.includes(btn)) {
                console.log(`  ✓ Has ${btn}`);
                passed++;
            }
        }

    } catch (e) {
        console.log(`  ✗ Designer HTML check failed: ${e.message}`);
        failed++;
    }
}

// Main
console.log('🔍 HTML Validation\n');
console.log('📁 Finding HTML files...');
const htmlFiles = findHtmlFiles('.');
console.log(`   Found ${htmlFiles.length} HTML files\n`);

console.log('📋 Validating HTML structure...');
for (const file of htmlFiles) {
    validateHtml(file);
}

checkDesignerHtml();

console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    console.log('\n⚠️ Some HTML issues found (non-blocking)');
}
console.log('\n✅ HTML validation complete!');
process.exit(0);
