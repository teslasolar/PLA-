/**
 * Catenary Curve Calculator
 * True catenary sag-tension mathematics
 */
export class Catenary {
    constructor(span, sag, weight = 1.5, hDiff = 0) {
        this.span = span;
        this.sag = sag;
        this.weight = weight;
        this.hDiff = hDiff;
        this.a = this._calcA();
    }

    _calcA() {
        let a = this.span / 2;
        for (let i = 0; i < 20; i++) {
            const h = this.span / (2 * a);
            const f = a * (Math.cosh(h) - 1) - this.sag;
            const df = Math.cosh(h) - 1 - h * Math.sinh(h);
            const c = f / df;
            a -= c;
            if (Math.abs(c) < 1e-10) break;
        }
        return a;
    }

    y(x) {
        const lx = x - this.span / 2;
        const h = this.span / (2 * this.a);
        return this.a * Math.cosh(lx / this.a) - this.a * Math.cosh(h) + (this.hDiff / this.span) * x;
    }

    points(n = 50) {
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const x = (i / n) * this.span;
            pts.push({ x, y: this.y(x) });
        }
        return pts;
    }

    tension() { return this.a * this.weight * 9.81; }

    tensionAt(x) {
        const H = this.tension();
        const lx = x - this.span / 2;
        const V = this.weight * 9.81 * this.a * Math.sinh(lx / this.a);
        return Math.sqrt(H * H + V * V);
    }

    maxTension() { return this.tensionAt(0); }

    length() {
        const h = this.span / (2 * this.a);
        return 2 * this.a * Math.sinh(h);
    }

    lowPointX() {
        if (this.hDiff === 0) return this.span / 2;
        const h = this.span / (2 * this.a);
        return this.span / 2 - this.a * Math.asinh(this.hDiff / (2 * this.a * Math.sinh(h)));
    }

    clearance(x, attachH, groundH = 0) {
        return attachH + this.y(x) - groundH;
    }

    minClearance(attachH, groundFn = () => 0) {
        let min = Infinity, minX = 0;
        for (let i = 0; i <= 100; i++) {
            const x = (i / 100) * this.span;
            const c = this.clearance(x, attachH, groundFn(x));
            if (c < min) { min = c; minX = x; }
        }
        return { x: minX, clearance: min };
    }

    toJSON() {
        return {
            span: this.span, sag: this.sag, weight: this.weight,
            a: this.a, H: this.tension(), L: this.length()
        };
    }
}

export default Catenary;
