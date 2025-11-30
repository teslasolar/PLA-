# Catenary API Reference

The `CatenaryCurve` class provides precise sag-tension calculations for power line conductors.

## Class: CatenaryCurve

### Constructor

```javascript
new CatenaryCurve(span, sag, weight?, heightDiff?)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `span` | number | required | Horizontal distance between supports (m) |
| `sag` | number | required | Maximum vertical sag (m) |
| `weight` | number | 1.5 | Conductor weight per unit length (kg/m) |
| `heightDiff` | number | 0 | Height difference between supports (m) |

**Example:**

```javascript
// Level span
const catenary = new CatenaryCurve(50, 2.5, 1.5);

// Inclined span
const inclined = new CatenaryCurve(50, 2.5, 1.5, 5);
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `span` | number | Span length (m) |
| `sag` | number | Sag depth (m) |
| `weight` | number | Weight per meter (kg/m) |
| `heightDiff` | number | Height difference (m) |
| `a` | number | Catenary constant (m) |

### Methods

#### getY(x)

Get vertical position at horizontal position.

```javascript
const y = catenary.getY(25); // Sag at midspan
```

**Parameters:**
- `x` (number): Position along span (0 to span)

**Returns:** number - Vertical position (negative is down)

---

#### getPoints(segments?)

Get array of points along the curve.

```javascript
const points = catenary.getPoints(50);
// [{x: 0, y: 0}, {x: 1, y: -0.02}, ...]
```

**Parameters:**
- `segments` (number, default: 50): Number of segments

**Returns:** Array<{x: number, y: number}>

---

#### getHorizontalTension()

Calculate horizontal component of tension.

```javascript
const H = catenary.getHorizontalTension(); // Newtons
```

**Returns:** number - Horizontal tension (N)

**Formula:**
```
H = a × w × g
where:
  a = catenary constant
  w = weight per meter
  g = 9.81 m/s²
```

---

#### getTensionAt(x)

Get total tension at any point along the curve.

```javascript
const tension = catenary.getTensionAt(0); // At support
const midTension = catenary.getTensionAt(25); // At midspan
```

**Parameters:**
- `x` (number): Position along span

**Returns:** number - Total tension (N)

---

#### getMaxTension()

Get maximum tension (at supports).

```javascript
const Tmax = catenary.getMaxTension();
```

**Returns:** number - Maximum tension (N)

---

#### getLength()

Calculate conductor arc length.

```javascript
const length = catenary.getLength();
const extraLength = length - catenary.span;
```

**Returns:** number - Arc length (m)

**Formula:**
```
S = 2a × sinh(L/2a)
```

---

#### getLowPointX()

Get horizontal position of lowest point.

```javascript
const lowPoint = catenary.getLowPointX();
// For level spans: span/2
// For inclined: shifted toward lower support
```

**Returns:** number - X position of low point (m)

---

#### getMaxSag()

Get sag at lowest point.

```javascript
const maxSag = catenary.getMaxSag();
```

**Returns:** number - Maximum sag (m)

---

#### getClearance(x, attachmentHeight, groundElevation?)

Calculate clearance to ground at position.

```javascript
const clearance = catenary.getClearance(25, 15, 0);
// Clearance at midspan, 15m attachment height
```

**Parameters:**
- `x` (number): Position along span
- `attachmentHeight` (number): Height of conductor at supports (m)
- `groundElevation` (number, default: 0): Ground elevation at x

**Returns:** number - Clearance (m)

---

#### findMinClearance(attachmentHeight, groundProfile?)

Find minimum clearance along span.

```javascript
// Flat ground
const min = catenary.findMinClearance(15);

// With terrain profile
const minWithTerrain = catenary.findMinClearance(15, x => x * 0.1);
```

**Parameters:**
- `attachmentHeight` (number): Height at supports
- `groundProfile` (function, optional): Function returning ground elevation at x

