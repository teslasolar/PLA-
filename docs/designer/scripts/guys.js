/**
 * PLA Designer - Guy Wire Management
 */
import * as THREE from 'three';
import { addObject, removeObject, objects } from './scene.js';
import { state, getPole } from './state.js';

let nescSpecs = null;

export function setNESCSpecs(specs) { nescSpecs = specs; }

// Guy wire strengths (lb)
const STRENGTHS = { '3/8': 10800, '7/16': 15400, '1/2': 20400 };

// Create guy wire mesh
export function createGuyMesh(cfg) {
    const { id, poleId, attachHeight, anchorX, anchorZ, size = '3/8' } = cfg;
    const pole = getPole(poleId);
    if (!pole) return null;

    const h = attachHeight * 0.3048; // ft to m
    const start = new THREE.Vector3(pole.x, h, pole.z);
    const end = new THREE.Vector3(anchorX, 0, anchorZ);

    const grp = new THREE.Group();
    grp.userData = { id, type: 'guy', poleId, attachHeight, anchorX, anchorZ, size, strength: STRENGTHS[size] };

    // Guy wire line
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    dir.normalize();

    const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, len, 6),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 })
    );
    wire.position.copy(start).add(dir.clone().multiplyScalar(len / 2));
    wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    wire.castShadow = true;
    grp.add(wire);

    // Anchor
    const anchor = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.3, 6),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    anchor.position.set(anchorX, 0.15, anchorZ);
    anchor.rotation.x = Math.PI;
    grp.add(anchor);

    return grp;
}

// Add guy to scene
export function addGuyToScene(poleId, attachHeight, anchorX, anchorZ, size = '3/8') {
    const id = `guy_${++state.guyCounter}`;
    const mesh = createGuyMesh({ id, poleId, attachHeight, anchorX, anchorZ, size });
    if (!mesh) return null;

    addObject(id, mesh);
    const guy = { id, poleId, attachHeight, anchorX, anchorZ, size, strength: STRENGTHS[size] };
    state.guys.push(guy);
    return id;
}

export function removeGuyFromScene(id) {
    removeObject(id);
    state.guys = state.guys.filter(g => g.id !== id);
}

// Calculate guy load capacity
export function calcGuyCapacity(guy) {
    const pole = getPole(guy.poleId);
    if (!pole) return 0;

    const h = guy.attachHeight;
    const dx = guy.anchorX - pole.x;
    const dz = guy.anchorZ - pole.z;
    const lead = Math.sqrt(dx * dx + dz * dz);
    const guyLen = Math.sqrt(lead * lead + h * h);

    // Horizontal component of guy tension
    const sf = nescSpecs?.guys?.sf || 2.0;
    return (guy.strength / sf) * (lead / guyLen);
}

// Calculate required guy size for given load
export function requiredGuySize(load, lead, height) {
    const guyLen = Math.sqrt(lead * lead + height * height);
    const sf = nescSpecs?.guys?.sf || 2.0;
    const reqStrength = load * sf * guyLen / lead;

    for (const [size, str] of Object.entries(STRENGTHS)) {
        if (str >= reqStrength) return size;
    }
    return '1/2+'; // Multiple guys needed
}

// Get all guys for a pole
export function getGuysForPole(poleId) {
    return state.guys.filter(g => g.poleId === poleId);
}

// Total guy resistance moment for a pole
export function totalGuyMoment(poleId) {
    return getGuysForPole(poleId).reduce((sum, guy) => {
        const cap = calcGuyCapacity(guy);
        return sum + cap * guy.attachHeight;
    }, 0);
}

export default { createGuyMesh, addGuyToScene, removeGuyFromScene, calcGuyCapacity, requiredGuySize, getGuysForPole, totalGuyMoment, setNESCSpecs };
