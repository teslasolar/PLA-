/**
 * PLA Designer - Structural Analysis (Optimized)
 */
import { state, getConnectedSpans } from './state.js';
import { totalGuyMoment, getGuysForPole, requiredGuySize } from './guys.js';

let nesc = null;

export async function loadNESCSpecs() {
    nesc = await fetch('../specs/nesc.json').then(r => r.json());
    return nesc;
}

// Overload factor (expanded from compressed keys)
export function getOverloadFactor(grade = 'C', isCross = false) {
    const g = nesc?.loading?.ovl?.[grade.toUpperCase()];
    return g ? (isCross ? g.x : g.e) : 2.2;
}

// Wind force on conductor
export function windOnConductor(span, windPsf = 4) {
    return windPsf * (0.5 / 12) * span; // 0.5" dia assumed
}

// Wind force on pole
export function windOnPole(height, avgDia = 0.5) {
    return 4 * avgDia * height;
}

// Ice load (lb/ft)
export function iceLoad(dia, district = 'medium') {
    const ice = nesc?.loading?.dist?.[district]?.ice || 0.25;
    return 1.24 * ice * (dia + ice); // π * ρ_ice * t * (d + t)
}

// Total conductor load with ice + wind
export function totalConductorLoad(span, condDia = 0.5, district = 'medium') {
    const wind = windOnConductor(span);
    const ice = iceLoad(condDia, district) * span;
    return Math.sqrt(wind * wind + ice * ice);
}

// Ground-line moment
export function calculateMoment(poleId, windPsf = 4) {
    const pole = state.poles.find(p => p.id === poleId);
    if (!pole) return 0;

    let moment = 0;
    const spans = getConnectedSpans(poleId);

    // Conductor wind loads
    spans.forEach(s => {
        const windSpan = s.length * 3.28084 / 2;
        const force = windOnConductor(windSpan, windPsf) * (s.phases || 3);
        moment += force * (pole.height * 0.9);
    });

    // Pole wind load
    moment += windOnPole(pole.height) * (pole.height * 0.6);

    return moment;
}

// Utilization with guy resistance
export function calculateUtilization(poleId, grade = 'C') {
    const pole = state.poles.find(p => p.id === poleId);
    if (!pole) return 0;

    const moment = calculateMoment(poleId);
    const guyResist = totalGuyMoment(poleId);
    const netMoment = Math.max(0, moment - guyResist);
    const factor = getOverloadFactor(grade);

    return (netMoment * factor / pole.capacity) * 100;
}

// Status check
export function checkPoleStatus(poleId, grade = 'C') {
    const util = calculateUtilization(poleId, grade);
    return { utilization: util, status: util <= 100 ? 'PASS' : 'FAIL', margin: 100 - util };
}

// Recommended class for moment
const CLASSES = ['7','6','5','4','3','2','1','H1','H2','H3','H4','H5','H6'];
const CAPS = [1200,1500,1900,2400,3000,3700,4500,6400,8000,10000,12400,16000,19800];

export function getRecommendedClass(reqCap) {
    for (let i = 0; i < CLASSES.length; i++) if (CAPS[i] >= reqCap) return CLASSES[i];
    return 'H6+';
}

// Clearance check
export function checkClearance(attachH, sag, groundElev = 0, voltage = '750-22k', type = 'road') {
    const req = nesc?.clearances?.ground?.[voltage]?.[type] || 18.5;
    const actual = attachH - sag - groundElev;
    return { actual, required: req, margin: actual - req, status: actual >= req ? 'PASS' : 'FAIL' };
}

// Full analysis
export function runAnalysis(grade = 'C') {
    const results = {
        poles: [],
        spans: [],
        guys: [],
        summary: { totalPoles: state.poles.length, totalSpans: state.spans.length, totalLength: 0, maxUtil: 0, failing: 0, status: 'PASS' }
    };

    // Poles
    state.poles.forEach(pole => {
        const moment = calculateMoment(pole.id);
        const guyResist = totalGuyMoment(pole.id);
        const factor = getOverloadFactor(grade);
        const util = Math.max(0, (moment - guyResist) * factor / pole.capacity) * 100;
        const status = util <= 100 ? 'PASS' : 'FAIL';
        const guys = getGuysForPole(pole.id);

        results.poles.push({
            id: pole.id, poleClass: pole.poleClass, height: pole.height, capacity: pole.capacity,
            moment: Math.round(moment), guyResist: Math.round(guyResist), factor,
            utilization: util.toFixed(1), status, guyCount: guys.length,
            rec: util > 100 ? (guys.length === 0 ? 'Add guy wire or upgrade pole' : `Upgrade to Class ${getRecommendedClass((moment - guyResist) * factor)}`) : null
        });

        if (util > results.summary.maxUtil) results.summary.maxUtil = util;
        if (status === 'FAIL') results.summary.failing++;
    });

    // Spans
    state.spans.forEach(s => {
        const len = s.length * 3.28084;
        results.summary.totalLength += len;
        results.spans.push({ id: s.id, pole1: s.pole1, pole2: s.pole2, length: len.toFixed(1), phases: s.phases, sag: s.sag, conductor: s.conductor });
    });

    // Guys
    state.guys.forEach(g => {
        results.guys.push({ id: g.id, poleId: g.poleId, size: g.size, strength: g.strength });
    });

    results.summary.status = results.summary.failing > 0 ? 'FAIL' : 'PASS';
    results.summary.maxUtil = results.summary.maxUtil.toFixed(1);
    results.summary.totalLength = results.summary.totalLength.toFixed(0);
    return results;
}

// Report generation
export function generateReport(grade = 'C') {
    const a = runAnalysis(grade);
    const L = [];
    L.push('═'.repeat(60), '           PLA STRUCTURAL ANALYSIS REPORT', '═'.repeat(60));
    L.push(`Date: ${new Date().toLocaleString()}  |  Grade: ${grade}`, '');
    L.push('SUMMARY', '─'.repeat(60));
    L.push(`Poles: ${a.summary.totalPoles}  |  Spans: ${a.summary.totalSpans}  |  Length: ${a.summary.totalLength} ft`);
    L.push(`Max Util: ${a.summary.maxUtil}%  |  Failing: ${a.summary.failing}  |  Status: ${a.summary.status}`, '');
    L.push('POLE ANALYSIS', '─'.repeat(60));
    a.poles.forEach(p => {
        L.push(`${p.id} (Class ${p.poleClass}, ${p.height}ft) - ${p.status}`);
        L.push(`  Moment: ${p.moment} lb-ft | Guy Resist: ${p.guyResist} lb-ft | Util: ${p.utilization}%`);
        if (p.rec) L.push(`  ⚠️  ${p.rec}`);
    });
    L.push('', 'SPAN ANALYSIS', '─'.repeat(60));
    a.spans.forEach(s => L.push(`${s.id}: ${s.pole1} → ${s.pole2} | ${s.length} ft | ${s.phases}φ | ${s.conductor}`));
    if (a.guys.length) {
        L.push('', 'GUY WIRES', '─'.repeat(60));
        a.guys.forEach(g => L.push(`${g.id}: ${g.poleId} | ${g.size}" | ${g.strength} lb`));
    }
    L.push('', '═'.repeat(60));
    return L.join('\n');
}

export default { loadNESCSpecs, getOverloadFactor, calculateMoment, calculateUtilization, checkPoleStatus, runAnalysis, getRecommendedClass, checkClearance, generateReport };
