/**
 * JSON Validation Tests
 * Validates all JSON files in the project
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const errors = [];
let passed = 0;
let failed = 0;

function findJsonFiles(dir, files = []) {
    const items = readdirSync(dir);
    for (const item of items) {
        const path = join(dir, item);
        if (item.startsWith('.') || item === 'node_modules') continue;
        if (statSync(path).isDirectory()) {
            findJsonFiles(path, files);
        } else if (extname(item) === '.json') {
            files.push(path);
        }
    }
    return files;
}

function validateJson(file) {
    try {
        const content = readFileSync(file, 'utf8');
        JSON.parse(content);
        console.log(`  ✓ ${file}`);
        passed++;
        return true;
    } catch (e) {
        console.log(`  ✗ ${file}: ${e.message}`);
        errors.push({ file, error: e.message });
        failed++;
        return false;
    }
}

function validateDesignerSpecs() {
    console.log('\n📋 Validating Designer Specs Structure...');

    // Validate poles.json structure
    try {
        const poles = JSON.parse(readFileSync('docs/designer/specs/poles.json', 'utf8'));
        if (!poles.classes) throw new Error('Missing classes');
        if (!poles.materials) throw new Error('Missing materials');
        const classCount = Object.keys(poles.classes).length;
        console.log(`  ✓ poles.json: ${classCount} pole classes defined`);
        passed++;
    } catch (e) {
        console.log(`  ✗ poles.json structure: ${e.message}`);
        errors.push({ file: 'poles.json', error: e.message });
        failed++;
    }

    // Validate conductors.json structure
    try {
        const cond = JSON.parse(readFileSync('docs/designer/specs/conductors.json', 'utf8'));
        if (!cond.acsr) throw new Error('Missing ACSR conductors');
        const acsrCount = Object.keys(cond.acsr).length;
        console.log(`  ✓ conductors.json: ${acsrCount} ACSR conductors defined`);
        passed++;
    } catch (e) {
        console.log(`  ✗ conductors.json structure: ${e.message}`);
        errors.push({ file: 'conductors.json', error: e.message });
        failed++;
    }

    // Validate nesc.json structure
    try {
        const nesc = JSON.parse(readFileSync('docs/designer/specs/nesc.json', 'utf8'));
        if (!nesc.clearances) throw new Error('Missing clearances');
        if (!nesc.loading) throw new Error('Missing loading');
        console.log(`  ✓ nesc.json: clearances and loading defined`);
        passed++;
    } catch (e) {
        console.log(`  ✗ nesc.json structure: ${e.message}`);
        errors.push({ file: 'nesc.json', error: e.message });
        failed++;
    }

    // Validate palette.json structure
    try {
        const palette = JSON.parse(readFileSync('docs/designer/palette.json', 'utf8'));
        if (!palette.categories) throw new Error('Missing categories');
        const catCount = palette.categories.length;
        const itemCount = palette.categories.reduce((sum, c) => sum + c.items.length, 0);
        console.log(`  ✓ palette.json: ${catCount} categories, ${itemCount} items`);
        passed++;
    } catch (e) {
        console.log(`  ✗ palette.json structure: ${e.message}`);
        errors.push({ file: 'palette.json', error: e.message });
        failed++;
    }
}

// Main
console.log('🔍 JSON Validation\n');
console.log('📁 Finding JSON files...');
const jsonFiles = findJsonFiles('.');
console.log(`   Found ${jsonFiles.length} JSON files\n`);

console.log('📋 Validating JSON syntax...');
for (const file of jsonFiles) {
    validateJson(file);
}

validateDesignerSpecs();

console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   ${e.file}: ${e.error}`));
    process.exit(1);
} else {
    console.log('\n✅ All JSON files valid!');
    process.exit(0);
}
