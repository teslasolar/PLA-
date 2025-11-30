// Obstacles Layer - Trees, buildings, and obstructions management
import { getState, setState } from './state.js';

// Obstacle types and their default properties
const OBSTACLE_TYPES = {
    tree: {
        name: 'Tree',
        icon: '🌳',
        defaultHeight: 40,
        defaultRadius: 15,
        color: '#228B22',
        clearanceRequired: 10
    },
    building: {
        name: 'Building',
        icon: '🏢',
        defaultHeight: 25,
        defaultRadius: 30,
        color: '#8B4513',
        clearanceRequired: 15
    },
    tower: {
        name: 'Communication Tower',
        icon: '📡',
        defaultHeight: 100,
        defaultRadius: 10,
        color: '#4A90D9',
        clearanceRequired: 25
    },
    sign: {
        name: 'Sign/Billboard',
        icon: '📋',
        defaultHeight: 20,
        defaultRadius: 8,
        color: '#FFD700',
        clearanceRequired: 8
    },
    water: {
        name: 'Water Body',
        icon: '💧',
        defaultHeight: 0,
        defaultRadius: 50,
        color: '#1E90FF',
        clearanceRequired: 20
    },
    road: {
        name: 'Road Crossing',
        icon: '🛣️',
        defaultHeight: 0,
        defaultRadius: 20,
        color: '#696969',
        clearanceRequired: 18.5
    },
    railroad: {
        name: 'Railroad',
        icon: '🚂',
        defaultHeight: 0,
        defaultRadius: 25,
        color: '#8B0000',
        clearanceRequired: 27
    },
    pipeline: {
        name: 'Pipeline',
        icon: '🔴',
        defaultHeight: 0,
        defaultRadius: 15,
        color: '#FF6347',
        clearanceRequired: 12
    }
};

let obstacles = [];
let selectedObstacle = null;
let obstacleIdCounter = 1;

export function initObstacles() {
    obstacles = getState().obstacles || [];
    obstacleIdCounter = obstacles.length > 0
        ? Math.max(...obstacles.map(o => parseInt(o.id.replace('OBS-', '')))) + 1
        : 1;
}

export function addObstacle(type, x, z, options = {}) {
    const obstacleType = OBSTACLE_TYPES[type] || OBSTACLE_TYPES.tree;

    const obstacle = {
        id: `OBS-${obstacleIdCounter++}`,
        type,
        x,
        z,
        height: options.height || obstacleType.defaultHeight,
        radius: options.radius || obstacleType.defaultRadius,
        name: options.name || `${obstacleType.name} ${obstacleIdCounter - 1}`,
        notes: options.notes || '',
        clearanceRequired: options.clearanceRequired || obstacleType.clearanceRequired,
        createdAt: new Date().toISOString()
    };

    obstacles.push(obstacle);
    updateState();

    window.dispatchEvent(new CustomEvent('obstacleAdded', { detail: obstacle }));
    return obstacle;
}

export function updateObstacle(id, updates) {
    const index = obstacles.findIndex(o => o.id === id);
    if (index >= 0) {
        obstacles[index] = { ...obstacles[index], ...updates };
        updateState();
        window.dispatchEvent(new CustomEvent('obstacleUpdated', { detail: obstacles[index] }));
        return obstacles[index];
    }
    return null;
}

export function removeObstacle(id) {
    const index = obstacles.findIndex(o => o.id === id);
    if (index >= 0) {
        const removed = obstacles.splice(index, 1)[0];
        updateState();
        window.dispatchEvent(new CustomEvent('obstacleRemoved', { detail: removed }));
        return removed;
    }
    return null;
}

export function getObstacle(id) {
    return obstacles.find(o => o.id === id);
}

export function getAllObstacles() {
    return [...obstacles];
}

export function getObstaclesByType(type) {
    return obstacles.filter(o => o.type === type);
}

function updateState() {
    const state = getState();
    setState({ ...state, obstacles });
}

// Check if a span passes near an obstacle
export function checkSpanObstacles(span, poles) {
    const p1 = poles.find(p => p.id === span.pole1 || p.id === span.from);
    const p2 = poles.find(p => p.id === span.pole2 || p.id === span.to);

    if (!p1 || !p2) return [];

    const conflicts = [];

    obstacles.forEach(obs => {
        const distance = pointToLineDistance(
            obs.x, obs.z,
            p1.x, p1.z,
            p2.x, p2.z
        );

        // Check horizontal clearance
        if (distance < obs.radius + obs.clearanceRequired) {
            // Check vertical clearance
            const spanHeight = Math.min(p1.height || 40, p2.height || 40);
            const obsType = OBSTACLE_TYPES[obs.type] || OBSTACLE_TYPES.tree;

            if (obs.height > 0 && spanHeight - obs.height < obs.clearanceRequired) {
                conflicts.push({
                    obstacle: obs,
                    span: span.id,
                    horizontalDistance: distance.toFixed(1),
                    verticalClearance: (spanHeight - obs.height).toFixed(1),
                    requiredClearance: obs.clearanceRequired,
                    severity: distance < obs.radius ? 'CRITICAL' : 'WARNING'
                });
            } else if (distance < obs.radius) {
                conflicts.push({
                    obstacle: obs,
                    span: span.id,
                    horizontalDistance: distance.toFixed(1),
                    severity: 'CRITICAL',
                    issue: 'Span passes through obstacle footprint'
                });
            }
        }
    });

    return conflicts;
}

function pointToLineDistance(px, pz, x1, z1, x2, z2) {
    const A = px - x1;
    const B = pz - z1;
    const C = x2 - x1;
    const D = z2 - z1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, zz;

    if (param < 0) {
        xx = x1;
        zz = z1;
    } else if (param > 1) {
        xx = x2;
        zz = z2;
    } else {
        xx = x1 + param * C;
        zz = z1 + param * D;
    }

    const dx = px - xx;
    const dz = pz - zz;
    return Math.sqrt(dx * dx + dz * dz);
}

