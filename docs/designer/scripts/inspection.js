// Pole Inspection Tracker - Track inspection status and findings
import { getState, setState } from './state.js';

// Inspection categories and items
const INSPECTION_CATEGORIES = {
    structure: {
        name: 'Structure',
        items: [
            { id: 'pole_condition', name: 'Pole Condition', severity: 'high' },
            { id: 'pole_lean', name: 'Pole Lean/Plumb', severity: 'medium' },
            { id: 'ground_line', name: 'Ground Line Decay', severity: 'high' },
            { id: 'woodpecker', name: 'Woodpecker Damage', severity: 'medium' },
            { id: 'splits_checks', name: 'Splits/Checks', severity: 'low' }
        ]
    },
    hardware: {
        name: 'Hardware',
        items: [
            { id: 'crossarms', name: 'Crossarm Condition', severity: 'medium' },
            { id: 'insulators', name: 'Insulator Condition', severity: 'high' },
            { id: 'brackets', name: 'Brackets/Bolts', severity: 'medium' },
            { id: 'guys', name: 'Guy Wires/Anchors', severity: 'high' },
            { id: 'grounding', name: 'Grounding', severity: 'high' }
        ]
    },
    conductors: {
        name: 'Conductors',
        items: [
            { id: 'primary', name: 'Primary Conductors', severity: 'high' },
            { id: 'secondary', name: 'Secondary/Service', severity: 'medium' },
            { id: 'neutral', name: 'Neutral Wire', severity: 'high' },
            { id: 'clearances', name: 'Clearances Met', severity: 'high' },
            { id: 'sag', name: 'Proper Sag', severity: 'medium' }
        ]
    },
    equipment: {
        name: 'Equipment',
        items: [
            { id: 'transformers', name: 'Transformer Condition', severity: 'high' },
            { id: 'cutouts', name: 'Cutouts/Fuses', severity: 'high' },
            { id: 'arresters', name: 'Arresters', severity: 'medium' },
            { id: 'capacitors', name: 'Capacitors', severity: 'medium' },
            { id: 'meters', name: 'Meters', severity: 'low' }
        ]
    },
    vegetation: {
        name: 'Vegetation',
        items: [
            { id: 'tree_contact', name: 'Tree Contact Risk', severity: 'high' },
            { id: 'trimming_needed', name: 'Trimming Required', severity: 'medium' },
            { id: 'growth_rate', name: 'Fast Growth Species', severity: 'low' }
        ]
    }
};

// Condition ratings
const CONDITION_RATINGS = {
    1: { name: 'Good', color: '#22c55e', description: 'No issues, meets all standards' },
    2: { name: 'Fair', color: '#eab308', description: 'Minor issues, monitor' },
    3: { name: 'Poor', color: '#f97316', description: 'Repairs needed within 1 year' },
    4: { name: 'Critical', color: '#ef4444', description: 'Immediate attention required' },
    5: { name: 'Failed', color: '#7f1d1d', description: 'Replace/repair immediately' }
};

let inspections = {};

export function initInspections() {
    inspections = getState().inspections || {};
}

export function createInspection(poleId, inspector = 'Unknown') {
    const inspection = {
        id: `INS-${poleId}-${Date.now()}`,
        poleId,
        inspector,
        date: new Date().toISOString(),
        status: 'in_progress',
        overallRating: null,
        findings: {},
        notes: '',
        photos: [],
        recommendations: []
    };

    if (!inspections[poleId]) {
        inspections[poleId] = [];
    }
    inspections[poleId].push(inspection);
    updateState();

    return inspection;
}

export function updateInspectionItem(poleId, inspectionId, itemId, rating, notes = '') {
    const poleInspections = inspections[poleId];
    if (!poleInspections) return null;

    const inspection = poleInspections.find(i => i.id === inspectionId);
    if (!inspection) return null;

    inspection.findings[itemId] = {
        rating,
        notes,
        timestamp: new Date().toISOString()
    };

    updateState();
    return inspection;
}

export function completeInspection(poleId, inspectionId) {
    const poleInspections = inspections[poleId];
    if (!poleInspections) return null;

    const inspection = poleInspections.find(i => i.id === inspectionId);
    if (!inspection) return null;

    // Calculate overall rating (worst rating found)
    const ratings = Object.values(inspection.findings).map(f => f.rating).filter(r => r);
    inspection.overallRating = ratings.length > 0 ? Math.max(...ratings) : 1;
    inspection.status = 'completed';
    inspection.completedAt = new Date().toISOString();

    updateState();
    return inspection;
}

export function getLatestInspection(poleId) {
    const poleInspections = inspections[poleId];
    if (!poleInspections || poleInspections.length === 0) return null;

    return poleInspections.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    )[0];
}

export function getAllInspections() {
    return inspections;
}

function updateState() {
    const state = getState();
    setState({ ...state, inspections });
}

export function getInspectionSummary() {
    const state = getState();
    const poles = state.poles || [];

    const summary = {
        totalPoles: poles.length,
        inspected: 0,
        uninspected: 0,
        byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        needsAttention: [],
        overdue: []
    };

    poles.forEach(pole => {
        const latest = getLatestInspection(pole.id);

        if (latest && latest.status === 'completed') {
            summary.inspected++;
            summary.byRating[latest.overallRating]++;

            if (latest.overallRating >= 3) {
                summary.needsAttention.push({
                    pole: pole.id,
                    rating: latest.overallRating,
                    date: latest.completedAt
                });
            }

            // Check if inspection is overdue (>1 year old)
            const inspDate = new Date(latest.completedAt);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            if (inspDate < oneYearAgo) {
                summary.overdue.push({
                    pole: pole.id,
                    lastInspection: latest.completedAt
                });
            }
        } else {
            summary.uninspected++;
        }
    });

    return summary;
}

