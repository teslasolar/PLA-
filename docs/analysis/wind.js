/**
 * Wind and Ice Load Calculator
 * NESC loading district calculations
 */
export const NESC_LOADING = {
    light:  { ice: 0,    wind: 9, temp: 30 },
    medium: { ice: 0.25, wind: 4, temp: 15 },
    heavy:  { ice: 0.5,  wind: 4, temp: 0 },
    extreme:{ ice: 0,    wind: 0, temp: 60 }  // wind varies
};

export class WindCalculator {
    static pressureFromVelocity(mph) {
        return 0.00256 * mph * mph; // psf
    }

    static velocityFromPressure(psf) {
        return Math.sqrt(psf / 0.00256); // mph
    }

    static forceOnConductor(pressure, diameter, span) {
        // diameter in inches, span in feet
        return pressure * (diameter / 12) * span; // lb
    }

    static forceOnPole(pressure, avgDia, height) {
        return pressure * (avgDia / 12) * height;
    }
}

export class IceCalculator {
    static weight(thickness, conductorDia) {
        // thickness and diameter in inches
        // Returns lb/ft
        return 1.244 * thickness * (conductorDia + thickness);
    }

    static effectiveDiameter(thickness, conductorDia) {
        return conductorDia + 2 * thickness;
    }
}

export class CombinedLoad {
    constructor(district = 'medium') {
        this.district = district;
        this.params = NESC_LOADING[district];
    }

    calculate(conductorDia, conductorWt) {
        const ice = this.params.ice;
        const wind = this.params.wind;

        const iceWt = ice > 0 ? IceCalculator.weight(ice, conductorDia) : 0;
        const effDia = IceCalculator.effectiveDiameter(ice, conductorDia);
        const windF = wind * (effDia / 12); // per foot

        const verticalWt = conductorWt + iceWt;
        const resultant = Math.sqrt(verticalWt * verticalWt + windF * windF);

        return {
            district: this.district,
            iceWeight: iceWt,
            windForce: windF,
            verticalWeight: verticalWt,
            resultant: resultant,
            effectiveDiameter: effDia
        };
    }

    report(condDia, condWt) {
        const r = this.calculate(condDia, condWt);
        return `${this.district}: Ice=${r.iceWeight.toFixed(3)} Wind=${r.windForce.toFixed(3)} Result=${r.resultant.toFixed(3)} lb/ft`;
    }
}

export default { WindCalculator, IceCalculator, CombinedLoad, NESC_LOADING };
