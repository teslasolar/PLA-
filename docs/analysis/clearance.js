/**
 * NESC Clearance Checker
 * Minimum clearance verification
 */
export const NESC_CLEARANCES = {
    road: { '<750V': 15.5, '<22kV': 15.5, '<50kV': 18.0 },
    pedestrian: { '<750V': 12.0, '<22kV': 15.5, '<50kV': 18.0 },
    residential: { '<750V': 12.0, '<22kV': 15.5, '<50kV': 18.0 },
    railroad: { '<750V': 27.0, '<22kV': 27.0, '<50kV': 28.5 },
    water: { '<750V': 17.0, '<22kV': 17.0, '<50kV': 18.5 }
};

export class ClearanceChecker {
    constructor(voltage = 12.47) {
        this.voltage = voltage;
        this.category = this._voltageCategory();
    }

    _voltageCategory() {
        if (this.voltage < 0.75) return '<750V';
        if (this.voltage < 22) return '<22kV';
        return '<50kV';
    }

    _voltageAdder() {
        if (this.voltage <= 22) return 0;
        return (this.voltage - 22) * 0.4 / 12; // inches to feet
    }

    getRequired(terrain) {
        const base = NESC_CLEARANCES[terrain]?.[this.category] || 15.5;
        return base + this._voltageAdder();
    }

    check(terrain, actual) {
        const req = this.getRequired(terrain);
        return {
            terrain,
            voltage: this.voltage,
            required: req,
            actual,
            margin: actual - req,
            status: actual >= req ? 'PASS' : 'FAIL'
        };
    }

    checkAll(actual) {
        const results = {};
        for (const terrain of Object.keys(NESC_CLEARANCES)) {
            results[terrain] = this.check(terrain, actual);
        }
        return results;
    }

    minRequired() {
        let min = Infinity;
        for (const terrain of Object.keys(NESC_CLEARANCES)) {
            const r = this.getRequired(terrain);
            if (r < min) min = r;
        }
        return min;
    }

    report(terrain, actual) {
        const r = this.check(terrain, actual);
        return `${terrain}: ${r.actual.toFixed(1)}ft vs ${r.required.toFixed(1)}ft req (${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(1)}ft) [${r.status}]`;
    }
}

export default ClearanceChecker;
