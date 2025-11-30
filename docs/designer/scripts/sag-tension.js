/**
 * PLA Designer - Sag-Tension Calculator
 * Calculates conductor sag at various temperatures
 */

// Conductor properties (from specs)
const CONDUCTORS = {
    'Raven': { area: 0.0642, weight: 0.0829, strength: 4380, modulus: 10e6, coef: 12.8e-6 },
    'Sparrow': { area: 0.0522, weight: 0.0522, strength: 2850, modulus: 10e6, coef: 12.8e-6 },
    'Penguin': { area: 0.1663, weight: 0.1663, strength: 8350, modulus: 10e6, coef: 12.8e-6 },
    'Dove': { area: 0.7653, weight: 0.7653, strength: 22600, modulus: 10e6, coef: 12.8e-6 },
    'Partridge': { area: 0.3673, weight: 0.3673, strength: 11300, modulus: 10e6, coef: 12.8e-6 }
};

// Standard temperatures (°F)
const TEMPS = [0, 32, 60, 90, 120, 167, 212];

// Ice loading (inches radial)
const ICE_LOADS = { heavy: 0.5, medium: 0.25, light: 0 };

// Calculate initial sag (parabolic approximation)
export function calcSag(span, weight, tension) {
    return (weight * span * span) / (8 * tension);
}

// Calculate tension from sag
export function calcTension(span, weight, sag) {
    return (weight * span * span) / (8 * sag);
}

// Calculate loaded weight with ice
export function calcLoadedWeight(conductor, iceThickness = 0, windPsf = 0) {
    const cond = CONDUCTORS[conductor] || CONDUCTORS['Raven'];
    const diameter = Math.sqrt(cond.area / Math.PI) * 2 * 12; // inches

    // Ice weight (lb/ft) = π * ρ_ice * t * (d + t)
    const iceWeight = iceThickness > 0 ? 1.24 * iceThickness * (diameter + iceThickness) : 0;

    // Wind load on iced conductor
    const icedDia = diameter + 2 * iceThickness;
    const windLoad = windPsf * icedDia / 12;

    // Total load (vector sum)
    const vertLoad = cond.weight + iceWeight;
    const totalLoad = Math.sqrt(vertLoad * vertLoad + windLoad * windLoad);

    return { bare: cond.weight, iced: vertLoad, total: totalLoad };
}

// Sag-tension calculation using change equation
export function sagTensionCalc(params) {
    const {
        conductor = 'Raven',
        span = 300,
        initialTension = 2000,
        initialTemp = 60,
        finalTemp = 60,
        initialIce = 0,
        finalIce = 0,
        initialWind = 0,
        finalWind = 0
    } = params;

    const cond = CONDUCTORS[conductor] || CONDUCTORS['Raven'];

    // Initial conditions
    const w1 = calcLoadedWeight(conductor, initialIce, initialWind).total;
    const H1 = initialTension;
    const S1 = calcSag(span, w1, H1);

    // Final conditions
    const w2 = calcLoadedWeight(conductor, finalIce, finalWind).total;

    // Temperature change factor
    const deltaT = finalTemp - initialTemp;
    const thermalStrain = cond.coef * deltaT;

    // Simplified sag-tension change equation
    // H2³ + a*H2² + b = 0 (cubic equation)
    // Using iterative solution

    let H2 = H1;
    const A = cond.area;
    const E = cond.modulus;
    const L = span;

    for (let i = 0; i < 20; i++) {
        const S2 = calcSag(L, w2, H2);
        const strain1 = (w1 * L) ** 2 / (24 * H1 ** 2);
        const strain2 = (w2 * L) ** 2 / (24 * H2 ** 2);

        const newH2 = H1 + A * E * (strain1 - strain2 - thermalStrain);
        if (Math.abs(newH2 - H2) < 1) break;
        H2 = (H2 + newH2) / 2;
    }

    const S2 = calcSag(span, w2, H2);

    return {
        initialTension: H1,
        finalTension: Math.round(H2),
        initialSag: S1.toFixed(2),
        finalSag: S2.toFixed(2),
        initialWeight: w1.toFixed(4),
        finalWeight: w2.toFixed(4),
        percentStrength: ((H2 / cond.strength) * 100).toFixed(1)
    };
}

// Generate sag-tension table for a span
export function generateSagTable(conductor, span, rulingSpan = null) {
    const rs = rulingSpan || span;
    const cond = CONDUCTORS[conductor] || CONDUCTORS['Raven'];

    // Initial condition: 60°F, no ice, 25% RBS
    const initialTension = cond.strength * 0.25;

    const table = {
        conductor,
        span,
        rulingSpan: rs,
        strength: cond.strength,
        initialTension: Math.round(initialTension),
        rows: []
    };

    // Calculate for each temperature
    for (const temp of TEMPS) {
        const result = sagTensionCalc({
            conductor,
            span,
            initialTension,
            initialTemp: 60,
            finalTemp: temp
        });

        table.rows.push({
            temp,
            tension: result.finalTension,
            sag: result.finalSag,
            percentRBS: result.percentStrength
        });
    }

    // Add NESC Heavy loading condition
    const heavyResult = sagTensionCalc({
        conductor,
        span,
        initialTension,
        initialTemp: 60,
        finalTemp: 0,
        finalIce: 0.5,
        finalWind: 4
    });

    table.rows.push({
        temp: 'NESC Heavy',
        tension: heavyResult.finalTension,
        sag: heavyResult.finalSag,
        percentRBS: heavyResult.percentStrength
    });

    return table;
}

// Format table as HTML
export function formatSagTableHTML(table) {
    return `
        <div style="margin-bottom:1rem;">
            <strong>Conductor:</strong> ${table.conductor} |
            <strong>Span:</strong> ${table.span} ft |
            <strong>Strength:</strong> ${table.strength} lb
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
                <tr style="background:#374151;color:#fff;">
                    <th style="padding:0.5rem;text-align:left;">Temp (°F)</th>
                    <th style="padding:0.5rem;text-align:right;">Tension (lb)</th>
                    <th style="padding:0.5rem;text-align:right;">Sag (ft)</th>
                    <th style="padding:0.5rem;text-align:right;">% RBS</th>
                </tr>
            </thead>
            <tbody>
                ${table.rows.map(r => `
                    <tr style="border-bottom:1px solid #444;">
                        <td style="padding:0.4rem;">${r.temp}</td>
                        <td style="padding:0.4rem;text-align:right;">${r.tension}</td>
                        <td style="padding:0.4rem;text-align:right;">${r.sag}</td>
                        <td style="padding:0.4rem;text-align:right;${parseFloat(r.percentRBS) > 60 ? 'color:#ef4444;' : ''}">${r.percentRBS}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Show sag-tension modal
export function showSagTensionModal(conductor = 'Raven', span = 300) {
    const table = generateSagTable(conductor, span);
    const modal = document.getElementById('sagTensionModal');
    const content = document.getElementById('sagTensionContent');

    if (modal && content) {
        content.innerHTML = formatSagTableHTML(table);
        modal.style.display = 'flex';
    }
}

export default { calcSag, calcTension, calcLoadedWeight, sagTensionCalc, generateSagTable, formatSagTableHTML, showSagTensionModal };
