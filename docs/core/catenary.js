/**
 * 📐 Catenary Mathematics Module
 * Precise sag-tension calculations for power line conductors
 */

class CatenaryCurve {
    /**
     * Create a catenary curve
     * @param {number} span - Horizontal distance between supports (m)
     * @param {number} sag - Maximum vertical sag (m)
     * @param {number} weight - Conductor weight per unit length (kg/m)
     * @param {number} heightDiff - Height difference between supports (m)
     */
    constructor(span, sag, weight = 1.5, heightDiff = 0) {
        this.span = span;
        this.sag = sag;
        this.weight = weight;
        this.heightDiff = heightDiff;

        // Calculate catenary constant
        this.a = this._calculateCatenaryConstant();

        // Pre-calculate common values
        this._precompute();
    }

    /**
     * Iteratively solve for catenary constant 'a'
     * Equation: sag = a * (cosh(span/(2*a)) - 1)
     */
    _calculateCatenaryConstant() {
        let a = this.span / 2; // Initial guess

        // Newton-Raphson iteration
        for (let i = 0; i < 20; i++) {
            const halfSpanOverA = this.span / (2 * a);
            const f = a * (Math.cosh(halfSpanOverA) - 1) - this.sag;
            const df = Math.cosh(halfSpanOverA) - 1 - halfSpanOverA * Math.sinh(halfSpanOverA);

            const correction = f / df;
            a = a - correction;

            if (Math.abs(correction) < 1e-10) break;
        }

        return a;
    }

    _precompute() {
        const halfSpanOverA = this.span / (2 * this.a);
        this._coshHalf = Math.cosh(halfSpanOverA);
        this._sinhHalf = Math.sinh(halfSpanOverA);
    }

    /**
     * Get Y coordinate at position X along span
     * @param {number} x - Position along span (0 to span)
     * @returns {number} Vertical position (negative is down)
     */
    getY(x) {
        const localX = x - this.span / 2;
        const y = this.a * Math.cosh(localX / this.a) - this.a * this._coshHalf;

        // Adjust for height difference
        const slopeAdjust = (this.heightDiff / this.span) * x;

        return y + slopeAdjust;
    }

