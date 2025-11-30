// Staking Sheets - Standard utility staking sheet output
import { getState } from './state.js';
import { localToGeo, getOrigin } from './gis.js';

export function generateStakingSheet(poleId) {
    const state = getState();
    const pole = state.poles.find(p => p.id === poleId);
    if (!pole) return null;

    const geo = localToGeo(pole.x, pole.z);
    const connectedSpans = state.spans.filter(s => s.from === poleId || s.to === poleId);

    const sheet = {
        pole: {
            id: pole.id,
            class: pole.class || 4,
            height: pole.height || 40,
            species: pole.species || 'SP',
            embedment: pole.embedment || 6,
            treatment: pole.treatment || 'CCA'
        },
        location: {
            lat: geo.lat.toFixed(6),
            lng: geo.lng.toFixed(6),
            x: pole.x.toFixed(1),
            z: pole.z.toFixed(1),
            address: pole.address || '',
            station: pole.station || ''
        },
        construction: {
            type: getPoleType(pole, connectedSpans),
            framing: pole.framing || 'Standard',
            anchor: pole.anchor || 'N/A'
        },
        spans: connectedSpans.map(span => {
            const otherPoleId = span.from === poleId ? span.to : span.from;
            const otherPole = state.poles.find(p => p.id === otherPoleId);
            const length = otherPole ? Math.sqrt(
                (otherPole.x - pole.x) ** 2 + (otherPole.z - pole.z) ** 2
            ).toFixed(0) : 0;

            return {
                to: otherPoleId,
                length,
                conductor: span.conductor || '1/0 ACSR',
                phases: span.phases || 3
            };
        }),
        attachments: (pole.attachments || []).map(a => ({
            type: a.type,
            height: a.height,
            details: a.details || ''
        })),
        guys: (pole.guys || []).map(g => ({
            direction: g.direction,
            lead: g.leadLength || 20,
            attachHeight: g.attachHeight || 25,
            anchor: g.anchorType || 'Screw'
        })),
        notes: pole.notes || ''
    };

    return sheet;
}

function getPoleType(pole, spans) {
    if (spans.length === 1) return 'Deadend';
    if (spans.length > 2) return 'Junction';

    // Check for angle
    if (spans.length === 2 && pole.lineAngle && pole.lineAngle > 5) {
        if (pole.lineAngle > 60) return 'Large Angle';
        if (pole.lineAngle > 30) return 'Medium Angle';
        return 'Small Angle';
    }

    return 'Tangent';
}

