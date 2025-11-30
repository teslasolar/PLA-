# PLA System Architecture

Technical overview of the Pole Line Analysis system architecture.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PLA SYSTEM                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   eVGPU     │  │  FemtoLLM   │  │  PLAScene   │          │
│  │ CPU Compute │  │  16-dim AI  │  │  3D Render  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│  ┌──────┴────────────────┴────────────────┴──────┐          │
│  │              PLASystem (Coordinator)           │          │
│  └──────┬────────────────┬────────────────┬──────┘          │
│         │                │                │                  │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐          │
│  │ CatenaryCurve│  │ PoleAnalysis│  │  BlockArray │          │
│  │ Sag-Tension │  │  Structural │  │  3D Grid    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. eVGPU (Electronic Virtual GPU)

CPU-based compute engine that eliminates GPU dependency.

**Features:**
- Matrix operations with cache tiling
- Vectorized catenary calculations
- Result caching (LRU)
- Multi-core utilization hints

**Location:** `core/evgpu.js`

```javascript
class eVGPU {
  constructor(cores = 4)
  tensor(a, b, op)      // Matrix operations
  matmul(a, b)          // Optimized multiply
  catenary(span, sag)   // Curve calculation
  windPressure(v, d, s) // Wind load
}
```

### 2. FemtoLLM (16-dim Nano Model)

Specialized language model for PLA domain knowledge.

**Specifications:**
- 16-dimensional hidden state
- Character-level tokenization (256 vocab)
- Embedded knowledge base
- ~4MB memory footprint

**Location:** `core/femto-llm.js`

```javascript
class FemtoLLM {
  constructor(hiddenSize = 16)
  async process(text)           // Query processing
  analyzeCatenary(span, sag)    // Catenary report
  analyzePole(class, moment)    // Pole report
}
```

### 3. BlockArray (3D Grid)

Sparse storage system for 1000³ coordinate space.

**Features:**
- Map-based sparse storage
- LLM attachment per coordinate
- Neighbor queries
- Slice extraction

**Location:** `core/block-array.js`

```javascript
class BlockArray {
  constructor(dimensions = [1000, 1000, 1000])
  set(x, y, z, value)
  get(x, y, z)
  attachLLM(x, y, z, llm)
  getNeighbors(x, y, z)
}
```

### 4. Cube (9-node Constellation)

LLM network with 8 vertices + 1 central node.

**Vertices:** NEU, NED, NWU, NWD, SEU, SED, SWU, SWD

**Features:**
- Per-vertex LLM instances
- Edge connections
- Broadcast/propagate patterns
- PackML state machine

**Location:** `core/block-array.js`

```javascript
class Cube {
  constructor(id)
  connect(v1, v2)
  async processVertex(vertex, input)
  async broadcast(input)
  async propagate(source, input)
}
```

### 5. PLAScene (3D Visualization)

Three.js-based rendering engine.

**Features:**
- Pole geometry (cylinders, crossarms)
- Catenary conductors (TubeGeometry)
- Interactive controls (OrbitControls)
- Object selection (raycasting)

**Location:** `viz/scene.js`

```javascript
class PLAScene {
  constructor(container)
  init()
  addPole(config)
  addConductor(config)
  createPowerLine(data)
}
```

## Analysis Modules

### CatenaryCurve

True catenary mathematics for sag-tension.

**Location:** `core/catenary.js`

**Key Methods:**
- `getY(x)` - Point on curve
- `getHorizontalTension()` - H value
- `getLength()` - Arc length
- `atTemperature()` - Thermal sag

### PoleAnalysis

NESC-compliant structural analysis.

**Location:** `core/pole-analysis.js`

**Key Methods:**
- `addConductorLoad()` - Apply loads
- `calculateGroundLineMoment()` - Sum moments
- `calculateUtilization()` - Check capacity
- `generateReport()` - Text output

### Supporting Classes

- `RulingSpan` - Multi-span calculations
- `InsulatorSwing` - Swing angles
- `GuyWireAnalysis` - Guy sizing
- `WindLoadCalculator` - NESC loads

