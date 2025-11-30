// Transformer Sizing Calculator - KVA sizing based on connected load
import { getState } from './state.js';

// Standard transformer sizes (kVA)
const TRANSFORMER_SIZES = [5, 10, 15, 25, 37.5, 50, 75, 100, 167, 250, 333, 500];

// Load types with typical demand factors and power factors
const LOAD_TYPES = {
    residential: {
        name: 'Residential',
        demandFactor: 0.40,  // 40% of connected load
        powerFactor: 0.95,
        diversityFactor: 0.6,  // For multiple homes
        typicalKW: 12  // per home
    },
    commercial: {
        name: 'Commercial',
        demandFactor: 0.70,
        powerFactor: 0.85,
        diversityFactor: 0.8,
        typicalKW: 50  // per unit
    },
    industrial: {
        name: 'Industrial',
        demandFactor: 0.80,
        powerFactor: 0.80,
        diversityFactor: 0.9,
        typicalKW: 100
    },
    irrigation: {
        name: 'Irrigation/Pump',
        demandFactor: 1.0,
        powerFactor: 0.85,
        diversityFactor: 1.0,
        typicalKW: 25  // per HP
    },
    lighting: {
        name: 'Street Lighting',
        demandFactor: 1.0,
        powerFactor: 0.90,
        diversityFactor: 1.0,
        typicalKW: 0.4  // per fixture
    }
};

// Temperature derating factors
const TEMP_DERATING = {
    30: 1.00, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82
};

export function calculateTransformerSize(params) {
    const {
        loads = [],              // Array of {type, quantity, kw}
        futureGrowth = 0.20,     // 20% growth allowance
        ambientTemp = 30,        // °C
        elevation = 0,           // ft above sea level
        phases = 1
    } = params;

    // Calculate total connected load
    let totalConnectedKW = 0;
    let totalDemandKVA = 0;
    const loadDetails = [];

    loads.forEach(load => {
        const loadType = LOAD_TYPES[load.type] || LOAD_TYPES.residential;
        const connectedKW = load.kw || (loadType.typicalKW * load.quantity);
        const demandKW = connectedKW * loadType.demandFactor * loadType.diversityFactor;
        const demandKVA = demandKW / loadType.powerFactor;

        totalConnectedKW += connectedKW;
        totalDemandKVA += demandKVA;

        loadDetails.push({
            type: loadType.name,
            quantity: load.quantity,
            connectedKW,
            demandKW: demandKW.toFixed(1),
            demandKVA: demandKVA.toFixed(1),
            powerFactor: loadType.powerFactor
        });
    });

    // Add future growth
    const withGrowthKVA = totalDemandKVA * (1 + futureGrowth);

    // Apply temperature derating
    const tempDerate = TEMP_DERATING[ambientTemp] || 1.0;

    // Elevation derating (1% per 330ft above 3300ft)
    const elevDerate = elevation > 3300 ? 1 - ((elevation - 3300) / 330) * 0.01 : 1.0;

    // Total derating
    const totalDerate = tempDerate * elevDerate;

    // Required transformer size
    const requiredKVA = withGrowthKVA / totalDerate;

    // Select standard size
    let selectedSize = TRANSFORMER_SIZES.find(s => s >= requiredKVA) || TRANSFORMER_SIZES[TRANSFORMER_SIZES.length - 1];

    // Calculate loading
    const loadingPercent = (withGrowthKVA / selectedSize) * 100;

    // Determine if size is appropriate
    let status = 'PASS';
    let recommendation = '';

    if (loadingPercent > 100) {
        status = 'FAIL';
        recommendation = 'Transformer will be overloaded. Select larger size or split load.';
    } else if (loadingPercent > 80) {
        status = 'WARNING';
        recommendation = 'Transformer loading exceeds 80%. Consider next size up for growth.';
    } else if (loadingPercent < 30) {
        status = 'WARNING';
        recommendation = 'Transformer may be oversized. Consider smaller unit for efficiency.';
    }

    return {
        input: params,
        loadDetails,
        summary: {
            totalConnectedKW: totalConnectedKW.toFixed(1),
            totalDemandKVA: totalDemandKVA.toFixed(1),
            withGrowthKVA: withGrowthKVA.toFixed(1),
            derating: totalDerate.toFixed(2),
            requiredKVA: requiredKVA.toFixed(1),
            selectedSize,
            loadingPercent: loadingPercent.toFixed(1)
        },
        status,
        recommendation
    };
}

export function calculateResidentialTransformer(numHomes, avgKW = 12) {
    const loads = [{
        type: 'residential',
        quantity: numHomes,
        kw: numHomes * avgKW
    }];

    return calculateTransformerSize({ loads });
}

