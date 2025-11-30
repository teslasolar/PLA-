// Stringing Charts - Temperature-based tension tables
import { getState } from './state.js';

// Conductor properties for stringing
const CONDUCTORS = {
    '1/0 ACSR': { area: 0.1045, weight: 0.145, strength: 4380, modulus: 8.3e6, alpha: 10.6e-6 },
    '2/0 ACSR': { area: 0.1318, weight: 0.183, strength: 5520, modulus: 8.4e6, alpha: 10.6e-6 },
    '3/0 ACSR': { area: 0.1662, weight: 0.231, strength: 6960, modulus: 8.5e6, alpha: 10.6e-6 },
    '4/0 ACSR': { area: 0.2095, weight: 0.291, strength: 8760, modulus: 8.6e6, alpha: 10.6e-6 },
    '336.4 ACSR': { area: 0.2642, weight: 0.462, strength: 11300, modulus: 8.8e6, alpha: 10.6e-6 },
    '477 ACSR': { area: 0.3744, weight: 0.656, strength: 16100, modulus: 9.0e6, alpha: 10.6e-6 },
    '556 ACSR': { area: 0.4371, weight: 0.765, strength: 18800, modulus: 9.1e6, alpha: 10.6e-6 },
    '795 ACSR': { area: 0.6244, weight: 1.093, strength: 27300, modulus: 9.3e6, alpha: 10.6e-6 }
};

// Standard stringing temperatures
const TEMPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

export function generateStringingChart(params) {
    const {
        conductor,
        rulingSpan,
        initialTension,  // % of rated strength at coldest temp
        finalTension,    // % after creep
        coldTemp = 0,
        maxTemp = 120
    } = params;

    const spec = CONDUCTORS[conductor];
    if (!spec) return null;

    const chart = {
        conductor,
        rulingSpan,
        specs: spec,
        initial: [],  // Initial stringing tensions
        final: []     // Final (after creep) tensions
    };

    // Calculate tensions at each temperature
    const baseInitialTension = spec.strength * (initialTension / 100);
    const baseFinalTension = spec.strength * (finalTension / 100);

    TEMPS.forEach(temp => {
        // Temperature change from base
        const deltaT = temp - coldTemp;

        // Thermal expansion factor
        const thermalChange = spec.alpha * deltaT;

        // Calculate sag at this temperature (simplified catenary)
        const initialSag = calcSag(rulingSpan, spec.weight, baseInitialTension, thermalChange);
        const finalSag = calcSag(rulingSpan, spec.weight, baseFinalTension, thermalChange);

        // Calculate tension from sag
        const initialTensionAtTemp = (spec.weight * rulingSpan ** 2) / (8 * initialSag);
        const finalTensionAtTemp = (spec.weight * rulingSpan ** 2) / (8 * finalSag);

        chart.initial.push({
            temp,
            tension: Math.round(initialTensionAtTemp),
            sag: initialSag.toFixed(2),
            percentStrength: ((initialTensionAtTemp / spec.strength) * 100).toFixed(1)
        });

        chart.final.push({
            temp,
            tension: Math.round(finalTensionAtTemp),
            sag: finalSag.toFixed(2),
            percentStrength: ((finalTensionAtTemp / spec.strength) * 100).toFixed(1)
        });
    });

    return chart;
}

function calcSag(span, weight, tension, thermalFactor) {
    // Catenary sag calculation with thermal adjustment
    const baseSag = (weight * span ** 2) / (8 * tension);
    const thermalSag = baseSag * (1 + thermalFactor * 1000);
    return Math.max(baseSag * 0.5, thermalSag);
}

