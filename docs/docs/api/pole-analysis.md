# Pole Analysis API Reference

The `PoleAnalysis` class provides structural analysis for utility poles per NESC standards.

## Class: PoleAnalysis

### Constructor

```javascript
new PoleAnalysis(config)
```

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `height` | number | 45 | Total pole height (ft) |
| `poleClass` | string | '2' | Pole class (H6-H1, 1-7) |
| `material` | string | 'wood' | Material type |
| `species` | string | 'southern_pine' | Wood species |
| `embedDepth` | number | auto | Setting depth (ft) |
| `topDiameter` | number | auto | Top diameter (in) |
| `groundDiameter` | number | auto | Ground-line diameter (in) |

**Example:**

```javascript
const pole = new PoleAnalysis({
  height: 45,
  poleClass: '2',
  material: 'wood',
  species: 'southern_pine'
});
```

### Methods

#### addLoad(load)

Add a general load to the pole.

```javascript
pole.addLoad({
  type: 'point',        // 'point', 'distributed', 'moment'
  direction: 'transverse', // 'transverse', 'longitudinal', 'vertical'
  magnitude: 500,       // N or N/m
  height: 40,           // ft above ground
  description: 'Wind on conductor'
});
```

---

#### addConductorLoad(params)

Add conductor loading (convenience method).

```javascript
pole.addConductorLoad({
  windSpan: 300,        // ft
  weightSpan: 300,      // ft
  windPressure: 4,      // psf (NESC)
  conductorDiameter: 0.5, // inches
  conductorWeight: 0.3,  // lb/ft
  iceThickness: 0.5,    // inches
  attachmentHeight: 40, // ft
  tension: 5000,        // lb (for angles)
  lineAngle: 15         // degrees
});
```

**Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `windSpan` | 300 | Wind span (ft) |
| `weightSpan` | 300 | Weight span (ft) |
| `windPressure` | 4 | Wind pressure (psf) |
| `conductorDiameter` | 0.5 | Conductor diameter (in) |
| `conductorWeight` | 0.3 | Weight per ft (lb/ft) |
| `iceThickness` | 0 | Radial ice (in) |
| `attachmentHeight` | auto | Height above ground (ft) |
| `tension` | 0 | Line tension (lb) |
| `lineAngle` | 0 | Line angle (degrees) |

---

#### addPoleWindLoad(windPressure?)

Add wind load on the pole itself.

```javascript
pole.addPoleWindLoad(4); // 4 psf
```

---

#### calculateGroundLineMoment()

Calculate total moment at ground line.

```javascript
const moment = pole.calculateGroundLineMoment();
// Returns: lb-ft
```

---

#### getPoleCapacity()

Get allowable moment from pole class specifications.

```javascript
const capacity = pole.getPoleCapacity();
// Returns: lb-ft
```

---

#### calculateUtilization(grade?, atCrossing?)

Calculate utilization ratio with NESC factors.

```javascript
const util = pole.calculateUtilization('C', false);
// Returns: percentage (e.g., 85.5)
```

**Parameters:**
- `grade` (string): Construction grade ('B', 'C', 'N')
- `atCrossing` (boolean): Whether at crossing location

---

#### analyze(options?)

Run full structural analysis.

```javascript
const result = pole.analyze({
  grade: 'C',
  atCrossing: false
});
```

**Returns:**

```javascript
{
  poleClass: '2',
  height: 45,
  embedDepth: 6.5,
  heightAboveGround: 38.5,
  groundLineMoment: 12500,  // lb-ft
  capacity: 3700,           // lb-ft
  utilization: 84.5,        // %
  deflection: 2.3,          // inches
  status: 'PASS',           // or 'FAIL'
  loads: 5,
  grade: 'C',
  atCrossing: false
}
```

---

#### recommendPoleClass(safetyMargin?)

Recommend smallest adequate pole class.

```javascript
const recommended = pole.recommendPoleClass(20);
// Returns: '1' (with 20% margin)
```

---

#### generateReport()

Generate formatted analysis report.

```javascript
const report = pole.generateReport();
console.log(report);
```

**Output:**

```
POLE STRUCTURAL ANALYSIS REPORT
================================

Pole Specifications:
  Class: 2
  Total Height: 45 ft
  Setting Depth: 6.5 ft
  Height Above Ground: 38.5 ft
  Material: wood (southern_pine)

Applied Loads:
  - Conductor at 40ft: 180.0 lb @ 40 ft
  - Conductor weight at 40ft: 90.0 lb @ 40 ft
  - Wind on pole: 25.0 lb @ 19.25 ft

Analysis Results:
  Ground-Line Moment: 8055 lb-ft
  Pole Capacity: 3700 lb-ft
  Utilization: 54.5%
  Est. Deflection: 1.82 inches

Construction Grade: C
At Crossing: No

STATUS: PASS ✓
```

