// Annotations - Drawing/markup tools for review
import { getState, setState } from './state.js';

let annotations = [];
let currentTool = null; // 'line', 'arrow', 'rect', 'circle', 'text', 'freehand'
let isDrawing = false;
let currentAnnotation = null;
let annotationLayer = null;

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
let currentColor = COLORS[0];
let currentWidth = 2;

export function initAnnotations() {
    createAnnotationLayer();
    loadAnnotations();
}

export function setAnnotationTool(tool) {
    currentTool = tool;
    updateCursor();
}

export function clearAnnotationTool() {
    currentTool = null;
    isDrawing = false;
    currentAnnotation = null;
    updateCursor();
}

export function setAnnotationColor(color) {
    currentColor = color;
}

export function setAnnotationWidth(width) {
    currentWidth = width;
}

function createAnnotationLayer() {
    if (annotationLayer) return;

    annotationLayer = document.createElement('div');
    annotationLayer.id = 'annotationLayer';
    annotationLayer.className = 'annotation-layer';

    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.appendChild(annotationLayer);

        // Event listeners
        annotationLayer.addEventListener('mousedown', handleMouseDown);
        annotationLayer.addEventListener('mousemove', handleMouseMove);
        annotationLayer.addEventListener('mouseup', handleMouseUp);
        annotationLayer.addEventListener('dblclick', handleDoubleClick);
    }
}

function handleMouseDown(e) {
    if (!currentTool) return;

    const rect = annotationLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawing = true;

    if (currentTool === 'text') {
        showTextInput(x, y);
        return;
    }

    currentAnnotation = {
        id: `ann_${Date.now()}`,
        type: currentTool,
        color: currentColor,
        width: currentWidth,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        points: currentTool === 'freehand' ? [{ x, y }] : null,
        text: '',
        timestamp: new Date().toISOString()
    };
}

function handleMouseMove(e) {
    if (!isDrawing || !currentAnnotation) return;

    const rect = annotationLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'freehand') {
        currentAnnotation.points.push({ x, y });
    } else {
        currentAnnotation.endX = x;
        currentAnnotation.endY = y;
    }

    renderCurrentAnnotation();
}

function handleMouseUp(e) {
    if (!isDrawing || !currentAnnotation) return;

    isDrawing = false;

    // Only save if annotation has size
    const hasSize = currentTool === 'freehand'
        ? currentAnnotation.points.length > 2
        : Math.abs(currentAnnotation.endX - currentAnnotation.startX) > 5 ||
          Math.abs(currentAnnotation.endY - currentAnnotation.startY) > 5;

    if (hasSize) {
        annotations.push(currentAnnotation);
        saveAnnotations();
    }

    currentAnnotation = null;
    renderAnnotations();
}

function handleDoubleClick(e) {
    const rect = annotationLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked annotation
    const clicked = findAnnotationAt(x, y);
    if (clicked) {
        showAnnotationMenu(clicked, e.clientX, e.clientY);
    }
}

function findAnnotationAt(x, y) {
    for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];

        if (ann.type === 'text') {
            if (x >= ann.startX && x <= ann.startX + 100 &&
                y >= ann.startY - 20 && y <= ann.startY) {
                return ann;
            }
        } else if (ann.type === 'freehand') {
            for (const pt of ann.points) {
                if (Math.abs(pt.x - x) < 10 && Math.abs(pt.y - y) < 10) {
                    return ann;
                }
            }
        } else {
            const minX = Math.min(ann.startX, ann.endX) - 5;
            const maxX = Math.max(ann.startX, ann.endX) + 5;
            const minY = Math.min(ann.startY, ann.endY) - 5;
            const maxY = Math.max(ann.startY, ann.endY) + 5;

            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                return ann;
            }
        }
    }
    return null;
}

function renderAnnotations() {
    if (!annotationLayer) return;

    // Clear and re-render all
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';

    annotations.forEach(ann => {
        const el = createAnnotationElement(ann);
        if (el) svg.appendChild(el);
    });

    // Replace existing SVG
    const existing = annotationLayer.querySelector('svg');
    if (existing) existing.remove();
    annotationLayer.appendChild(svg);
}

