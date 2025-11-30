/**
 * PLA Designer - Span/Conductor Management (Optimized)
 */
import * as THREE from 'three';
import { addObject, removeObject, objects } from './scene.js';
import { state, addSpan, removeSpan, getPole } from './state.js';

let specs = null;

export async function loadConductorSpecs() {
    specs = await fetch('../specs/conductors.json').then(r => r.json());
    return specs;
}

// Get conductor with key expansion
export function getConductor(type, code) {
    const c = specs?.[type]?.[code];
    return c ? { size: c.sz, stranding: c.str, diameter: c.d, weight: c.w, strength: c.s, resistance: c.r } : null;
}

// Catenary curve points
export function catenaryPoints(start, end, sag, n = 24) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push(new THREE.Vector3(
            start.x + (end.x - start.x) * t,
            start.y + (end.y - start.y) * t - sag * 4 * t * (1 - t),
            start.z + (end.z - start.z) * t
        ));
    }
    return pts;
}

// Create conductor mesh
export function createConductorMesh(start, end, sag = 2.5, color = 0x333333) {
    const pts = catenaryPoints(start, end, sag);
    const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.018, 6, false),
        new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 })
    );
    mesh.castShadow = true;
    return mesh;
}

// Create span with phases
export function createSpanMesh(cfg) {
    const { id, pole1Id, pole2Id, phases = 3, sag = 2.5, conductor = 'Raven' } = cfg;
    const p1 = getPole(pole1Id), p2 = getPole(pole2Id);
    if (!p1 || !p2) return null;

    const h1 = p1.height * 0.3048 * 0.9, h2 = p2.height * 0.3048 * 0.9;
    const grp = new THREE.Group();
    grp.userData = { id, type: 'span', pole1: pole1Id, pole2: pole2Id, phases, sag, conductor };

    const colors = [0x333333, 0x555555, 0x777777];
    for (let i = 0; i < phases; i++) {
        const off = (i - (phases - 1) / 2) * 1.1;
        grp.add(createConductorMesh(
            { x: p1.x, y: h1, z: p1.z + off },
            { x: p2.x, y: h2, z: p2.z + off },
            sag, colors[i % 3]
        ));
    }
    return grp;
}

// Add span to scene
export function addSpanToScene(pole1Id, pole2Id, phases = 3, sag = 2.5, conductor = 'Raven') {
    const p1 = getPole(pole1Id), p2 = getPole(pole2Id);
    if (!p1 || !p2) return null;

    const id = `span_${++state.spanCounter}`;
    const len = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
    const mesh = createSpanMesh({ id, pole1Id, pole2Id, phases, sag, conductor });

    if (mesh) {
        addObject(id, mesh);
        addSpan({ id, pole1: pole1Id, pole2: pole2Id, length: len, phases, sag, conductor });
    }
    return id;
}

export function removeSpanFromScene(id) {
    removeObject(id);
    removeSpan(id);
}

// Rebuild span after pole moved
export function rebuildSpan(spanId) {
    const s = state.spans.find(x => x.id === spanId);
    if (!s) return;
    removeObject(spanId);
    const mesh = createSpanMesh({ id: spanId, pole1Id: s.pole1, pole2Id: s.pole2, phases: s.phases, sag: s.sag, conductor: s.conductor });
    if (mesh) addObject(spanId, mesh);
}

// Ruling span calculation
export function rulingSpan(spanIds) {
    const spans = spanIds.map(id => state.spans.find(s => s.id === id)).filter(Boolean);
    if (!spans.length) return 0;
    const sumCubes = spans.reduce((s, x) => s + x.length ** 3, 0);
    const sumLen = spans.reduce((s, x) => s + x.length, 0);
    return Math.sqrt(sumCubes / sumLen);
}

// Sag calculation (parabolic approximation)
export function calcSag(span, tension, weight) {
    return (weight * span * span) / (8 * tension);
}

export default { loadConductorSpecs, getConductor, catenaryPoints, createSpanMesh, addSpanToScene, removeSpanFromScene, rebuildSpan, rulingSpan, calcSag };
