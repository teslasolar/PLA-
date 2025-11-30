/**
 * PLA Designer - Equipment 3D Models
 * Transformers, switches, reclosers, etc.
 */
import * as THREE from 'three';
import { addObject, removeObject, objects } from './scene.js';
import { state, getPole } from './state.js';

// Equipment types and specs
const EQUIPMENT_SPECS = {
    transformer: {
        sizes: {
            10: { weight: 150, width: 0.4, height: 0.5, depth: 0.3 },
            25: { weight: 250, width: 0.5, height: 0.6, depth: 0.35 },
            50: { weight: 400, width: 0.6, height: 0.7, depth: 0.4 },
            100: { weight: 700, width: 0.7, height: 0.8, depth: 0.5 },
            167: { weight: 1000, width: 0.8, height: 0.9, depth: 0.55 }
        },
        color: 0x666666
    },
    switch: {
        default: { weight: 80, width: 0.3, height: 0.4, depth: 0.2 },
        color: 0x444444
    },
    recloser: {
        default: { weight: 200, width: 0.5, height: 0.6, depth: 0.3 },
        color: 0x2255aa
    },
    fuse: {
        default: { weight: 15, width: 0.1, height: 0.5, depth: 0.1 },
        color: 0x888888
    },
    capacitor: {
        default: { weight: 300, width: 0.4, height: 0.8, depth: 0.4 },
        color: 0xcccccc
    }
};

// Create transformer mesh
function createTransformerMesh(kva = 25) {
    const spec = EQUIPMENT_SPECS.transformer.sizes[kva] || EQUIPMENT_SPECS.transformer.sizes[25];
    const group = new THREE.Group();

    // Main tank
    const tank = new THREE.Mesh(
        new THREE.BoxGeometry(spec.width, spec.height, spec.depth),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 })
    );
    tank.position.y = spec.height / 2;
    tank.castShadow = true;
    group.add(tank);

    // Lid
    const lid = new THREE.Mesh(
        new THREE.BoxGeometry(spec.width + 0.05, 0.05, spec.depth + 0.05),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    lid.position.y = spec.height + 0.025;
    group.add(lid);

    // Bushings (HV and LV)
    const bushingGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.15, 8);
    const bushingMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    [-0.1, 0, 0.1].forEach((x, i) => {
        const bushing = new THREE.Mesh(bushingGeo, bushingMat);
        bushing.position.set(x, spec.height + 0.1, 0);
        group.add(bushing);
    });

    // Mounting bracket
    const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    bracket.position.set(-spec.width / 2 - 0.05, spec.height / 2, 0);
    group.add(bracket);

    return group;
}

// Create switch mesh
function createSwitchMesh() {
    const group = new THREE.Group();

    // Main body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.4, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 })
    );
    body.position.y = 0.2;
    body.castShadow = true;
    group.add(body);

    // Operating handle
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0xff4444 })
    );
    handle.rotation.z = Math.PI / 6;
    handle.position.set(0.15, 0.3, 0);
    group.add(handle);

    return group;
}

// Create recloser mesh
function createRecloserMesh() {
    const group = new THREE.Group();

    // Main tank
    const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.6, 12),
        new THREE.MeshStandardMaterial({ color: 0x2255aa, metalness: 0.6 })
    );
    tank.position.y = 0.3;
    tank.castShadow = true;
    group.add(tank);

    // Top
    const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.2, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    top.position.y = 0.65;
    group.add(top);

    // Bushings
    const bushingGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8);
    const bushingMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const bushing = new THREE.Mesh(bushingGeo, bushingMat);
        bushing.position.set(Math.cos(angle) * 0.15, 0.8, Math.sin(angle) * 0.15);
        group.add(bushing);
    }

    return group;
}

// Create fuse cutout mesh
function createFuseMesh() {
    const group = new THREE.Group();

    // Insulator
    const insulator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    insulator.position.y = 0.15;
    group.add(insulator);

    // Fuse tube
    const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    tube.rotation.z = Math.PI / 4;
    tube.position.set(0.1, 0.35, 0);
    group.add(tube);

    return group;
}

// Create equipment mesh by type
export function createEquipmentMesh(type, props = {}) {
    let mesh;

    switch (type) {
        case 'transformer':
            mesh = createTransformerMesh(props.kva || 25);
            break;
        case 'switch':
            mesh = createSwitchMesh();
            break;
        case 'recloser':
            mesh = createRecloserMesh();
            break;
        case 'fuse':
            mesh = createFuseMesh();
            break;
        default:
            mesh = createTransformerMesh(25);
    }

    return mesh;
}

// Add equipment to pole
export function addEquipmentToPole(poleId, type, props = {}) {
    const pole = getPole(poleId);
    if (!pole) return null;

    const id = `equip_${++state.equipCounter}`;
    const mesh = createEquipmentMesh(type, props);

    // Position on pole
    const attachHeight = (pole.height * 0.3048) * 0.7; // 70% up pole
    const offset = (state.equipment.filter(e => e.poleId === poleId).length) * 0.8;

    mesh.position.set(pole.x + 0.5 + offset, attachHeight, pole.z);
    mesh.userData = { id, type: 'equipment', equipType: type, poleId, ...props };

    addObject(id, mesh);

    state.equipment.push({
        id,
        type,
        poleId,
        attachHeight: attachHeight / 0.3048,
        ...props
    });

    return id;
}

// Remove equipment
export function removeEquipment(id) {
    removeObject(id);
    state.equipment = state.equipment.filter(e => e.id !== id);
}

// Get equipment on pole
export function getEquipmentOnPole(poleId) {
    return state.equipment.filter(e => e.poleId === poleId);
}

// Calculate equipment load on pole
export function calculateEquipmentLoad(poleId) {
    const equipment = getEquipmentOnPole(poleId);
    let totalWeight = 0;
    let totalMoment = 0;

    equipment.forEach(equip => {
        const spec = EQUIPMENT_SPECS[equip.type];
        const size = equip.kva ? spec.sizes?.[equip.kva] : spec.default;
        const weight = size?.weight || 100;

        totalWeight += weight;
        totalMoment += weight * (equip.attachHeight || 30) * 0.5; // Offset moment
    });

    return { weight: totalWeight, moment: totalMoment };
}

export default { createEquipmentMesh, addEquipmentToPole, removeEquipment, getEquipmentOnPole, calculateEquipmentLoad };
