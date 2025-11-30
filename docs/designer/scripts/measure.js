// Measurement Tools - Distance, angle, clearance rulers
import { getState } from './state.js';

let measureMode = null; // 'distance', 'angle', 'clearance'
let measurePoints = [];
let measureLayer = null;

export function setMeasureMode(mode) {
    measureMode = mode;
    measurePoints = [];
    updateMeasureCursor();
    showMeasureInstructions(mode);
}

export function clearMeasureMode() {
    measureMode = null;
    measurePoints = [];
    clearMeasureOverlay();
    updateMeasureCursor();
}

export function addMeasurePoint(x, z) {
    if (!measureMode) return;

    measurePoints.push({ x, z });

    if (measureMode === 'distance' && measurePoints.length === 2) {
        const result = measureDistance(measurePoints[0], measurePoints[1]);
        showMeasureResult(result);
        drawMeasureLine(measurePoints[0], measurePoints[1], result);
    } else if (measureMode === 'angle' && measurePoints.length === 3) {
        const result = measureAngle(measurePoints[0], measurePoints[1], measurePoints[2]);
        showMeasureResult(result);
        drawMeasureAngle(measurePoints[0], measurePoints[1], measurePoints[2], result);
    } else if (measureMode === 'clearance' && measurePoints.length === 2) {
        const result = measureClearance(measurePoints[0], measurePoints[1]);
        showMeasureResult(result);
    } else {
        drawMeasurePoint(measurePoints[measurePoints.length - 1]);
    }
}

export function measureDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const bearing = (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360;

    return {
        type: 'distance',
        distance: distance.toFixed(1),
        horizontal: Math.abs(dx).toFixed(1),
        vertical: Math.abs(dz).toFixed(1),
        bearing: bearing.toFixed(1)
    };
}

export function measureAngle(p1, vertex, p2) {
    // Angle at vertex between p1 and p2
    const a1 = Math.atan2(p1.z - vertex.z, p1.x - vertex.x);
    const a2 = Math.atan2(p2.z - vertex.z, p2.x - vertex.x);

    let angle = (a2 - a1) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    if (angle > 180) angle = 360 - angle;

    const deflection = 180 - angle;

    return {
        type: 'angle',
        interior: angle.toFixed(1),
        deflection: deflection.toFixed(1),
        supplement: (180 - angle).toFixed(1)
    };
}

export function measureClearance(ground, conductor) {
    // Vertical clearance between two points (ground to conductor)
    const state = getState();

    // Find nearest span to conductor point
    let minDist = Infinity;
    let nearestSpan = null;

    state.spans.forEach(span => {
        const p1 = state.poles.find(p => p.id === span.from);
        const p2 = state.poles.find(p => p.id === span.to);
        if (!p1 || !p2) return;

        // Distance from point to line segment
        const dist = pointToLineDistance(conductor, p1, p2);
        if (dist < minDist) {
            minDist = dist;
            nearestSpan = span;
        }
    });

    if (!nearestSpan || minDist > 50) {
        return { type: 'clearance', error: 'No span found near point' };
    }

    // Calculate sag at this position
    const p1 = state.poles.find(p => p.id === nearestSpan.from);
    const p2 = state.poles.find(p => p.id === nearestSpan.to);
    const spanLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
    const attachHeight = nearestSpan.attachHeight || 30;

    // Position along span (0 to 1)
    const t = getPositionOnLine(conductor, p1, p2);
    const sagAtPoint = calculateSagAtPosition(spanLength, nearestSpan.sag || 3, t);
    const conductorHeight = attachHeight - sagAtPoint;

    const groundHeight = ground.elevation || 0;
    const clearance = conductorHeight - groundHeight;

    return {
        type: 'clearance',
        clearance: clearance.toFixed(1),
        conductorHeight: conductorHeight.toFixed(1),
        groundHeight: groundHeight.toFixed(1),
        span: nearestSpan.id,
        meets18ft: clearance >= 18 ? 'PASS' : 'FAIL'
    };
}

function pointToLineDistance(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.z - lineStart.z;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.z - lineStart.z;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;

    let xx, zz;
    if (param < 0) {
        xx = lineStart.x;
        zz = lineStart.z;
    } else if (param > 1) {
        xx = lineEnd.x;
        zz = lineEnd.z;
    } else {
        xx = lineStart.x + param * C;
        zz = lineStart.z + param * D;
    }

    return Math.sqrt((point.x - xx) ** 2 + (point.z - zz) ** 2);
}

function getPositionOnLine(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dz = lineEnd.z - lineStart.z;
    const t = ((point.x - lineStart.x) * dx + (point.z - lineStart.z) * dz) / (dx * dx + dz * dz);
    return Math.max(0, Math.min(1, t));
}

function calculateSagAtPosition(spanLength, maxSag, t) {
    // Parabolic sag profile, max at t=0.5
    return 4 * maxSag * t * (1 - t);
}

function updateMeasureCursor() {
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.style.cursor = measureMode ? 'crosshair' : 'default';
    }
}

function showMeasureInstructions(mode) {
    const status = document.getElementById('status');
    if (!status) return;

    const instructions = {
        distance: 'Click two points to measure distance',
        angle: 'Click three points: start, vertex, end',
        clearance: 'Click ground point, then conductor area'
    };

    status.textContent = instructions[mode] || 'Ready';
    status.style.color = '#f59e0b';
}