export function generateStakingHTML(sheet) {
    if (!sheet) return '';

    return `
        <div class="staking-sheet">
            <div class="sheet-header">
                <h3>POLE STAKING SHEET</h3>
                <div class="project-info">
                    <span>Project: ${getState().name || 'Untitled'}</span>
                    <span>Date: ${new Date().toLocaleDateString()}</span>
                </div>
            </div>

            <div class="sheet-section">
                <div class="section-title">POLE IDENTIFICATION</div>
                <div class="sheet-grid">
                    <div class="field">
                        <label>Pole ID:</label>
                        <span class="value">${sheet.pole.id}</span>
                    </div>
                    <div class="field">
                        <label>Class:</label>
                        <span class="value">${sheet.pole.class}</span>
                    </div>
                    <div class="field">
                        <label>Height:</label>
                        <span class="value">${sheet.pole.height}'</span>
                    </div>
                    <div class="field">
                        <label>Species:</label>
                        <span class="value">${sheet.pole.species}</span>
                    </div>
                    <div class="field">
                        <label>Setting:</label>
                        <span class="value">${sheet.pole.embedment}' embed</span>
                    </div>
                    <div class="field">
                        <label>Treatment:</label>
                        <span class="value">${sheet.pole.treatment}</span>
                    </div>
                </div>
            </div>

            <div class="sheet-section">
                <div class="section-title">LOCATION</div>
                <div class="sheet-grid">
                    <div class="field">
                        <label>Latitude:</label>
                        <span class="value">${sheet.location.lat}</span>
                    </div>
                    <div class="field">
                        <label>Longitude:</label>
                        <span class="value">${sheet.location.lng}</span>
                    </div>
                    <div class="field wide">
                        <label>Address:</label>
                        <span class="value">${sheet.location.address || '_______________'}</span>
                    </div>
                    <div class="field">
                        <label>Station:</label>
                        <span class="value">${sheet.location.station || '_______________'}</span>
                    </div>
                </div>
            </div>

            <div class="sheet-section">
                <div class="section-title">CONSTRUCTION</div>
                <div class="sheet-grid">
                    <div class="field">
                        <label>Pole Type:</label>
                        <span class="value">${sheet.construction.type}</span>
                    </div>
                    <div class="field">
                        <label>Framing:</label>
                        <span class="value">${sheet.construction.framing}</span>
                    </div>
                </div>
            </div>

            <div class="sheet-section">
                <div class="section-title">SPANS</div>
                <table class="sheet-table">
                    <thead>
                        <tr>
                            <th>To Pole</th>
                            <th>Length</th>
                            <th>Conductor</th>
                            <th>Phases</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sheet.spans.map(s => `
                            <tr>
                                <td>${s.to}</td>
                                <td>${s.length}'</td>
                                <td>${s.conductor}</td>
                                <td>${s.phases}φ</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${sheet.guys.length > 0 ? `
                <div class="sheet-section">
                    <div class="section-title">GUYING</div>
                    <table class="sheet-table">
                        <thead>
                            <tr>
                                <th>Direction</th>
                                <th>Lead</th>
                                <th>Attach Ht</th>
                                <th>Anchor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sheet.guys.map(g => `
                                <tr>
                                    <td>${g.direction}°</td>
                                    <td>${g.lead}'</td>
                                    <td>${g.attachHeight}'</td>
                                    <td>${g.anchor}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${sheet.attachments.length > 0 ? `
                <div class="sheet-section">
                    <div class="section-title">ATTACHMENTS</div>
                    <table class="sheet-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Height</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sheet.attachments.map(a => `
                                <tr>
                                    <td>${a.type}</td>
                                    <td>${a.height}'</td>
                                    <td>${a.details}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            <div class="sheet-section">
                <div class="section-title">NOTES</div>
                <div class="notes-area">${sheet.notes || '_______________________________________________'}</div>
            </div>

            <div class="sheet-footer">
                <div class="signature">
                    <label>Surveyor:</label>
                    <span class="line">_____________________</span>
                </div>
                <div class="signature">
                    <label>Date:</label>
                    <span class="line">_______________</span>
                </div>
            </div>
        </div>
    `;
}

export function generateAllStakingSheets() {
    const state = getState();
    const sheets = (state.poles || []).map(p => generateStakingSheet(p.id));

    return sheets.map(s => generateStakingHTML(s)).join('<div class="page-break"></div>');
}

export function printStakingSheet(poleId) {
    const sheet = generateStakingSheet(poleId);
    const html = generateStakingHTML(sheet);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Staking Sheet - ${poleId}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                .staking-sheet { max-width: 8in; margin: 0 auto; }
                .sheet-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                .sheet-header h3 { margin: 0; }
                .project-info { display: flex; justify-content: space-between; margin-top: 5px; }
                .sheet-section { margin-bottom: 15px; }
                .section-title { background: #333; color: #fff; padding: 4px 8px; font-weight: bold; }
                .sheet-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8px; border: 1px solid #ccc; }
                .field { display: flex; gap: 5px; }
                .field label { font-weight: bold; min-width: 70px; }
                .field.wide { grid-column: span 2; }
                .sheet-table { width: 100%; border-collapse: collapse; }
                .sheet-table th, .sheet-table td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
                .sheet-table th { background: #eee; }
                .notes-area { border: 1px solid #ccc; min-height: 50px; padding: 8px; }
                .sheet-footer { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; }
                .signature .line { border-bottom: 1px solid #000; min-width: 150px; display: inline-block; }
                .page-break { page-break-after: always; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>${html}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

export function showStakingDialog(poleId) {
    const modal = document.getElementById('stakingModal');
    const content = document.getElementById('stakingContent');

    if (content) {
        if (poleId) {
            const sheet = generateStakingSheet(poleId);
            content.innerHTML = `
                <div class="staking-actions">
                    <button class="btn" onclick="window.printStakingSheet('${poleId}')">Print</button>
                </div>
                ${generateStakingHTML(sheet)}
            `;
        } else {
            content.innerHTML = `
                <div class="staking-actions">
                    <button class="btn" onclick="window.printAllStaking()">Print All</button>
                </div>
                <p>Select a pole to view its staking sheet, or print all.</p>
            `;
        }
    }

    window.printStakingSheet = printStakingSheet;
    window.printAllStaking = () => {
        const html = generateAllStakingSheets();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Staking Sheets</title>
            <style>/* Same styles as above */</style>
            </head><body>${html}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    if (modal) modal.style.display = 'flex';
}