export function generateSizingReport(result) {
    return `
        <div class="sizing-report">
            <div class="sizing-summary">
                <div class="stat">
                    <span class="stat-val">${result.summary.selectedSize}</span>
                    <span class="stat-label">Recommended kVA</span>
                </div>
                <div class="stat">
                    <span class="stat-val ${result.status.toLowerCase()}">${result.summary.loadingPercent}%</span>
                    <span class="stat-label">Loading</span>
                </div>
            </div>

            <h4>Load Analysis</h4>
            <table class="sag-table">
                <thead>
                    <tr>
                        <th>Load Type</th>
                        <th>Qty</th>
                        <th>Connected kW</th>
                        <th>Demand kW</th>
                        <th>Demand kVA</th>
                        <th>PF</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.loadDetails.map(l => `
                        <tr>
                            <td>${l.type}</td>
                            <td>${l.quantity}</td>
                            <td>${l.connectedKW.toFixed(1)}</td>
                            <td>${l.demandKW}</td>
                            <td>${l.demandKVA}</td>
                            <td>${l.powerFactor}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2"><strong>Total</strong></td>
                        <td><strong>${result.summary.totalConnectedKW} kW</strong></td>
                        <td>-</td>
                        <td><strong>${result.summary.totalDemandKVA} kVA</strong></td>
                        <td>-</td>
                    </tr>
                </tfoot>
            </table>

            <div class="sizing-details">
                <div><strong>With 20% Growth:</strong> ${result.summary.withGrowthKVA} kVA</div>
                <div><strong>Derating Factor:</strong> ${result.summary.derating}</div>
                <div><strong>Required Size:</strong> ${result.summary.requiredKVA} kVA</div>
            </div>

            ${result.recommendation ? `
                <div class="recommendation ${result.status.toLowerCase()}">
                    ${result.status === 'FAIL' ? '❌' : '⚠️'} ${result.recommendation}
                </div>
            ` : ''}

            <h4>Standard Sizes Comparison</h4>
            <div class="size-options">
                ${TRANSFORMER_SIZES.filter(s => s >= result.summary.requiredKVA * 0.7 && s <= result.summary.requiredKVA * 2).map(size => {
                    const loading = (result.summary.withGrowthKVA / size * 100).toFixed(0);
                    const selected = size === result.summary.selectedSize;
                    return `
                        <div class="size-option ${selected ? 'selected' : ''} ${loading > 100 ? 'overload' : ''}">
                            <span class="size-val">${size} kVA</span>
                            <span class="size-loading">${loading}%</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

export function showTransformerSizingDialog() {
    const modal = document.getElementById('transformerModal');
    const content = document.getElementById('transformerContent');

    if (content) {
        content.innerHTML = `
            <div class="xfmr-calc">
                <div class="load-inputs">
                    <h4>Connected Loads</h4>
                    <div id="loadList">
                        <div class="load-row">
                            <select class="input load-type">
                                ${Object.entries(LOAD_TYPES).map(([k, v]) =>
                                    `<option value="${k}">${v.name}</option>`
                                ).join('')}
                            </select>
                            <input type="number" class="input load-qty" placeholder="Qty" value="10">
                            <input type="number" class="input load-kw" placeholder="kW (opt)">
                        </div>
                    </div>
                    <button class="btn" onclick="window.addLoadRow()">+ Add Load</button>
                </div>

                <div class="calc-options">
                    <div class="form-row">
                        <label>Future Growth:</label>
                        <select id="xfmrGrowth" class="input">
                            <option value="0.10">10%</option>
                            <option value="0.20" selected>20%</option>
                            <option value="0.30">30%</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Ambient Temp:</label>
                        <select id="xfmrTemp" class="input">
                            <option value="30">30°C</option>
                            <option value="35">35°C</option>
                            <option value="40">40°C</option>
                            <option value="45">45°C</option>
                        </select>
                    </div>
                </div>

                <button class="btn success" onclick="window.calcXfmrSize()">Calculate Size</button>

                <div id="xfmrResults" style="margin-top:1rem;"></div>
            </div>
        `;
    }

    window.addLoadRow = () => {
        const list = document.getElementById('loadList');
        const row = document.createElement('div');
        row.className = 'load-row';
        row.innerHTML = `
            <select class="input load-type">
                ${Object.entries(LOAD_TYPES).map(([k, v]) =>
                    `<option value="${k}">${v.name}</option>`
                ).join('')}
            </select>
            <input type="number" class="input load-qty" placeholder="Qty" value="1">
            <input type="number" class="input load-kw" placeholder="kW (opt)">
            <button class="btn btn-sm danger" onclick="this.parentElement.remove()">×</button>
        `;
        list.appendChild(row);
    };

    window.calcXfmrSize = () => {
        const rows = document.querySelectorAll('.load-row');
        const loads = [];

        rows.forEach(row => {
            const type = row.querySelector('.load-type').value;
            const qty = +row.querySelector('.load-qty').value || 1;
            const kw = +row.querySelector('.load-kw').value || null;
            loads.push({ type, quantity: qty, kw });
        });

        const result = calculateTransformerSize({
            loads,
            futureGrowth: +document.getElementById('xfmrGrowth').value,
            ambientTemp: +document.getElementById('xfmrTemp').value
        });

        document.getElementById('xfmrResults').innerHTML = generateSizingReport(result);
    };

    if (modal) modal.style.display = 'flex';
}

export { TRANSFORMER_SIZES, LOAD_TYPES };
