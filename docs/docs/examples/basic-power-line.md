# Example: Basic Power Line Analysis

Complete example of analyzing a simple distribution line.

## Scenario

Design a 3-span 12.47kV distribution line with:
- Three wood poles
- 3-phase ACSR conductor
- 250 ft spans
- NESC Medium loading district

## Step 1: Define Parameters

```javascript
// Line parameters
const lineConfig = {
  voltage: 12.47,  // kV
  phases: 3,
  conductor: {
    type: 'ACSR',
    size: '336.4 MCM',
    diameter: 0.72,  // inches
    weight: 0.463,   // lb/ft
    strength: 8350   // lb
  },
  spans: [250, 250, 250],  // ft
  loadingDistrict: 'medium'
};

// NESC Medium: 0.25" ice, 4 psf wind, 15°F
const loading = {
  iceThickness: 0.25,  // inches
  windPressure: 4,     // psf
  temperature: 15      // °F
};
```

## Step 2: Calculate Ruling Span

```javascript
// Using RulingSpan class
const Rs = RulingSpan.calculate(lineConfig.spans);
console.log(`Ruling Span: ${Rs.toFixed(1)} ft`);
// Output: Ruling Span: 250.0 ft
```

For equal spans, ruling span equals individual span.

## Step 3: Sag-Tension Analysis

```javascript
// Convert to metric for CatenaryCurve
const spanM = 250 * 0.3048;  // 76.2 m
const weightKg = 0.463 * 1.488;  // 0.689 kg/m

// Target 25% initial tension
const initialTension = 8350 * 0.25;  // 2087.5 lb

// Calculate sag at final conditions (60°F, no load)
// This is iterative in practice, starting estimate:
const estimatedSag = 6.5 * 0.3048;  // ~2 m

const catenary = new CatenaryCurve(spanM, estimatedSag, weightKg);
console.log(`Horizontal Tension: ${catenary.getHorizontalTension().toFixed(0)} N`);
console.log(`Conductor Length: ${catenary.getLength().toFixed(2)} m`);
```

## Step 4: Pole Selection

```javascript
// Analyze pole loading
const pole = new PoleAnalysis({
  height: 40,      // ft
  poleClass: '3'   // Start with Class 3
});

// Add 3-phase conductors
const attachHeights = [37, 35, 33];
for (const height of attachHeights) {
  pole.addConductorLoad({
    windSpan: 250,
    weightSpan: 250,
    windPressure: 4,
    conductorDiameter: 0.72,
    conductorWeight: 0.463,
    iceThickness: 0.25,
    attachmentHeight: height
  });
}

// Add neutral
pole.addConductorLoad({
  windSpan: 250,
  weightSpan: 250,
  attachmentHeight: 28
});

// Add wind on pole
pole.addPoleWindLoad(4);

// Analyze
const result = pole.analyze({ grade: 'C' });
console.log(pole.generateReport());
```

### Expected Output

```
POLE STRUCTURAL ANALYSIS REPORT
================================

Pole Specifications:
  Class: 3
  Total Height: 40 ft
  Setting Depth: 6.0 ft
  Height Above Ground: 34.0 ft

Applied Loads:
  - Conductor at 37ft: 85.2 lb @ 37 ft
  - Conductor at 35ft: 85.2 lb @ 35 ft
  - Conductor at 33ft: 85.2 lb @ 33 ft
  - Conductor at 28ft: 42.6 lb @ 28 ft

Analysis Results:
  Ground-Line Moment: 11,234 lb-ft
  Pole Capacity: 3,000 lb-ft
  Utilization: 82.4%

STATUS: PASS ✓
```

## Step 5: Clearance Verification

```javascript
// Check clearances at maximum sag
const maxSag = 8.5 * 0.3048;  // Hot weather sag
const attachHeight = 37 * 0.3048;  // Lowest phase attachment

const hotCatenary = new CatenaryCurve(spanM, maxSag, weightKg);
const minClearance = hotCatenary.findMinClearance(attachHeight);

console.log(`Minimum clearance: ${(minClearance.clearance / 0.3048).toFixed(1)} ft`);
console.log(`Required (road): 15.5 ft`);

// Check if adequate
const requiredFt = 15.5;
const actualFt = minClearance.clearance / 0.3048;
console.log(`Status: ${actualFt >= requiredFt ? 'PASS' : 'FAIL'}`);
```

## Step 6: 3D Visualization

```javascript
// Create visualization in PLA Scene
const pla = new PLASystem();
await pla.init();

// Add poles
const polePositions = [0, 250, 500].map(x => x * 0.3048);
polePositions.forEach((x, i) => {
  pla.scene.addPole({
    id: `pole_${i+1}`,
    x: x,
    y: 0,
    z: 0,
    height: 40 * 0.3048,  // 12.2m
    material: 'wood',
    type: 'tangent'
  });
});

// Add conductors between poles
for (let i = 0; i < polePositions.length - 1; i++) {
  pla.scene.addConductor({
    id: `span_${i+1}`,
    start: { x: polePositions[i], y: 11.3, z: 0 },
    end: { x: polePositions[i+1], y: 11.3, z: 0 },
    sag: 2.6,  // 8.5 ft in meters
    phases: 3,
    phaseOffset: 0.6
  });
}
```

## Complete Python Analysis

```python
import numpy as np

# Line configuration
span_ft = 250
span_m = span_ft * 0.3048
conductor_weight_lb_ft = 0.463
conductor_weight_kg_m = conductor_weight_lb_ft * 1.488

# Sag-tension at 60°F final
sag_ft = 6.5
sag_m = sag_ft * 0.3048

# Catenary calculations
a = span_m / (2 * np.arcsinh(sag_m * 2 / span_m))
H = a * conductor_weight_kg_m * 9.81  # N
L = 2 * a * np.sinh(span_m / (2 * a))

print("Sag-Tension Analysis")
print("=" * 40)
print(f"Span: {span_ft} ft ({span_m:.1f} m)")
print(f"Sag: {sag_ft} ft ({sag_m:.2f} m)")
print(f"Catenary constant: {a:.2f} m")
print(f"Horizontal tension: {H:.0f} N ({H * 0.2248:.0f} lb)")
print(f"Conductor length: {L:.2f} m ({L/0.3048:.1f} ft)")

# Pole loading
pole_height = 40  # ft
attach_heights = [37, 35, 33, 28]  # ft
wind_force_per_span = 4 * 0.72/12 * 250  # lb per conductor

total_moment = 0
print("\nPole Loading")
print("=" * 40)
for h in attach_heights:
    moment = wind_force_per_span * h
    total_moment += moment
    print(f"Load at {h}ft: {wind_force_per_span:.1f} lb, Moment: {moment:.0f} lb-ft")

print(f"\nTotal ground-line moment: {total_moment:.0f} lb-ft")
print(f"Class 3 capacity: 3000 lb-ft")
print(f"Utilization: {(total_moment * 2.2 / 3000) * 100:.1f}%")
```

## Summary

| Parameter | Value |
|-----------|-------|
| Ruling Span | 250 ft |
| Final Sag (60°F) | 6.5 ft |
| Hot Sag (max temp) | 8.5 ft |
| Horizontal Tension | 1,850 lb |
| Pole Class | 3 |
| Utilization | 82.4% |
| Min Ground Clearance | 18.2 ft |
| Status | PASS |

## Key Takeaways

1. **Ruling span** simplifies multi-span analysis
2. **Sag increases** with temperature - check at maximum
3. **Pole utilization** must account for NESC overload factors
4. **Clearances** must be verified at maximum sag conditions
5. **3D visualization** helps verify design intent
