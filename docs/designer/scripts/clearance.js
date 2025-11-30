// Clearance Checker - NESC/NEC violation detection
import { getState } from './state.js';

// NESC clearance rules (feet)
const CLEARANCES = {
    ground: { residential: 18, commercial: 18, industrial: 18, crossing: 18.5 },
    roadway: { primary: 18.5, secondary: 15.5, service: 15.5 },
    railroad: { primary: 27, secondary: 24 },
    water: { sailboat: 38, pontoon: 28, nonNavigable: 17 },
    building: { horizontal: 3, vertical: 8, roofWalkable: 10.5, roofNotWalkable: 3.5 },
    communication: { supply750: 4, supply8700: 4.5, supply15000: 5, supply22000: 5.5 },
    conductor: {
        sameCircuit: { h: 0.75, v: 1.5 },
        diffCircuit: { h: 1.5, v: 2 },
        supplyComm: { h: 4, v: 4 }
    },
    pole: { climbing: 40, working: 3 }
};

// Voltage multipliers for additional clearance
const VOLTAGE_ADDERS = {
    750: 0, 8700: 0, 15000: 0.4, 22000: 0.8, 34500: 1.2, 46000: 1.6, 69000: 2.4
};

let violations = [];
let lastCheck = null;

export function checkAllClearances() {
    const state = getState();
    violations = [];

    // Check each span
    state.spans.forEach(span => {
        checkGroundClearance(span, state);
        checkConductorSpacing(span, state);
        checkPoleClearance(span, state);
    });

    // Check pole attachments
    state.poles.forEach(pole => {
        checkAttachmentSpacing(pole);
        checkClimbingSpace(pole);
    });

    lastCheck = { time: Date.now(), violations: [...violations] };
    highlightViolations();
    return violations;
}

function checkGroundClearance(span, state) {
    const { conductor, voltage = 12470 } = span;
    const sagAtMax = span.sagMax || 3; // Max sag in feet
    const attachHeight = span.attachHeight || 30;
    const groundClear = attachHeight - sagAtMax;

    const required = CLEARANCES.ground.residential + getVoltageAdder(voltage);

    if (groundClear < required) {
        violations.push({
            type: 'ground_clearance',
            severity: 'error',
            spanId: span.id,
            message: `Ground clearance ${groundClear.toFixed(1)}' < required ${required.toFixed(1)}'`,
            actual: groundClear,
            required,
            location: span.id
        });
    }
}

function checkConductorSpacing(span, state) {
    // Check vertical spacing between conductors on same pole
    const pole1 = state.poles.find(p => p.id === span.from);
    const pole2 = state.poles.find(p => p.id === span.to);
    if (!pole1 || !pole2) return;

    const attachments1 = pole1.attachments || [];
    for (let i = 0; i < attachments1.length - 1; i++) {
        for (let j = i + 1; j < attachments1.length; j++) {
            const spacing = Math.abs(attachments1[i].height - attachments1[j].height);
            const isComm = attachments1[i].type === 'comm' || attachments1[j].type === 'comm';
            const required = isComm ? CLEARANCES.conductor.supplyComm.v : CLEARANCES.conductor.sameCircuit.v;

            if (spacing < required) {
                violations.push({
                    type: 'conductor_spacing',
                    severity: 'warning',
                    poleId: pole1.id,
                    message: `Conductor spacing ${spacing.toFixed(1)}' < required ${required}'`,
                    actual: spacing,
                    required
                });
            }
        }
    }
}

function checkPoleClearance(span, state) {
    // Check clearance from pole to conductor at mid-span
    const pole1 = state.poles.find(p => p.id === span.from);
    const pole2 = state.poles.find(p => p.id === span.to);
    if (!pole1 || !pole2) return;

    const spanLength = Math.sqrt(
        Math.pow(pole2.x - pole1.x, 2) + Math.pow(pole2.z - pole1.z, 2)
    );

    if (spanLength > 400) {
        violations.push({
            type: 'span_length',
            severity: 'warning',
            spanId: span.id,
            message: `Span length ${spanLength.toFixed(0)}' exceeds typical 400' maximum`,
            actual: spanLength,
            required: 400
        });
    }
}

