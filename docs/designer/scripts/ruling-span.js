// Ruling Span Calculator - Auto-calculate ruling span from pole layout
import { getState } from './state.js';

/**
 * Ruling span is used for sag-tension calculations when spans have different lengths.
 * It represents an equivalent span that will produce the same tension as the actual spans
 * under the same loading conditions.
 *
 * Formula: RS = sqrt(sum(L^3) / sum(L))
 * where L is the length of each span
 */

export function calculateRulingSpan(spanLengths) {
    if (!spanLengths || spanLengths.length === 0) return 0;

    const sumCubed = spanLengths.reduce((sum, L) => sum + Math.pow(L, 3), 0);
    const sumLinear = spanLengths.reduce((sum, L) => sum + L, 0);

    if (sumLinear === 0) return 0;

    return Math.sqrt(sumCubed / sumLinear);
}

export function analyzeSpans() {
    const state = getState();
    const poles = state.poles || [];
    const spans = state.spans || [];

    const spanData = [];
    let totalLength = 0;

    spans.forEach(span => {
        const p1 = poles.find(p => p.id === span.pole1 || p.id === span.from);
        const p2 = poles.find(p => p.id === span.pole2 || p.id === span.to);

        if (!p1 || !p2) return;

        const dx = (p2.x || 0) - (p1.x || 0);
        const dz = (p2.z || 0) - (p1.z || 0);
        const length = Math.sqrt(dx * dx + dz * dz);

        totalLength += length;

        // Calculate level difference
        const h1 = p1.height || 40;
        const h2 = p2.height || 40;
        const levelDiff = Math.abs(h1 - h2);

        // Effective span for inclined spans
        const grade = levelDiff / length;
        const effectiveSpan = length * Math.sqrt(1 + grade * grade);

        spanData.push({
            id: span.id,
            from: p1.id,
            to: p2.id,
            length: length.toFixed(1),
            lengthNum: length,
            lengthCubed: Math.pow(length, 3).toFixed(0),
            levelDiff: levelDiff.toFixed(1),
            effectiveSpan: effectiveSpan.toFixed(1),
            conductor: span.conductor || 'Unknown'
        });
    });

    const rulingSpan = calculateRulingSpan(spanData.map(s => s.lengthNum));
    const avgSpan = totalLength / Math.max(spanData.length, 1);
    const minSpan = Math.min(...spanData.map(s => s.lengthNum));
    const maxSpan = Math.max(...spanData.map(s => s.lengthNum));

    // Check ruling span validity
    // Generally, ruling span should be between avg and max span
    let warnings = [];

    if (maxSpan > rulingSpan * 1.5) {
        warnings.push('Longest span exceeds 1.5x ruling span. Consider breaking into sections.');
    }

    if (minSpan < rulingSpan * 0.5) {
        warnings.push('Shortest span is less than 0.5x ruling span. May cause tension issues.');
    }

    const spanVariation = ((maxSpan - minSpan) / avgSpan) * 100;
    if (spanVariation > 50) {
        warnings.push('High span variation (>50%). Consider separating into multiple ruling span sections.');
    }

    return {
        spans: spanData,
        statistics: {
            count: spanData.length,
            totalLength: totalLength.toFixed(0),
            avgSpan: avgSpan.toFixed(1),
            minSpan: minSpan.toFixed(1),
            maxSpan: maxSpan.toFixed(1),
            rulingSpan: rulingSpan.toFixed(1),
            spanVariation: spanVariation.toFixed(1)
        },
        warnings
    };
}

