/**
 * Text Labels and Annotations
 */
export class Labels {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.labels = new Map();
        this.container = null;
    }

    init(container) {
        this.container = container;
        return this;
    }

    add(id, text, position, style = {}) {
        const div = document.createElement('div');
        div.className = 'label-3d';
        div.textContent = text;
        div.style.cssText = `
            position: absolute;
            background: ${style.bg || 'rgba(0,0,0,0.7)'};
            color: ${style.color || '#fff'};
            padding: 4px 8px;
            border-radius: 4px;
            font-size: ${style.size || '12px'};
            pointer-events: none;
            white-space: nowrap;
        `;
        this.container.appendChild(div);
        this.labels.set(id, { div, position: position.clone() });
        return this;
    }

    remove(id) {
        const label = this.labels.get(id);
        if (label) {
            label.div.remove();
            this.labels.delete(id);
        }
    }

    update() {
        for (const [id, label] of this.labels) {
            const pos = label.position.clone();
            pos.project(this.camera);
            const x = (pos.x * 0.5 + 0.5) * this.container.clientWidth;
            const y = (-pos.y * 0.5 + 0.5) * this.container.clientHeight;
            label.div.style.left = `${x}px`;
            label.div.style.top = `${y}px`;
            label.div.style.display = pos.z < 1 ? 'block' : 'none';
        }
    }

    clear() {
        for (const [id] of this.labels) this.remove(id);
    }

    setPosition(id, position) {
        const label = this.labels.get(id);
        if (label) label.position.copy(position);
    }

    setText(id, text) {
        const label = this.labels.get(id);
        if (label) label.div.textContent = text;
    }
}

export default Labels;
