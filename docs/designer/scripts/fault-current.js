// Fault Current Analysis - Short circuit calculations at each pole
import { getState } from './state.js';

// Typical source impedances (ohms at primary voltage)
const SOURCE_IMPEDANCES = {
    strong: { description: 'Strong Source (Substation nearby)', z1: 0.5, z0: 1.0 },
    normal: { description: 'Normal Source', z1: 1.5, z0: 3.0 },
    weak: { description: 'Weak Source (End of feeder)', z1: 3.0, z0: 6.0 }
};

// Conductor impedances (ohms per mile at 60Hz)
const CONDUCTOR_IMPEDANCE = {
    '1/0 ACSR': { r1: 0.446, x1: 0.585, r0: 0.843, x0: 2.023 },
    '2/0 ACSR': { r1: 0.354, x1: 0.569, r0: 0.751, x0: 1.996 },
    '3/0 ACSR': { r1: 0.281, x1: 0.554, r0: 0.678, x0: 1.971 },
    '4/0 ACSR': { r1: 0.223, x1: 0.540, r0: 0.620, x0: 1.948 },
    '336.4 ACSR': { r1: 0.141, x1: 0.510, r0: 0.538, x0: 1.898 },
    '477 ACSR': { r1: 0.099, x1: 0.489, r0: 0.496, x0: 1.869 },
    '556 ACSR': { r1: 0.085, x1: 0.480, r0: 0.482, x0: 1.857 },
    '795 ACSR': { r1: 0.059, x1: 0.464, r0: 0.456, x0: 1.834 }
};

// Transformer impedances (per unit on transformer kVA base)
const TRANSFORMER_Z = {
    25: 0.02, 37.5: 0.02, 50: 0.025, 75: 0.03,
    100: 0.035, 167: 0.04, 250: 0.045, 500: 0.05
};

export function calculateFaultCurrent(params) {
    const {
        voltage = 12470,         // Line-to-line voltage
        sourceStrength = 'normal',
        conductorType = '1/0 ACSR',
        distance = 5000,         // feet from source
        transformerKVA = null,   // If calculating secondary fault
        secondaryVoltage = 240
    } = params;

    const source = SOURCE_IMPEDANCES[sourceStrength] || SOURCE_IMPEDANCES.normal;
    const conductor = CONDUCTOR_IMPEDANCE[conductorType] || CONDUCTOR_IMPEDANCE['1/0 ACSR'];

    // Convert distance to miles
    const miles = distance / 5280;

    // Base impedance at primary voltage
    const Zbase = (voltage ** 2) / (10000000); // Assuming 10 MVA base

    // Line impedance
    const Rline = conductor.r1 * miles;
    const Xline = conductor.x1 * miles;
    const R0line = conductor.r0 * miles;
    const X0line = conductor.x0 * miles;

    // Total positive sequence impedance
    const R1total = source.z1 * 0.3 + Rline;  // Source R assumed 30% of Z
    const X1total = source.z1 * 0.95 + Xline; // Source X assumed 95% of Z
    const Z1 = Math.sqrt(R1total ** 2 + X1total ** 2);

    // Total zero sequence impedance
    const R0total = source.z0 * 0.3 + R0line;
    const X0total = source.z0 * 0.95 + X0line;
    const Z0 = Math.sqrt(R0total ** 2 + X0total ** 2);

    // Fault calculations (in Amps)
    const Vln = voltage / Math.sqrt(3);

    // Three-phase fault
    const I3ph = Vln / Z1;

    // Line-to-ground fault
    const Ilg = (3 * Vln) / (2 * Z1 + Z0);

    // Line-to-line fault
    const Ill = (Vln * Math.sqrt(3)) / (2 * Z1);

    // Symmetrical RMS
    const XR = X1total / R1total;
    const asymFactor = Math.sqrt(1 + 2 * Math.exp(-2 * Math.PI / XR));
    const Iasym = I3ph * asymFactor;

    let results = {
        primary: {
            threePhaseFault: Math.round(I3ph),
            lineToGround: Math.round(Ilg),
            lineToLine: Math.round(Ill),
            asymmetrical: Math.round(Iasym),
            xrRatio: XR.toFixed(1),
            z1: Z1.toFixed(3),
            z0: Z0.toFixed(3)
        }
    };

    // Secondary fault if transformer specified
    if (transformerKVA) {
        const xfmrZ = TRANSFORMER_Z[transformerKVA] || 0.04;
        const xfmrZohms = xfmrZ * (secondaryVoltage ** 2) / (transformerKVA * 1000);

        const secVln = secondaryVoltage / Math.sqrt(3);
        const totalZsec = xfmrZohms + (Z1 * (secondaryVoltage / voltage) ** 2);

        const I3phSec = secVln / totalZsec;

        results.secondary = {
            voltage: secondaryVoltage,
            transformerZ: (xfmrZ * 100).toFixed(1) + '%',
            threePhaseFault: Math.round(I3phSec),
            available: Math.round(I3phSec)
        };
    }

    return results;
}

