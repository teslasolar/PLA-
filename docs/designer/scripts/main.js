/**
 * PLA Designer - Main Entry (Enhanced v4.0)
 * Features: 3D, Undo/Redo, Map, Sag-Tension, Loading, Equipment, Clearance, GIS, BOM, Templates, Themes
 *           + Engineering Calculators, Terrain, Inspections, Progress Tracking, Dashboard
 */
import * as THREE from 'three';
import { initScene, camera, renderer, objects, zoomIn, zoomOut, resetCamera, addObject } from './scene.js';
import { state, select, setTool, toJSON, fromJSON, clear, subscribe, getState, setState } from './state.js';
import { loadPoleSpecs, addPoleToScene, removePoleFromScene, selectPole, highlightPole, createPoleMesh } from './poles.js';
import { loadConductorSpecs, addSpanToScene, removeSpanFromScene, rebuildSpan, createSpanMesh } from './spans.js';
import { loadNESCSpecs, runAnalysis, generateReport } from './analysis.js';
import { addGuyToScene, removeGuyFromScene, setNESCSpecs } from './guys.js';
import { initUI, notify, showPoleProperties, showSpanProperties, clearProperties, showAnalysisResults, showModal, closeModal, buildPalette, updateUI } from './ui.js';
import { initHistory, saveState, undo, redo } from './history.js';
import { initShortcuts, showShortcuts } from './shortcuts.js';
import { initMap, toggleMap, syncToMap, gotoMyLocation } from './map.js';
import { generatePDF } from './pdf-report.js';
import { showSagTensionModal } from './sag-tension.js';
import { buildLoadingSelector, initLoading, getGrade } from './loading.js';
import { addEquipmentToPole } from './equipment.js';

// Feature imports - v3.0
import { checkAllClearances, generateClearanceReport, showClearanceDialog } from './clearance.js';
import { createLoadingDiagram, showLoadingDiagram, getPoleMoment } from './loading-diagram.js';
import { calculateGuy, showGuyingCalculator, generateGuyingReport } from './guying-calc.js';
import { generateStringingChart, showStringingModal, getStringingForProject } from './stringing.js';
import { initWindAnimation, startWindAnimation, stopWindAnimation, setWindParams, showWindControls } from './wind-animation.js';
import { exportKML, exportGeoJSON, importGeoJSON, importKML, showGISDialog, setOrigin } from './gis.js';
import { generateBOM, generateBOMTable, generatePoleSchedule, exportBOMCSV, showBOMDialog } from './bom.js';
import { generateStakingSheet, generateStakingHTML, showStakingDialog, printStakingSheet } from './staking.js';
import { generateCostEstimate, generateCostHTML, showCostDialog } from './cost.js';
import { TEMPLATES, applyTemplate, showTemplatesDialog, createPoleFromTemplate, getTemplateList } from './templates.js';
import { selectPole as bulkSelectPole, selectAllPoles, clearSelection, bulkUpdate, bulkMove, bulkDelete, showBulkEditDialog, getSelectedPoles } from './bulk-edit.js';
import { setMeasureMode, addMeasurePoint, clearMeasureMode, showMeasurePanel, measureDistance, measureAngle } from './measure.js';
import { addPhoto, getPhotos, showPhotoDialog, exportPhotos, importPhotos } from './photos.js';
import { setTheme, getTheme, toggleTheme, initTheme, showThemeSelector } from './theme.js';
import { initTouchGestures, resetTransform, screenToCanvas, canvasToScreen } from './touch.js';
import { initVersionHistory, saveVersion, loadVersion, getVersions, showVersionsDialog, compareVersions } from './versions.js';
import { initAnnotations, setAnnotationTool, clearAnnotationTool, showAnnotationTools, getAnnotations, clearAllAnnotations } from './annotations.js';
import { initComments, addComment, getComments, showCommentsPanel, updateCommentBadges } from './comments.js';

// Feature imports - v4.0 Engineering Calculators
import { calculateVoltageDrop, calculateLineVoltageDrop, generateVoltageDropTable, showVoltageDropCalculator } from './voltage-drop.js';
import { calculateTransformerSize, generateSizingReport, showTransformerSizingDialog } from './transformer-sizing.js';
import { calculateFaultCurrent, analyzeLineFaults, generateFaultReport, showFaultAnalysisDialog } from './fault-current.js';
import { calculateRulingSpan, analyzeSpans, generateRulingSpanReport, showRulingSpanDialog } from './ruling-span.js';
import { initTerrain, importTerrainFromFile, generateRandomTerrain, getElevationAt, showTerrainDialog } from './terrain.js';
import { initObstacles, addObstacle, analyzeAllObstacles, showObstaclesDialog } from './obstacles.js';
import { initInspections, createInspection, getInspectionSummary, showInspectionDialog } from './inspection.js';
import { initProgress, setProgress, calculateOverallProgress, showProgressDialog } from './progress.js';
import { initDashboard, getDashboardData, showDashboard } from './dashboard.js';