export function analyzeAllObstacles() {
    const state = getState();
    const poles = state.poles || [];
    const spans = state.spans || [];

    const allConflicts = [];

    spans.forEach(span => {
        const conflicts = checkSpanObstacles(span, poles);
        allConflicts.push(...conflicts);
    });

    return {
        totalObstacles: obstacles.length,
        totalConflicts: allConflicts.length,
        criticalConflicts: allConflicts.filter(c => c.severity === 'CRITICAL').length,
        warnings: allConflicts.filter(c => c.severity === 'WARNING').length,
        conflicts: allConflicts,
        byType: Object.keys(OBSTACLE_TYPES).map(type => ({
            type,
            name: OBSTACLE_TYPES[type].name,
            count: obstacles.filter(o => o.type === type).length
        })).filter(t => t.count > 0)
    };
}

export function generateObstacleReport() {
    const analysis = analyzeAllObstacles();

    return `
        <div class="obstacle-report">
            <div class="obs-summary">
                <div class="stat">
                    <span class="stat-val">${analysis.totalObstacles}</span>
                    <span class="stat-label">Obstacles</span>
                </div>
                <div class="stat ${analysis.criticalConflicts > 0 ? 'fail' : ''}">
                    <span class="stat-val">${analysis.criticalConflicts}</span>
                    <span class="stat-label">Critical</span>
                </div>
                <div class="stat ${analysis.warnings > 0 ? 'warn' : ''}">
                    <span class="stat-val">${analysis.warnings}</span>
                    <span class="stat-label">Warnings</span>
                </div>
            </div>

            ${analysis.byType.length > 0 ? `
                <div class="obs-types">
                    ${analysis.byType.map(t => `
                        <span class="obs-type-badge">${OBSTACLE_TYPES[t.type].icon} ${t.name}: ${t.count}</span>
                    `).join('')}
                </div>
            ` : ''}

            ${analysis.conflicts.length > 0 ? `
                <h4>Conflicts</h4>
                <table class="sag-table">
                    <thead>
                        <tr>
                            <th>Obstacle</th>
                            <th>Span</th>
                            <th>Distance</th>
                            <th>Severity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${analysis.conflicts.map(c => `
                            <tr class="${c.severity.toLowerCase()}">
                                <td>${OBSTACLE_TYPES[c.obstacle.type]?.icon || ''} ${c.obstacle.name}</td>
                                <td>${c.span}</td>
                                <td>${c.horizontalDistance}'</td>
                                <td class="${c.severity === 'CRITICAL' ? 'fail' : 'warn'}">${c.severity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p class="pass">No obstacle conflicts detected</p>'}

            <h4>All Obstacles</h4>
            <table class="sag-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Height</th>
                        <th>Radius</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${obstacles.map(o => `
                        <tr>
                            <td>${o.id}</td>
                            <td>${OBSTACLE_TYPES[o.type]?.icon || ''} ${OBSTACLE_TYPES[o.type]?.name || o.type}</td>
                            <td>(${o.x.toFixed(0)}, ${o.z.toFixed(0)})</td>
                            <td>${o.height}'</td>
                            <td>${o.radius}'</td>
                            <td>
                                <button class="btn btn-sm" onclick="window.editObstacle('${o.id}')">Edit</button>
                                <button class="btn btn-sm danger" onclick="window.deleteObstacle('${o.id}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function showObstaclesDialog() {
    const modal = document.getElementById('obstaclesModal');
    const content = document.getElementById('obstaclesContent');

    if (content) {
        content.innerHTML = `
            <div class="obstacles-dialog">
                <div class="obs-actions">
                    <h4>Add Obstacle</h4>
                    <div class="add-obs-form">
                        <select id="obsType" class="input">
                            ${Object.entries(OBSTACLE_TYPES).map(([k, v]) =>
                                `<option value="${k}">${v.icon} ${v.name}</option>`
                            ).join('')}
                        </select>
                        <input type="number" id="obsX" class="input" placeholder="X" value="0">
                        <input type="number" id="obsZ" class="input" placeholder="Z" value="0">
                        <input type="number" id="obsHeight" class="input" placeholder="Height (ft)">
                        <input type="text" id="obsName" class="input" placeholder="Name (optional)">
                        <button class="btn success" onclick="window.addNewObstacle()">Add</button>
                    </div>
                </div>

                <hr style="margin:1rem 0;border-color:#4b5563;">

                ${generateObstacleReport()}
            </div>
        `;
    }

    window.addNewObstacle = () => {
        const type = document.getElementById('obsType').value;
        const x = parseFloat(document.getElementById('obsX').value) || 0;
        const z = parseFloat(document.getElementById('obsZ').value) || 0;
        const height = parseFloat(document.getElementById('obsHeight').value);
        const name = document.getElementById('obsName').value;

        const options = {};
        if (height) options.height = height;
        if (name) options.name = name;

        addObstacle(type, x, z, options);
        showObstaclesDialog(); // Refresh
    };

    window.editObstacle = (id) => {
        const obs = getObstacle(id);
        if (!obs) return;

        const newHeight = prompt('New height (ft):', obs.height);
        if (newHeight !== null) {
            updateObstacle(id, { height: parseFloat(newHeight) || obs.height });
            showObstaclesDialog();
        }
    };

    window.deleteObstacle = (id) => {
        if (confirm('Delete this obstacle?')) {
            removeObstacle(id);
            showObstaclesDialog();
        }
    };

    if (modal) modal.style.display = 'flex';
}

export { OBSTACLE_TYPES, obstacles };
