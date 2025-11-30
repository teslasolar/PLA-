/**
 * PLA Designer - Leaflet Map Integration
 */
import { state, getPole } from './state.js';

let map = null;
let markers = new Map();
let polylines = [];
let isVisible = false;

// Default center (can be overridden)
const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 16;

// Initialize map
export function initMap(containerId = 'mapContainer') {
    const container = document.getElementById(containerId);
    if (!container || map) return;

    // Load Leaflet if not loaded
    if (!window.L) {
        console.warn('Leaflet not loaded');
        return;
    }

    map = L.map(containerId, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true
    });

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add satellite layer option
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19
    });

    // Layer control
    L.control.layers({
        'Street': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        'Satellite': satellite
    }).addTo(map);

    // Click to add pole
    map.on('click', onMapClick);

    console.log('🗺️ Map initialized');
    return map;
}

// Handle map click
function onMapClick(e) {
    if (state.tool === 'select') return;

    const { lat, lng } = e.latlng;

    // Convert lat/lng to local coordinates (simplified)
    // In a real app, you'd use a proper projection
    const x = (lng - DEFAULT_CENTER[1]) * 111000 * Math.cos(lat * Math.PI / 180);
    const z = (lat - DEFAULT_CENTER[0]) * 111000;

    if (state.tool === 'pole' || window.addPoleAtPosition) {
        window.addPoleAtPosition?.(x, z);
        syncToMap();
    }
}

// Create pole marker
function createPoleMarker(pole) {
    const coords = poleToLatLng(pole);

    const icon = L.divIcon({
        className: 'pole-marker',
        html: `<div style="
            width: 20px; height: 20px;
            background: ${pole.material === 'steel' ? '#888' : '#8B4513'};
            border: 2px solid #fff;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; color: #fff; font-weight: bold;
        ">${pole.poleClass}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const marker = L.marker(coords, { icon, draggable: true })
        .bindPopup(`<b>${pole.id}</b><br>Class ${pole.poleClass}<br>${pole.height}ft ${pole.material}`);

    marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        const x = (lng - DEFAULT_CENTER[1]) * 111000 * Math.cos(lat * Math.PI / 180);
        const z = (lat - DEFAULT_CENTER[0]) * 111000;
        window.updatePolePosition?.(pole.id, x, z);
    });

    return marker;
}

// Convert pole coords to lat/lng
function poleToLatLng(pole) {
    const lat = DEFAULT_CENTER[0] + (pole.z / 111000);
    const lng = DEFAULT_CENTER[1] + (pole.x / (111000 * Math.cos(DEFAULT_CENTER[0] * Math.PI / 180)));
    return [lat, lng];
}

// Sync state to map
export function syncToMap() {
    if (!map || !isVisible) return;

    // Clear existing
    markers.forEach(m => map.removeLayer(m));
    markers.clear();
    polylines.forEach(p => map.removeLayer(p));
    polylines = [];

    // Add poles
    state.poles.forEach(pole => {
        const marker = createPoleMarker(pole);
        marker.addTo(map);
        markers.set(pole.id, marker);
    });

    // Add spans as polylines
    state.spans.forEach(span => {
        const p1 = getPole(span.pole1);
        const p2 = getPole(span.pole2);
        if (p1 && p2) {
            const line = L.polyline([poleToLatLng(p1), poleToLatLng(p2)], {
                color: '#333',
                weight: 3,
                opacity: 0.8
            }).addTo(map);
            polylines.push(line);
        }
    });

    // Fit bounds if we have poles
    if (state.poles.length > 0) {
        const bounds = L.latLngBounds(state.poles.map(poleToLatLng));
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Toggle map visibility
export function toggleMap() {
    const container = document.getElementById('mapContainer');
    if (!container) return;

    isVisible = !isVisible;
    container.style.display = isVisible ? 'block' : 'none';

    if (isVisible) {
        if (!map) initMap();
        setTimeout(() => {
            map?.invalidateSize();
            syncToMap();
        }, 100);
    }

    return isVisible;
}

// Show map
export function showMap() {
    isVisible = true;
    const container = document.getElementById('mapContainer');
    if (container) container.style.display = 'block';
    if (!map) initMap();
    setTimeout(() => {
        map?.invalidateSize();
        syncToMap();
    }, 100);
}

// Hide map
export function hideMap() {
    isVisible = false;
    const container = document.getElementById('mapContainer');
    if (container) container.style.display = 'none';
}

// Set map center from GPS
export function setCenter(lat, lng, zoom = DEFAULT_ZOOM) {
    if (map) {
        map.setView([lat, lng], zoom);
    }
}

// Get current map bounds
export function getBounds() {
    return map?.getBounds();
}

// Use geolocation
export function gotoMyLocation() {
    if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setCenter(pos.coords.latitude, pos.coords.longitude, 18);
        },
        (err) => console.warn('Geolocation error:', err)
    );
}

export default { initMap, syncToMap, toggleMap, showMap, hideMap, setCenter, getBounds, gotoMyLocation };
