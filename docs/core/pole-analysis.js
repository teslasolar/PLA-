/**
 * 🔩 Pole Structural Analysis Module
 * Comprehensive pole loading and structural calculations
 */

// Pole class specifications per ANSI O5.1
const POLE_CLASSES = {
    'H6': { momentCapacity: 19800, minTopCirc: 33.5, minLength: [90, 95, 100, 105, 110] },
    'H5': { momentCapacity: 16000, minTopCirc: 31.0, minLength: [85, 90, 95, 100, 105] },
    'H4': { momentCapacity: 12400, minTopCirc: 29.0, minLength: [80, 85, 90, 95, 100] },
    'H3': { momentCapacity: 10000, minTopCirc: 27.0, minLength: [75, 80, 85, 90, 95] },
    'H2': { momentCapacity: 8000, minTopCirc: 25.0, minLength: [70, 75, 80, 85, 90] },
    'H1': { momentCapacity: 6400, minTopCirc: 23.0, minLength: [65, 70, 75, 80, 85] },
    '1': { momentCapacity: 4500, minTopCirc: 21.0, minLength: [55, 60, 65, 70, 75] },
    '2': { momentCapacity: 3700, minTopCirc: 19.5, minLength: [50, 55, 60, 65, 70] },
    '3': { momentCapacity: 3000, minTopCirc: 18.0, minLength: [45, 50, 55, 60, 65] },
    '4': { momentCapacity: 2400, minTopCirc: 17.0, minLength: [40, 45, 50, 55, 60] },
    '5': { momentCapacity: 1900, minTopCirc: 15.0, minLength: [35, 40, 45, 50, 55] },
    '6': { momentCapacity: 1500, minTopCirc: 14.0, minLength: [30, 35, 40, 45, 50] },
    '7': { momentCapacity: 1200, minTopCirc: 13.0, minLength: [25, 30, 35, 40, 45] }
};

// NESC overload capacity factors (Table 253-1)
const NESC_OVERLOAD_FACTORS = {
    grade_B: {
        at_crossings: { vertical: 1.50, transverse: 2.50, longitudinal: 1.65 },
        elsewhere: { vertical: 1.50, transverse: 2.50, longitudinal: 1.10 }
    },
    grade_C: {
        at_crossings: { vertical: 1.50, transverse: 2.20, longitudinal: 1.30 },
        elsewhere: { vertical: 1.50, transverse: 2.20, longitudinal: 0.00 }
    },
    grade_N: {
        at_crossings: { vertical: 1.50, transverse: 2.20, longitudinal: 1.30 },
        elsewhere: { vertical: 1.50, transverse: 2.20, longitudinal: 0.00 }
    }
};

// Material properties
const MATERIALS = {
    wood: {
        southern_pine: { fiberStress: 8000, modulus: 1.8e6, density: 50 }, // psi, psi, lb/ft³
        douglas_fir: { fiberStress: 8000, modulus: 1.7e6, density: 45 },
        western_red_cedar: { fiberStress: 6000, modulus: 1.1e6, density: 23 }
    },
    steel: {
        standard: { yieldStrength: 65000, modulus: 29e6, density: 490 }
    },
    concrete: {
        prestressed: { compressiveStrength: 8000, modulus: 5.5e6, density: 150 }
    }
};

class PoleAnalysis {
    /**
     * Create pole analysis instance
     * @param {object} config - Pole configuration
     */
    constructor(config = {}) {
        this.height = config.height || 45; // ft
        this.poleClass = config.poleClass || '2';
        this.material = config.material || 'wood';
        this.species = config.species || 'southern_pine';
        this.embedDepth = config.embedDepth || this._calculateEmbedDepth();
        this.topDiameter = config.topDiameter || this._getTopDiameter();
        this.groundDiameter = config.groundDiameter || this._estimateGroundDiameter();

        // Applied loads
        this.loads = [];

        // Results
        this.results = null;
    }

    _calculateEmbedDepth() {
        // Rule of thumb: 10% of length + 2 feet
        return Math.max(6, this.height * 0.1 + 2);
    }

    _getTopDiameter() {
        const specs = POLE_CLASSES[this.poleClass];
        if (!specs) return 7; // default
        return specs.minTopCirc / Math.PI;
    }

    _estimateGroundDiameter() {
        // Typical taper: 0.1 to 0.15 inches per foot
        const taperRate = 0.125; // inches/ft
        const heightAboveGround = this.height - this.embedDepth;
        return this.topDiameter + (heightAboveGround * taperRate);
    }

    /**
     * Add a load to the pole
     * @param {object} load - Load definition
     */
    addLoad(load) {
        this.loads.push({
            type: load.type || 'point', // 'point', 'distributed', 'moment'
            direction: load.direction || 'transverse', // 'transverse', 'longitudinal', 'vertical'
            magnitude: load.magnitude || 0, // N or N/m
            height: load.height || this.height - 5, // ft above ground
            description: load.description || ''
        });
    }

