// Guying Calculator - Guy wire sizing and anchor design
import { getState } from './state.js';

// Guy wire specs
const GUY_WIRE = {
    '3/8 EHS': { diameter: 0.375, strength: 10800, weight: 0.273 },
    '3/8 HS': { diameter: 0.375, strength: 6950, weight: 0.273 },
    '1/4 EHS': { diameter: 0.25, strength: 4750, weight: 0.122 },
    '5/16 EHS': { diameter: 0.3125, strength: 7650, weight: 0.191 },
    '7/16 EHS': { diameter: 0.4375, strength: 14500, weight: 0.371 }
};

// Anchor types and holding power (lbs) by soil class
const ANCHORS = {
    'screw-8': {
        name: '8" Screw Anchor',
        soil: { A: 8000, B: 6000, C: 4000, D: 2500 },
        depth: 5
    },
    'screw-10': {
        name: '10" Screw Anchor',
        soil: { A: 12000, B: 9000, C: 6000, D: 4000 },
        depth: 6
    },
    'screw-12': {
        name: '12" Screw Anchor',
        soil: { A: 16000, B: 12000, C: 8000, D: 5000 },
        depth: 7
    },
    'plate-6': {
        name: '6" Plate Anchor',
        soil: { A: 6000, B: 4500, C: 3000, D: 2000 },
        depth: 4
    },
    'rock': {
        name: 'Rock Anchor',
        soil: { A: 20000, B: 20000, C: 20000, D: 20000 },
        depth: 3
    },
    'expanding': {
        name: 'Expanding Anchor',
        soil: { A: 10000, B: 7500, C: 5000, D: 3500 },
        depth: 5
    }
};

// Soil classifications
const SOIL_CLASSES = {
    A: { name: 'Good - Hard clay, gravel', bearing: 4000 },
    B: { name: 'Average - Firm clay, sand', bearing: 2000 },
    C: { name: 'Poor - Soft clay, wet sand', bearing: 1000 },
    D: { name: 'Very Poor - Loose fill, swamp', bearing: 500 }
};

export function calculateGuy(params) {
    const {
        poleLoad,          // Horizontal load at attachment (lbs)
        attachHeight,      // Guy attachment height (ft)
        leadLength,        // Horizontal distance to anchor (ft)
        soilClass = 'B',   // Soil classification
        safetyFactor = 2.0 // Design safety factor
    } = params;

    // Calculate guy geometry
    const guyLength = Math.sqrt(attachHeight ** 2 + leadLength ** 2);
    const angle = Math.atan(attachHeight / leadLength) * 180 / Math.PI;

    // Guy tension from horizontal load
    const guyTension = poleLoad / Math.cos(angle * Math.PI / 180);
    const verticalComponent = poleLoad * Math.tan(angle * Math.PI / 180);

    // Required guy strength
    const requiredStrength = guyTension * safetyFactor;

    // Select guy wire
    let selectedWire = null;
    for (const [name, spec] of Object.entries(GUY_WIRE)) {
        if (spec.strength >= requiredStrength) {
            selectedWire = { name, ...spec };
            break;
        }
    }

    // Required anchor holding power
    const anchorLoad = guyTension;
    const requiredAnchorPower = anchorLoad * safetyFactor;

    // Select anchor
    let selectedAnchor = null;
    for (const [id, anchor] of Object.entries(ANCHORS)) {
        if (anchor.soil[soilClass] >= requiredAnchorPower) {
            selectedAnchor = { id, ...anchor, holdingPower: anchor.soil[soilClass] };
            break;
        }
    }

    // Check if down guy or head guy needed based on angle
    const guyType = angle < 30 ? 'head guy with stub' : angle > 60 ? 'steep guy' : 'standard';

    return {
        geometry: {
            length: guyLength,
            angle,
            attachHeight,
            leadLength
        },
        loads: {
            poleLoad,
            guyTension,
            verticalComponent,
            anchorLoad
        },
        wire: selectedWire || { name: 'Custom required', strength: requiredStrength },
        anchor: selectedAnchor || { name: 'Special design required' },
        requirements: {
            minWireStrength: requiredStrength,
            minAnchorPower: requiredAnchorPower,
            safetyFactor
        },
        recommendations: {
            guyType,
            needsStub: angle < 30,
            warnings: getWarnings(angle, guyTension, soilClass)
        }
    };
}

function getWarnings(angle, tension, soilClass) {
    const warnings = [];

    if (angle < 30) {
        warnings.push('Guy angle < 30°: Consider stub pole or head guy');
    }
    if (angle > 60) {
        warnings.push('Guy angle > 60°: High vertical load on pole');
    }
    if (tension > 12000) {
        warnings.push('High tension: Consider multiple guys');
    }
    if (soilClass === 'D') {
        warnings.push('Poor soil: Consider deeper anchor or multiple anchors');
    }

    return warnings;
}