export function analyzeLineFaults() {
    const state = getState();
    const poles = state.poles || [];
    const spans = state.spans || [];

    const results = [];
    let cumulativeDistance = 0;

    // Assume source at first pole
    spans.forEach((span, i) => {
        const p1 = poles.find(p => p.id === span.pole1 || p.id === span.from);
        const p2 = poles.find(p => p.id === span.pole2 || p.id === span.to);

        if (!p1 || !p2) return;

        const dx = (p2.x || 0) - (p1.x || 0);
        const dz = (p2.z || 0) - (p1.z || 0);
        const spanLength = Math.sqrt(dx * dx + dz * dz);
        cumulativeDistance += spanLength;

        // Check for transformers at this pole
        const transformers = (p2.attachments || []).filter(a => a.type === 'transformer');
        const xfmrKVA = transformers.length > 0 ? (transformers[0].kva || 25) : null;

        const fault = calculateFaultCurrent({
            voltage: span.voltage || 12470,
            conductorType: span.conductor || '1/0 ACSR',
            distance: cumulativeDistance,
            transformerKVA: xfmrKVA
        });

        results.push({
            poleId: p2.id,
            distance: cumulativeDistance.toFixed(0),
            ...fault.primary,
            secondary: fault.secondary
        });
    });

    return results;
}

export function generateFaultReport(results) {
    if (!results || results.length === 0) {
        results = analyzeLineFaults();
    }

    return `
        <div class="fault-report">
            <h4>Fault Current Analysis</h4>
            <table class="sag-table">
                <thead>
                    <tr>
                        <th>Pole</th>
                        <th>Distance</th>
                        <th>3Φ Fault</th>
                        <th>L-G Fault</th>
                        <th>L-L Fault</th>
                        <th>X/R</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(r => `
                        <tr>
                            <td>${r.poleId}</td>
                            <td>${r.distance}'</td>
                            <td>${r.threePhaseFault.toLocaleString()} A</td>
                            <td>${r.lineToGround.toLocaleString()} A</td>
                            <td>${r.lineToLine.toLocaleString()} A</td>
                            <td>${r.xrRatio}</td>
                        </tr>
                        ${r.secondary ? `
                            <tr class="secondary-row">
                                <td colspan="2">↳ Secondary (${r.secondary.voltage}V)</td>
                                <td colspan="4">${r.secondary.threePhaseFault.toLocaleString()} A available</td>
                            </tr>
                        ` : ''}
                    `).join('')}
                </tbody>
            </table>

            <div class="fault-notes">
                <p><strong>Notes:</strong></p>
                <ul>
                    <li>Values calculated using symmetrical components method</li>
                    <li>Source impedance assumed as "Normal" unless specified</li>
                    <li>Secondary faults include transformer impedance</li>
                </ul>
            </div>
        </div>
    `;
}

export function showFaultAnalysisDialog() {
    const modal = document.getElementById('faultModal');
    const content = document.getElementById('faultContent');

    if (content) {
        content.innerHTML = `
            <div class="fault-calc">
                <div class="calc-form">
                    <div class="form-row">
                        <label>Primary Voltage:</label>
                        <select id="faultVoltage" class="input">
                            <option value="12470">12.47 kV</option>
                            <option value="13200">13.2 kV</option>
                            <option value="24940">24.94 kV</option>
                            <option value="34500">34.5 kV</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Source Strength:</label>
                        <select id="faultSource" class="input">
                            ${Object.entries(SOURCE_IMPEDANCES).map(([k, v]) =>
                                `<option value="${k}">${v.description}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Conductor:</label>
                        <select id="faultConductor" class="input">
                            ${Object.keys(CONDUCTOR_IMPEDANCE).map(c =>
                                `<option value="${c}">${c}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Distance (ft):</label>
                        <input type="number" id="faultDistance" value="5000" class="input">
                    </div>
                    <button class="btn success" onclick="window.calcFault()">Calculate</button>
                </div>

                <div id="faultPointResults" style="margin-top:1rem;"></div>

                <hr style="margin:1rem 0;border-color:#4b5563;">
                <h4>Full Line Fault Study</h4>
                ${generateFaultReport()}
            </div>
        `;
    }

    window.calcFault = () => {
        const result = calculateFaultCurrent({
            voltage: +document.getElementById('faultVoltage').value,
            sourceStrength: document.getElementById('faultSource').value,
            conductorType: document.getElementById('faultConductor').value,
            distance: +document.getElementById('faultDistance').value
        });

        document.getElementById('faultPointResults').innerHTML = `
            <div class="result-card">
                <h4>Fault Current at Point</h4>
                <div class="result-grid">
                    <div><strong>3Φ Fault:</strong> ${result.primary.threePhaseFault.toLocaleString()} A</div>
                    <div><strong>L-G Fault:</strong> ${result.primary.lineToGround.toLocaleString()} A</div>
                    <div><strong>L-L Fault:</strong> ${result.primary.lineToLine.toLocaleString()} A</div>
                    <div><strong>Asymmetrical:</strong> ${result.primary.asymmetrical.toLocaleString()} A</div>
                    <div><strong>X/R Ratio:</strong> ${result.primary.xrRatio}</div>
                    <div><strong>Z1:</strong> ${result.primary.z1} Ω</div>
                </div>
            </div>
        `;
    };

    if (modal) modal.style.display = 'flex';
}

export { SOURCE_IMPEDANCES, CONDUCTOR_IMPEDANCE };
