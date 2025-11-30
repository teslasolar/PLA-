# eVGPU API Reference

Electronic Virtual GPU - CPU-based tensor operations for PLA calculations.

## Class: eVGPU

### Constructor

```javascript
new eVGPU(cores?)
```

**Parameters:**
- `cores` (number, default: 4): Number of CPU cores to utilize

### Methods

#### tensor(a, b?, op)

Perform tensor operations.

```javascript
const evgpu = new eVGPU();
const result = evgpu.tensor(matrixA, matrixB, '@');
```

**Operations:**

| Op | Description | Example |
|----|-------------|---------|
| `@` | Matrix multiplication | `tensor(A, B, '@')` |
| `+` | Element-wise addition | `tensor(A, B, '+')` |
| `*` | Element-wise multiply | `tensor(A, B, '*')` |
| `T` | Transpose | `tensor(A, null, 'T')` |
| `σ` | Sigmoid activation | `tensor(A, null, 'σ')` |
| `relu` | ReLU activation | `tensor(A, null, 'relu')` |

---

#### matmul(a, b)

Optimized matrix multiplication with cache tiling.

```javascript
const C = evgpu.matmul(A, B);
```

---

#### catenary(span, sag, segments?)

Calculate catenary curve points.

```javascript
const points = evgpu.catenary(50, 2.5, 50);
// Returns Float64Array [x0, y0, x1, y1, ...]
```

---

#### windPressure(velocity, diameter, span)

Calculate wind load on conductor.

```javascript
const result = evgpu.windPressure(25, 25, 50);
// { pressure, forcePerMeter, totalForce }
```

---

#### poleBendingMoment(forces)

Calculate total bending moment.

```javascript
const forces = [
  { force: 500, height: 12 },
  { force: 300, height: 10 }
];
const moment = evgpu.poleBendingMoment(forces);
```

---

#### getMetrics()

Get performance statistics.

```javascript
const metrics = evgpu.getMetrics();
// { operations, cacheHits, totalTime, avgTime, cacheHitRate }
```

---

#### reset()

Clear cache and reset metrics.

## Performance Features

1. **Cache Tiling**: 32x32 tiles for cache efficiency
2. **Result Caching**: LRU cache for repeated operations
3. **SIMD Hints**: Float64Array for potential SIMD optimization
4. **Vectorization**: Operations designed for vectorization

## Example

```javascript
const evgpu = new eVGPU(navigator.hardwareConcurrency);

// Matrix multiplication
const A = [[1, 2], [3, 4]];
const B = [[5, 6], [7, 8]];
const C = evgpu.tensor(A, B, '@');
// [[19, 22], [43, 50]]

// Wind calculation
const wind = evgpu.windPressure(30, 25, 100);
console.log(`Total force: ${wind.totalForce.toFixed(2)} N`);

// Performance
console.log(evgpu.getMetrics());
```
