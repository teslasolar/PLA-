// Version History - Project versioning with diff view
import { getState, setState } from './state.js';

const MAX_VERSIONS = 50;
const STORAGE_KEY = 'pla-versions';

let versions = [];
let currentVersionIndex = -1;

export function initVersionHistory() {
    // Load from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            versions = data.versions || [];
            currentVersionIndex = data.currentIndex ?? versions.length - 1;
        } catch (e) {
            console.error('Failed to load versions:', e);
        }
    }
}

export function saveVersion(name, description = '') {
    const state = getState();

    const version = {
        id: `v${Date.now()}`,
        name: name || `Version ${versions.length + 1}`,
        description,
        timestamp: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(state)), // Deep clone
        stats: {
            poles: state.poles?.length || 0,
            spans: state.spans?.length || 0
        }
    };

    // Trim old versions if needed
    if (versions.length >= MAX_VERSIONS) {
        versions = versions.slice(-MAX_VERSIONS + 1);
    }

    versions.push(version);
    currentVersionIndex = versions.length - 1;

    persistVersions();
    return version;
}

export function loadVersion(versionId) {
    const index = versions.findIndex(v => v.id === versionId);
    if (index === -1) return false;

    const version = versions[index];
    setState(JSON.parse(JSON.stringify(version.data)));
    currentVersionIndex = index;

    window.dispatchEvent(new CustomEvent('versionLoaded', { detail: version }));
    return true;
}

export function getVersions() {
    return versions.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        timestamp: v.timestamp,
        stats: v.stats,
        isCurrent: versions.indexOf(v) === currentVersionIndex
    }));
}

export function getCurrentVersion() {
    return versions[currentVersionIndex] || null;
}

export function deleteVersion(versionId) {
    const index = versions.findIndex(v => v.id === versionId);
    if (index === -1) return false;

    versions.splice(index, 1);

    if (currentVersionIndex >= versions.length) {
        currentVersionIndex = versions.length - 1;
    }

    persistVersions();
    return true;
}

export function renameVersion(versionId, newName) {
    const version = versions.find(v => v.id === versionId);
    if (!version) return false;

    version.name = newName;
    persistVersions();
    return true;
}

export function compareVersions(versionId1, versionId2) {
    const v1 = versions.find(v => v.id === versionId1);
    const v2 = versions.find(v => v.id === versionId2);

    if (!v1 || !v2) return null;

    const diff = {
        polesAdded: [],
        polesRemoved: [],
        polesModified: [],
        spansAdded: [],
        spansRemoved: [],
        spansModified: []
    };

    // Compare poles
    const poles1 = new Map(v1.data.poles?.map(p => [p.id, p]) || []);
    const poles2 = new Map(v2.data.poles?.map(p => [p.id, p]) || []);

    poles2.forEach((pole, id) => {
        if (!poles1.has(id)) {
            diff.polesAdded.push(pole);
        } else {
            const old = poles1.get(id);
            if (JSON.stringify(old) !== JSON.stringify(pole)) {
                diff.polesModified.push({ old, new: pole, changes: getObjectDiff(old, pole) });
            }
        }
    });

    poles1.forEach((pole, id) => {
        if (!poles2.has(id)) {
            diff.polesRemoved.push(pole);
        }
    });

    // Compare spans
    const spans1 = new Map(v1.data.spans?.map(s => [s.id, s]) || []);
    const spans2 = new Map(v2.data.spans?.map(s => [s.id, s]) || []);

    spans2.forEach((span, id) => {
        if (!spans1.has(id)) {
            diff.spansAdded.push(span);
        } else {
            const old = spans1.get(id);
            if (JSON.stringify(old) !== JSON.stringify(span)) {
                diff.spansModified.push({ old, new: span, changes: getObjectDiff(old, span) });
            }
        }
    });

    spans1.forEach((span, id) => {
        if (!spans2.has(id)) {
            diff.spansRemoved.push(span);
        }
    });

    return diff;
}

function getObjectDiff(obj1, obj2) {
    const changes = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    allKeys.forEach(key => {
        const val1 = JSON.stringify(obj1[key]);
        const val2 = JSON.stringify(obj2[key]);

        if (val1 !== val2) {
            changes.push({
                property: key,
                from: obj1[key],
                to: obj2[key]
            });
        }
    });

    return changes;
}

function persistVersions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            versions,
            currentIndex: currentVersionIndex
        }));
    } catch (e) {
        console.error('Failed to persist versions:', e);
        // Storage full - remove oldest versions
        versions = versions.slice(-10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            versions,
            currentIndex: currentVersionIndex
        }));
    }
}

