/**
 * Pole Mesh Generator
 * Creates 3D pole geometry
 */
import * as THREE from 'three';

export class PoleMesh {
    static MATERIALS = {
        wood: { color: 0x8B4513, roughness: 0.9, metalness: 0.1 },
        steel: { color: 0xC0C0C0, roughness: 0.3, metalness: 0.7 },
        concrete: { color: 0x808080, roughness: 0.8, metalness: 0.1 }
    };

    static create(config = {}) {
        const {
            x = 0, y = 0, z = 0,
            height = 15,
            topRadius = 0.15,
            bottomRadius = 0.25,
            material = 'wood',
            addCrossarm = true
        } = config;

        const group = new THREE.Group();
        group.userData = { type: 'pole', config };

        // Main pole
        const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 16);
        const mat = new THREE.MeshStandardMaterial(PoleMesh.MATERIALS[material]);
        const pole = new THREE.Mesh(geo, mat);
        pole.position.y = height / 2;
        pole.castShadow = true;
        group.add(pole);

        // Crossarm
        if (addCrossarm) {
            const arm = PoleMesh.createCrossarm(height * 0.9);
            group.add(arm);
        }

        group.position.set(x, y, z);
        return group;
    }

    static createCrossarm(height, width = 4) {
        const geo = new THREE.BoxGeometry(width, 0.15, 0.15);
        const mat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
        const arm = new THREE.Mesh(geo, mat);
        arm.position.y = height;
        arm.castShadow = true;
        return arm;
    }

    static createInsulator(x, y, z) {
        const geo = new THREE.SphereGeometry(0.1, 16, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0x4444aa });
        const ins = new THREE.Mesh(geo, mat);
        ins.position.set(x, y, z);
        return ins;
    }

    static update(pole, config) {
        if (config.x !== undefined) pole.position.x = config.x;
        if (config.y !== undefined) pole.position.y = config.y;
        if (config.z !== undefined) pole.position.z = config.z;
    }
}

export default PoleMesh;
