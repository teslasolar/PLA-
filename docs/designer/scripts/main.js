/**
 * PLA Designer - Main Entry (Optimized)
 */
import * as THREE from 'three';
import { initScene, camera, renderer, objects, zoomIn, zoomOut, resetCamera } from './scene.js';
import { state, select, setTool, toJSON, fromJSON, clear, subscribe } from './state.js';
import { loadPoleSpecs, addPoleToScene, removePoleFromScene, selectPole, highlightPole, createPoleMesh } from './poles.js';
import { loadConductorSpecs, addSpanToScene, removeSpanFromScene, rebuildSpan, createSpanMesh } from './spans.js';
import { loadNESCSpecs, runAnalysis, generateReport } from './analysis.js';
import { addGuyToScene, removeGuyFromScene, setNESCSpecs } from './guys.js';
import { initUI, notify, showPoleProperties, showSpanProperties, clearProperties, showAnalysisResults, showModal, closeModal, buildPalette, updateUI } from './ui.js';
import { addObject } from './scene.js';

let params = null;
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();

async function init() {
    console.log('🔌 PLA Designer init...');

    // Load all configs in parallel
    const [p, , , nesc] = await Promise.all([
        fetch('../params.json').then(r => r.json()),
        loadPoleSpecs(),
        loadConductorSpecs(),
        loadNESCSpecs()
    ]);
    params = p;
    setNESCSpecs(nesc);

    // Init 3D and UI
    await initScene(document.getElementById('viewer3d'), params);
    initUI();
    await buildPalette('palette');
    setupEvents();

    // Demo poles
    addPoleToScene(-40, 0, '2', 'wood');
    addPoleToScene(0, 0, '2', 'wood');
    addPoleToScene(40, 0, '2', 'wood');
    addSpanToScene('pole_1', 'pole_2');
    addSpanToScene('pole_2', 'pole_3');

    console.log('✅ Ready');
    notify('Designer ready!', 'success');
}

function setupEvents() {
    renderer.domElement.addEventListener('click', onClick);
    document.addEventListener('dragstart', onDrag);
    document.getElementById('canvas').addEventListener('dragover', e => e.preventDefault());
    document.getElementById('canvas').addEventListener('drop', onDrop);
    document.addEventListener('keydown', onKey);
}

function onClick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);

    const meshes = [];
    objects.forEach(o => o.traverse(c => { if (c.isMesh) meshes.push(c); }));
    const hits = ray.intersectObjects(meshes);

    if (hits.length) {
        let obj = hits[0].object;
        while (obj.parent && !obj.userData.id) obj = obj.parent;
        if (obj.userData.id) {
            state.tool === 'span' ? handleSpan(obj.userData.id) :
            state.tool === 'guy' ? handleGuy(obj.userData.id, e) :
            selectObj(obj.userData.id);
        }
    } else if (state.tool === 'select') selectObj(null);
}

function handleSpan(id) {
    if (!state.poles.find(p => p.id === id)) return;
    if (!state.spanStart) {
        state.spanStart = id;
        highlightPole(id, true);
        notify('Click second pole', 'info');
    } else {
        if (state.spanStart !== id) {
            addSpanToScene(state.spanStart, id);
            notify('Span created!', 'success');
        }
        highlightPole(state.spanStart, false);
        state.spanStart = null;
    }
}

function handleGuy(id, e) {
    const pole = state.poles.find(p => p.id === id);
    if (!pole) return;
    // Calculate anchor position based on click offset
    const r = renderer.domElement.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 100;
    const dz = ((e.clientY - r.top) / r.height - 0.5) * 100;
    const anchorX = pole.x + (dx > 0 ? 15 : -15);
    const anchorZ = pole.z + (dz > 0 ? 15 : -15);
    addGuyToScene(id, pole.height * 0.85, anchorX, anchorZ, '3/8');
    notify('Guy wire added!', 'success');
}

function selectObj(id) {
    select(id);
    selectPole(id);
    if (!id) { clearProperties(); return; }

    const pole = state.poles.find(p => p.id === id);
    const span = state.spans.find(s => s.id === id);
    if (pole) showPoleProperties(pole, (k, v) => updatePole(id, k, v), () => delPole(id));
    else if (span) showSpanProperties(span, (k, v) => updateSpan(id, k, v), () => delSpan(id));
}