function showMeasureResult(result) {
    const status = document.getElementById('status');
    if (!status) return;

    let text = '';
    if (result.type === 'distance') {
        text = `Distance: ${result.distance}' | Bearing: ${result.bearing}°`;
    } else if (result.type === 'angle') {
        text = `Angle: ${result.interior}° | Deflection: ${result.deflection}°`;
    } else if (result.type === 'clearance') {
        if (result.error) {
            text = result.error;
        } else {
            text = `Clearance: ${result.clearance}' [${result.meets18ft}]`;
        }
    }

    status.textContent = text;
    status.style.color = result.meets18ft === 'FAIL' ? '#ef4444' : '#10b981';

    // Show detailed result in panel
    const panel = document.getElementById('measureResult');
    if (panel) {
        panel.innerHTML = generateResultHTML(result);
        panel.style.display = 'block';
    }
}

function generateResultHTML(result) {
    if (result.type === 'distance') {
        return `
            <div class="measure-result">
                <div class="result-title">📏 Distance Measurement</div>
                <div class="result-row"><span>Total:</span><strong>${result.distance} ft</strong></div>
                <div class="result-row"><span>Horizontal:</span>${result.horizontal} ft</div>
                <div class="result-row"><span>Vertical:</span>${result.vertical} ft</div>
                <div class="result-row"><span>Bearing:</span>${result.bearing}°</div>
            </div>
        `;
    } else if (result.type === 'angle') {
        return `
            <div class="measure-result">
                <div class="result-title">📐 Angle Measurement</div>
                <div class="result-row"><span>Interior:</span><strong>${result.interior}°</strong></div>
                <div class="result-row"><span>Deflection:</span>${result.deflection}°</div>
            </div>
        `;
    } else if (result.type === 'clearance') {
        return `
            <div class="measure-result">
                <div class="result-title">📊 Clearance Check</div>
                <div class="result-row"><span>Clearance:</span><strong class="${result.meets18ft === 'PASS' ? 'pass' : 'fail'}">${result.clearance} ft</strong></div>
                <div class="result-row"><span>Conductor:</span>${result.conductorHeight} ft AGL</div>
                <div class="result-row"><span>Ground:</span>${result.groundHeight} ft</div>
                <div class="result-row"><span>18' Check:</span><span class="${result.meets18ft === 'PASS' ? 'pass' : 'fail'}">${result.meets18ft}</span></div>
            </div>
        `;
    }
    return '';
}

function drawMeasurePoint(point) {
    const overlay = getMeasureOverlay();
    const marker = document.createElement('div');
    marker.className = 'measure-point';
    marker.style.left = `${point.x}px`;
    marker.style.top = `${point.z}px`;
    overlay.appendChild(marker);
}

function drawMeasureLine(p1, p2, result) {
    const overlay = getMeasureOverlay();

    // Line element
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx) * 180 / Math.PI;

    const line = document.createElement('div');
    line.className = 'measure-line';
    line.style.left = `${p1.x}px`;
    line.style.top = `${p1.z}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
    overlay.appendChild(line);

    // Label
    const label = document.createElement('div');
    label.className = 'measure-label';
    label.textContent = `${result.distance}'`;
    label.style.left = `${(p1.x + p2.x) / 2}px`;
    label.style.top = `${(p1.z + p2.z) / 2}px`;
    overlay.appendChild(label);
}

function drawMeasureAngle(p1, vertex, p2, result) {
    const overlay = getMeasureOverlay();

    // Draw lines to vertex
    drawMeasureLine(vertex, p1, { distance: '' });
    drawMeasureLine(vertex, p2, { distance: '' });

    // Arc
    const arc = document.createElement('div');
    arc.className = 'measure-arc';
    arc.style.left = `${vertex.x - 30}px`;
    arc.style.top = `${vertex.z - 30}px`;
    overlay.appendChild(arc);

    // Label
    const label = document.createElement('div');
    label.className = 'measure-label';
    label.textContent = `${result.interior}°`;
    label.style.left = `${vertex.x + 40}px`;
    label.style.top = `${vertex.z}px`;
    overlay.appendChild(label);
}

function getMeasureOverlay() {
    if (!measureLayer) {
        measureLayer = document.createElement('div');
        measureLayer.id = 'measureOverlay';
        measureLayer.className = 'measure-overlay';
        document.getElementById('canvas')?.appendChild(measureLayer);
    }
    return measureLayer;
}

function clearMeasureOverlay() {
    if (measureLayer) {
        measureLayer.innerHTML = '';
    }
}

export function showMeasurePanel() {
    const panel = document.getElementById('measurePanel');
    if (panel) {
        panel.innerHTML = `
            <div class="measure-tools">
                <button class="btn ${measureMode === 'distance' ? 'active' : ''}" onclick="window.setMeasure('distance')">📏 Distance</button>
                <button class="btn ${measureMode === 'angle' ? 'active' : ''}" onclick="window.setMeasure('angle')">📐 Angle</button>
                <button class="btn ${measureMode === 'clearance' ? 'active' : ''}" onclick="window.setMeasure('clearance')">📊 Clearance</button>
                <button class="btn" onclick="window.clearMeasure()">Clear</button>
            </div>
            <div id="measureResult" style="display:none;"></div>
        `;
        panel.style.display = 'block';
    }

    window.setMeasure = setMeasureMode;
    window.clearMeasure = clearMeasureMode;
}

export { measureMode, measurePoints };
