// Voltage Drop Calculator - Calculate voltage drop along distribution lines
import { getState } from './state.js';

// Conductor resistance (ohms per 1000ft at 25°C)
const CONDUCTOR_RESISTANCE = {
    '6 ACSR': 0.641, '4 ACSR': 0.403, '2 ACSR': 0.254,
    '1/0 ACSR': 0.160, '2/0 ACSR': 0.127, '3/0 ACSR': 0.101, '4/0 ACSR': 0.080,
    '336.4 ACSR': 0.0506, '477 ACSR': 0.0357, '556 ACSR': 0.0309, '795 ACSR': 0.0216,
    '6 CU': 0.410, '4 CU': 0.259, '2 CU': 0.162, '1/0 CU': 0.102
};

// Conductor reactance (ohms per 1000ft)
const CONDUCTOR_REACTANCE = {
    '6 ACSR': 0.121, '4 ACSR': 0.115, '2 ACSR': 0.109,
    '1/0 ACSR': 0.103, '2/0 ACSR': 0.100, '3/0 ACSR': 0.097, '4/0 ACSR': 0.094,
    '336.4 ACSR': 0.087, '477 ACSR': 0.082, '556 ACSR': 0.080, '795 ACSR': 0.075
};

// Standard voltages
const VOLTAGES = {
    '120/240': { phase: 1, line: 240, neutral: 120 },
    '120/208': { phase: 3, line: 208, neutral: 120 },
    '277/480': { phase: 3, line: 480, neutral: 277 },
    '7200/12470': { phase: 3, line: 12470, neutral: 7200 },
    '7620/13200': { phase: 3, line: 13200, neutral: 7620 },
    '14400/24940': { phase: 3, line: 24940, neutral: 14400 },
    '19920/34500': { phase: 3, line: 34500, neutral: 19920 }
};

export function calculateVoltageDrop(params) {
    const {
        conductor = '1/0 ACSR',
        voltage = '7200/12470',
        load = 100,           // kVA
        powerFactor = 0.9,
        distance = 1000,      // feet
        phases = 3,
        temperature = 25      // °C
    } = params;

    const R = (CONDUCTOR_RESISTANCE[conductor] || 0.16) * (distance / 1000);
    const X = (CONDUCTOR_REACTANCE[conductor] || 0.10) * (distance / 1000);

    // Temperature correction (resistance increases ~0.4% per °C above 25°C)
    const tempFactor = 1 + 0.004 * (temperature - 25);
    const Rcorrected = R * tempFactor;

    const voltageSpec = VOLTAGES[voltage] || VOLTAGES['7200/12470'];
    const V = voltageSpec.line;

    // Current calculation
    const I = phases === 3
        ? (load * 1000) / (Math.sqrt(3) * V * powerFactor)
        : (load * 1000) / (V * powerFactor);

    // Power factor angle
    const theta = Math.acos(powerFactor);
    const sinTheta = Math.sin(theta);
    const cosTheta = powerFactor;

    // Voltage drop (simplified formula)
    let Vdrop;
    if (phases === 3) {
        Vdrop = Math.sqrt(3) * I * (Rcorrected * cosTheta + X * sinTheta);
    } else {
        Vdrop = 2 * I * (Rcorrected * cosTheta + X * sinTheta);
    }

    const VdropPercent = (Vdrop / V) * 100;
    const Vend = V - Vdrop;

    // Status based on typical limits
    let status = 'PASS';
    let recommendation = '';
    if (VdropPercent > 5) {
        status = 'FAIL';
        recommendation = 'Voltage drop exceeds 5%. Consider larger conductor or voltage regulator.';
    } else if (VdropPercent > 3) {
        status = 'WARNING';
        recommendation = 'Voltage drop exceeds 3%. Monitor during peak load.';
    }

    return {
        input: { conductor, voltage, load, powerFactor, distance, phases, temperature },
        results: {
            current: I.toFixed(1),
            resistance: Rcorrected.toFixed(4),
            reactance: X.toFixed(4),
            voltageDrop: Vdrop.toFixed(1),
            voltageDropPercent: VdropPercent.toFixed(2),
            endVoltage: Vend.toFixed(0),
            sourceVoltage: V
        },
        status,
        recommendation
    };
}