function renderCurrentAnnotation() {
    if (!currentAnnotation || !annotationLayer) return;

    let preview = annotationLayer.querySelector('.annotation-preview');
    if (!preview) {
        preview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        preview.classList.add('annotation-preview');
        preview.setAttribute('width', '100%');
        preview.setAttribute('height', '100%');
        preview.style.position = 'absolute';
        preview.style.top = '0';
        preview.style.left = '0';
        preview.style.pointerEvents = 'none';
        annotationLayer.appendChild(preview);
    }

    preview.innerHTML = '';
    const el = createAnnotationElement(currentAnnotation);
    if (el) preview.appendChild(el);
}

function createAnnotationElement(ann) {
    const ns = 'http://www.w3.org/2000/svg';

    if (ann.type === 'line') {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', ann.startX);
        line.setAttribute('y1', ann.startY);
        line.setAttribute('x2', ann.endX);
        line.setAttribute('y2', ann.endY);
        line.setAttribute('stroke', ann.color);
        line.setAttribute('stroke-width', ann.width);
        return line;
    }

    if (ann.type === 'arrow') {
        const g = document.createElementNS(ns, 'g');

        // Line
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', ann.startX);
        line.setAttribute('y1', ann.startY);
        line.setAttribute('x2', ann.endX);
        line.setAttribute('y2', ann.endY);
        line.setAttribute('stroke', ann.color);
        line.setAttribute('stroke-width', ann.width);
        g.appendChild(line);

        // Arrowhead
        const angle = Math.atan2(ann.endY - ann.startY, ann.endX - ann.startX);
        const headLen = 15;
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', `
            M ${ann.endX} ${ann.endY}
            L ${ann.endX - headLen * Math.cos(angle - 0.5)} ${ann.endY - headLen * Math.sin(angle - 0.5)}
            M ${ann.endX} ${ann.endY}
            L ${ann.endX - headLen * Math.cos(angle + 0.5)} ${ann.endY - headLen * Math.sin(angle + 0.5)}
        `);
        path.setAttribute('stroke', ann.color);
        path.setAttribute('stroke-width', ann.width);
        path.setAttribute('fill', 'none');
        g.appendChild(path);

        return g;
    }

    if (ann.type === 'rect') {
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', Math.min(ann.startX, ann.endX));
        rect.setAttribute('y', Math.min(ann.startY, ann.endY));
        rect.setAttribute('width', Math.abs(ann.endX - ann.startX));
        rect.setAttribute('height', Math.abs(ann.endY - ann.startY));
        rect.setAttribute('stroke', ann.color);
        rect.setAttribute('stroke-width', ann.width);
        rect.setAttribute('fill', 'none');
        return rect;
    }

    if (ann.type === 'circle') {
        const ellipse = document.createElementNS(ns, 'ellipse');
        ellipse.setAttribute('cx', (ann.startX + ann.endX) / 2);
        ellipse.setAttribute('cy', (ann.startY + ann.endY) / 2);
        ellipse.setAttribute('rx', Math.abs(ann.endX - ann.startX) / 2);
        ellipse.setAttribute('ry', Math.abs(ann.endY - ann.startY) / 2);
        ellipse.setAttribute('stroke', ann.color);
        ellipse.setAttribute('stroke-width', ann.width);
        ellipse.setAttribute('fill', 'none');
        return ellipse;
    }

    if (ann.type === 'freehand' && ann.points?.length > 0) {
        const path = document.createElementNS(ns, 'path');
        let d = `M ${ann.points[0].x} ${ann.points[0].y}`;
        for (let i = 1; i < ann.points.length; i++) {
            d += ` L ${ann.points[i].x} ${ann.points[i].y}`;
        }
        path.setAttribute('d', d);
        path.setAttribute('stroke', ann.color);
        path.setAttribute('stroke-width', ann.width);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        return path;
    }

    if (ann.type === 'text' && ann.text) {
        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', ann.startX);
        text.setAttribute('y', ann.startY);
        text.setAttribute('fill', ann.color);
        text.setAttribute('font-size', '14px');
        text.setAttribute('font-family', 'sans-serif');
        text.textContent = ann.text;
        return text;
    }

    return null;
}

function showTextInput(x, y) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'annotation-text-input';
    input.style.left = `${x}px`;
    input.style.top = `${y}px`;
    input.style.color = currentColor;

    input.onblur = () => {
        if (input.value.trim()) {
            annotations.push({
                id: `ann_${Date.now()}`,
                type: 'text',
                color: currentColor,
                startX: x,
                startY: y,
                text: input.value.trim(),
                timestamp: new Date().toISOString()
            });
            saveAnnotations();
            renderAnnotations();
        }
        input.remove();
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.value = ''; input.blur(); }
    };

    annotationLayer.appendChild(input);
    input.focus();
}

function showAnnotationMenu(annotation, x, y) {
    const existing = document.querySelector('.annotation-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'annotation-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
        <button onclick="window.deleteAnnotation('${annotation.id}')">Delete</button>
        <button onclick="window.changeAnnotationColor('${annotation.id}')">Change Color</button>
    `;

    document.body.appendChild(menu);

    setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
}

window.deleteAnnotation = (id) => {
    annotations = annotations.filter(a => a.id !== id);
    saveAnnotations();
    renderAnnotations();
};

window.changeAnnotationColor = (id) => {
    const ann = annotations.find(a => a.id === id);
    if (ann) {
        const currentIndex = COLORS.indexOf(ann.color);
        ann.color = COLORS[(currentIndex + 1) % COLORS.length];
        saveAnnotations();
        renderAnnotations();
    }
};

function updateCursor() {
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.style.cursor = currentTool ? 'crosshair' : 'default';
    }
}

