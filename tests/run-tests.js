/**
 * PLA Test Runner
 * Runs all validation tests
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const tests = [
    { name: 'JSON Validation', script: 'validate-json.js' },
    { name: 'HTML Validation', script: 'validate-html.js' },
    { name: 'JavaScript Validation', script: 'validate-js.js' }
];

let passed = 0;
let failed = 0;

async function runTest(test) {
    return new Promise((resolve) => {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🧪 Running: ${test.name}`);
        console.log('═'.repeat(60) + '\n');

        const proc = spawn('node', [join(__dirname, test.script)], {
            stdio: 'inherit',
            cwd: process.cwd()
        });

        proc.on('close', (code) => {
            if (code === 0) {
                passed++;
                resolve(true);
            } else {
                failed++;
                resolve(false);
            }
        });

        proc.on('error', (err) => {
            console.log(`Error running ${test.name}: ${err.message}`);
            failed++;
            resolve(false);
        });
    });
}

async function main() {
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(15) + 'PLA TEST SUITE' + ' '.repeat(29) + '║');
    console.log('║' + ' '.repeat(12) + 'Pole Line Analysis System' + ' '.repeat(21) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');

    const startTime = Date.now();

    for (const test of tests) {
        await runTest(test);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   Tests run:    ${tests.length}`);
    console.log(`   Passed:       ${passed}`);
    console.log(`   Failed:       ${failed}`);
    console.log(`   Duration:     ${duration}s`);
    console.log('═'.repeat(60));

    if (failed > 0) {
        console.log('\n❌ Some tests failed!\n');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!\n');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