## Class: GuyWireAnalysis

Calculate guy wire requirements.

### Static Methods

#### calculate(moment, attachHeight, leadDistance)

Calculate guy wire tension and sizing.

```javascript
const guy = GuyWireAnalysis.calculate(10000, 35, 35);
```

**Parameters:**
- `moment` (number): Overturning moment (lb-ft)
- `attachHeight` (number): Guy attachment height (ft)
- `leadDistance` (number): Lead to anchor (ft)

**Returns:**

```javascript
{
  angle: 45,              // degrees from vertical
  horizontalForce: 285.7, // lb
  guyTension: 404.1,      // lb
  anchorLoad: 404.1,      // lb
  recommended: {
    '3/8 EHS': true,      // <10,000 lb
    '7/16 EHS': true,     // <16,000 lb
    '1/2 EHS': true       // <26,000 lb
  }
}
```

## Class: WindLoadCalculator

Wind and ice load calculations.

### Static Methods

#### pressureFromVelocity(velocity)

Convert wind velocity to pressure.

```javascript
const pressure = WindLoadCalculator.pressureFromVelocity(90);
// 20.7 psf (for 90 mph wind)
```

**Formula:**
```
q = 0.00256 × V²
```

---

#### combinedIceWind(iceThickness, windPressure, conductorDiameter)

Calculate NESC combined ice and wind load.

```javascript
const load = WindLoadCalculator.combinedIceWind(0.5, 4, 0.5);
```

**Returns:**

```javascript
{
  iceWeight: 0.622,    // lb/ft
  windForce: 0.5,      // lb/ft
  resultant: 0.798     // lb/ft (combined vector)
}
```

## Constants

### POLE_CLASSES

Wood pole specifications per ANSI O5.1:

```javascript
POLE_CLASSES = {
  'H6': { momentCapacity: 19800, minTopCirc: 33.5 },
  'H5': { momentCapacity: 16000, minTopCirc: 31.0 },
  'H4': { momentCapacity: 12400, minTopCirc: 29.0 },
  'H3': { momentCapacity: 10000, minTopCirc: 27.0 },
  'H2': { momentCapacity: 8000, minTopCirc: 25.0 },
  'H1': { momentCapacity: 6400, minTopCirc: 23.0 },
  '1': { momentCapacity: 4500, minTopCirc: 21.0 },
  '2': { momentCapacity: 3700, minTopCirc: 19.5 },
  '3': { momentCapacity: 3000, minTopCirc: 18.0 },
  '4': { momentCapacity: 2400, minTopCirc: 17.0 },
  '5': { momentCapacity: 1900, minTopCirc: 15.0 },
  '6': { momentCapacity: 1500, minTopCirc: 14.0 },
  '7': { momentCapacity: 1200, minTopCirc: 13.0 }
}
```

### NESC_OVERLOAD_FACTORS

Overload capacity factors per NESC Table 253-1:

```javascript
NESC_OVERLOAD_FACTORS = {
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
}
```

## Examples

### Complete Pole Analysis

```javascript
// Create pole
const pole = new PoleAnalysis({
  height: 45,
  poleClass: '2'
});

// Add conductors (3-phase)
for (let phase = 0; phase < 3; phase++) {
  pole.addConductorLoad({
    windSpan: 300,
    weightSpan: 300,
    attachmentHeight: 40 - phase * 2
  });
}

// Add neutral
pole.addConductorLoad({
  windSpan: 300,
  weightSpan: 300,
  attachmentHeight: 30
});

// Add wind on pole
pole.addPoleWindLoad(4);

// Analyze
const result = pole.analyze({ grade: 'C' });

if (result.status === 'FAIL') {
  const newClass = pole.recommendPoleClass(15);
  console.log(`Upgrade to Class ${newClass}`);
}
```

### Guy Design

```javascript
// Dead-end structure with high tension
const moment = 25000; // lb-ft
const attachHeight = 35; // ft

// Try different guy angles
for (const lead of [25, 30, 35, 40]) {
  const guy = GuyWireAnalysis.calculate(moment, attachHeight, lead);
  console.log(`Lead ${lead}ft: Tension ${guy.guyTension.toFixed(0)}lb at ${guy.angle.toFixed(1)}°`);
}
```

### NESC Heavy Loading

```javascript
// NESC Heavy loading district
const iceThickness = 0.5; // inches
const windPressure = 4;   // psf at 40 mph
const conductorDia = 0.72; // inches (336.4 ACSR)

const load = WindLoadCalculator.combinedIceWind(iceThickness, windPressure, conductorDia);

console.log(`Ice weight: ${load.iceWeight.toFixed(3)} lb/ft`);
console.log(`Wind force: ${load.windForce.toFixed(3)} lb/ft`);
console.log(`Resultant: ${load.resultant.toFixed(3)} lb/ft`);
```
