// Bill of Materials - Auto-generate pole schedule & material list
import { getState } from './state.js';

// Unit costs (can be customized)
const UNIT_COSTS = {
    poles: {
        '4-40': 450, '4-45': 520, '4-50': 600,
        '3-40': 380, '3-45': 430, '3-50': 490,
        '2-40': 320, '2-45': 360, '2-50': 410,
        '1-40': 270, '1-45': 310, '1-50': 350
    },
    conductors: {
        '1/0 ACSR': 0.45, '2/0 ACSR': 0.55, '3/0 ACSR': 0.68,
        '4/0 ACSR': 0.82, '336.4 ACSR': 1.15, '477 ACSR': 1.45
    },
    hardware: {
        crossarm: 85, insulator: 25, guy_wire: 0.35, anchor: 120,
        transformer: 1200, switch: 850, fuse: 180, arrester: 95
    }
};

export function generateBOM() {
    const state = getState();
    const bom = {
        poles: {},
        conductors: {},
        hardware: {},
        equipment: {},
        summary: { items: 0, totalCost: 0 }
    };

    // Count poles by class/height
    (state.poles || []).forEach(pole => {
        const key = `${pole.class || 4}-${pole.height || 40}`;
        if (!bom.poles[key]) {
            bom.poles[key] = { qty: 0, desc: `Class ${pole.class || 4}, ${pole.height || 40}' ${pole.species || 'SP'}` };
        }
        bom.poles[key].qty++;

        // Count attachments
        (pole.attachments || []).forEach(att => {
            if (!bom.equipment[att.type]) {
                bom.equipment[att.type] = { qty: 0, desc: att.type };
            }
            bom.equipment[att.type].qty++;
        });

        // Count guys
        (pole.guys || []).forEach(() => {
            if (!bom.hardware['guy_assembly']) {
                bom.hardware['guy_assembly'] = { qty: 0, desc: 'Guy Wire Assembly w/ Anchor' };
            }
            bom.hardware['guy_assembly'].qty++;
        });
    });

    // Count conductor by type
    (state.spans || []).forEach(span => {
        const conductor = span.conductor || '1/0 ACSR';
        const p1 = state.poles.find(p => p.id === span.from);
        const p2 = state.poles.find(p => p.id === span.to);

        if (p1 && p2) {
            const length = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);

            if (!bom.conductors[conductor]) {
                bom.conductors[conductor] = { qty: 0, desc: conductor, unit: 'ft' };
            }
            bom.conductors[conductor].qty += Math.ceil(length * 1.03); // 3% sag allowance

            // Hardware per span
            const phases = span.phases || 3;
            if (!bom.hardware['insulator']) {
                bom.hardware['insulator'] = { qty: 0, desc: 'Suspension Insulator' };
            }
            bom.hardware['insulator'].qty += phases * 2; // Both ends
        }
    });

    // Calculate costs
    let totalCost = 0;
    let itemCount = 0;

    Object.entries(bom.poles).forEach(([key, item]) => {
        item.unitCost = UNIT_COSTS.poles[key] || 400;
        item.totalCost = item.qty * item.unitCost;
        totalCost += item.totalCost;
        itemCount += item.qty;
    });

    Object.entries(bom.conductors).forEach(([key, item]) => {
        item.unitCost = UNIT_COSTS.conductors[key] || 0.50;
        item.totalCost = item.qty * item.unitCost;
        totalCost += item.totalCost;
        itemCount++;
    });

    Object.entries(bom.hardware).forEach(([key, item]) => {
        const hwKey = key.replace('_assembly', '_wire');
        item.unitCost = UNIT_COSTS.hardware[hwKey] || UNIT_COSTS.hardware[key] || 50;
        item.totalCost = item.qty * item.unitCost;
        totalCost += item.totalCost;
        itemCount += item.qty;
    });

    Object.entries(bom.equipment).forEach(([key, item]) => {
        item.unitCost = UNIT_COSTS.hardware[key] || 500;
        item.totalCost = item.qty * item.unitCost;
        totalCost += item.totalCost;
        itemCount += item.qty;
    });

    bom.summary = { items: itemCount, totalCost };
    return bom;
}

