/**
 * Pole Structural Analysis
 * NESC-compliant loading calculations
 */
export const POLE_CLASSES = {
    'H6': 19800, 'H5': 16000, 'H4': 12400, 'H3': 10000,
    'H2': 8000, 'H1': 6400, '1': 4500, '2': 3700,
    '3': 3000, '4': 2400, '5': 1900, '6': 1500, '7': 1200
};

export const NESC_FACTORS = {
    B: { cross: 2.50, else: 2.50 },
    C: { cross: 2.20, else: 2.20 },
    N: { cross: 2.20, else: 2.20 }
};

export class PoleAnalysis {
    constructor(cfg = {}) {
        this.height = cfg.height || 45;
        this.poleClass = cfg.poleClass || '2';
        this.material = cfg.material || 'wood';
        this.embed = cfg.embed || Math.max(6, this.height * 0.1 + 2);
        this.loads = [];
    }

    addLoad(force, height, desc = '') {
        this.loads.push({ force, height, desc });
    }

    addConductor(cfg) {
        const ws = cfg.windSpan || 300;
        const wp = cfg.windPressure || 4;
        const dia = cfg.diameter || 0.5;
        const h = cfg.height || this.height - 5;
        const f = wp * (dia / 12) * ws;
        this.addLoad(f, h, `Conductor@${h}ft`);
    }

    addPoleWind(wp = 4, avgDia = 8) {
        const f = wp * (avgDia / 12) * (this.height - this.embed);
        const h = (this.height - this.embed) / 2;
        this.addLoad(f, h, 'Pole wind');
    }

    moment() {
        return this.loads.reduce((m, l) => m + l.force * l.height, 0);
    }

    capacity() {
        return POLE_CLASSES[this.poleClass] || 3000;
    }

    utilization(grade = 'C', cross = false) {
        const factor = NESC_FACTORS[grade]?.[cross ? 'cross' : 'else'] || 2.2;
        return (this.moment() * factor / this.capacity()) * 100;
    }

    analyze(grade = 'C', cross = false) {
        const util = this.utilization(grade, cross);
        return {
            poleClass: this.poleClass,
            height: this.height,
            embed: this.embed,
            moment: this.moment(),
            capacity: this.capacity(),
            utilization: util,
            status: util <= 100 ? 'PASS' : 'FAIL'
        };
    }

    recommend(margin = 1.2) {
        const req = this.moment() * margin;
        for (const [cls, cap] of Object.entries(POLE_CLASSES).sort((a, b) => a[1] - b[1])) {
            if (cap >= req) return cls;
        }
        return 'H6';
    }

    report() {
        const r = this.analyze();
        return `Pole ${r.poleClass}: ${r.moment.toFixed(0)} / ${r.capacity} lb-ft = ${r.utilization.toFixed(1)}% [${r.status}]`;
    }
}

export default PoleAnalysis;
