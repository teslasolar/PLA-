/**
 * PLA Designer - Pole Management
 */
import * as THREE from 'three';
import { scene, objects, addObject, removeObject } from './scene.js';
import { state, addPole, removePole, getPole } from './state.js';

// Load pole specs
let poleSpecs = null;
export async function loadPoleSpecs() {
    const res = await fetch('../specs/poles.json');
    poleSpecs = await res.json();
    return poleSpecs;
}

export function getPoleClass(classId) {
    return poleSpecs?.classes?.[classId];
}

export function getMaterial(materialId) {
    return poleSpecs?.materials?.[materialId];
}

// Create pole mesh
export function createPoleMesh(config) {
    const {
        id,
        x = 0,
        z = 0,
        poleClass = '2',
        material = 'wood'
    } = config;

    const classData = getPoleClass(poleClass) || { capacity: 3700, heights: [45] };
    const matData = getMaterial(material) || { color: '#8B4513', roughness: 0.9 };
    const height = (classData.heights?.[0] || 45) * 0.3048; // ft to m

    const group = new THREE.Group();
    group.userData = {
        id,
        type: 'pole',
        poleClass,
        material,
        height: classData.heights?.[0] || 45,
        capacity: classData.capacity || 3700
    };

    // Main pole cylinder (tapered)
    const topRadius = (classData.topDia || 4) * 0.0254 / 2;
    const bottomRadius = (classData.groundDia || 8) * 0.0254 / 2;
    const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 16);
    const mat = new THREE.MeshStandardMaterial({
        color: matData.color,
        roughness: matData.roughness || 0.9,
        metalness: matData.metalness || 0.1
    });
    const pole = new THREE.Mesh(geo, mat);
    pole.position.y = height / 2;
    pole.castShadow = true;
    group.add(pole);

    // Crossarm
    const armGeo = new THREE.BoxGeometry(4, 0.15, 0.15);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.y = height * 0.9;
    arm.castShadow = true;
    group.add(arm);

    // Insulators
    for (let i = -1; i <= 1; i++) {
        const insGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.15, 8);
        const insMat = new THREE.MeshStandardMaterial({ color: 0x4444aa });
        const ins = new THREE.Mesh(insGeo, insMat);
        ins.position.set(i * 1.5, height * 0.9 - 0.1, 0);
        group.add(ins);
    }

    group.position.set(x, 0, z);
    return group;
}

// Add pole to scene and state
export function addPoleToScene(x, z, poleClass = '2', material = 'wood') {
    const id = `pole_${++state.poleCounter}`;
    const classData = getPoleClass(poleClass) || { capacity: 3700, heights: [45] };

    const mesh = createPoleMesh({ id, x, z, poleClass, material });
    addObject(id, mesh);

    addPole({
        id,
        x,
        z,
        poleClass,
        material,
        height: classData.heights?.[0] || 45,
        capacity: classData.capacity || 3700,
        loads: []
    });

    return id;
}

// Remove pole from scene and state
export function removePoleFromScene(id) {
    removeObject(id);
    removePole(id);
}

// Update pole position
export function updatePolePosition(id, x, z) {
    const pole = getPole(id);
    const mesh = objects.get(id);

    if (pole && mesh) {
        pole.x = x;
        pole.z = z;
        mesh.position.x = x;
        mesh.position.z = z;
    }
}

// Highlight pole
export function highlightPole(id, on) {
    const mesh = objects.get(id);
    if (mesh) {
        mesh.traverse(c => {
            if (c.material?.emissive) {
                c.material.emissive.setHex(on ? 0x00ff00 : 0x000000);
            }
        });
    }
}

// Select pole
export function selectPole(id) {
    // Clear previous selection
    objects.forEach((obj, objId) => {
        if (obj.userData?.type === 'pole') {
            obj.traverse(c => {
                if (c.material?.emissive) {
                    c.material.emissive.setHex(0x000000);
                }
            });
        }
    });

    // Highlight selected
    const mesh = objects.get(id);
    if (mesh) {
        mesh.traverse(c => {
            if (c.material?.emissive) {
                c.material.emissive.setHex(0xff6600);
            }
        });
    }
}

export default {
    loadPoleSpecs,
    getPoleClass,
    getMaterial,
    createPoleMesh,
    addPoleToScene,
    removePoleFromScene,
    updatePolePosition,
    highlightPole,
    selectPole
};
