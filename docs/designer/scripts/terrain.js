// Terrain/Elevation Module - Load elevation data for 3D ground modeling
import { getState, setState } from './state.js';

let terrainData = null;
let terrainMesh = null;
let terrainTexture = null;

// Terrain configuration
const TERRAIN_CONFIG = {
    resolution: 50,      // Grid resolution
    verticalScale: 1.0,  // Vertical exaggeration
    defaultElevation: 0,
    colorRamp: [
        { elevation: 0, color: '#228B22' },      // Green (low)
        { elevation: 50, color: '#90EE90' },     // Light green
        { elevation: 100, color: '#DEB887' },    // Tan
        { elevation: 200, color: '#8B4513' },    // Brown
        { elevation: 500, color: '#808080' },    // Gray (high)
        { elevation: 1000, color: '#FFFFFF' }    // White (snow)
    ]
};

export function initTerrain() {
    // Initialize terrain subsystem
    terrainData = {
        elevations: [],
        bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
        resolution: TERRAIN_CONFIG.resolution
    };
}

export function setTerrainBounds(minX, maxX, minZ, maxZ) {
    if (!terrainData) initTerrain();
    terrainData.bounds = { minX, maxX, minZ, maxZ };
}

// Import elevation from GeoTIFF or DEM file
export function importTerrainFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                // Try to parse as JSON elevation grid
                const data = JSON.parse(e.target.result);
                if (data.elevations && Array.isArray(data.elevations)) {
                    terrainData = {
                        elevations: data.elevations,
                        bounds: data.bounds || terrainData.bounds,
                        resolution: data.resolution || TERRAIN_CONFIG.resolution
                    };
                    updateTerrainMesh();
                    resolve({ success: true, points: data.elevations.length });
                }
            } catch {
                // Try to parse as CSV
                const lines = e.target.result.split('\n');
                const elevations = [];

                lines.forEach(line => {
                    const parts = line.split(',').map(parseFloat);
                    if (parts.length >= 3 && !isNaN(parts[0])) {
                        elevations.push({
                            x: parts[0],
                            z: parts[1],
                            elevation: parts[2]
                        });
                    }
                });

                if (elevations.length > 0) {
                    terrainData.elevations = elevations;
                    updateTerrainMesh();
                    resolve({ success: true, points: elevations.length });
                } else {
                    reject(new Error('Could not parse terrain file'));
                }
            }
        };

        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Generate random terrain for testing
export function generateRandomTerrain(amplitude = 50, frequency = 0.01) {
    if (!terrainData) initTerrain();

    const { minX, maxX, minZ, maxZ } = terrainData.bounds;
    const step = (maxX - minX) / TERRAIN_CONFIG.resolution;

    terrainData.elevations = [];

    for (let x = minX; x <= maxX; x += step) {
        for (let z = minZ; z <= maxZ; z += step) {
            // Perlin-like noise using sine waves
            const elevation =
                amplitude * Math.sin(x * frequency) * Math.cos(z * frequency) +
                amplitude * 0.5 * Math.sin(x * frequency * 2.3) * Math.sin(z * frequency * 1.7) +
                amplitude * 0.25 * Math.cos(x * frequency * 4.1 + z * frequency * 3.2);

            terrainData.elevations.push({
                x, z,
                elevation: Math.max(0, elevation + amplitude)
            });
        }
    }

    updateTerrainMesh();
    return terrainData.elevations.length;
}

// Get elevation at a specific point
export function getElevationAt(x, z) {
    if (!terrainData || !terrainData.elevations.length) {
        return TERRAIN_CONFIG.defaultElevation;
    }

    // Find nearest point (could use bilinear interpolation for better results)
    let nearest = null;
    let minDist = Infinity;

    terrainData.elevations.forEach(p => {
        const dist = Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2);
        if (dist < minDist) {
            minDist = dist;
            nearest = p;
        }
    });

    return nearest ? nearest.elevation : TERRAIN_CONFIG.defaultElevation;
}

// Get elevation profile along a line
export function getElevationProfile(x1, z1, x2, z2, samples = 20) {
    const profile = [];
    const dx = (x2 - x1) / samples;
    const dz = (z2 - z1) / samples;

    for (let i = 0; i <= samples; i++) {
        const x = x1 + dx * i;
        const z = z1 + dz * i;
        const distance = Math.sqrt((x - x1) ** 2 + (z - z1) ** 2);

        profile.push({
            x, z,
            distance: distance.toFixed(1),
            elevation: getElevationAt(x, z).toFixed(1)
        });
    }

    return profile;
}

