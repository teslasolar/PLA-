/**
 * PLA Designer - Structural Analysis
 */
import { state, getConnectedSpans } from './state.js';

// Load NESC specs
let nescSpecs = null;
export async function loadNESCSpecs() {
    const res = await fetch('../specs/nesc.json');
    nescSpecs = await res.json();
    return nescSpecs;
}

// Get overload factor
export function getOverloadFactor(grade = 'C', isCrossing = false) {
    const key = isCrossing ? 'crossings' : 'else';
    return nescSpecs?.loading?.overload_factors?.[`grade_${grade.toLowerCase()}`]?.[key] || 2.2;
}

// Calculate wind force on conductor
export function windForceOnConductor(span, windPressure = 4) {
    // F = pressure * projected_area
    // Simplified: assume 0.5" conductor diameter
    const diameter = 0.5 / 12; // ft
    return windPressure * diameter * span;
}

// Calculate wind force on pole
export function windForceOnPole(height, avgDiameter = 0.5) {
    const windPressure = 4; // psf
    return windPressure * avgDiameter * height;
}

// Calculate ground-line moment for a pole
export function calculateMoment(poleId, windPressure = 4) {
    const pole = state.poles.find(p => p.id === poleId);
    if (!pole) return 0;

    let moment = 0;
    const connectedSpans = getConnectedSpans(poleId);

    // Conductor loads
    connectedSpans.forEach(span => {
        const windSpan = span.length * 3.28084 / 2; // Half span in ft
        const conductorForce = windForceOnConductor(windSpan, windPressure) * span.phases;
        const attachHeight = pole.height * 0.9;
        moment += conductorForce * attachHeight;
    });

    // Pole wind load
    const poleForce = windForceOnPole(pole.height);
    const centroid = pole.height * 0.6; // Approximate centroid
    moment += poleForce * centroid;

    return moment;
}

// Calculate pole utilization
export function calculateUtilization(poleId, grade = 'C') {
    const pole = state.poles.find(p => p.id === poleId);
    if (!pole) return 0;

    const moment = calculateMoment(poleId);
    const factor = getOverloadFactor(grade);

    return (moment * factor / pole.capacity) * 100;
}

// Check if pole passes
export function checkPoleStatus(poleId, grade = 'C') {
    const util = calculateUtilization(poleId, grade);
    return {
        utilization: util,
        status: util <= 100 ? 'PASS' : 'FAIL',
        margin: 100 - util
    };
}

// Run full analysis
export function runAnalysis(grade = 'C') {
    const results = {
        poles: [],
        spans: [],
        summary: {
            totalPoles: state.poles.length,
            totalSpans: state.spans.length,
            totalLength: 0,
            maxUtilization: 0,
            failingPoles: 0,
            overallStatus: 'PASS'
        }
    };

    // Analyze each pole
    state.poles.forEach(pole => {
        const moment = calculateMoment(pole.id);
        const factor = getOverloadFactor(grade);
        const utilization = (moment * factor / pole.capacity) * 100;
        const status = utilization <= 100 ? 'PASS' : 'FAIL';

        results.poles.push({
            id: pole.id,
            poleClass: pole.poleClass,
            height: pole.height,
            capacity: pole.capacity,
            moment: Math.round(moment),
            factor,
            utilization: utilization.toFixed(1),
            status,
            recommendation: utilization > 100 ?
                `Upgrade to Class ${getRecommendedClass(moment * factor)}` : null
        });

        if (utilization > results.summary.maxUtilization) {
            results.summary.maxUtilization = utilization;
        }
        if (status === 'FAIL') {
            results.summary.failingPoles++;
        }
    });

    // Analyze spans
    state.spans.forEach(span => {
        const lengthFt = span.length * 3.28084;
        results.summary.totalLength += lengthFt;

        results.spans.push({
            id: span.id,
            pole1: span.pole1,
            pole2: span.pole2,
            length: lengthFt.toFixed(1),
            phases: span.phases,
            sag: span.sag,
            conductor: span.conductor
        });
    });

    // Overall status
    results.summary.overallStatus = results.summary.failingPoles > 0 ? 'FAIL' : 'PASS';
    results.summary.maxUtilization = results.summary.maxUtilization.toFixed(1);
    results.summary.totalLength = results.summary.totalLength.toFixed(0);

    return results;
}

// Get recommended pole class for given moment
export function getRecommendedClass(requiredCapacity) {
    const classes = ['7', '6', '5', '4', '3', '2', '1', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    const capacities = [1200, 1500, 1900, 2400, 3000, 3700, 4500, 6400, 8000, 10000, 12400, 16000, 19800];

    for (let i = 0; i < classes.length; i++) {
        if (capacities[i] >= requiredCapacity) {
            return classes[i];
        }
    }
    return 'H6+';
}

// Check clearance
export function checkClearance(attachmentHeight, sag, groundElevation = 0, type = 'roads') {
    const minClearance = attachmentHeight - sag - groundElevation;
    const required = nescSpecs?.clearances?.ground?.voltages?.['750-22000']?.[type] || 18.5;

    return {
        actual: minClearance,
        required,
        margin: minClearance - required,
        status: minClearance >= required ? 'PASS' : 'FAIL'
    };
}

// Generate report
export function generateReport(grade = 'C') {
    const analysis = runAnalysis(grade);
    const lines = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('           PLA STRUCTURAL ANALYSIS REPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push(`Date: ${new Date().toLocaleString()}`);
    lines.push(`Grade: ${grade}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`Total Poles:        ${analysis.summary.totalPoles}`);
    lines.push(`Total Spans:        ${analysis.summary.totalSpans}`);
    lines.push(`Total Length:       ${analysis.summary.totalLength} ft`);
    lines.push(`Max Utilization:    ${analysis.summary.maxUtilization}%`);
    lines.push(`Failing Poles:      ${analysis.summary.failingPoles}`);
    lines.push(`Overall Status:     ${analysis.summary.overallStatus}`);
    lines.push('');
    lines.push('POLE ANALYSIS');
    lines.push('───────────────────────────────────────────────────────────');

    analysis.poles.forEach(pole => {
        lines.push(`${pole.id} (Class ${pole.poleClass}, ${pole.height}ft)`);
        lines.push(`  Moment:      ${pole.moment} / ${pole.capacity} lb-ft`);
        lines.push(`  Utilization: ${pole.utilization}%`);
        lines.push(`  Status:      ${pole.status}`);
        if (pole.recommendation) {
            lines.push(`  ⚠️  ${pole.recommendation}`);
        }
        lines.push('');
    });

    lines.push('SPAN ANALYSIS');
    lines.push('───────────────────────────────────────────────────────────');

    analysis.spans.forEach(span => {
        lines.push(`${span.id}: ${span.pole1} → ${span.pole2}`);
        lines.push(`  Length: ${span.length} ft | Phases: ${span.phases} | Sag: ${span.sag}m`);
    });

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
}

export default {
    loadNESCSpecs,
    getOverloadFactor,
    calculateMoment,
    calculateUtilization,
    checkPoleStatus,
    runAnalysis,
    getRecommendedClass,
    checkClearance,
    generateReport
};
