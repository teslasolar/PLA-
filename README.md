# 🔌 PLA - Pole Line Analysis System

3D Power Line Engineering with CPU-based AI | No GPU Required

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue)](https://teslasolar.github.io/PLA-)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🌟 Overview

PLA (Pole Line Analysis) is a browser-based power line engineering tool that runs entirely on GitHub Pages. It provides:

- **3D Visualization** - Interactive Three.js rendering of poles, conductors, and infrastructure
- **Structural Analysis** - Pole loading, sag-tension, and clearance calculations
- **CPU-based AI** - FemtoLLM (16-dim nano model) for PLA assistance
- **Python Sandbox** - Pyodide-powered Python execution in browser
- **No Backend Required** - 100% client-side, runs anywhere

## 🚀 Quick Start

### Online (GitHub Pages)
Visit: [https://teslasolar.github.io/PLA-](https://teslasolar.github.io/PLA-)

### Local Development
```bash
# Clone the repository
git clone https://github.com/teslasolar/PLA-.git
cd PLA-

# Serve locally (any static server)
python -m http.server 8000 -d docs
# or
npx serve docs

# Open http://localhost:8000
```

## 📦 System Architecture

Based on the Konomi System, adapted for Pole Line Analysis:

```
┌─────────────────────────────────────────────────────────┐
│                    PLA SYSTEM                           │
├─────────────────────────────────────────────────────────┤
│  ⚡ eVGPU          │  🧠 FemtoLLM       │  🎨 PLAScene   │
│  CPU Compute       │  16-dim AI         │  3D Render     │
├─────────────────────────────────────────────────────────┤
│  🧊 BlockArray (1000³)  │  🎲 Cube (9-node)             │
│  Sparse 3D Grid         │  LLM Constellation            │
├─────────────────────────────────────────────────────────┤
│  📐 Catenary       │  🔩 PoleAnalysis   │  📏 Clearance  │
│  Sag-Tension       │  Structural        │  NESC Rules    │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Features

### 3D Visualization
- Interactive pole and conductor rendering
- Catenary curve physics
- Multi-phase conductor support
- Camera controls (orbit, zoom, pan)
- Object selection and highlighting

### Structural Analysis
- NESC loading calculations
- Pole bending moment analysis
- Utilization checking
- Guy wire design
- Wind and ice loads

### Sag-Tension
- True catenary mathematics
- Temperature-dependent sag
- Ruling span calculation
- Conductor length computation

### AI Assistant
- PLA-specialized FemtoLLM
- Knowledge base for poles, conductors, standards
- Real-time query processing
- No external API required

### Python Sandbox
- Full NumPy support via Pyodide
- PLA calculation examples
- Interactive code execution
- Save and share analyses

## 📁 Project Structure

```
PLA-/
├── docs/                    # GitHub Pages root
│   ├── index.html          # Main application
│   ├── _config.yml         # Jekyll configuration
│   ├── assets/
│   │   └── css/style.css   # Styles
│   ├── core/               # Core JavaScript modules
│   │   ├── pla-system.js   # Main entry point
│   │   ├── evgpu.js        # CPU compute engine
│   │   ├── femto-llm.js    # AI model
│   │   ├── catenary.js     # Sag-tension math
│   │   ├── pole-analysis.js # Structural analysis
│   │   └── block-array.js  # 3D grid system
│   ├── visualization/
│   │   └── three-scene.js  # Three.js renderer
│   ├── sandbox/
│   │   └── python-runner.html
│   └── docs/               # Documentation
│       ├── getting-started.md
│       ├── api/
│       ├── examples/
│       └── reference/
└── README.md
```

## 📊 Performance Targets

| Component | Target | Notes |
|-----------|--------|-------|
| 🧠 FemtoLLM | 0.1s/req | 4MB RAM, 16-dim |
| ⚡ eVGPU | 100% CPU | No GPU required |
| 🧊 BlockArray | 1B cells | Sparse storage |
| 🎲 Cube | 9 LLMs | Concurrent processing |
| 📦 Total | <2GB | Memory footprint |

## 🔧 Core Components

### eVGPU (Electronic Virtual GPU)
CPU-based tensor operations optimized for browser execution:
```javascript
const evgpu = new eVGPU(4); // 4 cores
const result = evgpu.tensor(a, b, '@'); // Matrix multiply
const catenary = evgpu.catenary(50, 2.5); // Catenary curve
```

### FemtoLLM (16-dim Nano Model)
Specialized AI for pole line analysis:
```javascript
const llm = new FemtoLLM(16);
const response = await llm.process("What is sag-tension?");
```

### CatenaryCurve
True catenary mathematics:
```javascript
const curve = new CatenaryCurve(span, sag, weight);
const tension = curve.getHorizontalTension();
const length = curve.getLength();
```

### PoleAnalysis
Structural loading analysis:
```javascript
const pole = new PoleAnalysis({ height: 45, poleClass: '2' });
pole.addConductorLoad({ windSpan: 300 });
const result = pole.analyze();
```

## 📐 Calculations

### Catenary Equations
```
Sag: D = a × (cosh(L/2a) - 1)
Tension: H = w × a
Length: S = 2a × sinh(L/2a)
```

### Ruling Span
```
Rs = √(Σ(Li³) / Σ(Li))
```

### Ground-Line Moment
```
M = Σ(Fi × hi)
```

## 🌐 Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL required for 3D visualization.

## 📚 Documentation

- [Getting Started](docs/docs/getting-started.md)
- [API Reference](docs/docs/api/)
- [Examples](docs/docs/examples/)
- [Pole Specifications](docs/docs/reference/poles/)
- [NESC Standards](docs/docs/reference/standards/)

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) - 3D graphics
- [Pyodide](https://pyodide.org/) - Python in browser
- [PLS-CADD](https://www.powerlinesystems.com/) - Industry inspiration
- NESC, IEC, ASCE standards

---

**Built with ⚡ CPU efficiency | No GPU required | Runs anywhere**