    /**
     * Get multiple points along the curve
     * @param {number} segments - Number of segments
     * @returns {Array} Array of {x, y} points
     */
    getPoints(segments = 50) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * this.span;
            points.push({
                x: x,
                y: this.getY(x)
            });
        }
        return points;
    }

    /**
     * Get horizontal tension
     * @returns {number} Horizontal tension in Newtons
     */
    getHorizontalTension() {
        return this.a * this.weight * 9.81;
    }

    /**
     * Get tension at any point
     * @param {number} x - Position along span
     * @returns {number} Total tension in Newtons
     */
    getTensionAt(x) {
        const localX = x - this.span / 2;
        const H = this.getHorizontalTension();
        const verticalComponent = this.weight * 9.81 * this.a * Math.sinh(localX / this.a);
        return Math.sqrt(H * H + verticalComponent * verticalComponent);
    }

    /**
     * Get maximum tension (at supports)
     * @returns {number} Maximum tension in Newtons
     */
    getMaxTension() {
        return this.getTensionAt(0); // Maximum at support
    }

    /**
     * Get conductor arc length
     * @returns {number} Length in meters
     */
    getLength() {
        return 2 * this.a * this._sinhHalf;
    }

    /**
     * Get low point position (for unequal supports)
     * @returns {number} X position of low point
     */
    getLowPointX() {
        if (this.heightDiff === 0) {
            return this.span / 2;
        }

        // For inclined span, low point shifts
        const shift = this.a * Math.asinh(this.heightDiff / (2 * this.a * this._sinhHalf));
        return this.span / 2 - shift;
    }

    /**
     * Get sag at low point
     * @returns {number} Maximum sag in meters
     */
    getMaxSag() {
        const lowPointX = this.getLowPointX();
        // Sag measured from chord line
        const chordY = (this.heightDiff / this.span) * lowPointX;
        return Math.abs(this.getY(lowPointX) - chordY);
    }

    /**
     * Calculate for different temperature
     * @param {number} currentTemp - Current temperature (°C)
     * @param {number} newTemp - New temperature (°C)
     * @param {number} alpha - Thermal expansion coefficient (1/°C)
     * @param {number} E - Modulus of elasticity (Pa)
     * @param {number} A - Cross-sectional area (m²)
     * @returns {CatenaryCurve} New catenary at different temperature
     */
    atTemperature(currentTemp, newTemp, alpha = 23e-6, E = 70e9, A = 400e-6) {
        const deltaT = newTemp - currentTemp;

        // Current length
        const L0 = this.getLength();

        // Thermal length change
        const thermalChange = L0 * alpha * deltaT;

        // New length (simplified - ignores elastic effects)
        const newLength = L0 + thermalChange;

        // Iteratively find new sag that gives this length
        let newSag = this.sag;
        for (let i = 0; i < 20; i++) {
            const testCurve = new CatenaryCurve(this.span, newSag, this.weight, this.heightDiff);
            const testLength = testCurve.getLength();

            const error = testLength - newLength;
            if (Math.abs(error) < 0.001) break;

            // Adjust sag
            newSag += error * 0.5; // Simple correction
        }

        return new CatenaryCurve(this.span, newSag, this.weight, this.heightDiff);
    }

    /**
     * Get clearance to ground at position
     * @param {number} x - Position along span
     * @param {number} attachmentHeight - Height of conductor at supports
     * @param {number} groundElevation - Ground elevation at x (default 0)
     * @returns {number} Clearance in meters
     */
    getClearance(x, attachmentHeight, groundElevation = 0) {
        const conductorHeight = attachmentHeight + this.getY(x);
        return conductorHeight - groundElevation;
    }

    /**
     * Find minimum clearance along span
     * @param {number} attachmentHeight - Height of conductor at supports
     * @param {function} groundProfile - Function returning ground elevation at x
     * @returns {object} {x, clearance}
     */
    findMinClearance(attachmentHeight, groundProfile = () => 0) {
        let minClearance = Infinity;
        let minX = 0;

        const segments = 100;
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * this.span;
            const clearance = this.getClearance(x, attachmentHeight, groundProfile(x));

            if (clearance < minClearance) {
                minClearance = clearance;
                minX = x;
            }
        }

        return { x: minX, clearance: minClearance };
    }

    /**
     * Export curve data
     * @returns {object} Curve parameters and calculated values
     */
    toJSON() {
        return {
            span: this.span,
            sag: this.sag,
            weight: this.weight,
            heightDiff: this.heightDiff,
            catenaryConstant: this.a,
            horizontalTension: this.getHorizontalTension(),
            maxTension: this.getMaxTension(),
            length: this.getLength(),
            lowPointX: this.getLowPointX()
        };
    }
}

/**
 * Ruling Span Calculator
 */
class RulingSpan {
    /**
     * Calculate ruling span for a section of line
     * @param {Array<number>} spans - Array of individual span lengths
     * @returns {number} Ruling span in meters
     */
    static calculate(spans) {
        const sumCubes = spans.reduce((sum, s) => sum + Math.pow(s, 3), 0);
        const sumLengths = spans.reduce((sum, s) => sum + s, 0);
        return Math.sqrt(sumCubes / sumLengths);
    }

    /**
     * Quick estimate using rule of thumb
     * @param {Array<number>} spans - Array of individual span lengths
     * @returns {number} Estimated ruling span
     */
    static estimate(spans) {
        const avgSpan = spans.reduce((a, b) => a + b, 0) / spans.length;
        const maxSpan = Math.max(...spans);
        return avgSpan + (2/3) * (maxSpan - avgSpan);
    }
}

/**
 * Insulator Swing Calculator
 */
class InsulatorSwing {
    /**
     * Calculate I-string insulator swing angle
     * @param {number} horizontalLoad - Horizontal load (N)
     * @param {number} verticalLoad - Vertical load (N)
     * @returns {number} Swing angle in degrees
     */
    static calculateSwing(horizontalLoad, verticalLoad) {
        const radians = Math.atan(horizontalLoad / verticalLoad);
        return radians * (180 / Math.PI);
    }

    /**
     * Calculate horizontal offset due to swing
     * @param {number} insulatorLength - Length of insulator string (m)
     * @param {number} swingAngle - Swing angle in degrees
     * @returns {number} Horizontal offset (m)
     */
    static getOffset(insulatorLength, swingAngle) {
        const radians = swingAngle * (Math.PI / 180);
        return insulatorLength * Math.sin(radians);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CatenaryCurve, RulingSpan, InsulatorSwing };
}
if (typeof window !== 'undefined') {
    window.CatenaryCurve = CatenaryCurve;
    window.RulingSpan = RulingSpan;
    window.InsulatorSwing = InsulatorSwing;
}
