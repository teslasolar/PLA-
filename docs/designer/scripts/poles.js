/**
 * PLA Designer - Pole Management (Optimized)
 */
import * as THREE from 'three';
import { scene, objects, addObject, removeObject } from './scene.js';
import { state, addPole, removePole, getPole } from './state.js';

let specs = null;

export async function loadPoleSpecs() {
    specs = await fetch('../specs/poles.json').then(r => r.json());
    return specs;
}

// Get class data with key expansion
export function getPoleClass(id) {
    const c = specs?.classes?.[id];
    return c ? { capacity: c.c, heights: c.h, groundLine: c.gl, topDia: c.td, groundDia: c.gd } : null;
}

// Get material with key expansion
export function getMaterial(id) {
    const m = specs?.materials?.[id];
    return m ? { color: m.clr, roughness: m.r, metalness: m.m } : null;
}

// Create pole mesh
export function createPoleMesh(cfg) {
    const { id, x = 0, z = 0, poleClass = '2', material = 'wood' } = cfg;
    const cls = getPoleClass(poleClass) || { capacity: 3700, heights: [45], topDia: 4, groundDia: 7.5 };
    const mat = getMaterial(material) || { color: '#8B4513', roughness: 0.9, metalness: 0.1 };
    const h = (cls.heights?.[0] || 45) * 0.3048;

    const grp = new THREE.Group();
    grp.userData = { id, type: 'pole', poleClass, material, height: cls.heights?.[0] || 45, capacity: cls.capacity };

    // Tapered pole
    const topR = (cls.topDia || 4) * 0.0254 / 2;
    const botR = (cls.groundDia || 7.5) * 0.0254 / 2;
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(topR, botR, h, 12),
        new THREE.MeshStandardMaterial({ color: mat.color, roughness: mat.roughness, metalness: mat.metalness })
    );
    pole.position.y = h / 2;
    pole.castShadow = true;
    grp.add(pole);

    // Crossarm
    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.12, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x5a4020 })
    );
    arm.position.y = h * 0.9;
    arm.castShadow = true;
    grp.add(arm);

    // Insulators
    const insGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.12, 6);
    const insMat = new THREE.MeshStandardMaterial({ color: 0x3355aa });
    [-1, 0, 1].forEach(i => {
        const ins = new THREE.Mesh(insGeo, insMat);
        ins.position.set(i * 1.3, h * 0.9 - 0.08, 0);
        grp.add(ins);
    });

    grp.position.set(x, 0, z);
    return grp;
}

// Add pole to scene and state
export function addPoleToScene(x, z, poleClass = '2', material = 'wood') {
    const id = `pole_${++state.poleCounter}`;
    const cls = getPoleClass(poleClass) || { capacity: 3700, heights: [45] };
    const mesh = createPoleMesh({ id, x, z, poleClass, material });
    addObject(id, mesh);
    addPole({ id, x, z, poleClass, material, height: cls.heights?.[0] || 45, capacity: cls.capacity, loads: [] });
    return id;
}

export function removePoleFromScene(id) {
    removeObject(id);
    removePole(id);
}

export function updatePolePosition(id, x, z) {
    const pole = getPole(id);
    const mesh = objects.get(id);
    if (pole && mesh) {
        pole.x = x; pole.z = z;
        mesh.position.x = x; mesh.position.z = z;
    }
}

export function highlightPole(id, on) {
    const mesh = objects.get(id);
    mesh?.traverse(c => { if (c.material?.emissive) c.material.emissive.setHex(on ? 0x00ff00 : 0); });
}

export function selectPole(id) {
    objects.forEach(obj => {
        if (obj.userData?.type === 'pole') obj.traverse(c => { if (c.material?.emissive) c.material.emissive.setHex(0); });
    });
    const mesh = objects.get(id);
    mesh?.traverse(c => { if (c.material?.emissive) c.material.emissive.setHex(0xff6600); });
}

export default { loadPoleSpecs, getPoleClass, getMaterial, createPoleMesh, addPoleToScene, removePoleFromScene, updatePolePosition, highlightPole, selectPole };