export function generateBOMTable(bom) {
    if (!bom) bom = generateBOM();

    const formatCurrency = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    let html = `
        <div class="bom-report">
            <div class="bom-summary">
                <div class="stat">
                    <span class="stat-val">${bom.summary.items}</span>
                    <span class="stat-label">Total Items</span>
                </div>
                <div class="stat">
                    <span class="stat-val">${formatCurrency(bom.summary.totalCost)}</span>
                    <span class="stat-label">Material Cost</span>
                </div>
            </div>

            <h4>Poles</h4>
            <table class="bom-table">
                <thead><tr><th>Description</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
                <tbody>
                    ${Object.entries(bom.poles).map(([_, item]) => `
                        <tr>
                            <td>${item.desc}</td>
                            <td>${item.qty}</td>
                            <td>${formatCurrency(item.unitCost)}</td>
                            <td>${formatCurrency(item.totalCost)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <h4>Conductors</h4>
            <table class="bom-table">
                <thead><tr><th>Type</th><th>Qty (ft)</th><th>$/ft</th><th>Total</th></tr></thead>
                <tbody>
                    ${Object.entries(bom.conductors).map(([_, item]) => `
                        <tr>
                            <td>${item.desc}</td>
                            <td>${item.qty.toLocaleString()}</td>
                            <td>${formatCurrency(item.unitCost)}</td>
                            <td>${formatCurrency(item.totalCost)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <h4>Hardware</h4>
            <table class="bom-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
                <tbody>
                    ${Object.entries(bom.hardware).map(([_, item]) => `
                        <tr>
                            <td>${item.desc}</td>
                            <td>${item.qty}</td>
                            <td>${formatCurrency(item.unitCost)}</td>
                            <td>${formatCurrency(item.totalCost)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            ${Object.keys(bom.equipment).length > 0 ? `
                <h4>Equipment</h4>
                <table class="bom-table">
                    <thead><tr><th>Type</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
                    <tbody>
                        ${Object.entries(bom.equipment).map(([_, item]) => `
                            <tr>
                                <td>${item.desc}</td>
                                <td>${item.qty}</td>
                                <td>${formatCurrency(item.unitCost)}</td>
                                <td>${formatCurrency(item.totalCost)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}
        </div>
    `;

    return html;
}

export function generatePoleSchedule() {
    const state = getState();
    const poles = state.poles || [];

    let html = `
        <div class="pole-schedule">
            <h4>Pole Schedule</h4>
            <table class="bom-table">
                <thead>
                    <tr>
                        <th>Pole ID</th>
                        <th>Class</th>
                        <th>Height</th>
                        <th>Species</th>
                        <th>Setting</th>
                        <th>Guys</th>
                        <th>Equipment</th>
                    </tr>
                </thead>
                <tbody>
                    ${poles.map(p => `
                        <tr>
                            <td>${p.id}</td>
                            <td>${p.class || 4}</td>
                            <td>${p.height || 40}'</td>
                            <td>${p.species || 'SP'}</td>
                            <td>${p.embedment || 6}' embed</td>
                            <td>${(p.guys || []).length || '-'}</td>
                            <td>${(p.attachments || []).map(a => a.type).join(', ') || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    return html;
}

export function exportBOMCSV() {
    const bom = generateBOM();
    let csv = 'Category,Item,Description,Quantity,Unit,Unit Cost,Total Cost\n';

    Object.entries(bom.poles).forEach(([key, item]) => {
        csv += `Poles,${key},"${item.desc}",${item.qty},EA,${item.unitCost},${item.totalCost}\n`;
    });

    Object.entries(bom.conductors).forEach(([key, item]) => {
        csv += `Conductor,${key},"${item.desc}",${item.qty},FT,${item.unitCost},${item.totalCost}\n`;
    });

    Object.entries(bom.hardware).forEach(([key, item]) => {
        csv += `Hardware,${key},"${item.desc}",${item.qty},EA,${item.unitCost},${item.totalCost}\n`;
    });

    Object.entries(bom.equipment).forEach(([key, item]) => {
        csv += `Equipment,${key},"${item.desc}",${item.qty},EA,${item.unitCost},${item.totalCost}\n`;
    });

    csv += `\nTOTAL,,,${bom.summary.items},,,${bom.summary.totalCost}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bom-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function showBOMDialog() {
    const modal = document.getElementById('bomModal');
    const content = document.getElementById('bomContent');

    if (content) {
        content.innerHTML = `
            <div class="bom-actions">
                <button class="btn" onclick="window.exportBOMCSV()">Export CSV</button>
            </div>
            ${generateBOMTable()}
            ${generatePoleSchedule()}
        `;
    }

    window.exportBOMCSV = exportBOMCSV;

    if (modal) modal.style.display = 'flex';
}

export { UNIT_COSTS };
