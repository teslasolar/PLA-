// Dashboard Analytics - Project overview and statistics
import { getState } from './state.js';
import { analyzeSpans } from './ruling-span.js';
import { calculateOverallProgress } from './progress.js';
import { getInspectionSummary } from './inspection.js';
import { analyzeAllObstacles } from './obstacles.js';

export function getDashboardData() {
    const state = getState();
    const poles = state.poles || [];
    const spans = state.spans || [];
    const attachments = state.attachments || [];

    // Calculate totals
    let totalLineLength = 0;
    let maxSpan = 0;
    let minSpan = Infinity;

    spans.forEach(span => {
        const p1 = poles.find(p => p.id === span.pole1 || p.id === span.from);
        const p2 = poles.find(p => p.id === span.pole2 || p.id === span.to);
        if (p1 && p2) {
            const dx = (p2.x || 0) - (p1.x || 0);
            const dz = (p2.z || 0) - (p1.z || 0);
            const length = Math.sqrt(dx * dx + dz * dz);
            totalLineLength += length;
            maxSpan = Math.max(maxSpan, length);
            minSpan = Math.min(minSpan, length);
        }
    });

    // Pole height statistics
    const heights = poles.map(p => p.height || 40);
    const avgHeight = heights.length > 0
        ? heights.reduce((a, b) => a + b, 0) / heights.length
        : 0;

    // Attachment counts
    const attachmentCounts = {};
    poles.forEach(pole => {
        (pole.attachments || []).forEach(att => {
            attachmentCounts[att.type] = (attachmentCounts[att.type] || 0) + 1;
        });
    });

    // Get analysis data
    let rulingSpanData = { statistics: { rulingSpan: 'N/A' }, warnings: [] };
    let progressData = { overall: 0, poles: { percent: 0 }, spans: { percent: 0 } };
    let inspectionData = { inspected: 0, totalPoles: poles.length };
    let obstacleData = { totalObstacles: 0, criticalConflicts: 0 };

    try { rulingSpanData = analyzeSpans(); } catch(e) {}
    try { progressData = calculateOverallProgress(); } catch(e) {}
    try { inspectionData = getInspectionSummary(); } catch(e) {}
    try { obstacleData = analyzeAllObstacles(); } catch(e) {}

    return {
        summary: {
            totalPoles: poles.length,
            totalSpans: spans.length,
            totalLineLength: totalLineLength.toFixed(0),
            lineLengthMiles: (totalLineLength / 5280).toFixed(2),
            avgSpan: spans.length > 0 ? (totalLineLength / spans.length).toFixed(0) : 0,
            maxSpan: maxSpan === 0 ? 'N/A' : maxSpan.toFixed(0),
            minSpan: minSpan === Infinity ? 'N/A' : minSpan.toFixed(0),
            avgPoleHeight: avgHeight.toFixed(1)
        },
        attachments: attachmentCounts,
        rulingSpan: rulingSpanData.statistics?.rulingSpan || 'N/A',
        rulingSpanWarnings: rulingSpanData.warnings || [],
        progress: progressData,
        inspections: inspectionData,
        obstacles: obstacleData
    };
}

