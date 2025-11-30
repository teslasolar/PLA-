/**
 * PLA Designer - Three.js Scene Setup
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let scene, camera, renderer, controls;
export const objects = new Map();

export async function initScene(container, params) {
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(params.scene3d.background);
    scene.fog = new THREE.Fog(
        params.scene3d.background,
        params.scene3d.fogNear,
        params.scene3d.fogFar
    );

    // Camera
    camera = new THREE.PerspectiveCamera(
        params.camera.fov,
        w / h,
        params.camera.near,
        params.camera.far
    );
    camera.position.set(...params.camera.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(...params.camera.target);

    // Lighting
    setupLighting(params.lighting);

    // Ground
    setupGround(params.scene3d);

    // Grid
    scene.add(new THREE.GridHelper(
        params.scene3d.groundSize / 2,
        params.scene3d.gridDivisions,
        0x444444,
        0x666666
    ));

    // Resize handler
    window.addEventListener('resize', () => onResize(container));

    // Start animation loop
    animate();

    return { scene, camera, renderer, controls };
}

function setupLighting(params) {
    // Ambient
    scene.add(new THREE.AmbientLight(
        params.ambient.color,
        params.ambient.intensity
    ));

    // Directional (sun)
    const sun = new THREE.DirectionalLight(
        params.directional.color,
        params.directional.intensity
    );
    sun.position.set(...params.directional.position);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // Hemisphere
    scene.add(new THREE.HemisphereLight(
        params.hemisphere.skyColor,
        params.hemisphere.groundColor,
        params.hemisphere.intensity
    ));
}

function setupGround(params) {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(params.groundSize, params.groundSize),
        new THREE.MeshStandardMaterial({
            color: params.groundColor,
            roughness: 0.9
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function onResize(container) {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Object management
export function addObject(id, obj) {
    scene.add(obj);
    objects.set(id, obj);
}

export function removeObject(id) {
    const obj = objects.get(id);
    if (obj) {
        scene.remove(obj);
        objects.delete(id);
    }
}

export function getObject(id) {
    return objects.get(id);
}

export function clearObjects() {
    objects.forEach((obj, id) => {
        scene.remove(obj);
    });
    objects.clear();
}

// Camera controls
export function zoomIn() {
    camera.position.multiplyScalar(0.9);
}

export function zoomOut() {
    camera.position.multiplyScalar(1.1);
}

export function resetCamera(params) {
    camera.position.set(...params.camera.position);
    controls.target.set(...params.camera.target);
}

export function focusOn(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const d = Math.max(size.x, size.y, size.z) * 2;
    camera.position.set(center.x + d, center.y + d / 2, center.z + d);
    controls.target.copy(center);
}

export default { initScene, scene, camera, renderer, controls, objects };
