// Touch Gestures - Mobile pinch-zoom, pan support

let touchState = {
    active: false,
    startX: 0,
    startY: 0,
    startDist: 0,
    startScale: 1,
    lastX: 0,
    lastY: 0,
    panX: 0,
    panY: 0,
    scale: 1,
    touches: []
};

let canvas = null;
let onTransform = null;

export function initTouchGestures(element, callback) {
    canvas = element || document.getElementById('canvas');
    onTransform = callback;

    if (!canvas) return;

    // Prevent default touch behaviors
    canvas.style.touchAction = 'none';

    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Mouse wheel for zoom (also works with trackpad)
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Double-tap to reset
    let lastTap = 0;
    canvas.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300 && e.touches.length === 0) {
            resetTransform();
        }
        lastTap = now;
    });

    console.log('Touch gestures initialized');
}

function handleTouchStart(e) {
    e.preventDefault();
    touchState.active = true;
    touchState.touches = Array.from(e.touches);

    if (e.touches.length === 1) {
        // Single touch - start pan
        touchState.startX = e.touches[0].clientX - touchState.panX;
        touchState.startY = e.touches[0].clientY - touchState.panY;
    } else if (e.touches.length === 2) {
        // Two touches - start pinch zoom
        touchState.startDist = getTouchDistance(e.touches[0], e.touches[1]);
        touchState.startScale = touchState.scale;

        // Also track center for pan during pinch
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        touchState.startX = center.x - touchState.panX;
        touchState.startY = center.y - touchState.panY;
    }
}

function handleTouchMove(e) {
    if (!touchState.active) return;
    e.preventDefault();

    if (e.touches.length === 1) {
        // Single touch - pan
        touchState.panX = e.touches[0].clientX - touchState.startX;
        touchState.panY = e.touches[0].clientY - touchState.startY;
    } else if (e.touches.length === 2) {
        // Two touches - pinch zoom + pan
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const scaleFactor = dist / touchState.startDist;
        touchState.scale = clampScale(touchState.startScale * scaleFactor);

        // Pan during pinch
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        touchState.panX = center.x - touchState.startX;
        touchState.panY = center.y - touchState.startY;
    }

    applyTransform();
}

function handleTouchEnd(e) {
    if (e.touches.length === 0) {
        touchState.active = false;
    } else if (e.touches.length === 1) {
        // Switching from pinch to pan
        touchState.startX = e.touches[0].clientX - touchState.panX;
        touchState.startY = e.touches[0].clientY - touchState.panY;
    }

    touchState.touches = Array.from(e.touches);
}

function handleWheel(e) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards mouse position
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = clampScale(touchState.scale * zoomFactor);

    // Adjust pan to zoom towards mouse
    const scaleChange = newScale / touchState.scale;
    touchState.panX = mouseX - (mouseX - touchState.panX) * scaleChange;
    touchState.panY = mouseY - (mouseY - touchState.panY) * scaleChange;
    touchState.scale = newScale;

    applyTransform();
}

function getTouchDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(t1, t2) {
    return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    };
}

function clampScale(scale) {
    return Math.max(0.1, Math.min(5, scale));
}

function applyTransform() {
    if (!canvas) return;

    const transform = `translate(${touchState.panX}px, ${touchState.panY}px) scale(${touchState.scale})`;

    // Apply to canvas content
    const content = canvas.querySelector('.canvas-content, #viewer3d');
    if (content) {
        content.style.transform = transform;
        content.style.transformOrigin = '0 0';
    }

    // Callback for custom handling
    if (onTransform) {
        onTransform({
            panX: touchState.panX,
            panY: touchState.panY,
            scale: touchState.scale
        });
    }

    // Update zoom display
    updateZoomDisplay();
}

function updateZoomDisplay() {
    const display = document.getElementById('zoomLevel');
    if (display) {
        display.textContent = `${Math.round(touchState.scale * 100)}%`;
    }
}

export function resetTransform() {
    touchState.panX = 0;
    touchState.panY = 0;
    touchState.scale = 1;
    applyTransform();
}

export function setScale(scale) {
    touchState.scale = clampScale(scale);
    applyTransform();
}

export function zoomIn() {
    touchState.scale = clampScale(touchState.scale * 1.2);
    applyTransform();
}

export function zoomOut() {
    touchState.scale = clampScale(touchState.scale * 0.8);
    applyTransform();
}

export function panTo(x, y) {
    touchState.panX = -x * touchState.scale + canvas.clientWidth / 2;
    touchState.panY = -y * touchState.scale + canvas.clientHeight / 2;
    applyTransform();
}

export function getTransform() {
    return {
        panX: touchState.panX,
        panY: touchState.panY,
        scale: touchState.scale
    };
}

// Convert screen coordinates to canvas coordinates
export function screenToCanvas(screenX, screenY) {
    if (!canvas) return { x: screenX, y: screenY };

    const rect = canvas.getBoundingClientRect();
    return {
        x: (screenX - rect.left - touchState.panX) / touchState.scale,
        y: (screenY - rect.top - touchState.panY) / touchState.scale
    };
}

// Convert canvas coordinates to screen coordinates
export function canvasToScreen(canvasX, canvasY) {
    if (!canvas) return { x: canvasX, y: canvasY };

    const rect = canvas.getBoundingClientRect();
    return {
        x: canvasX * touchState.scale + touchState.panX + rect.left,
        y: canvasY * touchState.scale + touchState.panY + rect.top
    };
}

// Gesture detection helpers
export function detectSwipe(touches, threshold = 50) {
    if (touches.length < 2) return null;

    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'right' : 'left';
    }
    if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
        return dy > 0 ? 'down' : 'up';
    }
    return null;
}

// Three.js camera integration
export function updateThreeCamera(camera, controls) {
    if (!camera || !controls) return;

    // Sync touch pan/zoom with OrbitControls
    const factor = 0.01;
    controls.target.x += (touchState.panX - touchState.lastX) * factor;
    controls.target.z += (touchState.panY - touchState.lastY) * factor;
    camera.zoom = touchState.scale;
    camera.updateProjectionMatrix();

    touchState.lastX = touchState.panX;
    touchState.lastY = touchState.panY;
}

export { touchState };
