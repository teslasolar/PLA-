/**
 * PLA Designer - PDF Report Generation
 * Uses browser print functionality for PDF export
 */
import { state } from './state.js';
import { runAnalysis } from './analysis.js';

// Generate printable HTML report
export function generateReportHTML(options = {}) {
    const {
        title = 'PLA Structural Analysis Report',
        projectName = 'Untitled Project',
        engineer = '',
        date = new Date().toLocaleDateString(),
        grade = 'C',
        includeMap = false
    } = options;

    const analysis = runAnalysis(grade);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        @page { size: letter; margin: 0.75in; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; }
        .header { background: #1e3a5f; color: #fff; padding: 1rem; margin-bottom: 1rem; }
        .header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
        .header .subtitle { font-size: 0.9rem; opacity: 0.8; }
        .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 4px; }
        .meta-item { }
        .meta-label { font-size: 0.75rem; color: #666; text-transform: uppercase; }
        .meta-value { font-weight: 600; }
        h2 { color: #1e3a5f; font-size: 1.1rem; margin: 1.5rem 0 0.75rem; padding-bottom: 0.25rem; border-bottom: 2px solid #1e3a5f; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
        .summary-card { background: #f8f9fa; padding: 1rem; border-radius: 4px; text-align: center; border-left: 4px solid #2563eb; }
        .summary-card.pass { border-color: #10b981; }
        .summary-card.fail { border-color: #ef4444; }
        .summary-value { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; }
        .summary-label { font-size: 0.8rem; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
        th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: 600; color: #1e3a5f; }
        tr:hover { background: #fafafa; }
        .status { padding: 0.2rem 0.5rem; border-radius: 3px; font-weight: 600; font-size: 0.8rem; }
        .status.pass { background: #d1fae5; color: #059669; }
        .status.fail { background: #fee2e2; color: #dc2626; }
        .recommendation { color: #d97706; font-size: 0.85rem; font-style: italic; }
        .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.8rem; color: #666; display: flex; justify-content: space-between; }
        .print-btn { position: fixed; top: 1rem; right: 1rem; background: #2563eb; color: #fff; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        .print-btn:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>

    <div class="header">
        <h1>🔌 ${title}</h1>
        <div class="subtitle">Structural Analysis per NESC Grade ${grade}</div>
    </div>

    <div class="meta">
        <div class="meta-item">
            <div class="meta-label">Project</div>
            <div class="meta-value">${projectName}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Date</div>
            <div class="meta-value">${date}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Engineer</div>
            <div class="meta-value">${engineer || '—'}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Grade</div>
            <div class="meta-value">NESC Grade ${grade}</div>
        </div>
    </div>

    <h2>Summary</h2>
    <div class="summary-grid">
        <div class="summary-card">
            <div class="summary-value">${analysis.summary.totalPoles}</div>
            <div class="summary-label">Total Poles</div>
        </div>
        <div class="summary-card">
            <div class="summary-value">${analysis.summary.totalLength} ft</div>
            <div class="summary-label">Total Line Length</div>
        </div>
        <div class="summary-card ${analysis.summary.status === 'PASS' ? 'pass' : 'fail'}">
            <div class="summary-value">${analysis.summary.status}</div>
            <div class="summary-label">Overall Status</div>
        </div>
    </div>
    <div class="summary-grid">
        <div class="summary-card">
            <div class="summary-value">${analysis.summary.totalSpans}</div>
            <div class="summary-label">Total Spans</div>
        </div>
        <div class="summary-card ${parseFloat(analysis.summary.maxUtil) <= 100 ? 'pass' : 'fail'}">
            <div class="summary-value">${analysis.summary.maxUtil}%</div>
            <div class="summary-label">Max Utilization</div>
        </div>
        <div class="summary-card ${analysis.summary.failing === 0 ? 'pass' : 'fail'}">
            <div class="summary-value">${analysis.summary.failing}</div>
            <div class="summary-label">Failing Poles</div>
        </div>
    </div>

    <h2>Pole Analysis</h2>
    <table>
        <thead>
            <tr>
                <th>Pole ID</th>
                <th>Class</th>
                <th>Height</th>
                <th>Material</th>
                <th>Moment (lb-ft)</th>
                <th>Capacity (lb-ft)</th>
                <th>Utilization</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${analysis.poles.map(p => `
                <tr>
                    <td><strong>${p.id}</strong></td>
                    <td>${p.poleClass}</td>
                    <td>${p.height} ft</td>
                    <td>${state.poles.find(x => x.id === p.id)?.material || 'wood'}</td>
                    <td>${p.moment}</td>
                    <td>${p.capacity}</td>
                    <td>${p.utilization}%</td>
                    <td><span class="status ${p.status.toLowerCase()}">${p.status}</span></td>
                </tr>
                ${p.rec ? `<tr><td colspan="8" class="recommendation">⚠️ ${p.rec}</td></tr>` : ''}
            `).join('')}
        </tbody>
    </table>

    <h2>Span Analysis</h2>
    <table>
        <thead>
            <tr>
                <th>Span ID</th>
                <th>From</th>
                <th>To</th>
                <th>Length (ft)</th>
                <th>Phases</th>
                <th>Conductor</th>
                <th>Sag (m)</th>
            </tr>
        </thead>
        <tbody>
            ${analysis.spans.map(s => `
                <tr>
                    <td><strong>${s.id}</strong></td>
                    <td>${s.pole1}</td>
                    <td>${s.pole2}</td>
                    <td>${s.length}</td>
                    <td>${s.phases}φ</td>
                    <td>${s.conductor}</td>
                    <td>${s.sag}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${analysis.guys.length > 0 ? `
    <h2>Guy Wires</h2>
    <table>
        <thead>
            <tr>
                <th>Guy ID</th>
                <th>Pole</th>
                <th>Size</th>
                <th>Strength (lb)</th>
            </tr>
        </thead>
        <tbody>
            ${analysis.guys.map(g => `
                <tr>
                    <td><strong>${g.id}</strong></td>
                    <td>${g.poleId}</td>
                    <td>${g.size}"</td>
                    <td>${g.strength}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}

    <div class="footer">
        <div>Generated by PLA - Pole Line Analysis System</div>
        <div>${new Date().toLocaleString()}</div>
    </div>
</body>
</html>`;
}

// Open print dialog with report
export function generatePDF(options = {}) {
    const html = generateReportHTML(options);

    // Open in new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(html);
    printWindow.document.close();

    // Auto-trigger print dialog
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    };

    return printWindow;
}

// Download as HTML file
export function downloadHTML(options = {}) {
    const html = generateReportHTML(options);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pla-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

// Show report preview modal
export function showReportPreview(options = {}) {
    const modal = document.getElementById('reportModal');
    const preview = document.getElementById('reportPreview');

    if (modal && preview) {
        preview.srcdoc = generateReportHTML(options);
        modal.style.display = 'flex';
    }
}

export default { generateReportHTML, generatePDF, downloadHTML, showReportPreview };