## Data Flow

```
User Input
    │
    ▼
┌─────────────┐
│  PLASystem  │◄────────────────────────────────┐
└──────┬──────┘                                 │
       │                                        │
       ├──────────┬──────────┬──────────┐      │
       ▼          ▼          ▼          ▼      │
   ┌───────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
   │Catenary│ │  Pole  │ │FemtoLLM│ │PLAScene│  │
   │ Calc  │ │Analysis│ │ Query  │ │ Render │  │
   └───┬───┘ └───┬────┘ └───┬────┘ └───┬────┘  │
       │         │          │          │        │
       ▼         ▼          ▼          ▼        │
   ┌───────────────────────────────────────┐   │
   │            Results/Display             │───┘
   └───────────────────────────────────────┘
```

## State Management

### PLASystem State

```javascript
{
  initialized: boolean,
  poles: [],          // Pole configurations
  conductors: [],     // Conductor definitions
  metrics: {
    initTime: number,
    analysisCount: number,
    totalAnalysisTime: number
  }
}
```

### BlockArray State

```javascript
{
  dimensions: [x, y, z],
  data: Map<string, any>,
  llms: Map<string, FemtoLLM>,
  metadata: Map<string, object>,
  stats: {
    cellsUsed: number,
    llmsActive: number,
    operations: number
  }
}
```

## Performance Targets

| Component | Metric | Target |
|-----------|--------|--------|
| eVGPU | Operations/sec | >1000 |
| FemtoLLM | Response time | <100ms |
| PLAScene | Frame rate | 60 FPS |
| BlockArray | Cells supported | 1B sparse |
| Total | Memory | <2GB |

## Browser Requirements

- WebGL 2.0 support
- ES6+ JavaScript
- 4GB+ RAM recommended
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

## File Structure

```
/                           # Root landing page
├── index.html              # Main entry (links to docs/)
├── docs/                   # Application folder
│   ├── index.html          # OS Desktop hub
│   ├── designer/           # PLA Designer v4.0
│   │   ├── index.html      # Main designer app
│   │   ├── styles.css      # Designer styles
│   │   └── scripts/        # 27 feature modules
│   │       ├── main.js     # Entry point
│   │       ├── state.js    # State management
│   │       ├── poles.js    # Pole operations
│   │       ├── spans.js    # Span/conductor ops
│   │       └── ...         # Analysis, templates, etc.
│   ├── core/               # Core computation modules
│   │   ├── pla-system.js   # Main coordinator
│   │   ├── evgpu.js        # CPU compute engine
│   │   ├── catenary.js     # Sag-tension math
│   │   ├── pole-analysis.js# Structural analysis
│   │   └── init.js         # System initialization
│   ├── viz/                # 3D visualization
│   │   ├── scene.js        # Three.js scene setup
│   │   ├── pole-mesh.js    # Pole geometry
│   │   ├── conductor-mesh.js # Catenary rendering
│   │   └── controls.js     # Camera controls
│   ├── analysis/           # Analysis calculators
│   │   └── index.html      # Analysis tools UI
│   ├── sandbox/            # Python sandbox
│   │   ├── index.html      # Sandbox UI
│   │   └── python-runner.html # Pyodide runner
│   ├── llm/                # Browser AI
│   │   └── index.html      # LLM interface
│   ├── docs/               # Documentation
│   │   ├── api/            # API reference
│   │   ├── reference/      # NESC standards
│   │   └── examples/       # Code examples
│   └── assets/
│       └── css/base.css    # Shared OS styles
```

## Extension Points

### Adding New Analysis Types

1. Create class in `core/`
2. Import in `pla-system.js`
3. Add UI controls in `index.html`
4. Document in `docs/api/`

### Adding Visualization Features

1. Extend `PLAScene` class
2. Add Three.js geometries/materials
3. Bind to UI controls
4. Update export/import

### Adding Knowledge to FemtoLLM

1. Extend `knowledgeBase` in `femto-llm.js`
2. Add pattern matching in `_generateResponse`
3. Create response templates