export function generateRulingSpanReport(analysis) {
    if (!analysis) analysis = analyzeSpans();

    return `
        <div class="ruling-span-report">
            <div class="rs-summary">
                <div class="stat primary">
                    <span class="stat-val">${analysis.statistics.rulingSpan}'</span>
                    <span class="stat-label">Ruling Span</span>
                </div>
                <div class="stat">
                    <span class="stat-val">${analysis.statistics.avgSpan}'</span>
                    <span class="stat-label">Average Span</span>
                </div>
                <div class="stat">
                    <span class="stat-val">${analysis.statistics.minSpan}' - ${analysis.statistics.maxSpan}'</span>
                    <span class="stat-label">Span Range</span>
                </div>
                <div class="stat">
                    <span class="stat-val">${analysis.statistics.totalLength}'</span>
                    <span class="stat-label">Total Length</span>
                </div>
            </div>

            ${analysis.warnings.length > 0 ? `
                <div class="rs-warnings">
                    ${analysis.warnings.map(w => `<div class="warning">⚠️ ${w}</div>`).join('')}
                </div>
            ` : ''}

            <h4>Span Details</h4>
            <table class="sag-table">
                <thead>
                    <tr>
                        <th>Span</th>
                        <th>Length</th>
                        <th>L³</th>
                        <th>Level Diff</th>
                        <th>Effective</th>
                        <th>% of RS</th>
                    </tr>
                </thead>
                <tbody>
                    ${analysis.spans.map(s => {
                        const pctOfRS = (s.lengthNum / analysis.statistics.rulingSpan * 100).toFixed(0);
                        const pctClass = pctOfRS > 150 ? 'fail' : pctOfRS < 50 ? 'warn' : 'pass';
                        return `
                            <tr>
                                <td>${s.from} → ${s.to}</td>
                                <td>${s.length}'</td>
                                <td>${s.lengthCubed}</td>
                                <td>${s.levelDiff}'</td>
                                <td>${s.effectiveSpan}'</td>
                                <td class="${pctClass}">${pctOfRS}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="rs-formula">
                <strong>Ruling Span Formula:</strong>
                <code>RS = √(ΣL³ / ΣL) = √(${analysis.spans.reduce((s, sp) => s + Math.pow(sp.lengthNum, 3), 0).toFixed(0)} / ${analysis.statistics.totalLength}) = ${analysis.statistics.rulingSpan}'</code>
            </div>
        </div>
    `;
}

export function showRulingSpanDialog() {
    const modal = document.getElementById('rulingSpanModal');
    const content = document.getElementById('rulingSpanContent');

    if (content) {
        const analysis = analyzeSpans();
        content.innerHTML = `
            <div class="rs-dialog">
                ${generateRulingSpanReport(analysis)}

                <hr style="margin:1rem 0;border-color:#4b5563;">

                <h4>Manual Calculator</h4>
                <div class="manual-calc">
                    <div class="form-row">
                        <label>Span Lengths (comma separated):</label>
                        <input type="text" id="manualSpans" class="input" placeholder="250, 300, 275, 350" style="width:100%;">
                    </div>
                    <button class="btn success" onclick="window.calcManualRS()">Calculate</button>
                    <div id="manualRSResult" style="margin-top:0.5rem;"></div>
                </div>
            </div>
        `;
    }

    window.calcManualRS = () => {
        const input = document.getElementById('manualSpans').value;
        const lengths = input.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);

        if (lengths.length === 0) {
            document.getElementById('manualRSResult').innerHTML = '<div class="error">Enter valid span lengths</div>';
            return;
        }

        const rs = calculateRulingSpan(lengths);
        const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;

        document.getElementById('manualRSResult').innerHTML = `
            <div class="result-card">
                <div><strong>Ruling Span:</strong> ${rs.toFixed(1)}'</div>
                <div><strong>Average Span:</strong> ${avg.toFixed(1)}'</div>
                <div><strong>Count:</strong> ${lengths.length} spans</div>
            </div>
        `;
    };

    if (modal) modal.style.display = 'flex';
}

// Calculate recommended stringing sag based on ruling span
export function getStringSag(rulingSpan, conductor, temperature) {
    // Simplified sag table lookup (would normally reference full tables)
    const baseSag = rulingSpan * 0.02;  // ~2% of span as rough estimate
    const tempFactor = 1 + (temperature - 60) * 0.002;  // Adjust for temperature

    return baseSag * tempFactor;
}

export { calculateRulingSpan as calcRS };