export function generateDiffHTML(diff) {
    if (!diff) return '<div class="no-diff">No changes</div>';

    const count = diff.polesAdded.length + diff.polesRemoved.length + diff.polesModified.length +
                  diff.spansAdded.length + diff.spansRemoved.length + diff.spansModified.length;

    if (count === 0) return '<div class="no-diff">No changes between versions</div>';

    return `
        <div class="diff-view">
            <div class="diff-summary">
                <span class="added">+${diff.polesAdded.length + diff.spansAdded.length} added</span>
                <span class="removed">-${diff.polesRemoved.length + diff.spansRemoved.length} removed</span>
                <span class="modified">~${diff.polesModified.length + diff.spansModified.length} modified</span>
            </div>

            ${diff.polesAdded.length > 0 ? `
                <div class="diff-section">
                    <div class="diff-title added">Poles Added</div>
                    ${diff.polesAdded.map(p => `<div class="diff-item">+ ${p.id} (${p.class}-${p.height}')</div>`).join('')}
                </div>
            ` : ''}

            ${diff.polesRemoved.length > 0 ? `
                <div class="diff-section">
                    <div class="diff-title removed">Poles Removed</div>
                    ${diff.polesRemoved.map(p => `<div class="diff-item">- ${p.id}</div>`).join('')}
                </div>
            ` : ''}

            ${diff.polesModified.length > 0 ? `
                <div class="diff-section">
                    <div class="diff-title modified">Poles Modified</div>
                    ${diff.polesModified.map(m => `
                        <div class="diff-item">
                            <div>~ ${m.old.id}</div>
                            ${m.changes.map(c => `
                                <div class="diff-change">${c.property}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}</div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${diff.spansAdded.length > 0 ? `
                <div class="diff-section">
                    <div class="diff-title added">Spans Added</div>
                    ${diff.spansAdded.map(s => `<div class="diff-item">+ ${s.id} (${s.from} → ${s.to})</div>`).join('')}
                </div>
            ` : ''}

            ${diff.spansRemoved.length > 0 ? `
                <div class="diff-section">
                    <div class="diff-title removed">Spans Removed</div>
                    ${diff.spansRemoved.map(s => `<div class="diff-item">- ${s.id}</div>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

export function showVersionsDialog() {
    const modal = document.getElementById('versionsModal');
    const content = document.getElementById('versionsContent');

    if (content) {
        const versionList = getVersions();

        content.innerHTML = `
            <div class="versions-panel">
                <div class="versions-actions">
                    <button class="btn success" onclick="window.saveNewVersion()">Save Current Version</button>
                </div>
                <div class="versions-list">
                    ${versionList.length === 0 ? '<div class="no-versions">No saved versions</div>' : ''}
                    ${versionList.map(v => `
                        <div class="version-item ${v.isCurrent ? 'current' : ''}" data-id="${v.id}">
                            <div class="version-header">
                                <span class="version-name">${v.name}</span>
                                <span class="version-time">${new Date(v.timestamp).toLocaleString()}</span>
                            </div>
                            <div class="version-stats">
                                ${v.stats.poles} poles, ${v.stats.spans} spans
                            </div>
                            ${v.description ? `<div class="version-desc">${v.description}</div>` : ''}
                            <div class="version-actions">
                                <button class="btn btn-sm" onclick="window.loadVersionById('${v.id}')">Load</button>
                                <button class="btn btn-sm" onclick="window.compareWithCurrent('${v.id}')">Compare</button>
                                <button class="btn btn-sm" onclick="window.renameVersionDialog('${v.id}')">Rename</button>
                                <button class="btn btn-sm danger" onclick="window.deleteVersionConfirm('${v.id}')">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div id="diffView"></div>
            </div>
        `;
    }

    window.saveNewVersion = () => {
        const name = prompt('Version name:', `Version ${versions.length + 1}`);
        if (name) {
            const desc = prompt('Description (optional):', '');
            saveVersion(name, desc);
            showVersionsDialog();
        }
    };

    window.loadVersionById = (id) => {
        if (confirm('Load this version? Current unsaved changes will be lost.')) {
            loadVersion(id);
            closeModal('versionsModal');
        }
    };

    window.compareWithCurrent = (id) => {
        const current = getCurrentVersion();
        if (!current) {
            alert('Save current state first to compare');
            return;
        }
        const diff = compareVersions(id, current.id);
        document.getElementById('diffView').innerHTML = generateDiffHTML(diff);
    };

    window.renameVersionDialog = (id) => {
        const version = versions.find(v => v.id === id);
        const newName = prompt('New name:', version?.name);
        if (newName) {
            renameVersion(id, newName);
            showVersionsDialog();
        }
    };

    window.deleteVersionConfirm = (id) => {
        if (confirm('Delete this version?')) {
            deleteVersion(id);
            showVersionsDialog();
        }
    };

    if (modal) modal.style.display = 'flex';
}

// Auto-save version periodically
let autoSaveInterval = null;

export function startAutoSave(intervalMinutes = 30) {
    stopAutoSave();
    autoSaveInterval = setInterval(() => {
        saveVersion('Auto-save', `Automatic save at ${new Date().toLocaleTimeString()}`);
    }, intervalMinutes * 60 * 1000);
}

export function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// Initialize on load
initVersionHistory();
