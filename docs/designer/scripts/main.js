/**
 * PLA Designer - Main Entry Point
 */
import * as THREE from 'three';
import { initScene, camera, renderer, objects, zoomIn, zoomOut, resetCamera } from './scene.js';
import { state, select, setTool, toJSON, fromJSON, clear, subscribe } from './state.js';
import { loadPoleSpecs, addPoleToScene, removePoleFromScene, selectPole, highlightPole } from './poles.js';
import { loadConductorSpecs, addSpanToScene, removeSpanFromScene, rebuildSpan } from './spans.js';
import { loadNESCSpecs, runAnalysis, generateReport } from './analysis.js';
import { initUI, notify, showPoleProperties, showSpanProperties, clearProperties, showAnalysisResults, showModal, closeModal, buildPalette, updateUI } from './ui.js';

let params = null;

// Initialize
async function init() {
    console.log('🔌 PLA Designer initializing...');

    // Load configs
    const [paramsRes, _poleSpecs, _condSpecs, _nescSpecs] = await Promise.all([
        fetch('../params.json').then(r => r.json()),
        loadPoleSpecs(),
        loadConductorSpecs(),
        loadNESCSpecs()
    ]);
    params = paramsRes;

    // Initialize 3D scene
    const container = document.getElementById('viewer3d');
    await initScene(container, params);

    // Initialize UI
    initUI();
    await buildPalette('palette');

    // Setup event handlers
    setupEventListeners();

    // Add demo poles
    addPoleToScene(-40, 0, '2', 'wood');
    addPoleToScene(0, 0, '2', 'wood');
    addPoleToScene(40, 0, '2', 'wood');
    addSpanToScene('pole_1', 'pole_2');
    addSpanToScene('pole_2', 'pole_3');

    console.log('✅ PLA Designer ready');
    notify('Designer ready!', 'success');
}

// Event listeners
function setupEventListeners() {
    // Canvas click for selection
    renderer.domElement.addEventListener('click', onCanvasClick);

    // Drag and drop
    document.addEventListener('dragstart', onDragStart);
    document.getElementById('canvas').addEventListener('dragover', e => e.preventDefault());
    document.getElementById('canvas').addEventListener('drop', onDrop);

    // Keyboard shortcuts
    document.addEventListener('keydown', onKeyDown);
}

// Canvas click handler
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onCanvasClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const meshes = [];
    objects.forEach(obj => obj.traverse(c => { if (c.isMesh) meshes.push(c); }));
    const hits = raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj.parent && !obj.userData.id) obj = obj.parent;

        if (obj.userData.id) {
            if (state.tool === 'span') {
                handleSpanTool(obj.userData.id);
            } else {
                selectObject(obj.userData.id);
            }
        }
    } else if (state.tool === 'select') {
        selectObject(null);
    }
}

function handleSpanTool(id) {
    const pole = state.poles.find(p => p.id === id);
    if (!pole) return;

    if (!state.spanStart) {
        state.spanStart = id;
        highlightPole(id, true);
        notify('Click second pole to complete span', 'info');
    } else {
        if (state.spanStart !== id) {
            addSpanToScene(state.spanStart, id);
            notify('Span created!', 'success');
        }
        highlightPole(state.spanStart, false);
        state.spanStart = null;
    }
}

function selectObject(id) {
    select(id);
    selectPole(id);

    if (id) {
        const pole = state.poles.find(p => p.id === id);
        const span = state.spans.find(s => s.id === id);

        if (pole) {
            showPoleProperties(pole,
                (prop, val) => updatePole(id, prop, val),
                () => deletePole(id)
            );
        } else if (span) {
            showSpanProperties(span,
                (prop, val) => updateSpan(id, prop, val),
                () => deleteSpan(id)
            );
        }
    } else {
        clearProperties();
    }
}

function updatePole(id, prop, val) {
    const pole = state.poles.find(p => p.id === id);
    if (pole) {
        pole[prop] = val;
        // Update 3D position if needed
        const obj = objects.get(id);
        if (obj && (prop === 'x' || prop === 'z')) {
            obj.position[prop === 'x' ? 'x' : 'z'] = val;
            // Rebuild connected spans
            state.spans.filter(s => s.pole1 === id || s.pole2 === id)
                       .forEach(s => rebuildSpan(s.id));
        }
        updateUI();
    }
}

