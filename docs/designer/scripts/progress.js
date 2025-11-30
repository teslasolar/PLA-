// Construction Progress Tracking - Track installation status
import { getState, setState } from './state.js';

// Progress stages for different components
const PROGRESS_STAGES = {
    pole: [
        { id: 'staked', name: 'Staked', icon: '📍' },
        { id: 'hole_dug', name: 'Hole Dug', icon: '🕳️' },
        { id: 'pole_set', name: 'Pole Set', icon: '🪵' },
        { id: 'backfilled', name: 'Backfilled', icon: '🏗️' },
        { id: 'hardware', name: 'Hardware Installed', icon: '🔧' },
        { id: 'grounding', name: 'Grounding Complete', icon: '⚡' },
        { id: 'complete', name: 'Complete', icon: '✅' }
    ],
    span: [
        { id: 'planned', name: 'Planned', icon: '📋' },
        { id: 'strung', name: 'Conductor Strung', icon: '〰️' },
        { id: 'sagged', name: 'Sagged to Spec', icon: '📐' },
        { id: 'tied', name: 'Tied In', icon: '🔗' },
        { id: 'complete', name: 'Complete', icon: '✅' }
    ],
    transformer: [
        { id: 'ordered', name: 'Ordered', icon: '📦' },
        { id: 'delivered', name: 'Delivered', icon: '🚚' },
        { id: 'installed', name: 'Installed', icon: '🔧' },
        { id: 'connected', name: 'Connected', icon: '🔌' },
        { id: 'energized', name: 'Energized', icon: '⚡' },
        { id: 'complete', name: 'Complete', icon: '✅' }
    ],
    service: [
        { id: 'requested', name: 'Requested', icon: '📝' },
        { id: 'designed', name: 'Designed', icon: '📐' },
        { id: 'materials', name: 'Materials Ready', icon: '📦' },
        { id: 'installed', name: 'Installed', icon: '🔧' },
        { id: 'inspected', name: 'Inspected', icon: '🔍' },
        { id: 'energized', name: 'Energized', icon: '⚡' }
    ]
};

let progressData = {};

export function initProgress() {
    progressData = getState().progress || {};
}

export function setProgress(itemType, itemId, stageId, notes = '') {
    if (!progressData[itemType]) {
        progressData[itemType] = {};
    }

    const stages = PROGRESS_STAGES[itemType];
    if (!stages) return null;

    const stageIndex = stages.findIndex(s => s.id === stageId);
    if (stageIndex < 0) return null;

    progressData[itemType][itemId] = {
        currentStage: stageId,
        stageIndex,
        notes,
        history: [
            ...(progressData[itemType][itemId]?.history || []),
            { stage: stageId, timestamp: new Date().toISOString(), notes }
        ]
    };

    updateState();
    window.dispatchEvent(new CustomEvent('progressUpdated', {
        detail: { itemType, itemId, stage: stageId }
    }));

    return progressData[itemType][itemId];
}

export function getProgress(itemType, itemId) {
    return progressData[itemType]?.[itemId] || null;
}

export function getStageInfo(itemType, stageId) {
    const stages = PROGRESS_STAGES[itemType];
    return stages?.find(s => s.id === stageId) || null;
}

function updateState() {
    const state = getState();
    setState({ ...state, progress: progressData });
}

export function calculateOverallProgress() {
    const state = getState();
    const poles = state.poles || [];
    const spans = state.spans || [];

    const poleStages = PROGRESS_STAGES.pole;
    const spanStages = PROGRESS_STAGES.span;

    let poleProgress = 0;
    let spanProgress = 0;

    poles.forEach(pole => {
        const prog = getProgress('pole', pole.id);
        if (prog) {
            poleProgress += (prog.stageIndex + 1) / poleStages.length;
        }
    });

    spans.forEach(span => {
        const prog = getProgress('span', span.id);
        if (prog) {
            spanProgress += (prog.stageIndex + 1) / spanStages.length;
        }
    });

    const polePercent = poles.length > 0 ? (poleProgress / poles.length * 100) : 0;
    const spanPercent = spans.length > 0 ? (spanProgress / spans.length * 100) : 0;
    const overallPercent = (polePercent + spanPercent) / 2;

    return {
        poles: {
            total: poles.length,
            progress: poleProgress.toFixed(1),
            percent: polePercent.toFixed(0)
        },
        spans: {
            total: spans.length,
            progress: spanProgress.toFixed(1),
            percent: spanPercent.toFixed(0)
        },
        overall: overallPercent.toFixed(0)
    };
}

export function getProgressByStage(itemType) {
    const state = getState();
    const items = itemType === 'pole' ? state.poles : state.spans;
    const stages = PROGRESS_STAGES[itemType];

    const byStage = {};
    stages.forEach(s => { byStage[s.id] = { ...s, count: 0, items: [] }; });
    byStage['not_started'] = { id: 'not_started', name: 'Not Started', icon: '⏳', count: 0, items: [] };

    (items || []).forEach(item => {
        const prog = getProgress(itemType, item.id);
        if (prog) {
            byStage[prog.currentStage].count++;
            byStage[prog.currentStage].items.push(item.id);
        } else {
            byStage['not_started'].count++;
            byStage['not_started'].items.push(item.id);
        }
    });

    return byStage;
}