export function clearAllAnnotations() {
    annotations = [];
    saveAnnotations();
    renderAnnotations();
}

export function getAnnotations() {
    return annotations;
}

function saveAnnotations() {
    const state = getState();
    state.annotations = annotations;
    localStorage.setItem('pla-annotations', JSON.stringify(annotations));
}

function loadAnnotations() {
    const saved = localStorage.getItem('pla-annotations');
    if (saved) {
        try {
            annotations = JSON.parse(saved);
            renderAnnotations();
        } catch (e) {
            console.error('Failed to load annotations:', e);
        }
    }
}

export function showAnnotationTools() {
    const panel = document.getElementById('annotationPanel');
    if (!panel) return;

    panel.innerHTML = `
        <div class="annotation-tools">
            <div class="tool-group">
                <button class="btn ${currentTool === 'line' ? 'active' : ''}" onclick="window.setAnnTool('line')">Line</button>
                <button class="btn ${currentTool === 'arrow' ? 'active' : ''}" onclick="window.setAnnTool('arrow')">Arrow</button>
                <button class="btn ${currentTool === 'rect' ? 'active' : ''}" onclick="window.setAnnTool('rect')">Rect</button>
                <button class="btn ${currentTool === 'circle' ? 'active' : ''}" onclick="window.setAnnTool('circle')">Circle</button>
                <button class="btn ${currentTool === 'freehand' ? 'active' : ''}" onclick="window.setAnnTool('freehand')">Draw</button>
                <button class="btn ${currentTool === 'text' ? 'active' : ''}" onclick="window.setAnnTool('text')">Text</button>
            </div>
            <div class="color-group">
                ${COLORS.map(c => `
                    <button class="color-btn ${currentColor === c ? 'active' : ''}"
                            style="background:${c}" onclick="window.setAnnColor('${c}')"></button>
                `).join('')}
            </div>
            <div class="actions">
                <button class="btn" onclick="window.clearAnnTool()">Done</button>
                <button class="btn danger" onclick="window.clearAllAnn()">Clear All</button>
            </div>
        </div>
    `;
    panel.style.display = 'block';

    window.setAnnTool = (tool) => { setAnnotationTool(tool); showAnnotationTools(); };
    window.setAnnColor = (color) => { setAnnotationColor(color); showAnnotationTools(); };
    window.clearAnnTool = () => { clearAnnotationTool(); panel.style.display = 'none'; };
    window.clearAllAnn = () => { if (confirm('Clear all annotations?')) clearAllAnnotations(); };
}

export { annotations, currentTool, currentColor, COLORS };
