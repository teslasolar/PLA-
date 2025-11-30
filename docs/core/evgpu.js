/**
 * eVGPU - CPU Compute Engine
 * Fallback when WebGPU unavailable
 */
export class eVGPU {
    constructor(cores = navigator.hardwareConcurrency || 4) {
        this.cores = cores;
        this.cache = new Map();
        this.ops = 0;
    }

    tensor(a, b, op = '@') {
        this.ops++;
        switch (op) {
            case '@': return this.matmul(a, b);
            case '+': return this.add(a, b);
            case '*': return this.mul(a, b);
            case 'T': return this.transpose(a);
            case 'σ': return this.sigmoid(a);
            default: throw new Error(`Unknown op: ${op}`);
        }
    }

    matmul(a, b) {
        const m = a.length, k = a[0].length, n = b[0].length;
        const c = Array(m).fill(0).map(() => new Float32Array(n));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                let sum = 0;
                for (let p = 0; p < k; p++) sum += a[i][p] * b[p][j];
                c[i][j] = sum;
            }
        }
        return c;
    }

    add(a, b) {
        return a.map((row, i) => row.map((v, j) => v + b[i][j]));
    }

    mul(a, b) {
        return a.map((row, i) => row.map((v, j) => v * b[i][j]));
    }

    transpose(a) {
        return a[0].map((_, j) => a.map(row => row[j]));
    }

    sigmoid(a) {
        return a.map(row => row.map(v => 1 / (1 + Math.exp(-v))));
    }

    catenary(span, sag, n = 50) {
        const pts = new Float32Array(n * 2);
        const a = span / (2 * Math.asinh(sag * 2 / span));
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const x = (t - 0.5) * span;
            pts[i * 2] = t * span;
            pts[i * 2 + 1] = -(a * Math.cosh(x / a) - a * Math.cosh(span / (2 * a)));
        }
        return pts;
    }

    windForce(v, dia, span) {
        const q = 0.613 * v * v;
        const f = q * (dia / 1000);
        return { pressure: q, perMeter: f, total: f * span };
    }

    getInfo() {
        return { backend: 'CPU', cores: this.cores, ops: this.ops };
    }
}

export default eVGPU;
