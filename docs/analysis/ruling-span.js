/**
 * Ruling Span Calculator
 * For multi-span sag-tension analysis
 */
export class RulingSpan {
    static calculate(spans) {
        if (!spans.length) return 0;
        const sumCubes = spans.reduce((s, l) => s + l * l * l, 0);
        const sumLengths = spans.reduce((s, l) => s + l, 0);
        return Math.sqrt(sumCubes / sumLengths);
    }

    static estimate(spans) {
        if (!spans.length) return 0;
        const avg = spans.reduce((a, b) => a + b, 0) / spans.length;
        const max = Math.max(...spans);
        return avg + (2 / 3) * (max - avg);
    }

    static stats(spans) {
        return {
            count: spans.length,
            min: Math.min(...spans),
            max: Math.max(...spans),
            avg: spans.reduce((a, b) => a + b, 0) / spans.length,
            total: spans.reduce((a, b) => a + b, 0),
            ruling: RulingSpan.calculate(spans),
            estimate: RulingSpan.estimate(spans)
        };
    }

    static validate(spans, tolerance = 0.15) {
        const rs = RulingSpan.calculate(spans);
        const issues = [];
        for (let i = 0; i < spans.length; i++) {
            const ratio = spans[i] / rs;
            if (ratio < (1 - tolerance) || ratio > (1 + tolerance)) {
                issues.push({ span: i, length: spans[i], ratio, deviation: (ratio - 1) * 100 });
            }
        }
        return { rulingSpan: rs, valid: issues.length === 0, issues };
    }

    static report(spans) {
        const s = RulingSpan.stats(spans);
        return `Spans: ${s.count} | Min: ${s.min} | Max: ${s.max} | Avg: ${s.avg.toFixed(1)} | Rs: ${s.ruling.toFixed(1)}`;
    }
}

export default RulingSpan;