export function generateDashboard() {
    const data = getDashboardData();

    return `
        <div class="dashboard">
            <div class="dash-section hero">
                <h3>Project Overview</h3>
                <div class="dash-grid">
                    <div class="dash-card primary">
                        <span class="dash-val">${data.summary.totalPoles}</span>
                        <span class="dash-label">Poles</span>
                    </div>
                    <div class="dash-card">
                        <span class="dash-val">${data.summary.totalSpans}</span>
                        <span class="dash-label">Spans</span>
                    </div>
                    <div class="dash-card">
                        <span class="dash-val">${data.summary.lineLengthMiles} mi</span>
                        <span class="dash-label">Total Length</span>
                    </div>
                    <div class="dash-card">
                        <span class="dash-val">${data.summary.avgSpan}'</span>
                        <span class="dash-label">Avg Span</span>
                    </div>
                </div>
            </div>

            <div class="dash-row">
                <div class="dash-section">
                    <h4>Span Statistics</h4>
                    <div class="dash-stats">
                        <div class="stat-item">
                            <span class="stat-name">Ruling Span</span>
                            <span class="stat-value">${data.rulingSpan}'</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-name">Min Span</span>
                            <span class="stat-value">${data.summary.minSpan}'</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-name">Max Span</span>
                            <span class="stat-value">${data.summary.maxSpan}'</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-name">Avg Height</span>
                            <span class="stat-value">${data.summary.avgPoleHeight}'</span>
                        </div>
                    </div>
                </div>

                <div class="dash-section">
                    <h4>Construction Progress</h4>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width:${data.progress.overall}%"></div>
                        <span class="progress-text">${data.progress.overall}%</span>
                    </div>
                    <div class="progress-details">
                        <span>Poles: ${data.progress.poles?.percent || 0}%</span>
                        <span>Spans: ${data.progress.spans?.percent || 0}%</span>
                    </div>
                </div>
            </div>

            <div class="dash-row">
                <div class="dash-section">
                    <h4>Equipment Summary</h4>
                    <div class="equipment-list">
                        ${Object.entries(data.attachments).length > 0
                            ? Object.entries(data.attachments).map(([type, count]) => `
                                <div class="equip-item">
                                    <span class="equip-type">${type}</span>
                                    <span class="equip-count">${count}</span>
                                </div>
                            `).join('')
                            : '<p class="muted">No equipment attached</p>'
                        }
                    </div>
                </div>

                <div class="dash-section">
                    <h4>Inspections</h4>
                    <div class="inspection-stats">
                        <div class="insp-stat">
                            <span class="insp-val">${data.inspections.inspected}</span>
                            <span class="insp-label">Inspected</span>
                        </div>
                        <div class="insp-stat">
                            <span class="insp-val">${data.inspections.totalPoles - data.inspections.inspected}</span>
                            <span class="insp-label">Pending</span>
                        </div>
                    </div>
                </div>

                <div class="dash-section">
                    <h4>Obstacles</h4>
                    <div class="obstacle-stats">
                        <div class="obs-stat">
                            <span class="obs-val">${data.obstacles.totalObstacles}</span>
                            <span class="obs-label">Total</span>
                        </div>
                        <div class="obs-stat ${data.obstacles.criticalConflicts > 0 ? 'danger' : ''}">
                            <span class="obs-val">${data.obstacles.criticalConflicts}</span>
                            <span class="obs-label">Conflicts</span>
                        </div>
                    </div>
                </div>
            </div>

            ${data.rulingSpanWarnings.length > 0 ? `
                <div class="dash-section warnings">
                    <h4>Warnings</h4>
                    ${data.rulingSpanWarnings.map(w => `
                        <div class="warning-item">⚠️ ${w}</div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="dash-section actions">
                <h4>Quick Actions</h4>
                <div class="action-buttons">
                    <button class="btn" onclick="window.showVoltageDropCalculator?.()">Voltage Drop</button>
                    <button class="btn" onclick="window.showRulingSpanDialog?.()">Ruling Span</button>
                    <button class="btn" onclick="window.showFaultAnalysisDialog?.()">Fault Analysis</button>
                    <button class="btn" onclick="window.showProgressDialog?.()">Progress</button>
                    <button class="btn" onclick="window.showInspectionDialog?.()">Inspections</button>
                    <button class="btn" onclick="window.showObstaclesDialog?.()">Obstacles</button>
                </div>
            </div>
        </div>
    `;
}

export function showDashboard() {
    const modal = document.getElementById('dashboardModal');
    const content = document.getElementById('dashboardContent');

    if (content) {
        content.innerHTML = generateDashboard();
    }

    if (modal) modal.style.display = 'flex';
}

// Auto-refresh dashboard when data changes
export function initDashboard() {
    window.addEventListener('stateChanged', () => {
        const content = document.getElementById('dashboardContent');
        if (content && document.getElementById('dashboardModal')?.style.display === 'flex') {
            content.innerHTML = generateDashboard();
        }
    });
}

export { getDashboardData as getData };