function updatePole(id, k, v) {
    const p = state.poles.find(x => x.id === id);
    if (!p) return;
    p[k] = v;
    const obj = objects.get(id);
    if (obj && (k === 'x' || k === 'z')) {
        obj.position[k] = v;
        state.spans.filter(s => s.pole1 === id || s.pole2 === id).forEach(s => rebuildSpan(s.id));
    }
    updateUI();
}

function updateSpan(id, k, v) {
    const s = state.spans.find(x => x.id === id);
    if (s) { s[k] = v; rebuildSpan(id); updateUI(); }
}

function delPole(id) { removePoleFromScene(id); selectObj(null); notify('Pole deleted', 'info'); }
function delSpan(id) { removeSpanFromScene(id); selectObj(null); notify('Span deleted', 'info'); }

function onDrag(e) {
    if (e.target.classList.contains('item')) {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: e.target.dataset.type, props: JSON.parse(e.target.dataset.props || '{}') }));
    }
}

function onDrop(e) {
    e.preventDefault();
    const d = JSON.parse(e.dataTransfer.getData('text/plain'));
    const r = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 200;
    const z = ((e.clientY - r.top) / r.height - 0.5) * 200;

    if (d.type === 'pole') {
        addPoleToScene(x, z, d.props.class || '2', d.props.material || 'wood');
        notify(`Added pole Class ${d.props.class || '2'}`, 'success');
    }
}

function onKey(e) {
    if (e.key === 'Delete' && state.selected) {
        state.poles.find(p => p.id === state.selected) ? delPole(state.selected) : delSpan(state.selected);
    } else if (e.key === 'Escape') {
        if (state.spanStart) { highlightPole(state.spanStart, false); state.spanStart = null; }
        setTool('select');
    } else if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveProject(); }
}

// Exposed globals
window.setTool = t => { setTool(t); if (state.spanStart) { highlightPole(state.spanStart, false); state.spanStart = null; } };
window.toggleView = () => notify('Toggle view', 'info');
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetView = () => resetCamera(params);

window.runAnalysis = () => {
    if (!state.poles.length) { notify('Add poles first!', 'error'); return; }
    const res = runAnalysis();
    showAnalysisResults(res);
    document.getElementById('analysisResults').innerHTML = res.poles.map(p => `
        <div class="result-card">
            <div style="display:flex;justify-content:space-between"><strong>${p.id}</strong> <span class="result-value ${p.status === 'PASS' ? 'pass' : 'fail'}">${p.status}</span></div>
            <div style="font-size:0.8rem;color:#94a3b8">Moment: ${p.moment} | Guy: ${p.guyResist} | Util: ${p.utilization}%</div>
            ${p.rec ? `<div style="color:#f59e0b;font-size:0.8rem">⚠️ ${p.rec}</div>` : ''}
        </div>
    `).join('');
    showModal('analysisModal');
    notify('Analysis complete!', 'success');
};

window.showReport = () => { console.log(generateReport()); window.runAnalysis(); };
window.closeModal = closeModal;

window.saveProject = () => { localStorage.setItem('pla-project', JSON.stringify(toJSON())); notify('Saved!', 'success'); };
window.loadProject = () => {
    const d = localStorage.getItem('pla-project');
    if (!d) return;
    clear();
    objects.forEach((_, id) => { if (id.startsWith('pole_') || id.startsWith('span_') || id.startsWith('guy_')) objects.delete(id); });
    fromJSON(JSON.parse(d));
    state.poles.forEach(p => addObject(p.id, createPoleMesh(p)));
    state.spans.forEach(s => { const m = createSpanMesh({ id: s.id, pole1Id: s.pole1, pole2Id: s.pole2, phases: s.phases, sag: s.sag }); if (m) addObject(s.id, m); });
    notify('Loaded!', 'success');
};

window.exportProject = () => {
    const blob = new Blob([JSON.stringify(toJSON(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pla-project.json'; a.click();
    notify('Exported!', 'success');
};

window.copyJSON = () => { navigator.clipboard.writeText(document.getElementById('jsonOutput')?.textContent || '{}'); notify('Copied!', 'success'); };

window.exportReport = () => {
    const blob = new Blob([generateReport()], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pla-report.txt'; a.click();
    notify('Report exported!', 'success');
};

init();
