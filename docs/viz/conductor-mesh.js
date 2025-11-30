/**
 * Conductor Mesh Generator
 * Creates catenary curve conductors
 */
import { Catenary } from '../analysis/catenary.js';

export class ConductorMesh {
    static create(config = {}) {
        const {
            start = { x: 0, y: 15, z: 0 },
            end = { x: 50, y: 15, z: 0 },
            sag = 2.5,
            radius = 0.03,
            color = 0x333333,
            segments = 50
        } = config;

        const span = Math.sqrt(
            (end.x - start.x) ** 2 + (end.z - start.z) ** 2
        );

        const cat = new Catenary(span, sag);
        const pts2d = cat.points(segments);

        const pts3d = pts2d.map(p => {
            const t = p.x / span;
            return new THREE.Vector3(
                start.x + (end.x - start.x) * t,
                start.y + p.y,
                start.z + (end.z - start.z) * t
            );
        });

        const curve = new THREE.CatmullRomCurve3(pts3d);
        const geo = new THREE.TubeGeometry(curve, segments, radius, 8, false);
        const mat = new THREE.MeshStandardMaterial({
            color, metalness: 0.7, roughness: 0.3
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.userData = { type: 'conductor', config, catenary: cat.toJSON() };

        return mesh;
    }

    static createPhases(start, end, sag, phases = 3, offset = 1.5) {
        const group = new THREE.Group();
        group.userData = { type: 'span', phases };

        for (let i = 0; i < phases; i++) {
            const o = (i - (phases - 1) / 2) * offset;
            const conductor = ConductorMesh.create({
                start: { ...start, z: start.z + o },
                end: { ...end, z: end.z + o },
                sag
            });
            group.add(conductor);
        }

        return group;
    }

    static createLine(config) {
        const points = [];
        for (let i = 0; i <= config.segments; i++) {
            const t = i / config.segments;
            points.push(new THREE.Vector3(
                config.start.x + (config.end.x - config.start.x) * t,
                config.start.y,
                config.start.z + (config.end.z - config.start.z) * t
            ));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: config.color || 0x333333 });
        return new THREE.Line(geo, mat);
    }
}

export default ConductorMesh;
