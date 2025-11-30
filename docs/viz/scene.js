/**
 * Three.js Scene Manager
 * Main 3D visualization setup
 */
export class Scene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.objects = new Map();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 200, 1000);

        // Camera
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
        this.camera.position.set(100, 50, 100);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this._addLights();
        this._addGround();
        this._addGrid();

        window.addEventListener('resize', () => this.resize());
        return this;
    }

    _addLights() {
        this.scene.add(new THREE.AmbientLight(0x404040, 1));
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(100, 150, 100);
        sun.castShadow = true;
        this.scene.add(sun);
        this.scene.add(new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.5));
    }

    _addGround() {
        const geo = new THREE.PlaneGeometry(1000, 1000);
        const mat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9 });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    _addGrid() {
        this.scene.add(new THREE.GridHelper(500, 50, 0x444444, 0x888888));
    }

    add(id, obj) {
        this.scene.add(obj);
        this.objects.set(id, obj);
    }

    remove(id) {
        const obj = this.objects.get(id);
        if (obj) {
            this.scene.remove(obj);
            this.objects.delete(id);
        }
    }

    get(id) {
        return this.objects.get(id);
    }

    resize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate(fn) {
        const loop = () => {
            requestAnimationFrame(loop);
            if (fn) fn();
            this.render();
        };
        loop();
    }
}

export default Scene;
