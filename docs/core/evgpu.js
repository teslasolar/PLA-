/**
 * ⚡ eVGPU - Electronic Virtual GPU
 * CPU-based compute engine for PLA calculations
 * NO GPU REQUIRED - Pure CPU efficiency
 */

class eVGPU {
    constructor(cores = 4) {
        this.cores = cores;
        this.workers = [];
        this.cache = new Map();
        this.cacheSize = 1000;

        // Performance metrics
        this.metrics = {
            operations: 0,
            cacheHits: 0,
            totalTime: 0
        };
    }

    /**
     * Matrix multiplication using optimized CPU operations
     * @param {Array} a - First matrix
     * @param {Array} b - Second matrix
     * @returns {Array} Result matrix
     */
    matmul(a, b) {
        const start = performance.now();
        const rowsA = a.length;
        const colsA = a[0].length;
        const colsB = b[0].length;

        // Initialize result matrix
        const result = new Array(rowsA);
        for (let i = 0; i < rowsA; i++) {
            result[i] = new Float64Array(colsB);
        }

        // Cache-optimized multiplication (loop tiling)
        const tileSize = 32;
        for (let i0 = 0; i0 < rowsA; i0 += tileSize) {
            for (let j0 = 0; j0 < colsB; j0 += tileSize) {
                for (let k0 = 0; k0 < colsA; k0 += tileSize) {
                    // Process tile
                    const iMax = Math.min(i0 + tileSize, rowsA);
                    const jMax = Math.min(j0 + tileSize, colsB);
                    const kMax = Math.min(k0 + tileSize, colsA);

                    for (let i = i0; i < iMax; i++) {
                        for (let k = k0; k < kMax; k++) {
                            const aik = a[i][k];
                            for (let j = j0; j < jMax; j++) {
                                result[i][j] += aik * b[k][j];
                            }
                        }
                    }
                }
            }
        }

        this.metrics.operations++;
        this.metrics.totalTime += performance.now() - start;
        return result;
    }

    /**
     * Tensor operation dispatcher
     * @param {Array} a - First tensor
     * @param {Array} b - Second tensor (optional)
     * @param {string} op - Operation: '@' (matmul), '+' (add), '*' (elementwise), 'T' (transpose)
     */
    tensor(a, b = null, op = '@') {
        const cacheKey = this._getCacheKey(a, b, op);
        if (this.cache.has(cacheKey)) {
            this.metrics.cacheHits++;
            return this.cache.get(cacheKey);
        }

        let result;
        switch (op) {
            case '@': // Matrix multiplication
                result = this.matmul(a, b);
                break;
            case '+': // Addition
                result = this._add(a, b);
                break;
            case '*': // Element-wise multiplication
                result = this._multiply(a, b);
                break;
            case 'T': // Transpose
                result = this._transpose(a);
                break;
            case 'σ': // Sigmoid activation
                result = this._sigmoid(a);
                break;
            case 'relu': // ReLU activation
                result = this._relu(a);
                break;
            case '∇': // Gradient (for backprop)
                result = this._gradient(a, b);
                break;
            default:
                throw new Error(`Unknown operation: ${op}`);
        }

        this._cacheResult(cacheKey, result);
        return result;
    }

    /**
     * Vectorized operations for pole analysis
     */

    // Calculate catenary curve points
    catenary(span, sag, segments = 50) {
        const a = span / (2 * Math.asinh(sag * 2 / span));
        const points = new Float64Array(segments * 2);

        for (let i = 0; i < segments; i++) {
            const t = i / (segments - 1);
            const x = (t - 0.5) * span;
            const y = a * Math.cosh(x / a) - a * Math.cosh(span / (2 * a));
            points[i * 2] = t * span;
            points[i * 2 + 1] = -y;
        }

        return points;
    }

    // Calculate wind pressure on conductor
    windPressure(velocity, diameter, span) {
        // q = 0.5 * ρ * v² (dynamic pressure)
        const rho = 1.225; // air density kg/m³
        const q = 0.5 * rho * velocity * velocity;

        // Force per unit length
        const Cd = 1.0; // drag coefficient for cylinder
        const forcePerMeter = Cd * q * (diameter / 1000); // diameter in mm to m

        // Total force on span
        const totalForce = forcePerMeter * span;

        return {
            pressure: q,
            forcePerMeter,
            totalForce
        };
    }

    // Calculate pole bending moment
    poleBendingMoment(forces) {
        // M = Σ(F × h)
        let moment = 0;
        for (const f of forces) {
            moment += f.force * f.height;
        }
        return moment;
    }

    // Matrix operations
    _add(a, b) {
        const rows = a.length;
        const cols = a[0].length;
        const result = new Array(rows);

        for (let i = 0; i < rows; i++) {
            result[i] = new Float64Array(cols);
            for (let j = 0; j < cols; j++) {
                result[i][j] = a[i][j] + b[i][j];
            }
        }
        return result;
    }

    _multiply(a, b) {
        const rows = a.length;
        const cols = a[0].length;
        const result = new Array(rows);

        for (let i = 0; i < rows; i++) {
            result[i] = new Float64Array(cols);
            for (let j = 0; j < cols; j++) {
                result[i][j] = a[i][j] * b[i][j];
            }
        }
        return result;
    }

    _transpose(a) {
        const rows = a.length;
        const cols = a[0].length;
        const result = new Array(cols);

        for (let j = 0; j < cols; j++) {
            result[j] = new Float64Array(rows);
            for (let i = 0; i < rows; i++) {
                result[j][i] = a[i][j];
            }
        }
        return result;
    }

    _sigmoid(a) {
        const rows = a.length;
        const cols = a[0].length;
        const result = new Array(rows);

        for (let i = 0; i < rows; i++) {
            result[i] = new Float64Array(cols);
            for (let j = 0; j < cols; j++) {
                result[i][j] = 1 / (1 + Math.exp(-a[i][j]));
            }
        }
        return result;
    }

    _relu(a) {
        const rows = a.length;
        const cols = a[0].length;
        const result = new Array(rows);

        for (let i = 0; i < rows; i++) {
            result[i] = new Float64Array(cols);
            for (let j = 0; j < cols; j++) {
                result[i][j] = Math.max(0, a[i][j]);
            }
        }
        return result;
    }

    _gradient(a, b) {
        // Simple gradient calculation for backprop
        return this._add(a, this._multiply(b, [[-1]]));
    }

    _getCacheKey(a, b, op) {
        const aHash = a ? this._hashArray(a) : '';
        const bHash = b ? this._hashArray(b) : '';
        return `${op}:${aHash}:${bHash}`;
    }

    _hashArray(arr) {
        // Simple hash for caching
        if (!arr || arr.length === 0) return '0';
        const flat = arr.flat ? arr.flat() : arr;
        return flat.slice(0, 10).join(',');
    }

    _cacheResult(key, result) {
        if (this.cache.size >= this.cacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, result);
    }

    getMetrics() {
        return {
            ...this.metrics,
            avgTime: this.metrics.operations > 0
                ? this.metrics.totalTime / this.metrics.operations
                : 0,
            cacheHitRate: this.metrics.operations > 0
                ? this.metrics.cacheHits / this.metrics.operations
                : 0
        };
    }

    reset() {
        this.cache.clear();
        this.metrics = {
            operations: 0,
            cacheHits: 0,
            totalTime: 0
        };
    }
}

// Export for use in modules and global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = eVGPU;
}
if (typeof window !== 'undefined') {
    window.eVGPU = eVGPU;
}
