/**
 * Guy Wire Analysis
 * Tension and anchor calculations
 */
export const GUY_CAPACITY = {
    '3/8 EHS': 10000,
    '7/16 EHS': 16000,
    '1/2 EHS': 26000,
    '9/16 EHS': 29000
};

export class GuyAnalysis {
    constructor(moment, attachH, leadDist) {
        this.moment = moment;
        this.attachH = attachH;
        this.leadDist = leadDist;
        this.angle = Math.atan(leadDist / attachH) * 180 / Math.PI;
    }

    horizontalForce() {
        return this.moment / this.attachH;
    }

    guyTension() {
        const rad = this.angle * Math.PI / 180;
        return this.horizontalForce() / Math.sin(rad);
    }

    anchorLoad() {
        return this.guyTension();
    }

    verticalComponent() {
        const rad = this.angle * Math.PI / 180;
        return this.guyTension() * Math.cos(rad);
    }

    selectGuy(factor = 1.5) {
        const req = this.guyTension() * factor;
        for (const [type, cap] of Object.entries(GUY_CAPACITY)) {
            if (cap >= req) return { type, capacity: cap, utilization: (req / cap) * 100 };
        }
        return { type: '9/16 EHS (multiple)', capacity: 29000, utilization: 999 };
    }

    optimalLead() {
        // 45° is optimal for most applications
        return this.attachH;
    }

    analyze() {
        const sel = this.selectGuy();
        return {
            angle: this.angle,
            horizontalForce: this.horizontalForce(),
            guyTension: this.guyTension(),
            anchorLoad: this.anchorLoad(),
            verticalComponent: this.verticalComponent(),
            recommended: sel.type,
            utilization: sel.utilization
        };
    }

    report() {
        const a = this.analyze();
        return `Guy: ${a.guyTension.toFixed(0)}lb @ ${a.angle.toFixed(1)}° → ${a.recommended} (${a.utilization.toFixed(0)}%)`;
    }
}

export default GuyAnalysis;