export function generateProgressReport() {
    const overall = calculateOverallProgress();
    const polesByStage = getProgressByStage('pole');
    const spansByStage = getProgressByStage('span');

    return `
        <div class="progress-report">
            <div class="progress-overview">
                <div class="overall-progress">
                    <div class="progress-circle" style="--percent:${overall.overall}">
                        <span class="progress-val">${overall.overall}%</span>
                    </div>
                    <span class="progress-label">Overall Complete</span>
                </div>
                <div class="progress-stats">
                    <div class="stat">
                        <span class="stat-val">${overall.poles.percent}%</span>
                        <span class="stat-label">Poles (${overall.poles.total})</span>
                    </div>
                    <div class="stat">
                        <span class="stat-val">${overall.spans.percent}%</span>
                        <span class="stat-label">Spans (${overall.spans.total})</span>
                    </div>
                </div>
            </div>

            <h4>Pole Progress</h4>
            <div class="stage-breakdown">
                ${Object.values(polesByStage).map(s => `
                    <div class="stage-row ${s.count > 0 ? 'active' : ''}">
                        <span class="stage-icon">${s.icon}</span>
                        <span class="stage-name">${s.name}</span>
                        <span class="stage-count">${s.count}</span>
                    </div>
                `).join('')}
            </div>

            <h4>Span Progress</h4>
            <div class="stage-breakdown">
                ${Object.values(spansByStage).map(s => `
                    <div class="stage-row ${s.count > 0 ? 'active' : ''}">
                        <span class="stage-icon">${s.icon}</span>
                        <span class="stage-name">${s.name}</span>
                        <span class="stage-count">${s.count}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

export function showProgressDialog() {
    const modal = document.getElementById('progressModal');
    const content = document.getElementById('progressContent');

    if (content) {
        const state = getState();
        const poles = state.poles || [];
        const spans = state.spans || [];

        content.innerHTML = `
            <div class="progress-dialog">
                ${generateProgressReport()}

                <hr style="margin:1rem 0;border-color:#4b5563;">

                <h4>Update Progress</h4>
                <div class="progress-update-form">
                    <div class="form-row">
                        <label>Item Type:</label>
                        <select id="progType" class="input" onchange="window.updateProgItems()">
                            <option value="pole">Pole</option>
                            <option value="span">Span</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Item:</label>
                        <select id="progItem" class="input">
                            ${poles.map(p => `<option value="${p.id}">${p.id}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Stage:</label>
                        <select id="progStage" class="input">
                            ${PROGRESS_STAGES.pole.map(s =>
                                `<option value="${s.id}">${s.icon} ${s.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Notes:</label>
                        <input type="text" id="progNotes" class="input" placeholder="Optional notes">
                    </div>
                    <button class="btn success" onclick="window.updateProgress()">Update</button>
                </div>

                <h4 style="margin-top:1rem;">Progress Table</h4>
                <table class="sag-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Type</th>
                            <th>Current Stage</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${poles.map(p => {
                            const prog = getProgress('pole', p.id);
                            const stage = prog ? getStageInfo('pole', prog.currentStage) : null;
                            const lastUpdate = prog?.history?.slice(-1)[0]?.timestamp;
                            return `
                                <tr>
                                    <td>${p.id}</td>
                                    <td>Pole</td>
                                    <td>${stage ? `${stage.icon} ${stage.name}` : 'Not Started'}</td>
                                    <td>${lastUpdate ? new Date(lastUpdate).toLocaleDateString() : '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                        ${spans.map(s => {
                            const prog = getProgress('span', s.id);
                            const stage = prog ? getStageInfo('span', prog.currentStage) : null;
                            const lastUpdate = prog?.history?.slice(-1)[0]?.timestamp;
                            return `
                                <tr>
                                    <td>${s.id}</td>
                                    <td>Span</td>
                                    <td>${stage ? `${stage.icon} ${stage.name}` : 'Not Started'}</td>
                                    <td>${lastUpdate ? new Date(lastUpdate).toLocaleDateString() : '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        window.updateProgItems = () => {
            const type = document.getElementById('progType').value;
            const items = type === 'pole' ? poles : spans;
            const stages = PROGRESS_STAGES[type];

            document.getElementById('progItem').innerHTML =
                items.map(i => `<option value="${i.id}">${i.id}</option>`).join('');
            document.getElementById('progStage').innerHTML =
                stages.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
        };

        window.updateProgress = () => {
            const type = document.getElementById('progType').value;
            const itemId = document.getElementById('progItem').value;
            const stageId = document.getElementById('progStage').value;
            const notes = document.getElementById('progNotes').value;

            setProgress(type, itemId, stageId, notes);
            showProgressDialog(); // Refresh
        };
    }

    if (modal) modal.style.display = 'flex';
}

export { PROGRESS_STAGES, progressData };