export function generateStringingTable(chart) {
    if (!chart) return '';

    let html = `
        <div class="stringing-chart">
            <div class="chart-header">
                <h4>${chart.conductor}</h4>
                <div class="chart-info">
                    Ruling Span: ${chart.rulingSpan} ft |
                    Strength: ${chart.specs.strength} lbs
                </div>
            </div>
            <table class="sag-table">
                <thead>
                    <tr>
                        <th rowspan="2">Temp °F</th>
                        <th colspan="3">Initial (Stringing)</th>
                        <th colspan="3">Final (After Creep)</th>
                    </tr>
                    <tr>
                        <th>Tension</th>
                        <th>Sag</th>
                        <th>%</th>
                        <th>Tension</th>
                        <th>Sag</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
                    ${chart.initial.map((init, i) => {
                        const fin = chart.final[i];
                        return `
                            <tr>
                                <td>${init.temp}°</td>
                                <td>${init.tension}</td>
                                <td>${init.sag}'</td>
                                <td>${init.percentStrength}%</td>
                                <td>${fin.tension}</td>
                                <td>${fin.sag}'</td>
                                <td>${fin.percentStrength}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    return html;
}

export function generateSpanTable(chart, spans) {
    if (!chart) return '';

    // Generate sag values for different span lengths
    const spanLengths = spans || [150, 200, 250, 300, 350, 400, 450, 500];

    let html = `
        <div class="span-table">
            <h4>Sag by Span Length (ft) - Initial Stringing</h4>
            <table class="sag-table">
                <thead>
                    <tr>
                        <th>Temp</th>
                        ${spanLengths.map(s => `<th>${s}'</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${TEMPS.filter(t => t % 20 === 0).map(temp => {
                        const baseEntry = chart.initial.find(e => e.temp === temp);
                        if (!baseEntry) return '';

                        return `
                            <tr>
                                <td>${temp}°</td>
                                ${spanLengths.map(span => {
                                    const ratio = (span / chart.rulingSpan) ** 2;
                                    const sag = (parseFloat(baseEntry.sag) * ratio).toFixed(1);
                                    return `<td>${sag}</td>`;
                                }).join('')}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    return html;
}

export function showStringingModal() {
    const modal = document.getElementById('stringingModal');
    const content = document.getElementById('stringingContent');

    if (content) {
        content.innerHTML = `
            <div class="stringing-form">
                <div class="form-row">
                    <label>Conductor:</label>
                    <select id="strConductor" class="input">
                        ${Object.keys(CONDUCTORS).map(c =>
                            `<option value="${c}">${c}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <label>Ruling Span (ft):</label>
                    <input type="number" id="strRulingSpan" value="300" class="input">
                </div>
                <div class="form-row">
                    <label>Initial Tension (% strength):</label>
                    <input type="number" id="strInitial" value="35" class="input">
                </div>
                <div class="form-row">
                    <label>Final Tension (% strength):</label>
                    <input type="number" id="strFinal" value="25" class="input">
                </div>
                <button class="btn success" onclick="window.generateStringing()">Generate Chart</button>
                <div id="stringingResults" style="margin-top:1rem;max-height:400px;overflow:auto;"></div>
            </div>
        `;
    }

    window.generateStringing = () => {
        const chart = generateStringingChart({
            conductor: document.getElementById('strConductor').value,
            rulingSpan: +document.getElementById('strRulingSpan').value,
            initialTension: +document.getElementById('strInitial').value,
            finalTension: +document.getElementById('strFinal').value
        });

        const results = document.getElementById('stringingResults');
        if (results && chart) {
            results.innerHTML = generateStringingTable(chart) + generateSpanTable(chart);
        }
    };

    if (modal) modal.style.display = 'flex';
}

export function getStringingForProject() {
    const state = getState();
    const spans = state.spans || [];

    if (spans.length === 0) return null;

    // Calculate ruling span
    const spanLengths = spans.map(s => {
        const p1 = state.poles.find(p => p.id === s.from);
        const p2 = state.poles.find(p => p.id === s.to);
        if (!p1 || !p2) return 0;
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
    }).filter(l => l > 0);

    const sumCubed = spanLengths.reduce((a, l) => a + l ** 3, 0);
    const sum = spanLengths.reduce((a, l) => a + l, 0);
    const rulingSpan = Math.sqrt(sumCubed / sum);

    // Use first span's conductor
    const conductor = spans[0].conductor || '1/0 ACSR';

    return generateStringingChart({
        conductor,
        rulingSpan: Math.round(rulingSpan),
        initialTension: 35,
        finalTension: 25
    });
}

export { CONDUCTORS, TEMPS };