    /**
     * Add conductor load
     * @param {object} params - Conductor parameters
     */
    addConductorLoad(params) {
        const {
            windSpan = 300, // ft
            weightSpan = 300, // ft
            windPressure = 4, // psf (NESC)
            conductorDiameter = 0.5, // inches
            conductorWeight = 0.3, // lb/ft
            iceThickness = 0, // inches
            attachmentHeight = this.height - 5,
            tension = 0, // lb (for deadends/angles)
            lineAngle = 0 // degrees
        } = params;

        // Calculate wind load on conductor
        const iceWeight = iceThickness > 0
            ? Math.PI * ((conductorDiameter/2 + iceThickness)**2 - (conductorDiameter/2)**2) * 57 / 144
            : 0;

        const effectiveDiameter = conductorDiameter + 2 * iceThickness;
        const windForce = windPressure * (effectiveDiameter / 12) * windSpan;

        // Vertical load
        const verticalLoad = (conductorWeight + iceWeight) * weightSpan;

        // Transverse from line angle
        const angleTransverse = 2 * tension * Math.sin(lineAngle * Math.PI / 360);

        this.addLoad({
            type: 'point',
            direction: 'transverse',
            magnitude: windForce + angleTransverse,
            height: attachmentHeight,
            description: `Conductor at ${attachmentHeight}ft`
        });

        this.addLoad({
            type: 'point',
            direction: 'vertical',
            magnitude: verticalLoad,
            height: attachmentHeight,
            description: `Conductor weight at ${attachmentHeight}ft`
        });
    }

    /**
     * Add wind load on pole
     * @param {number} windPressure - Wind pressure (psf)
     */
    addPoleWindLoad(windPressure = 4) {
        // Wind on pole (distributed load)
        const avgDiameter = (this.topDiameter + this.groundDiameter) / 2;
        const forcePerFoot = windPressure * avgDiameter / 12;

        this.addLoad({
            type: 'distributed',
            direction: 'transverse',
            magnitude: forcePerFoot,
            height: (this.height - this.embedDepth) / 2, // Effective height
            description: 'Wind on pole'
        });
    }

    /**
     * Calculate ground-line moment
     * @returns {number} Total moment at ground line (lb-ft)
     */
    calculateGroundLineMoment() {
        let totalMoment = 0;

        for (const load of this.loads) {
            let moment = 0;

            if (load.type === 'point') {
                if (load.direction === 'transverse' || load.direction === 'longitudinal') {
                    moment = load.magnitude * load.height;
                }
            } else if (load.type === 'distributed') {
                // Distributed load creates moment from centroid
                const heightAboveGround = this.height - this.embedDepth;
                moment = load.magnitude * heightAboveGround * (heightAboveGround / 2);
            } else if (load.type === 'moment') {
                moment = load.magnitude;
            }

            totalMoment += moment;
        }

        return totalMoment;
    }

    /**
     * Get pole capacity
     * @returns {number} Allowable moment (lb-ft)
     */
    getPoleCapacity() {
        const specs = POLE_CLASSES[this.poleClass];
        return specs ? specs.momentCapacity : 0;
    }

    /**
     * Calculate utilization ratio
     * @param {string} grade - Construction grade ('B', 'C', 'N')
     * @param {boolean} atCrossing - Whether at crossing
     * @returns {number} Utilization percentage
     */
    calculateUtilization(grade = 'C', atCrossing = false) {
        const appliedMoment = this.calculateGroundLineMoment();
        const capacity = this.getPoleCapacity();

        // Get overload factor
        const factorKey = `grade_${grade.toLowerCase()}`;
        const locationKey = atCrossing ? 'at_crossings' : 'elsewhere';
        const overloadFactor = NESC_OVERLOAD_FACTORS[factorKey]?.[locationKey]?.transverse || 2.50;

        // Factored moment
        const factoredMoment = appliedMoment * overloadFactor;

        return (factoredMoment / capacity) * 100;
    }

    /**
     * Run full analysis
     * @param {object} options - Analysis options
     * @returns {object} Analysis results
     */
    analyze(options = {}) {
        const grade = options.grade || 'C';
        const atCrossing = options.atCrossing || false;

        const groundLineMoment = this.calculateGroundLineMoment();
        const capacity = this.getPoleCapacity();
        const utilization = this.calculateUtilization(grade, atCrossing);

        // Calculate deflection (approximate)
        const material = MATERIALS[this.material]?.[this.species] || MATERIALS.wood.southern_pine;
        const I = Math.PI * Math.pow(this.groundDiameter / 24, 4) / 4; // in⁴
        const E = material.modulus;

        // Simple cantilever deflection approximation
        const heightInches = (this.height - this.embedDepth) * 12;
        const tipLoad = groundLineMoment / (this.height - this.embedDepth);
        const deflection = (tipLoad * Math.pow(heightInches, 3)) / (3 * E * I);

        this.results = {
            poleClass: this.poleClass,
            height: this.height,
            embedDepth: this.embedDepth,
            heightAboveGround: this.height - this.embedDepth,
            groundLineMoment: groundLineMoment,
            capacity: capacity,
            utilization: utilization,
            deflection: deflection,
            status: utilization <= 100 ? 'PASS' : 'FAIL',
            loads: this.loads.length,
            grade: grade,
            atCrossing: atCrossing
        };

        return this.results;
    }