function updateSpan(id, prop, val) {
    const span = state.spans.find(s => s.id === id);
    if (span) {
        span[prop] = val;
        rebuildSpan(id);
        updateUI();
    }
}

function deletePole(id) {
    removePoleFromScene(id);
    selectObject(null);
    notify('Pole deleted', 'info');
}

function deleteSpan(id) {
    removeSpanFromScene(id);
    selectObject(null);
    notify('Span deleted', 'info');
}

// Drag and drop
function onDragStart(e) {
    if (e.target.classList.contains('item')) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: e.target.dataset.type,
            props: JSON.parse(e.target.dataset.props || '{}')
        }));
    }
}

function onDrop(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));

    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 200;
    const z = ((e.clientY - rect.top) / rect.height - 0.5) * 200;

    if (data.type === 'pole') {
        addPoleToScene(x, z, data.props.class || '2', data.props.material || 'wood');
        notify(`Added ${data.props.material || 'wood'} pole Class ${data.props.class || '2'}`, 'success');
    }
}

// Keyboard shortcuts
function onKeyDown(e) {
    if (e.key === 'Delete' && state.selected) {
        const pole = state.poles.find(p => p.id === state.selected);
        if (pole) deletePole(state.selected);
        else deleteSpan(state.selected);
    } else if (e.key === 'Escape') {
        if (state.spanStart) {
            highlightPole(state.spanStart, false);
            state.spanStart = null;
        }
        setTool('select');
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveProject();
    }
}

// Expose to window
window.setTool = (tool) => {
    setTool(tool);
    if (state.spanStart) {
        highlightPole(state.spanStart, false);
        state.spanStart = null;
    }
};

window.toggleView = () => { notify('Toggle 2D/3D', 'info'); };
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetView = () => resetCamera(params);

window.runAnalysis = () => {
    if (state.poles.length === 0) {
        notify('Add poles first!', 'error');
        return;
    }
    const results = runAnalysis();
    showAnalysisResults(results);

    // Show modal with details
    const resultsDiv = document.getElementById('analysisResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = results.poles.map(pole => `
            <div class="result-card">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span><strong>${pole.id}</strong> (Class ${pole.poleClass})</span>
                    <span class="result-value ${pole.status === 'PASS' ? 'pass' : 'fail'}">${pole.status}</span>
                </div>
                <div style="font-size:0.8rem;color:#94a3b8;margin-top:0.5rem;">
                    Moment: ${pole.moment} / ${pole.capacity} lb-ft | Utilization: ${pole.utilization}%
                </div>
                ${pole.recommendation ? `<div style="color:#f59e0b;font-size:0.8rem;">⚠️ ${pole.recommendation}</div>` : ''}
            </div>
        `).join('');
    }
    showModal('analysisModal');
    notify('Analysis complete!', 'success');
};

window.showReport = () => {
    const report = generateReport();
    console.log(report);
    window.runAnalysis();
};

window.closeModal = closeModal;

window.saveProject = () => {
    localStorage.setItem('pla-project', JSON.stringify(toJSON()));
    notify('Project saved!', 'success');
};

window.loadProject = () => {
    const data = localStorage.getItem('pla-project');
    if (data) {
        clear();
        objects.forEach((obj, id) => {
            if (id.startsWith('pole_') || id.startsWith('span_')) {
                objects.delete(id);
            }
        });
        fromJSON(JSON.parse(data));
        // Rebuild visuals
        state.poles.forEach(p => {
            const mesh = createPoleMesh(p);
            addObject(p.id, mesh);
        });
        state.spans.forEach(s => {
            const mesh = createSpanMesh(s);
            addObject(s.id, mesh);
        });
        notify('Project loaded!', 'success');
    }
};

window.exportProject = () => {
    const data = JSON.stringify(toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pla-project.json';
    a.click();
    notify('Project exported!', 'success');
};

window.copyJSON = () => {
    navigator.clipboard.writeText(document.getElementById('jsonOutput')?.textContent || '{}');
    notify('JSON copied!', 'success');
};

window.exportReport = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pla-analysis-report.txt';
    a.click();
    notify('Report exported!', 'success');
};

// Initialize on load
init();
