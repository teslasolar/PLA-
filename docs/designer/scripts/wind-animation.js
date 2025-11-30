// Wind Animation - Conductor sway simulation
import { getState } from './state.js';

let animationId = null;
let isAnimating = false;
let windSpeed = 30; // mph
let windDirection = 0; // degrees
let gustFactor = 1.5;

// Animation state for each span
const spanStates = new Map();

export function initWindAnimation(scene) {
    if (!scene) return;

    // Store reference to Three.js scene
    window.windScene = scene;
}

export function startWindAnimation() {
    if (isAnimating) return;
    isAnimating = true;

    initSpanStates();
    animate();
}

export function stopWindAnimation() {
    isAnimating = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    resetSpans();
}

export function setWindParams(speed, direction, gust = 1.5) {
    windSpeed = speed;
    windDirection = direction;
    gustFactor = gust;
}

function initSpanStates() {
    const state = getState();
    spanStates.clear();

    state.spans.forEach(span => {
        spanStates.set(span.id, {
            phase: Math.random() * Math.PI * 2,
            frequency: 0.5 + Math.random() * 0.3,
            amplitude: 0,
            currentSway: 0
        });
    });
}

function animate() {
    if (!isAnimating) return;

    const time = performance.now() / 1000;

    spanStates.forEach((state, spanId) => {
        // Calculate sway based on wind
        const baseAmplitude = calculateSwayAmplitude(spanId);

        // Add gust variation
        const gustNoise = Math.sin(time * 0.3) * (gustFactor - 1);
        const amplitude = baseAmplitude * (1 + gustNoise);

        // Oscillation with damping
        const sway = amplitude * Math.sin(time * state.frequency * Math.PI * 2 + state.phase);
        state.currentSway = sway;

        // Update 3D mesh if available
        updateSpanMesh(spanId, sway);
    });

    animationId = requestAnimationFrame(animate);
}

function calculateSwayAmplitude(spanId) {
    const state = getState();
    const span = state.spans.find(s => s.id === spanId);
    if (!span) return 0;

    const p1 = state.poles.find(p => p.id === span.from);
    const p2 = state.poles.find(p => p.id === span.to);
    if (!p1 || !p2) return 0;

    // Span length
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const spanLength = Math.sqrt(dx * dx + dz * dz);

    // Span direction
    const spanAngle = Math.atan2(dz, dx) * 180 / Math.PI;

    // Wind perpendicular component
    const angleDiff = Math.abs(windDirection - spanAngle);
    const perpComponent = Math.sin(angleDiff * Math.PI / 180);

    // Conductor diameter affects wind area
    const diameter = span.diameter || 0.5; // inches

    // Wind pressure (simplified)
    const windPressure = 0.00256 * windSpeed ** 2; // psf

    // Sway amplitude (simplified formula)
    const weight = span.weight || 0.3; // lb/ft
    const tension = span.tension || 2000;

    // Maximum sway at midspan
    const maxSway = (windPressure * diameter / 12 * spanLength ** 2) / (8 * tension) * perpComponent;

    return Math.min(maxSway, spanLength * 0.1); // Cap at 10% of span
}

function updateSpanMesh(spanId, sway) {
    // Find the catenary mesh in Three.js scene
    const scene = window.windScene;
    if (!scene) return;

    const mesh = scene.getObjectByName(`span-${spanId}`);
    if (!mesh || !mesh.geometry) return;

    const positions = mesh.geometry.attributes.position;
    if (!positions) return;

    // Store original positions if not stored
    if (!mesh.userData.originalPositions) {
        mesh.userData.originalPositions = new Float32Array(positions.array);
    }

    const original = mesh.userData.originalPositions;
    const count = positions.count;

    // Apply sway to middle vertices
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1); // 0 to 1 along span
        const swayFactor = Math.sin(t * Math.PI); // Max at middle

        // Get wind direction as vector
        const windX = Math.cos(windDirection * Math.PI / 180);
        const windZ = Math.sin(windDirection * Math.PI / 180);

        positions.array[i * 3] = original[i * 3] + windX * sway * swayFactor;
        positions.array[i * 3 + 2] = original[i * 3 + 2] + windZ * sway * swayFactor;
    }

    positions.needsUpdate = true;
    mesh.geometry.computeBoundingSphere();
}

