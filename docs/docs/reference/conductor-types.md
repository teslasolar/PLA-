# Conductor Types Reference

Common conductor types used in power line design.

## ACSR - Aluminum Conductor Steel Reinforced

Most common transmission/distribution conductor.

### Structure
- Aluminum outer strands (conductivity)
- Steel core (strength)

### Common Sizes

| Name | Size (MCM) | Diameter (in) | Weight (lb/ft) | Strength (lb) |
|------|-----------|---------------|----------------|---------------|
| Raven | 1/0 | 0.398 | 0.145 | 1,900 |
| Penguin | 4/0 | 0.563 | 0.291 | 3,550 |
| Partridge | 266.8 | 0.642 | 0.367 | 6,880 |
| Linnet | 336.4 | 0.720 | 0.463 | 8,350 |
| Oriole | 336.4 | 0.741 | 0.479 | 11,300 |
| Dove | 556.5 | 0.927 | 0.765 | 14,100 |
| Drake | 795 | 1.108 | 1.094 | 22,100 |
| Cardinal | 954 | 1.196 | 1.229 | 23,800 |

### Stranding

| Size Class | Aluminum | Steel | Example |
|------------|----------|-------|---------|
| Small | 6 | 1 | 6/1 |
| Medium | 26 | 7 | 26/7 |
| Large | 54 | 7 | 54/7 |
| Extra Large | 84 | 19 | 84/19 |

## AAC - All Aluminum Conductor

### Characteristics
- 61% IACS conductivity
- Lower strength than ACSR
- Lower cost
- Lighter weight

### Common Uses
- Distribution lines
- Urban areas (low spans)
- Short spans

### Common Sizes

| Name | Size (MCM) | Diameter (in) | Weight (lb/ft) |
|------|-----------|---------------|----------------|
| Poplar | 4/0 | 0.522 | 0.209 |
| Tulip | 336.4 | 0.666 | 0.338 |
| Magnolia | 556.5 | 0.858 | 0.559 |

## AAAC - All Aluminum Alloy Conductor

### Characteristics
- 6201-T81 aluminum alloy
- Higher strength than AAC
- Similar conductivity to AAC
- Corrosion resistant

### Common Uses
- Coastal areas
- Industrial environments
- Medium spans

## OPGW - Optical Ground Wire

### Structure
- Optical fiber core
- Aluminum tubes protecting fibers
- Steel armor wires
- Aluminum-clad steel wires

### Functions
1. Shield wire (lightning protection)
2. Communication pathway
3. Ground fault current return

### Design Considerations
- Fiber count (12, 24, 48, 96)
- Sag must match phase conductors
- Temperature limits for fiber

## Conductor Selection Guide

### By Application

| Application | Recommended |
|-------------|-------------|
| Transmission (long span) | ACSR, ACSS |
| Distribution (urban) | AAC, AAAC |
| Coastal/corrosive | AAAC |
| River crossings | ACSR high-strength |
| Communication | OPGW |

### By Span Length

| Span | Conductor Type |
|------|----------------|
| <200 ft | AAC, AAAC |
| 200-400 ft | ACSR medium |
| 400-800 ft | ACSR large |
| >800 ft | ACSR high-strength |

## Material Properties

### Aluminum

| Property | Value |
|----------|-------|
| Conductivity | 61% IACS |
| Density | 0.0977 lb/in³ |
| Thermal expansion | 23×10⁻⁶ /°C |
| Modulus (E) | 10×10⁶ psi |

### Steel (Core)

| Property | Value |
|----------|-------|
| Density | 0.283 lb/in³ |
| Thermal expansion | 11.5×10⁻⁶ /°C |
| Modulus (E) | 29×10⁶ psi |

## Ampacity

Approximate current carrying capacity at 75°C rise:

| Size (MCM) | ACSR (A) | AAC (A) |
|-----------|----------|---------|
| 1/0 | 230 | 215 |
| 4/0 | 340 | 315 |
| 336.4 | 530 | 490 |
| 556.5 | 730 | 670 |
| 795 | 900 | 830 |

*Values depend on ambient conditions*

## Code Example

```javascript
const CONDUCTORS = {
  'Drake': {
    type: 'ACSR',
    size: 795,
    diameter: 1.108,
    weight: 1.094,
    strength: 22100,
    stranding: '26/7'
  },
  'Linnet': {
    type: 'ACSR',
    size: 336.4,
    diameter: 0.720,
    weight: 0.463,
    strength: 8350,
    stranding: '26/7'
  }
};

function getConductor(name) {
  return CONDUCTORS[name];
}
```