export function calculateBisectorGuy(lineAngle, poleLoad, attachHeight, soilClass = 'B') {
    // For angle poles, guy goes on bisector of line angle
    const bisectorAngle = (180 - lineAngle) / 2;
    const leadLength = attachHeight / Math.tan(45 * Math.PI / 180); // Default 45° guy

    // Resultant force at angle pole
    const resultantLoad = 2 * poleLoad * Math.sin((lineAngle / 2) * Math.PI / 180);

    return calculateGuy({
        poleLoad: resultantLoad,
        attachHeight,
        leadLength,
        soilClass
    });
}

export function generateGuyingReport(poleId) {
    const state = getState();
    const pole = state.poles.find(p => p.id === poleId);
    if (!pole) return '';

    const guys = pole.guys || [];
    const soilClass = state.params?.soilClass || 'B';

    let html = `<div class="guying-report">
        <h4>Guying Analysis - ${pole.id}</h4>
        <div class="soil-info">
            <strong>Soil Class:</strong> ${soilClass} - ${SOIL_CLASSES[soilClass].name}
        </div>`;

    if (guys.length === 0) {
        // Calculate if guying is needed
        const moment = window.getPoleMoment?.(poleId) || 0;
        const poleCapacity = (pole.class || 4) * 2000; // Rough estimate

        if (moment > poleCapacity * 0.7) {
            html += `<div class="guy-needed warning">
                ⚠️ Guying recommended - Pole utilization high
            </div>`;
        } else {
            html += `<div class="no-guys">No guys installed - Pole self-supporting</div>`;
        }
    } else {
        guys.forEach((guy, i) => {
            const calc = calculateGuy({
                poleLoad: guy.load || 2000,
                attachHeight: guy.attachHeight || 25,
                leadLength: guy.leadLength || 20,
                soilClass
            });

            html += `
                <div class="guy-detail">
                    <div class="guy-header">Guy #${i + 1} - ${guy.direction || 0}°</div>
                    <div class="guy-grid">
                        <div class="guy-item">
                            <span class="label">Length:</span>
                            <span class="value">${calc.geometry.length.toFixed(1)} ft</span>
                        </div>
                        <div class="guy-item">
                            <span class="label">Angle:</span>
                            <span class="value">${calc.geometry.angle.toFixed(1)}°</span>
                        </div>
                        <div class="guy-item">
                            <span class="label">Tension:</span>
                            <span class="value">${Math.round(calc.loads.guyTension)} lbs</span>
                        </div>
                        <div class="guy-item">
                            <span class="label">Wire:</span>
                            <span class="value">${calc.wire.name}</span>
                        </div>
                        <div class="guy-item">
                            <span class="label">Anchor:</span>
                            <span class="value">${calc.anchor.name || 'TBD'}</span>
                        </div>
                    </div>
                    ${calc.recommendations.warnings.length > 0 ? `
                        <div class="guy-warnings">
                            ${calc.recommendations.warnings.map(w => `<div class="warning">⚠️ ${w}</div>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }

    html += '</div>';
    return html;
}

export function showGuyingCalculator() {
    const modal = document.getElementById('guyingModal');
    const content = document.getElementById('guyingContent');

    if (content) {
        content.innerHTML = `
            <div class="guying-form">
                <div class="form-row">
                    <label>Pole Load (lbs):</label>
                    <input type="number" id="guyPoleLoad" value="3000" class="input">
                </div>
                <div class="form-row">
                    <label>Attach Height (ft):</label>
                    <input type="number" id="guyAttachHeight" value="28" class="input">
                </div>
                <div class="form-row">
                    <label>Lead Length (ft):</label>
                    <input type="number" id="guyLeadLength" value="20" class="input">
                </div>
                <div class="form-row">
                    <label>Soil Class:</label>
                    <select id="guySoilClass" class="input">
                        ${Object.entries(SOIL_CLASSES).map(([k, v]) =>
                            `<option value="${k}">${k} - ${v.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <button class="btn success" onclick="window.runGuyCalc()">Calculate</button>
                <div id="guyResults" style="margin-top:1rem;"></div>
            </div>
        `;
    }

    window.runGuyCalc = () => {
        const result = calculateGuy({
            poleLoad: +document.getElementById('guyPoleLoad').value,
            attachHeight: +document.getElementById('guyAttachHeight').value,
            leadLength: +document.getElementById('guyLeadLength').value,
            soilClass: document.getElementById('guySoilClass').value
        });

        document.getElementById('guyResults').innerHTML = `
            <div class="result-card">
                <div><strong>Guy Length:</strong> ${result.geometry.length.toFixed(1)} ft</div>
                <div><strong>Guy Angle:</strong> ${result.geometry.angle.toFixed(1)}°</div>
                <div><strong>Guy Tension:</strong> ${Math.round(result.loads.guyTension)} lbs</div>
                <div><strong>Recommended Wire:</strong> ${result.wire.name}</div>
                <div><strong>Recommended Anchor:</strong> ${result.anchor.name || 'Special design'}</div>
                ${result.recommendations.warnings.map(w => `<div class="warning">⚠️ ${w}</div>`).join('')}
            </div>
        `;
    };

    if (modal) modal.style.display = 'flex';
}

export { GUY_WIRE, ANCHORS, SOIL_CLASSES };