**Returns:** {x: number, clearance: number}

---

#### atTemperature(currentTemp, newTemp, alpha?, E?, A?)

Calculate catenary at different temperature.

```javascript
const hotCurve = catenary.atTemperature(15, 40);
const coldCurve = catenary.atTemperature(15, -10);
```

**Parameters:**
- `currentTemp` (number): Current temperature (°C)
- `newTemp` (number): New temperature (°C)
- `alpha` (number, default: 23e-6): Thermal expansion coefficient (1/°C)
- `E` (number, default: 70e9): Modulus of elasticity (Pa)
- `A` (number, default: 400e-6): Cross-sectional area (m²)

**Returns:** CatenaryCurve - New catenary at temperature

---

#### toJSON()

Export curve data.

```javascript
const data = catenary.toJSON();
/*
{
  span: 50,
  sag: 2.5,
  weight: 1.5,
  heightDiff: 0,
  catenaryConstant: 125.08,
  horizontalTension: 1840.5,
  maxTension: 1856.2,
  length: 50.167,
  lowPointX: 25
}
*/
```

## Class: RulingSpan

Calculate ruling span for line sections.

### Static Methods

#### calculate(spans)

Calculate exact ruling span.

```javascript
const spans = [250, 300, 275, 350, 280];
const Rs = RulingSpan.calculate(spans); // 294.8
```

**Formula:**
```
Rs = √(Σ(Li³) / Σ(Li))
```

---

#### estimate(spans)

Quick estimate using rule of thumb.

```javascript
const Rs = RulingSpan.estimate(spans);
```

**Formula:**
```
Se = Average + (2/3)(Maximum - Average)
```

## Class: InsulatorSwing

Calculate insulator swing angles.

### Static Methods

#### calculateSwing(horizontalLoad, verticalLoad)

Calculate I-string swing angle.

```javascript
const angle = InsulatorSwing.calculateSwing(500, 1000);
// 26.57 degrees
```

**Returns:** number - Swing angle (degrees)

---

#### getOffset(insulatorLength, swingAngle)

Calculate horizontal offset due to swing.

```javascript
const offset = InsulatorSwing.getOffset(1.5, 30);
// 0.75 m
```

## Examples

### Basic Sag-Tension

```javascript
const span = 60;  // meters
const sag = 3.0;  // meters
const weight = 1.8;  // kg/m

const catenary = new CatenaryCurve(span, sag, weight);

console.log('Horizontal Tension:', catenary.getHorizontalTension(), 'N');
console.log('Max Tension:', catenary.getMaxTension(), 'N');
console.log('Conductor Length:', catenary.getLength(), 'm');
```

### Temperature Effects

```javascript
// Stringing at 15°C
const stringing = new CatenaryCurve(100, 4, 2.0);

// Hot day (40°C) - more sag
const hot = stringing.atTemperature(15, 40);
console.log('Hot sag:', hot.sag, 'm');

// Cold day (-10°C) - less sag
const cold = stringing.atTemperature(15, -10);
console.log('Cold sag:', cold.sag, 'm');
```

### Clearance Analysis

```javascript
const catenary = new CatenaryCurve(80, 4, 1.5);

// Check clearance above road at midspan
const clearance = catenary.getClearance(40, 18);
const required = 5.64; // meters (18.5 ft)

if (clearance >= required) {
  console.log('PASS:', clearance.toFixed(2), 'm clearance');
} else {
  console.log('FAIL: Need', required - clearance, 'm more');
}
```

### Three.js Integration

```javascript
// Get points for Three.js
const catenary = new CatenaryCurve(50, 2.5);
const points = catenary.getPoints(50);

const vectors = points.map(p => new THREE.Vector3(
  start.x + (end.x - start.x) * (p.x / 50),
  start.y + p.y,
  start.z + (end.z - start.z) * (p.x / 50)
));

const curve = new THREE.CatmullRomCurve3(vectors);
```