let params = null;
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();

async function init() {
    console.log('🔌 PLA Designer v3.0 init...');

    // Load configs
    const [p, , , nesc] = await Promise.all([
        fetch('../params.json').then(r => r.json()),
        loadPoleSpecs(),
        loadConductorSpecs(),
        loadNESCSpecs()
    ]);
    params = p;
    setNESCSpecs(nesc);

    // Init 3D scene
    await initScene(document.getElementById('viewer3d'), params);

    // Init all UI components
    initUI();
    await buildPalette('palette');
    buildLoadingSelector('loadingSelector');
    initLoading();
    initHistory();
    initShortcuts();

    // Init v3.0 features
    initTheme();
    initVersionHistory();
    initAnnotations();
    initComments();
    initTouchGestures(document.getElementById('canvas'));
    initWindAnimation(window.scene);

    // Init v4.0 features
    initTerrain();
    initObstacles();
    initInspections();
    initProgress();
    initDashboard();

    setupEvents();

    // Demo poles
    addPoleToScene(-40, 0, '2', 'wood');
    addPoleToScene(0, 0, '2', 'wood');
    addPoleToScene(40, 0, '2', 'wood');
    addSpanToScene('pole_1', 'pole_2');
    addSpanToScene('pole_2', 'pole_3');

    saveState('init');
    console.log('✅ Ready - 27 feature modules loaded');
    notify('Designer v4.0 ready! Press ? for shortcuts', 'success');
}

function setupEvents() {
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('dblclick', onDblClick);
    document.addEventListener('dragstart', onDrag);
    document.getElementById('canvas').addEventListener('dragover', e => e.preventDefault());
    document.getElementById('canvas').addEventListener('drop', onDrop);
    subscribe('poles', () => saveState('pole'));
    subscribe('spans', () => saveState('span'));
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

function onDblClick(e) {
    if (state.tool === 'select') {
        const r = renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 200;
        const z = ((e.clientY - r.top) / r.height - 0.5) * 200;
        addPoleToScene(x, z, '2', 'wood');
        notify('Pole added', 'success');
        syncToMap();
    }
}

function handleSpan(id) {
    if (!state.poles.find(p => p.id === id)) return;
    if (!state.spanStart) {
        state.spanStart = id;
        highlightPole(id, true);
        notify('Click second pole', 'info');
    } else {
        if (state.spanStart !== id) { addSpanToScene(state.spanStart, id); notify('Span created!', 'success'); }
        highlightPole(state.spanStart, false);
        state.spanStart = null;
    }
}

function handleGuy(id, e) {
    const pole = state.poles.find(p => p.id === id);
    if (!pole) return;
    const r = renderer.domElement.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 100;
    const dz = ((e.clientY - r.top) / r.height - 0.5) * 100;
    addGuyToScene(id, pole.height * 0.85, pole.x + (dx > 0 ? 15 : -15), pole.z + (dz > 0 ? 15 : -15), '3/8');
    notify('Guy wire added!', 'success');
}

function selectObj(id) {
    select(id); selectPole(id);
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
    updateUI(); syncToMap();
}

function updateSpan(id, k, v) {
    const s = state.spans.find(x => x.id === id);
    if (s) { s[k] = v; rebuildSpan(id); updateUI(); }
}

function delPole(id) { removePoleFromScene(id); selectObj(null); notify('Deleted', 'info'); syncToMap(); }
function delSpan(id) { removeSpanFromScene(id); selectObj(null); notify('Deleted', 'info'); }

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
        notify(`Added pole`, 'success');
        syncToMap();
    }
}

// Window exports - Core
window.setTool = t => { setTool(t); if (state.spanStart) { highlightPole(state.spanStart, false); state.spanStart = null; } };
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetView = () => resetCamera(params);
window.undo = () => { if (undo()) notify('Undo', 'info'); };
window.redo = () => { if (redo()) notify('Redo', 'info'); };
window.toggleMap = () => { const v = toggleMap(); notify(v ? 'Map shown' : 'Map hidden', 'info'); };
window.gotoMyLocation = gotoMyLocation;
window.deleteSelected = () => { if (state.selected) state.poles.find(p => p.id === state.selected) ? delPole(state.selected) : delSpan(state.selected); };
window.addPoleAtCenter = () => { addPoleToScene(0, 0, '2', 'wood'); notify('Pole added', 'success'); };
window.closeAllModals = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');

