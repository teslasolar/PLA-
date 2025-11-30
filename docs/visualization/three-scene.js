/**
 * 🎨 Three.js Scene Manager for PLA Visualization
 * 3D rendering of poles, conductors, and infrastructure
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class PLAScene {
    constructor(container) {
        this.container = container || document.getElementById('threejs-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Object collections
        this.poles = new Map();
        this.conductors = new Map();
        this.annotations = new Map();

        // Selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;

        // Settings
        this.settings = {
            showGrid: true,
            showLabels: true,
            showSag: true,
            wireframe: false,
            shadowsEnabled: true
        };

        // Animation
        this.animationId = null;
        this.clock = new THREE.Clock();
    }

    /**
     * Initialize the 3D scene
     */
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 200, 1000);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
        this.camera.position.set(100, 50, 100);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = this.settings.shadowsEnabled;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        if (THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 10;
            this.controls.maxDistance = 500;
            this.controls.maxPolarAngle = Math.PI / 2.1;
        }

        // Lights
        this._setupLights();

        // Ground
        this._createGround();

        // Grid
        if (this.settings.showGrid) {
            this._createGrid();
        }

        // Event listeners
        this._setupEventListeners();

        // Start animation
        this.animate();

        return this;
    }

    _setupLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x404040, 1.0);
        this.scene.add(ambient);

        // Sun
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(100, 150, 100);
        sun.castShadow = true;
        sun.shadow.camera.left = -200;
        sun.shadow.camera.right = 200;
        sun.shadow.camera.top = 200;
        sun.shadow.camera.bottom = -200;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 500;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        this.scene.add(sun);
        this.sunLight = sun;

        // Hemisphere
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.5);
        this.scene.add(hemi);
    }

    _createGround() {
        const geometry = new THREE.PlaneGeometry(1000, 1000, 50, 50);
        const material = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'ground';
        this.scene.add(ground);
        this.ground = ground;
    }

    _createGrid() {
        const grid = new THREE.GridHelper(500, 50, 0x444444, 0x888888);
        grid.position.y = 0.1;
        this.scene.add(grid);
        this.grid = grid;
    }

    _setupEventListeners() {
        window.addEventListener('resize', () => this.onResize());

        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    /**
     * Add a pole to the scene
     * @param {object} config - Pole configuration
     */
    addPole(config) {
        const {
            id = `pole_${this.poles.size}`,
            x = 0,
            y = 0,
            z = 0,
            height = 15,
            topRadius = 0.15,
            bottomRadius = 0.25,
            material = 'wood',
            type = 'tangent'
        } = config;

        const group = new THREE.Group();
        group.name = id;
        group.userData = { type: 'pole', config };

        // Pole body
        const poleGeometry = new THREE.CylinderGeometry(
            topRadius,
            bottomRadius,
            height,
            16
        );

        const poleMaterial = new THREE.MeshStandardMaterial({
            color: material === 'steel' ? 0xC0C0C0 : 0x8B4513,
            roughness: material === 'steel' ? 0.3 : 0.9,
            metalness: material === 'steel' ? 0.7 : 0.1,
            wireframe: this.settings.wireframe
        });

        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = height / 2;
        pole.castShadow = true;
        pole.receiveShadow = true;
        group.add(pole);

        // Crossarm (for tangent poles)
        if (type === 'tangent' || type === 'angle') {
            const crossarm = this._createCrossarm(height * 0.9);
            group.add(crossarm);
        }

        // Position the pole
        group.position.set(x, y, z);
        this.scene.add(group);
        this.poles.set(id, group);

        return group;
    }

    _createCrossarm(height) {
        const geometry = new THREE.BoxGeometry(4, 0.15, 0.15);
        const material = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.8
        });
        const crossarm = new THREE.Mesh(geometry, material);
        crossarm.position.y = height;
        crossarm.castShadow = true;
        return crossarm;
    }

    /**
     * Add a conductor between two points
     * @param {object} config - Conductor configuration
     */
    addConductor(config) {
        const {
            id = `conductor_${this.conductors.size}`,
            start = { x: 0, y: 15, z: 0 },
            end = { x: 50, y: 15, z: 0 },
            sag = 2.5,
            segments = 50,
            radius = 0.03,
            color = 0x333333,
            phases = 1,
            phaseOffset = 1.5
        } = config;

        const group = new THREE.Group();
        group.name = id;
        group.userData = { type: 'conductor', config };

        for (let phase = 0; phase < phases; phase++) {
            const offsetZ = (phase - (phases - 1) / 2) * phaseOffset;
            const conductor = this._createCatenaryConductor(
                { x: start.x, y: start.y, z: start.z + offsetZ },
                { x: end.x, y: end.y, z: end.z + offsetZ },
                sag,
                segments,
                radius,
                color
            );
            group.add(conductor);
        }

        this.scene.add(group);
        this.conductors.set(id, group);

        return group;
    }

    _createCatenaryConductor(start, end, sag, segments, radius, color) {
        // Calculate catenary points
        const span = Math.sqrt(
            Math.pow(end.x - start.x, 2) +
            Math.pow(end.z - start.z, 2)
        );

        const points = [];
        const catenary = new CatenaryCurve(span, sag);
        const catenaryPoints = catenary.getPoints(segments);

        for (const p of catenaryPoints) {
            const t = p.x / span;
            points.push(new THREE.Vector3(
                start.x + (end.x - start.x) * t,
                start.y + p.y,
                start.z + (end.z - start.z) * t
            ));
        }

        // Create tube geometry
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, segments, radius, 8, false);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.7,
            roughness: 0.3,
            wireframe: this.settings.wireframe
        });

        const conductor = new THREE.Mesh(geometry, material);
        conductor.castShadow = true;
        conductor.userData = {
            span: span,
            sag: sag,
            tension: catenary.getHorizontalTension(),
            length: catenary.getLength()
        };

        return conductor;
    }

    /**
     * Create a complete power line from data
     * @param {object} data - Line data
     */
    createPowerLine(data) {
        const { poles, spans } = data;

        // Add poles
        poles.forEach((poleData, i) => {
            this.addPole({
                id: `pole_${i}`,
                ...poleData
            });
        });

        // Add conductors between poles
        for (let i = 0; i < poles.length - 1; i++) {
            const p1 = poles[i];
            const p2 = poles[i + 1];
            const spanData = spans?.[i] || {};

            this.addConductor({
                id: `span_${i}`,
                start: { x: p1.x, y: p1.height * 0.9, z: p1.z || 0 },
                end: { x: p2.x, y: p2.height * 0.9, z: p2.z || 0 },
                sag: spanData.sag || 2.5,
                phases: spanData.phases || 3
            });
        }
    }

    /**
     * Highlight an object
     */
    highlight(object) {
        if (this.selectedObject) {
            // Reset previous selection
            this.selectedObject.traverse(child => {
                if (child.isMesh && child.material.emissive) {
                    child.material.emissive.setHex(0x000000);
                }
            });
        }

        if (object) {
            object.traverse(child => {
                if (child.isMesh && child.material.emissive) {
                    child.material.emissive.setHex(0xFF6600);
                }
            });
            this.selectedObject = object;
        }
    }

    /**
     * Camera controls
     */
    resetCamera() {
        this.camera.position.set(100, 50, 100);
        if (this.controls) {
            this.controls.target.set(0, 10, 0);
            this.controls.update();
        }
    }

    focusOn(object) {
        if (!object) return;

        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        this.camera.position.set(
            center.x + maxDim * 2,
            center.y + maxDim,
            center.z + maxDim * 2
        );

        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.update();
        }
    }

    /**
     * Toggle settings
     */
    toggleWireframe() {
        this.settings.wireframe = !this.settings.wireframe;
        this.scene.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.wireframe = this.settings.wireframe;
            }
        });
    }

    toggleShadows() {
        this.settings.shadowsEnabled = !this.settings.shadowsEnabled;
        this.renderer.shadowMap.enabled = this.settings.shadowsEnabled;
    }

    toggleGrid() {
        this.settings.showGrid = !this.settings.showGrid;
        if (this.grid) {
            this.grid.visible = this.settings.showGrid;
        }
    }

    /**
     * Event handlers
     */
    onClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const objects = [];
        this.poles.forEach(p => objects.push(p));
        this.conductors.forEach(c => objects.push(c));

        const intersects = this.raycaster.intersectObjects(objects, true);

        if (intersects.length > 0) {
            let parent = intersects[0].object;
            while (parent.parent && !parent.userData.type) {
                parent = parent.parent;
            }
            this.highlight(parent);

            // Dispatch custom event
            this.container.dispatchEvent(new CustomEvent('objectSelected', {
                detail: { object: parent, userData: parent.userData }
            }));
        }
    }

    onMouseMove(event) {
        // Hover effects could be added here
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.scene.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        this.renderer.dispose();
        if (this.controls) this.controls.dispose();
    }

    /**
     * Export scene data
     */
    exportData() {
        const data = {
            poles: [],
            conductors: []
        };

        this.poles.forEach((pole, id) => {
            data.poles.push({
                id,
                position: pole.position.toArray(),
                config: pole.userData.config
            });
        });

        this.conductors.forEach((conductor, id) => {
            data.conductors.push({
                id,
                config: conductor.userData.config
            });
        });

        return data;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PLAScene;
}
if (typeof window !== 'undefined') {
    window.PLAScene = PLAScene;
}