export function generateInspectionReport() {
    const summary = getInspectionSummary();
    const pct = summary.totalPoles > 0
        ? ((summary.inspected / summary.totalPoles) * 100).toFixed(0)
        : 0;

    return `
        <div class="inspection-report">
            <div class="insp-summary">
                <div class="stat">
                    <span class="stat-val">${pct}%</span>
                    <span class="stat-label">Inspected</span>
                </div>
                <div class="stat">
                    <span class="stat-val">${summary.inspected}/${summary.totalPoles}</span>
                    <span class="stat-label">Poles Done</span>
                </div>
                <div class="stat ${summary.needsAttention.length > 0 ? 'warn' : ''}">
                    <span class="stat-val">${summary.needsAttention.length}</span>
                    <span class="stat-label">Need Attention</span>
                </div>
                <div class="stat ${summary.overdue.length > 0 ? 'fail' : ''}">
                    <span class="stat-val">${summary.overdue.length}</span>
                    <span class="stat-label">Overdue</span>
                </div>
            </div>

            <div class="rating-breakdown">
                <h4>Condition Distribution</h4>
                <div class="rating-bars">
                    ${Object.entries(CONDITION_RATINGS).map(([rating, info]) => {
                        const count = summary.byRating[rating] || 0;
                        const width = summary.inspected > 0
                            ? (count / summary.inspected * 100).toFixed(0)
                            : 0;
                        return `
                            <div class="rating-row">
                                <span class="rating-label" style="color:${info.color}">${info.name}</span>
                                <div class="rating-bar-bg">
                                    <div class="rating-bar" style="width:${width}%;background:${info.color}"></div>
                                </div>
                                <span class="rating-count">${count}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            ${summary.needsAttention.length > 0 ? `
                <h4>Poles Needing Attention</h4>
                <table class="sag-table">
                    <thead>
                        <tr>
                            <th>Pole</th>
                            <th>Rating</th>
                            <th>Last Inspected</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summary.needsAttention.map(p => `
                            <tr>
                                <td>${p.pole}</td>
                                <td style="color:${CONDITION_RATINGS[p.rating]?.color}">${CONDITION_RATINGS[p.rating]?.name}</td>
                                <td>${new Date(p.date).toLocaleDateString()}</td>
                                <td><button class="btn btn-sm" onclick="window.viewInspection('${p.pole}')">View</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}
        </div>
    `;
}

export function showInspectionDialog() {
    const modal = document.getElementById('inspectionModal');
    const content = document.getElementById('inspectionContent');

    if (content) {
        const state = getState();
        const poles = state.poles || [];

        content.innerHTML = `
            <div class="inspection-dialog">
                ${generateInspectionReport()}

                <hr style="margin:1rem 0;border-color:#4b5563;">

                <h4>Start New Inspection</h4>
                <div class="new-inspection-form">
                    <select id="inspPole" class="input">
                        ${poles.map(p => `<option value="${p.id}">${p.id}</option>`).join('')}
                    </select>
                    <input type="text" id="inspInspector" class="input" placeholder="Inspector Name">
                    <button class="btn success" onclick="window.startInspection()">Start Inspection</button>
                </div>

                <div id="inspectionForm" style="display:none;margin-top:1rem;"></div>
            </div>
        `;
    }

    window.startInspection = () => {
        const poleId = document.getElementById('inspPole').value;
        const inspector = document.getElementById('inspInspector').value || 'Unknown';

        const inspection = createInspection(poleId, inspector);
        showInspectionForm(poleId, inspection.id);
    };

    window.viewInspection = (poleId) => {
        const latest = getLatestInspection(poleId);
        if (latest) {
            alert(JSON.stringify(latest.findings, null, 2));
        }
    };

    if (modal) modal.style.display = 'flex';
}

function showInspectionForm(poleId, inspectionId) {
    const container = document.getElementById('inspectionForm');
    if (!container) return;

    container.style.display = 'block';
    container.innerHTML = `
        <div class="insp-form">
            <h4>Inspecting: ${poleId}</h4>
            ${Object.entries(INSPECTION_CATEGORIES).map(([catId, cat]) => `
                <div class="insp-category">
                    <h5>${cat.name}</h5>
                    ${cat.items.map(item => `
                        <div class="insp-item">
                            <label>${item.name}</label>
                            <select id="item_${item.id}" class="input" onchange="window.rateItem('${poleId}','${inspectionId}','${item.id}',this.value)">
                                <option value="">--</option>
                                ${Object.entries(CONDITION_RATINGS).map(([r, info]) =>
                                    `<option value="${r}">${r} - ${info.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
            <div class="insp-actions" style="margin-top:1rem;">
                <button class="btn success" onclick="window.finishInspection('${poleId}','${inspectionId}')">Complete Inspection</button>
            </div>
        </div>
    `;

    window.rateItem = (poleId, inspId, itemId, rating) => {
        if (rating) {
            updateInspectionItem(poleId, inspId, itemId, parseInt(rating));
        }
    };

    window.finishInspection = (poleId, inspId) => {
        completeInspection(poleId, inspId);
        alert('Inspection completed!');
        showInspectionDialog();
    };
}

export { INSPECTION_CATEGORIES, CONDITION_RATINGS, inspections };
