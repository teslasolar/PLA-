// Cost Estimator - Material + labor cost calculator
import { getState } from './state.js';
import { generateBOM, UNIT_COSTS } from './bom.js';

// Labor rates (can be customized)
const LABOR_RATES = {
    poleSet: { crew: 3, hours: 2.5, rate: 85 },      // Per pole
    poleRemove: { crew: 3, hours: 1.5, rate: 85 },   // Per pole
    spanString: { crew: 2, hours: 0.5, rate: 75 },   // Per 100ft
    guyInstall: { crew: 2, hours: 1, rate: 75 },     // Per guy
    transformerHang: { crew: 2, hours: 1.5, rate: 85 }, // Per transformer
    equipmentMount: { crew: 2, hours: 1, rate: 75 }, // Per device
    engineering: { rate: 125 },                       // Per hour
    supervision: { rate: 95 },                        // Per hour
    permits: { flat: 500 }                            // Flat fee
};

// Overhead and contingency
const OVERHEAD = {
    materialMarkup: 0.15,   // 15% markup on materials
    laborBurden: 0.35,      // 35% burden on labor
    contingency: 0.10,      // 10% contingency
    profitMargin: 0.12      // 12% profit
};

export function generateCostEstimate(options = {}) {
    const state = getState();
    const bom = generateBOM();

    const estimate = {
        materials: { subtotal: 0, items: [] },
        labor: { subtotal: 0, items: [] },
        other: { subtotal: 0, items: [] },
        adjustments: { subtotal: 0, items: [] },
        grandTotal: 0
    };

    // === MATERIALS ===
    estimate.materials.subtotal = bom.summary.totalCost;
    estimate.materials.items.push({
        desc: 'Poles, Conductor, Hardware',
        qty: bom.summary.items,
        cost: bom.summary.totalCost
    });

    // Material markup
    const materialMarkup = estimate.materials.subtotal * OVERHEAD.materialMarkup;
    estimate.adjustments.items.push({
        desc: 'Material Markup (15%)',
        cost: materialMarkup
    });

    // === LABOR ===
    const poles = state.poles || [];
    const spans = state.spans || [];

    // Pole setting
    const poleLaborHours = poles.length * LABOR_RATES.poleSet.hours;
    const poleLaborCost = poleLaborHours * LABOR_RATES.poleSet.crew * LABOR_RATES.poleSet.rate;
    estimate.labor.items.push({
        desc: `Set ${poles.length} poles`,
        hours: poleLaborHours,
        crew: LABOR_RATES.poleSet.crew,
        rate: LABOR_RATES.poleSet.rate,
        cost: poleLaborCost
    });

    // Span stringing
    let totalSpanLength = 0;
    spans.forEach(span => {
        const p1 = poles.find(p => p.id === span.from);
        const p2 = poles.find(p => p.id === span.to);
        if (p1 && p2) {
            totalSpanLength += Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
        }
    });

    const spanHours = (totalSpanLength / 100) * LABOR_RATES.spanString.hours;
    const spanLaborCost = spanHours * LABOR_RATES.spanString.crew * LABOR_RATES.spanString.rate;
    estimate.labor.items.push({
        desc: `String ${Math.round(totalSpanLength)}' conductor`,
        hours: spanHours,
        crew: LABOR_RATES.spanString.crew,
        rate: LABOR_RATES.spanString.rate,
        cost: spanLaborCost
    });

    // Guy installation
    let guyCount = 0;
    poles.forEach(p => { guyCount += (p.guys || []).length; });

    if (guyCount > 0) {
        const guyHours = guyCount * LABOR_RATES.guyInstall.hours;
        const guyLaborCost = guyHours * LABOR_RATES.guyInstall.crew * LABOR_RATES.guyInstall.rate;
        estimate.labor.items.push({
            desc: `Install ${guyCount} guy assemblies`,
            hours: guyHours,
            crew: LABOR_RATES.guyInstall.crew,
            rate: LABOR_RATES.guyInstall.rate,
            cost: guyLaborCost
        });
    }

    // Equipment mounting
    let equipCount = 0;
    poles.forEach(p => { equipCount += (p.attachments || []).length; });

    if (equipCount > 0) {
        const equipHours = equipCount * LABOR_RATES.equipmentMount.hours;
        const equipLaborCost = equipHours * LABOR_RATES.equipmentMount.crew * LABOR_RATES.equipmentMount.rate;
        estimate.labor.items.push({
            desc: `Mount ${equipCount} equipment items`,
            hours: equipHours,
            crew: LABOR_RATES.equipmentMount.crew,
            rate: LABOR_RATES.equipmentMount.rate,
            cost: equipLaborCost
        });
    }

    // Calculate labor subtotal
    estimate.labor.subtotal = estimate.labor.items.reduce((sum, i) => sum + i.cost, 0);

    // Labor burden
    const laborBurden = estimate.labor.subtotal * OVERHEAD.laborBurden;
    estimate.adjustments.items.push({
        desc: 'Labor Burden (35%)',
        cost: laborBurden
    });

    // === OTHER COSTS ===
    // Engineering (estimate based on project size)
    const engHours = Math.max(8, poles.length * 0.5);
    estimate.other.items.push({
        desc: `Engineering (${engHours} hrs)`,
        cost: engHours * LABOR_RATES.engineering.rate
    });

    // Supervision
    const totalLaborHours = estimate.labor.items.reduce((sum, i) => sum + (i.hours || 0), 0);
    const supervisionHours = totalLaborHours * 0.15; // 15% of labor hours
    estimate.other.items.push({
        desc: `Supervision (${supervisionHours.toFixed(1)} hrs)`,
        cost: supervisionHours * LABOR_RATES.supervision.rate
    });

    // Permits
    estimate.other.items.push({
        desc: 'Permits & Fees',
        cost: LABOR_RATES.permits.flat
    });

    // Mobilization (estimate)
    estimate.other.items.push({
        desc: 'Mobilization',
        cost: 1500
    });

    estimate.other.subtotal = estimate.other.items.reduce((sum, i) => sum + i.cost, 0);

    // === ADJUSTMENTS ===
    const baseTotal = estimate.materials.subtotal + estimate.labor.subtotal + estimate.other.subtotal;

    // Contingency
    const contingency = baseTotal * OVERHEAD.contingency;
    estimate.adjustments.items.push({
        desc: 'Contingency (10%)',
        cost: contingency
    });

    // Profit
    const profit = (baseTotal + contingency) * OVERHEAD.profitMargin;
    estimate.adjustments.items.push({
        desc: 'Profit Margin (12%)',
        cost: profit
    });

    estimate.adjustments.subtotal = estimate.adjustments.items.reduce((sum, i) => sum + i.cost, 0);

    // === GRAND TOTAL ===
    estimate.grandTotal = estimate.materials.subtotal +
                          estimate.labor.subtotal +
                          estimate.other.subtotal +
                          estimate.adjustments.subtotal;

    return estimate;
}

