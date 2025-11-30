# Getting Started with PLA

Welcome to the Pole Line Analysis system! This guide will help you get up and running.

## Quick Start

### Option 1: Use Online (Recommended)

Simply visit the GitHub Pages deployment:
- **URL**: https://teslasolar.github.io/PLA-

No installation required! Everything runs in your browser.

### Option 2: Run Locally

```bash
# Clone the repository
git clone https://github.com/teslasolar/PLA-.git
cd PLA-

# Serve the docs folder
python -m http.server 8000 -d docs
# OR
npx serve docs

# Open in browser
open http://localhost:8000
```

## Interface Overview

### Main Sections

1. **3D Viewer** - Interactive visualization of poles and conductors
2. **Analysis** - Sag-tension and pole loading calculators
3. **Sandbox** - Python code execution environment
4. **LLM Assistant** - AI-powered help for PLA questions

### 3D Viewer Controls

| Action | Control |
|--------|---------|
| Rotate | Left-click + drag |
| Zoom | Scroll wheel |
| Pan | Right-click + drag |
| Select | Click on object |

## Your First Analysis

### 1. Catenary Calculation

Enter parameters in the Sag-Tension Calculator:

```
Span: 50 m
Sag: 2.5 m
Weight: 1.5 kg/m
```

Click "Calculate" to see:
- Horizontal tension
- Conductor length
- Catenary constant

### 2. Pole Loading

Configure a pole analysis:

```
Height: 15 m
Class: 2
Wind Speed: 25 m/s
```

Results show:
- Ground-line moment
- Utilization percentage
- Pass/Fail status

### 3. Python Sandbox

Try this code:

```python
import numpy as np

# Calculate catenary
span = 50
sag = 2.5
a = span / (2 * np.arcsinh(sag * 2 / span))

tension = a * 1.5 * 9.81  # N
print(f"Tension: {tension:.2f} N")
```

## Key Concepts

### Catenary vs Parabola

PLA uses true catenary equations, not parabolic approximations:

```
Catenary: y = a × cosh(x/a)
Parabola: y = wx²/2H (approximation)
```

The catenary is more accurate for:
- Long spans (>400m)
- High sag-to-span ratios
- Precise clearance calculations

### Pole Classes

Wood poles are classified by ground-line moment capacity:

| Class | Moment (lb-ft) | Typical Use |
|-------|----------------|-------------|
| H1-H6 | 6400-19800 | Transmission |
| 1-3 | 3000-4500 | Distribution |
| 4-7 | 1200-2400 | Services |

### NESC Clearances

Minimum clearances above ground:
- Roads: 18.5 ft
- Pedestrian: 15.5 ft
- Railroad: 27.0 ft

## Next Steps

1. **Explore Examples** - See pre-built calculations
2. **Read API Docs** - Understand the JavaScript API
3. **Try Python** - Run calculations in the sandbox
4. **Ask the LLM** - Get answers to PLA questions

## Getting Help

- **LLM Assistant**: Ask questions in the interface
- **Documentation**: Browse `/docs/` folder
- **GitHub Issues**: Report bugs or request features
