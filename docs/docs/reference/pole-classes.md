# Pole Class Reference

Wood pole classifications per ANSI O5.1.

## Class Definitions

Poles are classified by minimum ground-line circumference and bending moment capacity.

### Class Table

| Class | Ground-Line Moment (lb-ft) | Min Top Circ (in) | Typical Use |
|-------|---------------------------|-------------------|-------------|
| H6 | 19,800 | 33.5 | Heavy transmission |
| H5 | 16,000 | 31.0 | Transmission |
| H4 | 12,400 | 29.0 | Transmission |
| H3 | 10,000 | 27.0 | Transmission |
| H2 | 8,000 | 25.0 | Sub-transmission |
| H1 | 6,400 | 23.0 | Sub-transmission |
| 1 | 4,500 | 21.0 | Primary distribution |
| 2 | 3,700 | 19.5 | Primary distribution |
| 3 | 3,000 | 18.0 | Primary distribution |
| 4 | 2,400 | 17.0 | Secondary |
| 5 | 1,900 | 15.0 | Services |
| 6 | 1,500 | 14.0 | Services |
| 7 | 1,200 | 13.0 | Services |

## Pole Lengths

Standard lengths and setting depths:

| Total Length (ft) | Setting Depth (ft) | Height Above Ground (ft) |
|-------------------|--------------------|-----------------------|
| 25 | 5.0 | 20.0 |
| 30 | 5.5 | 24.5 |
| 35 | 6.0 | 29.0 |
| 40 | 6.0 | 34.0 |
| 45 | 6.5 | 38.5 |
| 50 | 7.0 | 43.0 |
| 55 | 7.5 | 47.5 |
| 60 | 8.0 | 52.0 |
| 65 | 8.5 | 56.5 |
| 70 | 9.0 | 61.0 |
| 75 | 9.5 | 65.5 |
| 80 | 10.0 | 70.0 |

**Setting Depth Rule:** 10% of length + 2 feet (minimum 5 feet)

## Wood Species

### Southern Pine (Most Common)

| Property | Value |
|----------|-------|
| Fiber stress | 8,000 psi |
| Modulus of elasticity | 1.8×10⁶ psi |
| Density | 50 lb/ft³ |
| Taper | 0.15 in/ft |

### Douglas Fir

| Property | Value |
|----------|-------|
| Fiber stress | 8,000 psi |
| Modulus of elasticity | 1.7×10⁶ psi |
| Density | 45 lb/ft³ |
| Taper | 0.16 in/ft |

### Western Red Cedar

| Property | Value |
|----------|-------|
| Fiber stress | 6,000 psi |
| Modulus of elasticity | 1.1×10⁶ psi |
| Density | 23 lb/ft³ |
| Taper | 0.14 in/ft |

## Circumference Requirements

### At Ground Line

| Class | 25 ft | 30 ft | 35 ft | 40 ft | 45 ft | 50 ft |
|-------|-------|-------|-------|-------|-------|-------|
| 1 | 28.0 | 29.5 | 31.0 | 32.5 | 34.0 | 35.5 |
| 2 | 26.5 | 28.0 | 29.5 | 31.0 | 32.0 | 33.5 |
| 3 | 25.0 | 26.5 | 28.0 | 29.0 | 30.5 | 31.5 |
| 4 | 23.5 | 25.0 | 26.0 | 27.5 | 28.5 | 30.0 |
| 5 | 21.5 | 23.0 | 24.0 | 25.5 | 26.5 | 27.5 |

*Values in inches, for Southern Pine*

## Pole Strength Calculation

### Ground-Line Moment Capacity

```
M = S × f
where:
  M = moment capacity (lb-in)
  S = section modulus (in³)
  f = allowable fiber stress (psi)
```

### Section Modulus (Round Pole)

```
S = π × c³ / 32
where:
  c = circumference at ground line
```

### Fiber Stress Reduction

Apply reduction factors for:
- Knots and defects
- Age and condition
- Treatment method

## Selection Criteria

### Load Factors

| Structure Type | Factor |
|----------------|--------|
| Tangent | 1.0 |
| Small angle (<15°) | 1.2-1.5 |
| Large angle (>15°) | 1.5-2.0 |
| Dead-end | 2.0-2.5 |
| Corner | 2.5-3.0 |

### Selection Process

1. Calculate applied moment at ground line
2. Apply NESC overload factors
3. Compare to pole class capacities
4. Select smallest class that passes
5. Consider future loading expansion

## Code Example

```javascript
const POLE_CLASSES = {
  'H1': { moment: 6400, topCirc: 23.0 },
  'H2': { moment: 8000, topCirc: 25.0 },
  '1': { moment: 4500, topCirc: 21.0 },
  '2': { moment: 3700, topCirc: 19.5 },
  '3': { moment: 3000, topCirc: 18.0 },
  '4': { moment: 2400, topCirc: 17.0 },
  '5': { moment: 1900, topCirc: 15.0 }
};

function selectPoleClass(requiredMoment, safetyFactor = 1.0) {
  const target = requiredMoment * safetyFactor;

  const sorted = Object.entries(POLE_CLASSES)
    .sort((a, b) => a[1].moment - b[1].moment);

  for (const [className, specs] of sorted) {
    if (specs.moment >= target) {
      return className;
    }
  }

  return 'H6'; // Largest available
}

// Example
const required = 2800; // lb-ft
const recommended = selectPoleClass(required, 1.2);
console.log(`Recommended: Class ${recommended}`);
```

## Quick Reference

### Minimum Classes by Application

| Application | Min Class |
|-------------|-----------|
| 69kV Transmission | H2-H4 |
| 34.5kV Sub-transmission | H1-1 |
| 12.47kV Distribution | 2-3 |
| 4.8kV Distribution | 3-4 |
| Secondary/Service | 5-7 |

### Guy Requirements

| Class | Typically Guyed |
|-------|-----------------|
| H classes | Yes |
| 1-2 | Often |
| 3-4 | Sometimes |
| 5-7 | Rarely |