export function generateCostHTML(estimate) {
    if (!estimate) estimate = generateCostEstimate();

    const fmt = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return `
        <div class="cost-estimate">
            <div class="cost-section">
                <h4>Materials</h4>
                <table class="cost-table">
                    <tbody>
                        ${estimate.materials.items.map(i => `
                            <tr><td>${i.desc}</td><td class="cost">${fmt(i.cost)}</td></tr>
                        `).join('')}
                        <tr class="subtotal"><td>Subtotal</td><td class="cost">${fmt(estimate.materials.subtotal)}</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="cost-section">
                <h4>Labor</h4>
                <table class="cost-table">
                    <thead><tr><th>Description</th><th>Hours</th><th>Crew</th><th>Rate</th><th>Cost</th></tr></thead>
                    <tbody>
                        ${estimate.labor.items.map(i => `
                            <tr>
                                <td>${i.desc}</td>
                                <td>${i.hours?.toFixed(1) || '-'}</td>
                                <td>${i.crew || '-'}</td>
                                <td>${i.rate ? fmt(i.rate) + '/hr' : '-'}</td>
                                <td class="cost">${fmt(i.cost)}</td>
                            </tr>
                        `).join('')}
                        <tr class="subtotal"><td colspan="4">Subtotal</td><td class="cost">${fmt(estimate.labor.subtotal)}</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="cost-section">
                <h4>Other Costs</h4>
                <table class="cost-table">
                    <tbody>
                        ${estimate.other.items.map(i => `
                            <tr><td>${i.desc}</td><td class="cost">${fmt(i.cost)}</td></tr>
                        `).join('')}
                        <tr class="subtotal"><td>Subtotal</td><td class="cost">${fmt(estimate.other.subtotal)}</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="cost-section">
                <h4>Adjustments</h4>
                <table class="cost-table">
                    <tbody>
                        ${estimate.adjustments.items.map(i => `
                            <tr><td>${i.desc}</td><td class="cost">${fmt(i.cost)}</td></tr>
                        `).join('')}
                        <tr class="subtotal"><td>Subtotal</td><td class="cost">${fmt(estimate.adjustments.subtotal)}</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="cost-total">
                <span>Grand Total:</span>
                <span class="total-value">${fmt(estimate.grandTotal)}</span>
            </div>

            <div class="cost-breakdown">
                <div class="breakdown-item">
                    <span>Materials:</span>
                    <span>${((estimate.materials.subtotal / estimate.grandTotal) * 100).toFixed(0)}%</span>
                </div>
                <div class="breakdown-item">
                    <span>Labor:</span>
                    <span>${((estimate.labor.subtotal / estimate.grandTotal) * 100).toFixed(0)}%</span>
                </div>
                <div class="breakdown-item">
                    <span>Other:</span>
                    <span>${((estimate.other.subtotal / estimate.grandTotal) * 100).toFixed(0)}%</span>
                </div>
            </div>
        </div>
    `;
}

export function showCostDialog() {
    const modal = document.getElementById('costModal');
    const content = document.getElementById('costContent');

    if (content) {
        const estimate = generateCostEstimate();
        content.innerHTML = `
            <div class="cost-actions">
                <button class="btn" onclick="window.exportCostPDF()">Export PDF</button>
            </div>
            ${generateCostHTML(estimate)}
        `;
    }

    window.exportCostPDF = () => {
        const estimate = generateCostEstimate();
        const html = generateCostHTML(estimate);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Cost Estimate</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
                .cost-estimate { max-width: 8in; margin: 0 auto; }
                .cost-section { margin-bottom: 15px; }
                .cost-section h4 { background: #333; color: #fff; padding: 5px 10px; margin: 0 0 5px 0; }
                .cost-table { width: 100%; border-collapse: collapse; }
                .cost-table th, .cost-table td { border: 1px solid #ccc; padding: 4px 8px; }
                .cost-table th { background: #eee; text-align: left; }
                .cost-table .cost { text-align: right; }
                .subtotal { font-weight: bold; background: #f5f5f5; }
                .cost-total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 15px; padding: 10px; background: #333; color: #fff; }
                .cost-breakdown { display: flex; justify-content: space-around; margin-top: 10px; }
            </style>
            </head><body>
            <h2>Cost Estimate - ${getState().name || 'PLA Project'}</h2>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            ${html}
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    if (modal) modal.style.display = 'flex';
}

export { LABOR_RATES, OVERHEAD };
