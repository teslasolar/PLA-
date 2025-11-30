/**
 * Camera and Interaction Controls
 */
export class Controls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.orbit = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selected = null;
        this.onSelect = null;
    }

    initOrbit() {
        if (!THREE.OrbitControls) {
            console.warn('OrbitControls not loaded');
            return this;
        }
        this.orbit = new THREE.OrbitControls(this.camera, this.domElement);
        this.orbit.enableDamping = true;
        this.orbit.dampingFactor = 0.05;
        this.orbit.minDistance = 10;
        this.orbit.maxDistance = 500;
        this.orbit.maxPolarAngle = Math.PI / 2.1;
        return this;
    }

    initPick(objects, callback) {
        this.onSelect = callback;
        this.domElement.addEventListener('click', (e) => {
            const rect = this.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const hits = this.raycaster.intersectObjects(objects, true);
            if (hits.length > 0) {
                let obj = hits[0].object;
                while (obj.parent && !obj.userData.type) obj = obj.parent;
                this.select(obj);
            }
        });
        return this;
    }

    select(obj) {
        if (this.selected) this.deselect();
        this.selected = obj;
        obj.traverse(c => {
            if (c.material?.emissive) c.material.emissive.setHex(0xff6600);
        });
        if (this.onSelect) this.onSelect(obj);
    }

    deselect() {
        if (this.selected) {
            this.selected.traverse(c => {
                if (c.material?.emissive) c.material.emissive.setHex(0x000000);
            });
            this.selected = null;
        }
    }

    reset() {
        this.camera.position.set(100, 50, 100);
        if (this.orbit) {
            this.orbit.target.set(0, 10, 0);
            this.orbit.update();
        }
    }

    focusOn(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const d = Math.max(size.x, size.y, size.z) * 2;
        this.camera.position.set(center.x + d, center.y + d / 2, center.z + d);
        if (this.orbit) this.orbit.target.copy(center);
    }

    update() {
        if (this.orbit) this.orbit.update();
    }
}

export default Controls;
