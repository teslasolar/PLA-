# NESC Clearance Requirements

Reference guide for National Electrical Safety Code (NESC) clearances.

## Ground Clearances (Rule 232)

### Table 232-1: Minimum Vertical Clearances

| Surface | Open Supply <750V | Supply 750V-22kV | Supply 22kV-50kV |
|---------|------------------|------------------|------------------|
| Roads, streets | 15.5 ft | 15.5 ft | 18.0 ft |
| Driveways, parking | 15.5 ft | 15.5 ft | 18.0 ft |
| Alleys | 15.5 ft | 15.5 ft | 18.0 ft |
| Other land (pedestrian) | 12.0 ft | 15.5 ft | 18.0 ft |
| Spaces accessible to pedestrians | 12.0 ft | 15.5 ft | 18.0 ft |
| Railroad tracks | 27.0 ft | 27.0 ft | 28.5 ft |
| Water areas (sailboat) | varies | varies | varies |

### Adders for Higher Voltages

For voltages above 22kV, add:
- **22kV to 50kV**: 0.4 inches per kV above 22kV
- **Above 50kV**: Additional calculation required

### Example Calculation

For 69kV line over road:
```
Base clearance (22kV): 18.0 ft
Voltage adder: (69-22) × 0.4 in = 18.8 in = 1.57 ft
Total: 18.0 + 1.57 = 19.57 ft → Round to 20 ft
```

## Clearance Conditions

### When to Apply

Clearances must be met at:
- **Maximum sag**: Highest conductor temperature
- **Maximum swing**: High wind conditions

### Temperature Cases

| Condition | Temperature | Use |
|-----------|-------------|-----|
| Initial | Stringing temp | Installation |
| Final (no load) | 60°F (15°C) | Baseline |
| Maximum sag | Max operating temp | Clearance check |
| Ice | NESC loading district | Ice clearance |

## Joint-Use Clearances (Rule 235)

### Communication Space

| Item | Minimum |
|------|---------|
| Supply to communication | 40 inches |
| Communication worker safety zone | 40 inches |
| Between communication cables | 12 inches |
| Communication to ground | 9.5-15.5 ft |

### Climbing Space

Per Rule 236, maintain adequate climbing space on poles:
- 30 inches minimum
- Free of obstructions

## Horizontal Clearances (Rule 234)

### To Buildings

| Voltage | Horizontal | Vertical above roof |
|---------|------------|---------------------|
| <300V | 3 ft | 8 ft |
| 300-750V | 4.5 ft | 8 ft |
| >750V | 4.5 ft + adder | 8 ft + adder |

### To Other Structures

| Structure Type | Open Supply |
|----------------|-------------|
| Signs, chimneys | 4.5 ft |
| Bridges | 8 ft (over), 4.5 ft (under) |
| Swimming pools | varies by voltage |

## Conductor Spacing (Rule 235)

### Between Phases

| Voltage | Minimum Spacing |
|---------|-----------------|
| <8.7kV | 12 inches + sag |
| 8.7-50kV | 15 inches + sag |

### Between Circuits

Different circuits on same structure:
- Same owner: 4.0 ft
- Different owners: 6.0 ft

## Insulator Swing

### Blowout Conditions

| Condition | Wind | Temperature | Swing Limit |
|-----------|------|-------------|-------------|
| No wind | 0 | Max operating | 0° |
| 6 psf | 6 psf | 60°F | 30° |
| High wind | Extreme | 60°F | Per design |

### Swing Envelope

```
Horizontal offset = Insulator length × sin(swing angle)
```

Clearances must be maintained at all swing positions within design limits.

## Code Examples

### JavaScript Clearance Check

```javascript
// Check clearance to ground
function checkClearance(catenaryHeight, sag, requiredClearance) {
  const actualClearance = catenaryHeight - sag;
  return {
    actual: actualClearance,
    required: requiredClearance,
    margin: actualClearance - requiredClearance,
    pass: actualClearance >= requiredClearance
  };
}

// Example: 12kV over road
const result = checkClearance(20, 4, 15.5);
console.log(result);
// { actual: 16, required: 15.5, margin: 0.5, pass: true }
```

### Python Clearance Calculator

```python
class ClearanceChecker:
    CLEARANCES = {
        'road': {'<750V': 15.5, '<22kV': 15.5, '<50kV': 18.0},
        'pedestrian': {'<750V': 12.0, '<22kV': 15.5, '<50kV': 18.0},
        'railroad': {'<750V': 27.0, '<22kV': 27.0, '<50kV': 28.5}
    }

    def get_required(self, surface, voltage_kv):
        if voltage_kv < 0.75:
            key = '<750V'
        elif voltage_kv < 22:
            key = '<22kV'
        else:
            key = '<50kV'
        return self.CLEARANCES.get(surface, {}).get(key, 15.5)

    def voltage_adder(self, voltage_kv):
        if voltage_kv <= 22:
            return 0
        return (voltage_kv - 22) * 0.4 / 12  # Convert inches to feet

checker = ClearanceChecker()
base = checker.get_required('road', 35)
adder = checker.voltage_adder(35)
print(f"Required clearance: {base + adder:.2f} ft")
```

## Quick Reference

### Common Voltage Clearances (Road/Street)

| Voltage | Clearance |
|---------|-----------|
| 120/240V | 15.5 ft |
| 4.8 kV | 15.5 ft |
| 12.47 kV | 15.5 ft |
| 25 kV | 18.5 ft |
| 34.5 kV | 18.7 ft |
| 69 kV | 20.0 ft |
| 115 kV | 21.5 ft |
| 230 kV | 24.5 ft |

### Critical Values to Remember

- **40 inches**: Supply to communication space
- **15.5 ft**: General ground clearance (<22kV)
- **18 ft**: Ground clearance (22-50kV)
- **27 ft**: Railroad crossing
- **0.4 in/kV**: Voltage adder above 22kV

## References

- NESC 2023 Edition
- IEEE C2-2023
- ANSI O5.1 (Pole specifications)
- RUS Bulletin 1724E-150 series