export function calculateLineVoltageDrop() {
    const state = getState();
    const results = [];

    // Build path from first to last pole
    const poles = state.poles || [];
    const spans = state.spans || [];

    if (poles.length < 2) return results;

    let cumulativeDistance = 0;
    let cumulativeLoad = 0;

    spans.forEach((span, i) => {
        const p1 = poles.find(p => p.id === span.pole1 || p.id === span.from);
        const p2 = poles.find(p => p.id === span.pole2 || p.id === span.to);

        if (!p1 || !p2) return;

        const dx = (p2.x || 0) - (p1.x || 0);
        const dz = (p2.z || 0) - (p1.z || 0);
        const spanLength = Math.sqrt(dx * dx + dz * dz);

        cumulativeDistance += spanLength;

        // Add load at this pole (transformers)
        const poleLoad = (p2.attachments || [])
            .filter(a => a.type === 'transformer')
            .reduce((sum, t) => sum + (t.kva || 25), 0);
        cumulativeLoad += poleLoad;

        const calc = calculateVoltageDrop({
            conductor: span.conductor || '1/0 ACSR',
            voltage: span.voltage || '7200/12470',
            load: cumulativeLoad || 50,
            distance: cumulativeDistance,
            phases: span.phases || 3
        });

        results.push({
            spanId: span.id,
            fromPole: p1.id,
            toPole: p2.id,
            spanLength: spanLength.toFixed(0),
            cumulativeDistance: cumulativeDistance.toFixed(0),
            cumulativeLoad,
            ...calc.results,
            status: calc.status
        });
    });

    return results;
}

export function generateVoltageDropTable(results) {
    if (!results || results.length === 0) {
        results = calculateLineVoltageDrop();
    }

    return `
        <div class="vdrop-table">
            <table class="sag-table">
                <thead>
                    <tr>
                        <th>Span</th>
                        <th>Distance</th>
                        <th>Load (kVA)</th>
                        <th>Current (A)</th>
                        <th>V Drop</th>
                        <th>% Drop</th>
                        <th>End V</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(r => `
                        <tr class="${r.status.toLowerCase()}">
                            <td>${r.fromPole} → ${r.toPole}</td>
                            <td>${r.cumulativeDistance}'</td>
                            <td>${r.cumulativeLoad}</td>
                            <td>${r.current}</td>
                            <td>${r.voltageDrop}V</td>
                            <td class="${r.status === 'PASS' ? 'pass' : r.status === 'WARNING' ? 'warn' : 'fail'}">${r.voltageDropPercent}%</td>
                            <td>${r.endVoltage}V</td>
                            <td class="${r.status.toLowerCase()}">${r.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function showVoltageDropCalculator() {
    const modal = document.getElementById('voltageDropModal');
    const content = document.getElementById('voltageDropContent');

    if (content) {
        content.innerHTML = `
            <div class="vdrop-calc">
                <div class="calc-form">
                    <div class="form-row">
                        <label>Conductor:</label>
                        <select id="vdConductor" class="input">
                            ${Object.keys(CONDUCTOR_RESISTANCE).map(c =>
                                `<option value="${c}">${c}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Voltage:</label>
                        <select id="vdVoltage" class="input">
                            ${Object.keys(VOLTAGES).map(v =>
                                `<option value="${v}">${v}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Load (kVA):</label>
                        <input type="number" id="vdLoad" value="100" class="input">
                    </div>
                    <div class="form-row">
                        <label>Distance (ft):</label>
                        <input type="number" id="vdDistance" value="1000" class="input">
                    </div>
                    <div class="form-row">
                        <label>Power Factor:</label>
                        <input type="number" id="vdPF" value="0.9" step="0.05" class="input">
                    </div>
                    <div class="form-row">
                        <label>Phases:</label>
                        <select id="vdPhases" class="input">
                            <option value="3">3-Phase</option>
                            <option value="1">1-Phase</option>
                        </select>
                    </div>
                    <button class="btn success" onclick="window.calcVDrop()">Calculate</button>
                </div>
                <div id="vdropResults" style="margin-top:1rem;"></div>
                <hr style="margin:1rem 0;border-color:#4b5563;">
                <h4>Line Voltage Profile</h4>
                ${generateVoltageDropTable()}
            </div>
        `;
    }

    window.calcVDrop = () => {
        const result = calculateVoltageDrop({
            conductor: document.getElementById('vdConductor').value,
            voltage: document.getElementById('vdVoltage').value,
            load: +document.getElementById('vdLoad').value,
            distance: +document.getElementById('vdDistance').value,
            powerFactor: +document.getElementById('vdPF').value,
            phases: +document.getElementById('vdPhases').value
        });

        document.getElementById('vdropResults').innerHTML = `
            <div class="result-card ${result.status.toLowerCase()}">
                <div class="result-header">
                    <span>Voltage Drop Analysis</span>
                    <span class="status-badge ${result.status.toLowerCase()}">${result.status}</span>
                </div>
                <div class="result-grid">
                    <div><strong>Current:</strong> ${result.results.current} A</div>
                    <div><strong>Voltage Drop:</strong> ${result.results.voltageDrop} V</div>
                    <div><strong>% Drop:</strong> ${result.results.voltageDropPercent}%</div>
                    <div><strong>End Voltage:</strong> ${result.results.endVoltage} V</div>
                </div>
                ${result.recommendation ? `<div class="recommendation">${result.recommendation}</div>` : ''}
            </div>
        `;
    };

    if (modal) modal.style.display = 'flex';
}

export { CONDUCTOR_RESISTANCE, CONDUCTOR_REACTANCE, VOLTAGES };