function checkAttachmentSpacing(pole) {
    const attachments = pole.attachments || [];

    // Check communication clearance (40" minimum from supply)
    const supply = attachments.filter(a => a.type === 'supply' || a.type === 'primary');
    const comm = attachments.filter(a => a.type === 'comm' || a.type === 'telco' || a.type === 'catv');

    supply.forEach(s => {
        comm.forEach(c => {
            const spacing = Math.abs(s.height - c.height) * 12; // Convert to inches
            if (spacing < 40) {
                violations.push({
                    type: 'comm_clearance',
                    severity: 'error',
                    poleId: pole.id,
                    message: `Communication clearance ${spacing.toFixed(0)}" < required 40"`,
                    actual: spacing,
                    required: 40
                });
            }
        });
    });
}

function checkClimbingSpace(pole) {
    // Check climbing space requirements
    const attachments = pole.attachments || [];
    const hasObstruction = attachments.some(a =>
        a.type === 'transformer' || a.type === 'capacitor' || a.type === 'recloser'
    );

    if (hasObstruction) {
        // Need climbing space on opposite side
        const hasClimbingSpace = pole.climbingSpace !== false;
        if (!hasClimbingSpace) {
            violations.push({
                type: 'climbing_space',
                severity: 'warning',
                poleId: pole.id,
                message: 'Climbing space may be obstructed by equipment'
            });
        }
    }
}

function getVoltageAdder(voltage) {
    const levels = Object.keys(VOLTAGE_ADDERS).map(Number).sort((a, b) => a - b);
    for (let i = levels.length - 1; i >= 0; i--) {
        if (voltage >= levels[i]) return VOLTAGE_ADDERS[levels[i]];
    }
    return 0;
}

function highlightViolations() {
    // Add visual indicators to 3D scene
    violations.forEach(v => {
        const el = document.querySelector(`[data-id="${v.spanId || v.poleId}"]`);
        if (el) {
            el.classList.add('violation');
            el.classList.add(v.severity === 'error' ? 'violation-error' : 'violation-warning');
        }
    });

    // Dispatch event for UI update
    window.dispatchEvent(new CustomEvent('clearanceChecked', { detail: violations }));
}

export function getViolations() { return violations; }
export function getLastCheck() { return lastCheck; }
export function getClearanceRules() { return CLEARANCES; }

export function generateClearanceReport() {
    if (!lastCheck) checkAllClearances();

    const errors = violations.filter(v => v.severity === 'error');
    const warnings = violations.filter(v => v.severity === 'warning');

    return `
        <div class="clearance-report">
            <div class="clearance-summary">
                <div class="stat ${errors.length ? 'fail' : 'pass'}">
                    <span class="stat-val">${errors.length}</span>
                    <span class="stat-label">Errors</span>
                </div>
                <div class="stat ${warnings.length ? 'warn' : 'pass'}">
                    <span class="stat-val">${warnings.length}</span>
                    <span class="stat-label">Warnings</span>
                </div>
            </div>
            <div class="violation-list">
                ${violations.map(v => `
                    <div class="violation-item ${v.severity}">
                        <span class="violation-icon">${v.severity === 'error' ? '❌' : '⚠️'}</span>
                        <span class="violation-msg">${v.message}</span>
                        <span class="violation-loc">${v.spanId || v.poleId}</span>
                    </div>
                `).join('')}
                ${violations.length === 0 ? '<div class="no-violations">✅ All clearances pass</div>' : ''}
            </div>
        </div>
    `;
}

// Auto-check on state change
window.addEventListener('stateChanged', () => {
    if (window.autoCheckClearances) checkAllClearances();
});