function resetSpans() {
    const scene = window.windScene;
    if (!scene) return;

    spanStates.forEach((_, spanId) => {
        const mesh = scene.getObjectByName(`span-${spanId}`);
        if (mesh && mesh.userData.originalPositions) {
            const positions = mesh.geometry.attributes.position;
            positions.array.set(mesh.userData.originalPositions);
            positions.needsUpdate = true;
        }
    });
}

export function getWindForce(span) {
    const state = getState();
    const p1 = state.poles.find(p => p.id === span.from);
    const p2 = state.poles.find(p => p.id === span.to);
    if (!p1 || !p2) return 0;

    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const spanLength = Math.sqrt(dx * dx + dz * dz);
    const spanAngle = Math.atan2(dz, dx) * 180 / Math.PI;

    const perpComponent = Math.abs(Math.sin((windDirection - spanAngle) * Math.PI / 180));
    const diameter = span.diameter || 0.5;
    const windPressure = 0.00256 * windSpeed ** 2;

    // Total wind force on span
    return windPressure * (diameter / 12) * spanLength * perpComponent;
}

export function showWindControls() {
    const container = document.getElementById('windControls');
    if (!container) return;

    container.innerHTML = `
        <div class="wind-panel">
            <div class="wind-header">
                <span>💨 Wind Simulation</span>
                <button class="btn btn-sm" id="windToggle" onclick="window.toggleWind()">
                    ${isAnimating ? 'Stop' : 'Start'}
                </button>
            </div>
            <div class="wind-controls">
                <div class="control-row">
                    <label>Speed (mph):</label>
                    <input type="range" id="windSpeedSlider" min="0" max="100" value="${windSpeed}"
                           oninput="window.updateWind()">
                    <span id="windSpeedVal">${windSpeed}</span>
                </div>
                <div class="control-row">
                    <label>Direction:</label>
                    <input type="range" id="windDirSlider" min="0" max="360" value="${windDirection}"
                           oninput="window.updateWind()">
                    <span id="windDirVal">${windDirection}°</span>
                </div>
                <div class="control-row">
                    <label>Gust Factor:</label>
                    <input type="range" id="gustSlider" min="1" max="2" step="0.1" value="${gustFactor}"
                           oninput="window.updateWind()">
                    <span id="gustVal">${gustFactor}</span>
                </div>
            </div>
            <div class="wind-compass">
                <div class="compass-arrow" style="transform: rotate(${windDirection}deg)">➤</div>
            </div>
        </div>
    `;

    container.style.display = 'block';
}

window.toggleWind = () => {
    if (isAnimating) {
        stopWindAnimation();
    } else {
        startWindAnimation();
    }
    const btn = document.getElementById('windToggle');
    if (btn) btn.textContent = isAnimating ? 'Stop' : 'Start';
};

window.updateWind = () => {
    windSpeed = +document.getElementById('windSpeedSlider')?.value || 30;
    windDirection = +document.getElementById('windDirSlider')?.value || 0;
    gustFactor = +document.getElementById('gustSlider')?.value || 1.5;

    document.getElementById('windSpeedVal').textContent = windSpeed;
    document.getElementById('windDirVal').textContent = windDirection + '°';
    document.getElementById('gustVal').textContent = gustFactor;

    const arrow = document.querySelector('.compass-arrow');
    if (arrow) arrow.style.transform = `rotate(${windDirection}deg)`;
};

export { isAnimating, windSpeed, windDirection, gustFactor };