// Update terrain visualization
function updateTerrainMesh() {
    // This would create Three.js terrain mesh
    // Dispatching event for 3D scene to handle
    window.dispatchEvent(new CustomEvent('terrainUpdated', {
        detail: terrainData
    }));
}

// Get color for elevation
export function getElevationColor(elevation) {
    const ramp = TERRAIN_CONFIG.colorRamp;

    for (let i = 0; i < ramp.length - 1; i++) {
        if (elevation >= ramp[i].elevation && elevation < ramp[i + 1].elevation) {
            // Interpolate between colors
            const t = (elevation - ramp[i].elevation) / (ramp[i + 1].elevation - ramp[i].elevation);
            return interpolateColor(ramp[i].color, ramp[i + 1].color, t);
        }
    }

    return ramp[ramp.length - 1].color;
}

function interpolateColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);

    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Generate terrain report for poles
export function generateTerrainReport() {
    const state = getState();
    const poles = state.poles || [];

    const report = poles.map(pole => ({
        id: pole.id,
        x: pole.x,
        z: pole.z,
        groundElevation: getElevationAt(pole.x, pole.z).toFixed(1),
        poleTopElevation: (getElevationAt(pole.x, pole.z) + (pole.height || 40)).toFixed(1)
    }));

    return report;
}

export function showTerrainDialog() {
    const modal = document.getElementById('terrainModal');
    const content = document.getElementById('terrainContent');

    if (content) {
        const poleElevations = generateTerrainReport();

        content.innerHTML = `
            <div class="terrain-dialog">
                <div class="terrain-actions">
                    <input type="file" id="terrainFileInput" accept=".json,.csv,.txt" style="display:none"
                           onchange="window.importTerrainFile(this)">
                    <button class="btn" onclick="document.getElementById('terrainFileInput').click()">
                        Import Terrain
                    </button>
                    <button class="btn" onclick="window.generateTestTerrain()">Generate Test Terrain</button>
                    <button class="btn" onclick="window.clearTerrain()">Clear Terrain</button>
                </div>

                <div class="terrain-info">
                    <div class="stat">
                        <span class="stat-val">${terrainData?.elevations?.length || 0}</span>
                        <span class="stat-label">Elevation Points</span>
                    </div>
                </div>

                <h4>Pole Ground Elevations</h4>
                <table class="sag-table">
                    <thead>
                        <tr>
                            <th>Pole</th>
                            <th>X</th>
                            <th>Z</th>
                            <th>Ground Elev</th>
                            <th>Top Elev</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${poleElevations.map(p => `
                            <tr>
                                <td>${p.id}</td>
                                <td>${p.x.toFixed(0)}</td>
                                <td>${p.z.toFixed(0)}</td>
                                <td>${p.groundElevation}'</td>
                                <td>${p.poleTopElevation}'</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h4>Terrain Settings</h4>
                <div class="terrain-settings">
                    <div class="form-row">
                        <label>Vertical Scale:</label>
                        <input type="range" id="terrainScale" min="0.1" max="5" step="0.1" value="${TERRAIN_CONFIG.verticalScale}"
                               onchange="window.setTerrainScale(this.value)">
                        <span id="scaleVal">${TERRAIN_CONFIG.verticalScale}x</span>
                    </div>
                </div>
            </div>
        `;
    }

    window.importTerrainFile = async (input) => {
        const file = input.files[0];
        if (file) {
            try {
                const result = await importTerrainFromFile(file);
                alert(`Imported ${result.points} elevation points`);
                showTerrainDialog(); // Refresh
            } catch (e) {
                alert('Failed to import: ' + e.message);
            }
        }
    };

    window.generateTestTerrain = () => {
        const count = generateRandomTerrain(30, 0.02);
        alert(`Generated ${count} terrain points`);
        showTerrainDialog();
    };

    window.clearTerrain = () => {
        terrainData = { elevations: [], bounds: terrainData.bounds, resolution: TERRAIN_CONFIG.resolution };
        updateTerrainMesh();
        showTerrainDialog();
    };

    window.setTerrainScale = (val) => {
        TERRAIN_CONFIG.verticalScale = parseFloat(val);
        document.getElementById('scaleVal').textContent = val + 'x';
        updateTerrainMesh();
    };

    if (modal) modal.style.display = 'flex';
}

export { terrainData, TERRAIN_CONFIG };