// Window exports - Feature dialogs
window.showSagModal = showSagTensionModal;
window.showShortcuts = showShortcuts;
window.showClearances = () => { checkAllClearances(); showModal('clearanceModal'); document.getElementById('clearanceContent').innerHTML = generateClearanceReport(); };
window.showLoadingDiagram = (id) => showLoadingDiagram(id || state.selected);
window.showGuyingCalc = showGuyingCalculator;
window.showStringing = showStringingModal;
window.showGIS = showGISDialog;
window.showBOM = showBOMDialog;
window.showStaking = (id) => showStakingDialog(id || state.selected);
window.showCost = showCostDialog;
window.showTemplates = (id) => showTemplatesDialog(id || state.selected);
window.showBulkEdit = showBulkEditDialog;
window.showMeasure = showMeasurePanel;
window.showPhotos = (id) => showPhotoDialog(id || state.selected);
window.showThemes = showThemeSelector;
window.showVersions = showVersionsDialog;
window.showAnnotations = showAnnotationTools;
window.showComments = (id) => showCommentsPanel(id, id ? 'pole' : null);

// Window exports - v4.0 Engineering Calculators
window.showVoltageDropCalculator = showVoltageDropCalculator;
window.showTransformerSizing = showTransformerSizingDialog;
window.showFaultAnalysis = showFaultAnalysisDialog;
window.showRulingSpanDialog = showRulingSpanDialog;
window.showTerrainDialog = showTerrainDialog;
window.showObstaclesDialog = showObstaclesDialog;
window.showInspectionDialog = showInspectionDialog;
window.showProgressDialog = showProgressDialog;
window.showDashboard = showDashboard;
window.calcVoltageDrop = calculateVoltageDrop;
window.calcFaultCurrent = calculateFaultCurrent;
window.calcRulingSpan = calculateRulingSpan;
window.getElevationAt = getElevationAt;

// Window exports - Direct actions
window.toggleTheme = toggleTheme;
window.toggleWind = () => { window.windActive ? stopWindAnimation() : startWindAnimation(); window.windActive = !window.windActive; notify(window.windActive ? 'Wind on' : 'Wind off', 'info'); };
window.exportKML = exportKML;
window.exportGeoJSON = exportGeoJSON;
window.exportBOMCSV = exportBOMCSV;
window.saveVersion = (name) => { saveVersion(name || `Save ${new Date().toLocaleTimeString()}`); notify('Version saved!', 'success'); };
window.getPoleMoment = getPoleMoment;
window.applyTemplate = applyTemplate;
window.selectAllPoles = selectAllPoles;
window.clearSelection = clearSelection;

window.runAnalysis = () => {
    if (!state.poles.length) { notify('Add poles first!', 'error'); return; }
    const res = runAnalysis(getGrade().key);
    checkAllClearances(); // Also run clearance check
    showAnalysisResults(res);
    document.getElementById('analysisResults').innerHTML = res.poles.map(p => `
        <div class="result-card">
            <div style="display:flex;justify-content:space-between"><strong>${p.id}</strong> <span class="result-value ${p.status === 'PASS' ? 'pass' : 'fail'}">${p.status}</span></div>
            <div style="font-size:0.8rem;color:#94a3b8">Moment: ${p.moment} | Guy: ${p.guyResist} | Util: ${p.utilization}%</div>
            ${p.rec ? `<div style="color:#f59e0b;font-size:0.8rem">⚠️ ${p.rec}</div>` : ''}
        </div>`).join('');
    showModal('analysisModal');
    notify('Analysis complete!', 'success');
};

window.showReport = () => window.runAnalysis();
window.closeModal = closeModal;
window.generatePDF = () => generatePDF({ grade: getGrade().key });

window.saveProject = () => {
    const data = toJSON();
    data.photos = exportPhotos();
    data.annotations = getAnnotations();
    data.comments = getComments();
    localStorage.setItem('pla-project', JSON.stringify(data));
    notify('Saved!', 'success');
};

window.loadProject = () => {
    const d = localStorage.getItem('pla-project');
    if (!d) return;
    clear();
    objects.forEach((_, id) => { if (id.startsWith('pole_') || id.startsWith('span_') || id.startsWith('guy_')) objects.delete(id); });
    const data = JSON.parse(d);
    fromJSON(data);
    if (data.photos) importPhotos(data.photos);
    state.poles.forEach(p => addObject(p.id, createPoleMesh(p)));
    state.spans.forEach(s => { const m = createSpanMesh({ id: s.id, pole1Id: s.pole1, pole2Id: s.pole2, phases: s.phases, sag: s.sag }); if (m) addObject(s.id, m); });
    saveState('load');
    syncToMap();
    updateCommentBadges();
    notify('Loaded!', 'success');
};

window.exportProject = () => {
    const data = toJSON();
    data.photos = exportPhotos();
    data.annotations = getAnnotations();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pla-project.json'; a.click();
    notify('Exported!', 'success');
};

window.copyJSON = () => { navigator.clipboard.writeText(document.getElementById('jsonOutput')?.textContent || '{}'); notify('Copied!', 'success'); };

window.exportReport = () => {
    const blob = new Blob([generateReport(getGrade().key)], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pla-report.txt'; a.click();
    notify('Exported!', 'success');
};

init();
