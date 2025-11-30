/**
 * PLA Designer - UI Helpers
 */
import { state, subscribe, toJSON } from './state.js';

// DOM Elements
let elements = {};

export function initUI() {
    elements = {
        poleCount: document.getElementById('poleCount'),
        spanCount: document.getElementById('spanCount'),
        selectedName: document.getElementById('selectedName'),
        currentTool: document.getElementById('currentTool'),
        status: document.getElementById('status'),
        propsPanel: document.getElementById('propsPanel'),
        jsonOutput: document.getElementById('jsonOutput'),
        totalLength: document.getElementById('totalLength'),
        maxUtil: document.getElementById('maxUtil'),
        clearanceStatus: document.getElementById('clearanceStatus')
    };

    // Subscribe to state changes
    subscribe('update', updateUI);
    subscribe('selected', updateSelected);
    subscribe('tool', updateTool);
}

export function updateUI() {
    if (elements.poleCount) {
        elements.poleCount.textContent = state.poles.length;
    }
    if (elements.spanCount) {
        elements.spanCount.textContent = state.spans.length;
    }
    updateJSON();
}

export function updateSelected(id) {
    if (elements.selectedName) {
        elements.selectedName.textContent = id || 'None';
    }
}

export function updateTool(tool) {
    if (elements.currentTool) {
        elements.currentTool.textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
    }
    // Update button states
    document.querySelectorAll('.toolbar .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const btn = document.getElementById(tool + 'Btn');
    if (btn) btn.classList.add('active');
}

export function updateJSON() {
    if (elements.jsonOutput) {
        elements.jsonOutput.textContent = JSON.stringify(toJSON(), null, 2);
    }
}

export function setStatus(msg, type = 'info') {
    if (elements.status) {
        elements.status.textContent = msg;
        elements.status.style.color = type === 'error' ? '#ef4444' :
                                      type === 'success' ? '#10b981' : '#94a3b8';
    }
}

// Notifications
export function notify(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 100);
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// Properties panel
export function showPoleProperties(pole, onUpdate, onDelete) {
    if (!elements.propsPanel) return;

    elements.propsPanel.innerHTML = `
        <div class="form-group">
            <label class="label">Pole ID</label>
            <input class="input" value="${pole.id}" readonly>
        </div>
        <div class="form-row">
            <div>
                <label class="label">X Position</label>
                <input class="input" type="number" id="prop-x" value="${pole.x.toFixed(1)}">
            </div>
            <div>
                <label class="label">Z Position</label>
                <input class="input" type="number" id="prop-z" value="${pole.z.toFixed(1)}">
            </div>
        </div>
        <div class="form-row">
            <div>
                <label class="label">Class</label>
                <select class="input" id="prop-class">
                    ${['H6','H5','H4','H3','H2','H1','1','2','3','4','5','6','7'].map(c =>
                        `<option value="${c}" ${c === pole.poleClass ? 'selected' : ''}>${c}</option>`
                    ).join('')}
                </select>
            </div>
            <div>
                <label class="label">Height (ft)</label>
                <input class="input" value="${pole.height}" readonly>
            </div>
        </div>
        <div class="form-group">
            <label class="label">Material</label>
            <select class="input" id="prop-material">
                ${['wood','steel','concrete'].map(m =>
                    `<option value="${m}" ${m === pole.material ? 'selected' : ''}>${m}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="label">Capacity (lb-ft)</label>
            <input class="input" value="${pole.capacity}" readonly>
        </div>
        <button class="btn danger" style="width:100%" id="delete-btn">🗑️ Delete Pole</button>
    `;

    // Add event listeners
    document.getElementById('prop-x')?.addEventListener('change', (e) => onUpdate('x', parseFloat(e.target.value)));
    document.getElementById('prop-z')?.addEventListener('change', (e) => onUpdate('z', parseFloat(e.target.value)));
    document.getElementById('prop-class')?.addEventListener('change', (e) => onUpdate('poleClass', e.target.value));
    document.getElementById('prop-material')?.addEventListener('change', (e) => onUpdate('material', e.target.value));
    document.getElementById('delete-btn')?.addEventListener('click', onDelete);
}

export function showSpanProperties(span, onUpdate, onDelete) {
    if (!elements.propsPanel) return;

    elements.propsPanel.innerHTML = `
        <div class="form-group">
            <label class="label">Span ID</label>
            <input class="input" value="${span.id}" readonly>
        </div>
        <div class="form-row">
            <div>
                <label class="label">From</label>
                <input class="input" value="${span.pole1}" readonly>
            </div>
            <div>
                <label class="label">To</label>
                <input class="input" value="${span.pole2}" readonly>
            </div>
        </div>
        <div class="form-group">
            <label class="label">Length (ft)</label>
            <input class="input" value="${(span.length * 3.28084).toFixed(1)}" readonly>
        </div>
        <div class="form-row">
            <div>
                <label class="label">Phases</label>
                <select class="input" id="prop-phases">
                    <option value="1" ${span.phases === 1 ? 'selected' : ''}>1</option>
                    <option value="3" ${span.phases === 3 ? 'selected' : ''}>3</option>
                </select>
            </div>
            <div>
                <label class="label">Sag (m)</label>
                <input class="input" type="number" step="0.1" id="prop-sag" value="${span.sag}">
            </div>
        </div>
        <div class="form-group">
            <label class="label">Conductor</label>
            <select class="input" id="prop-conductor">
                ${['Raven','Sparrow','Penguin','Dove'].map(c =>
                    `<option value="${c}" ${c === span.conductor ? 'selected' : ''}>${c}</option>`
                ).join('')}
            </select>
        </div>
        <button class="btn danger" style="width:100%" id="delete-btn">🗑️ Delete Span</button>
    `;

    document.getElementById('prop-phases')?.addEventListener('change', (e) => onUpdate('phases', parseInt(e.target.value)));
    document.getElementById('prop-sag')?.addEventListener('change', (e) => onUpdate('sag', parseFloat(e.target.value)));
    document.getElementById('prop-conductor')?.addEventListener('change', (e) => onUpdate('conductor', e.target.value));
    document.getElementById('delete-btn')?.addEventListener('click', onDelete);
}

export function clearProperties() {
    if (elements.propsPanel) {
        elements.propsPanel.innerHTML = `
            <div style="color: #64748b; text-align: center; padding: 1rem;">
                Select a component to edit properties
            </div>
        `;
    }
}

// Analysis results
export function showAnalysisResults(results) {
    if (elements.totalLength) {
        elements.totalLength.textContent = `${results.summary.totalLength} ft`;
    }
    if (elements.maxUtil) {
        elements.maxUtil.textContent = `${results.summary.maxUtilization}%`;
        elements.maxUtil.className = `result-value ${parseFloat(results.summary.maxUtilization) <= 100 ? 'pass' : 'fail'}`;
    }
    if (elements.clearanceStatus) {
        elements.clearanceStatus.textContent = results.summary.overallStatus;
        elements.clearanceStatus.className = `result-value ${results.summary.overallStatus === 'PASS' ? 'pass' : 'fail'}`;
    }
}

// Modal
export function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// Build palette from JSON
export async function buildPalette(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const res = await fetch('../palette.json');
    const palette = await res.json();

    let html = '';
    palette.categories.forEach(cat => {
        html += `
            <div class="category">
                <div class="category-header" onclick="toggleCategory(this)">
                    <span class="category-title">${cat.icon} ${cat.name}</span>
                    <span class="category-count">${cat.items.length}</span>
                </div>
                <div class="category-content">
                    ${cat.items.map(item => `
                        <div class="item" draggable="true"
                             data-type="${item.type}"
                             data-props='${JSON.stringify(item.props)}'>
                            <div class="item-icon">${item.icon}</div>
                            <div class="item-name">${item.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Toggle category
window.toggleCategory = function(el) {
    el.nextElementSibling.classList.toggle('collapsed');
};

export default {
    initUI,
    updateUI,
    setStatus,
    notify,
    showPoleProperties,
    showSpanProperties,
    clearProperties,
    showAnalysisResults,
    showModal,
    closeModal,
    buildPalette
};