    /**
     * Recommend pole class
     * @param {number} safetyMargin - Desired safety margin (%)
     * @returns {string} Recommended pole class
     */
    recommendPoleClass(safetyMargin = 20) {
        const requiredCapacity = this.calculateGroundLineMoment() * (1 + safetyMargin / 100);

        // Find smallest pole that works
        const classes = Object.entries(POLE_CLASSES)
            .sort((a, b) => a[1].momentCapacity - b[1].momentCapacity);

        for (const [className, specs] of classes) {
            if (specs.momentCapacity >= requiredCapacity) {
                return className;
            }
        }

        return 'H6'; // Largest class
    }

    /**
     * Export analysis report
     * @returns {string} Formatted report
     */
    generateReport() {
        if (!this.results) {
            this.analyze();
        }

        const r = this.results;

        return `
POLE STRUCTURAL ANALYSIS REPORT
================================

Pole Specifications:
  Class: ${r.poleClass}
  Total Height: ${r.height} ft
  Setting Depth: ${r.embedDepth} ft
  Height Above Ground: ${r.heightAboveGround} ft
  Material: ${this.material} (${this.species})

Applied Loads:
${this.loads.map(l => `  - ${l.description}: ${l.magnitude.toFixed(1)} lb @ ${l.height} ft`).join('\n')}

Analysis Results:
  Ground-Line Moment: ${r.groundLineMoment.toFixed(0)} lb-ft
  Pole Capacity: ${r.capacity} lb-ft
  Utilization: ${r.utilization.toFixed(1)}%
  Est. Deflection: ${r.deflection.toFixed(2)} inches

Construction Grade: ${r.grade}
At Crossing: ${r.atCrossing ? 'Yes' : 'No'}

STATUS: ${r.status} ${r.status === 'PASS' ? '✓' : '✗'}

${r.utilization > 100 ? `Recommended upgrade: Class ${this.recommendPoleClass()}` : ''}
        `.trim();
    }
}

/**
 * Guy Wire Analysis
 */
class GuyWireAnalysis {
    /**
     * Calculate guy wire tension
     * @param {number} moment - Overturning moment (lb-ft)
     * @param {number} attachHeight - Guy attachment height (ft)
     * @param {number} leadDistance - Lead distance to anchor (ft)
     * @returns {object} Guy analysis results
     */
    static calculate(moment, attachHeight, leadDistance) {
        // Guy angle from vertical
        const angle = Math.atan(leadDistance / attachHeight) * 180 / Math.PI;

        // Horizontal component needed
        const horizontalForce = moment / attachHeight;

        // Total guy tension
        const guyTension = horizontalForce / Math.sin(angle * Math.PI / 180);

        // Anchor load (assuming 45° typical)
        const anchorLoad = guyTension;

        return {
            angle: angle,
            horizontalForce: horizontalForce,
            guyTension: guyTension,
            anchorLoad: anchorLoad,
            recommended: {
                '3/8 EHS': guyTension < 10000,
                '7/16 EHS': guyTension < 16000,
                '1/2 EHS': guyTension < 26000
            }
        };
    }
}

/**
 * Wind Load Calculator
 */
class WindLoadCalculator {
    /**
     * Calculate wind pressure from velocity
     * @param {number} velocity - Wind velocity (mph)
     * @returns {number} Wind pressure (psf)
     */
    static pressureFromVelocity(velocity) {
        // q = 0.00256 * V² (ASCE 7)
        return 0.00256 * velocity * velocity;
    }

    /**
     * NESC combined ice and wind load
     * @param {number} iceThickness - Radial ice thickness (inches)
     * @param {number} windPressure - Wind pressure on ice (psf)
     * @param {number} conductorDiameter - Bare conductor diameter (inches)
     * @returns {object} Combined loads per foot
     */
    static combinedIceWind(iceThickness, windPressure, conductorDiameter) {
        // Ice weight per foot
        const iceWeight = 1.244 * iceThickness * (conductorDiameter + iceThickness);

        // Wind force per foot on ice-covered conductor
        const iceCoveredDiameter = conductorDiameter + 2 * iceThickness;
        const windForce = windPressure * iceCoveredDiameter / 12;

        return {
            iceWeight: iceWeight, // lb/ft
            windForce: windForce, // lb/ft
            resultant: Math.sqrt(iceWeight * iceWeight + windForce * windForce)
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PoleAnalysis, GuyWireAnalysis, WindLoadCalculator, POLE_CLASSES, NESC_OVERLOAD_FACTORS };
}
if (typeof window !== 'undefined') {
    window.PoleAnalysis = PoleAnalysis;
    window.GuyWireAnalysis = GuyWireAnalysis;
    window.WindLoadCalculator = WindLoadCalculator;
    window.POLE_CLASSES = POLE_CLASSES;
    window.NESC_OVERLOAD_FACTORS = NESC_OVERLOAD_FACTORS;
}
