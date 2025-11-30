/**
 * PLA Designer - UI Helpers (Optimized)
 */
import { state, subscribe, toJSON } from './state.js';

let el = {};

export function initUI() {
    el = {
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
    subscribe('update', updateUI);
    subscribe('selected', id => el.selectedName && (el.selectedName.textContent = id || 'None'));
    subscribe('tool', t => {
        el.currentTool && (el.currentTool.textContent = t.charAt(0).toUpperCase() + t.slice(1));
        document.querySelectorAll('.toolbar .btn').forEach(b => b.classList.remove('active'));
        document.getElementById(t + 'Btn')?.classList.add('active');
    });
}

export function updateUI() {
    if (el.poleCount) el.poleCount.textContent = state.poles.length;
    if (el.spanCount) el.spanCount.textContent = state.spans.length;
    if (el.jsonOutput) el.jsonOutput.textContent = JSON.stringify(toJSON(), null, 2);
}

export function setStatus(msg, type = 'info') {
    if (el.status) {
        el.status.textContent = msg;
        el.status.style.color = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#94a3b8';
    }
}

export function notify(msg, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add('show'), 50);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 250); }, 2500);
}

export function showPoleProperties(pole, onUpdate, onDelete) {
    if (!el.propsPanel) return;
    const cls = ['H6','H5','H4','H3','H2','H1','1','2','3','4','5','6','7'];
    const mats = ['wood','steel','concrete'];
    el.propsPanel.innerHTML = `
        <div class="form-group"><label class="label">ID</label><input class="input" value="${pole.id}" readonly></div>
        <div class="form-row">
            <div><label class="label">X</label><input class="input" type="number" id="px" value="${pole.x.toFixed(1)}"></div>
            <div><label class="label">Z</label><input class="input" type="number" id="pz" value="${pole.z.toFixed(1)}"></div>
        </div>
        <div class="form-row">
            <div><label class="label">Class</label><select class="input" id="pc">${cls.map(c=>`<option ${c===pole.poleClass?'selected':''}>${c}</option>`).join('')}</select></div>
            <div><label class="label">Height</label><input class="input" value="${pole.height} ft" readonly></div>
        </div>
        <div class="form-group"><label class="label">Material</label><select class="input" id="pm">${mats.map(m=>`<option ${m===pole.material?'selected':''}>${m}</option>`).join('')}</select></div>
        <div class="form-group"><label class="label">Capacity</label><input class="input" value="${pole.capacity} lb-ft" readonly></div>
        <button class="btn danger" style="width:100%" id="del">Delete</button>`;
    document.getElementById('px')?.addEventListener('change', e => onUpdate('x', +e.target.value));
    document.getElementById('pz')?.addEventListener('change', e => onUpdate('z', +e.target.value));
    document.getElementById('pc')?.addEventListener('change', e => onUpdate('poleClass', e.target.value));
    document.getElementById('pm')?.addEventListener('change', e => onUpdate('material', e.target.value));
    document.getElementById('del')?.addEventListener('click', onDelete);
}

export function showSpanProperties(span, onUpdate, onDelete) {
    if (!el.propsPanel) return;
    const conds = ['Raven','Sparrow','Penguin','Dove'];
    el.propsPanel.innerHTML = `
        <div class="form-group"><label class="label">ID</label><input class="input" value="${span.id}" readonly></div>
        <div class="form-row">
            <div><label class="label">From</label><input class="input" value="${span.pole1}" readonly></div>
            <div><label class="label">To</label><input class="input" value="${span.pole2}" readonly></div>
        </div>
        <div class="form-group"><label class="label">Length</label><input class="input" value="${(span.length*3.28084).toFixed(1)} ft" readonly></div>
        <div class="form-row">
            <div><label class="label">Phases</label><select class="input" id="sp"><option ${span.phases===1?'selected':''}>1</option><option ${span.phases===3?'selected':''}>3</option></select></div>
            <div><label class="label">Sag (m)</label><input class="input" type="number" step="0.1" id="ss" value="${span.sag}"></div>
        </div>
        <div class="form-group"><label class="label">Conductor</label><select class="input" id="sc">${conds.map(c=>`<option ${c===span.conductor?'selected':''}>${c}</option>`).join('')}</select></div>
        <button class="btn danger" style="width:100%" id="del">Delete</button>`;
    document.getElementById('sp')?.addEventListener('change', e => onUpdate('phases', +e.target.value));
    document.getElementById('ss')?.addEventListener('change', e => onUpdate('sag', +e.target.value));
    document.getElementById('sc')?.addEventListener('change', e => onUpdate('conductor', e.target.value));
    document.getElementById('del')?.addEventListener('click', onDelete);
}

export function clearProperties() {
    if (el.propsPanel) el.propsPanel.innerHTML = '<div style="color:#64748b;text-align:center;padding:1rem">Select component</div>';
}

export function showAnalysisResults(r) {
    if (el.totalLength) el.totalLength.textContent = `${r.summary.totalLength} ft`;
    if (el.maxUtil) { el.maxUtil.textContent = `${r.summary.maxUtil}%`; el.maxUtil.className = `result-value ${+r.summary.maxUtil <= 100 ? 'pass' : 'fail'}`; }
    if (el.clearanceStatus) { el.clearanceStatus.textContent = r.summary.status; el.clearanceStatus.className = `result-value ${r.summary.status === 'PASS' ? 'pass' : 'fail'}`; }
}

export function showModal(id) { document.getElementById(id)?.style.setProperty('display', 'flex'); }
export function closeModal(id) { document.getElementById(id)?.style.setProperty('display', 'none'); }

export async function buildPalette(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    const p = await fetch('../palette.json').then(r => r.json());
    c.innerHTML = p.categories.map(cat => `
        <div class="category">
            <div class="category-header" onclick="toggleCategory(this)">
                <span class="category-title">${cat.icon} ${cat.name}</span>
                <span class="category-count">${cat.items.length}</span>
            </div>
            <div class="category-content">${cat.items.map(i => `
                <div class="item" draggable="true" data-type="${i.type}" data-props='${JSON.stringify(i.props)}'>
                    <div class="item-icon">${i.icon}</div>
                    <div class="item-name">${i.name}</div>
                </div>`).join('')}
            </div>
        </div>`).join('');
}

window.toggleCategory = el => el.nextElementSibling.classList.toggle('collapsed');

export default { initUI, updateUI, setStatus, notify, showPoleProperties, showSpanProperties, clearProperties, showAnalysisResults, showModal, closeModal, buildPalette };
