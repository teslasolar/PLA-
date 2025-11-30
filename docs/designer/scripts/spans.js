/**
 * PLA Designer - Span/Conductor Management
 */
import * as THREE from 'three';
import { scene, addObject, removeObject, objects } from './scene.js';
import { state, addSpan, removeSpan, getPole } from './state.js';

// Load conductor specs
let conductorSpecs = null;
export async function loadConductorSpecs() {
    const res = await fetch('../specs/conductors.json');
    conductorSpecs = await res.json();
    return conductorSpecs;
}

export function getConductor(type, code) {
    return conductorSpecs?.[type]?.types?.[code];
}

// Create catenary curve points
export function catenaryPoints(start, end, sag, segments = 30) {
    const span = Math.sqrt(
        (end.x - start.x) ** 2 + (end.z - start.z) ** 2
    );
    const points = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = start.x + (end.x - start.x) * t;
        const z = start.z + (end.z - start.z) * t;
        // Catenary approximation: 4 * sag * t * (1 - t)
        const sagY = -sag * 4 * t * (1 - t);
        const y = start.y + (end.y - start.y) * t + sagY;
        points.push(new THREE.Vector3(x, y, z));
    }

    return points;
}

// Create conductor mesh
export function createConductorMesh(start, end, sag = 2.5, color = 0x333333) {
    const points = catenaryPoints(start, end, sag);
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 30, 0.02, 8, false);
    const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.7,
        roughness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
}

// Create span with multiple phases
export function createSpanMesh(config) {
    const {
        id,
        pole1Id,
        pole2Id,
        phases = 3,
        sag = 2.5,
        conductor = 'Raven'
    } = config;

    const p1 = getPole(pole1Id);
    const p2 = getPole(pole2Id);
    if (!p1 || !p2) return null;

    const h1 = p1.height * 0.3048 * 0.9; // Attachment height
    const h2 = p2.height * 0.3048 * 0.9;

    const group = new THREE.Group();
    group.userData = {
        id,
        type: 'span',
        pole1: pole1Id,
        pole2: pole2Id,
        phases,
        sag,
        conductor
    };

    // Phase colors
    const colors = [0x333333, 0x666666, 0x999999];

    // Create each phase conductor
    for (let i = 0; i < phases; i++) {
        const offset = (i - (phases - 1) / 2) * 1.2; // Spacing
        const start = { x: p1.x, y: h1, z: p1.z + offset };
        const end = { x: p2.x, y: h2, z: p2.z + offset };
        const mesh = createConductorMesh(start, end, sag, colors[i % 3]);
        group.add(mesh);
    }

    return group;
}

// Add span to scene and state
export function addSpanToScene(pole1Id, pole2Id, phases = 3, sag = 2.5, conductor = 'Raven') {
    const p1 = getPole(pole1Id);
    const p2 = getPole(pole2Id);
    if (!p1 || !p2) return null;

    const id = `span_${++state.spanCounter}`;
    const length = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);

    const mesh = createSpanMesh({ id, pole1Id, pole2Id, phases, sag, conductor });
    if (mesh) {
        addObject(id, mesh);

        addSpan({
            id,
            pole1: pole1Id,
            pole2: pole2Id,
            length,
            phases,
            sag,
            conductor
        });
    }

    return id;
}

// Remove span
export function removeSpanFromScene(id) {
    removeObject(id);
    removeSpan(id);
}

// Rebuild span (after pole moved)
export function rebuildSpan(spanId) {
    const spanData = state.spans.find(s => s.id === spanId);
    if (!spanData) return;

    // Remove old mesh
    removeObject(spanId);

    // Create new mesh
    const mesh = createSpanMesh({
        id: spanId,
        pole1Id: spanData.pole1,
        pole2Id: spanData.pole2,
        phases: spanData.phases,
        sag: spanData.sag,
        conductor: spanData.conductor
    });

    if (mesh) {
        addObject(spanId, mesh);
    }
}

// Get span between two poles
export function getSpanBetween(pole1Id, pole2Id) {
    return state.spans.find(s =>
        (s.pole1 === pole1Id && s.pole2 === pole2Id) ||
        (s.pole1 === pole2Id && s.pole2 === pole1Id)
    );
}

// Calculate ruling span
export function calculateRulingSpan(spanIds) {
    const spans = spanIds.map(id => state.spans.find(s => s.id === id)).filter(Boolean);
    if (spans.length === 0) return 0;

    const sumCubes = spans.reduce((sum, s) => sum + s.length ** 3, 0);
    const sumLengths = spans.reduce((sum, s) => sum + s.length, 0);

    return Math.sqrt(sumCubes / sumLengths);
}

export default {
    loadConductorSpecs,
    getConductor,
    catenaryPoints,
    createConductorMesh,
    createSpanMesh,
    addSpanToScene,
    removeSpanFromScene,
    rebuildSpan,
    getSpanBetween,
    calculateRulingSpan
};
