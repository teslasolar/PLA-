# FemtoLLM API Reference

16-dimensional nano language model specialized for pole line analysis.

## Class: FemtoLLM

### Constructor

```javascript
new FemtoLLM(hiddenSize?)
```

**Parameters:**
- `hiddenSize` (number, default: 16): Hidden layer dimension

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `h` | number | Hidden size (16) |
| `vocabSize` | number | Character vocabulary (256) |
| `knowledgeBase` | object | PLA domain knowledge |

### Methods

#### process(text)

Process input and generate PLA-focused response.

```javascript
const llm = new FemtoLLM();
const response = await llm.process("What is sag-tension?");
```

**Returns:** Promise<string> - Markdown-formatted response

---

#### analyzeCatenary(span, sag, weight?)

Generate catenary analysis report.

```javascript
const report = llm.analyzeCatenary(50, 2.5, 1.5);
```

**Returns:** Formatted analysis string

---

#### analyzePole(poleClass, appliedMoment)

Generate pole utilization report.

```javascript
const report = llm.analyzePole('2', 2500);
```

## Knowledge Base

The FemtoLLM includes embedded knowledge for:

### Pole Classes
```javascript
llm.knowledgeBase.poles.classes
// H1-H6, 1-7 with moment capacities
```

### Conductor Types
```javascript
llm.knowledgeBase.conductors
// ACSR, AAC, AAAC, OPGW
```

### Formulas
```javascript
llm.knowledgeBase.formulas
// catenary, sag, tension, moment, windForce, rulingSpan
```

### NESC Clearances
```javascript
llm.knowledgeBase.clearances
// groundToRoadway, supplyToCommunication, etc.
```

### Load Cases
```javascript
llm.knowledgeBase.loadCases
// NESC Light, Medium, Heavy, Extreme Wind
```

## Query Topics

Ask about:
- **"catenary"** / **"sag"** - Sag-tension equations
- **"pole class"** - Pole specifications
- **"conductor"** / **"acsr"** - Conductor types
- **"clearance"** / **"nesc"** - Clearance requirements
- **"load"** / **"wind"** / **"ice"** - Loading conditions
- **"tension"** - Tension calculations
- **"moment"** / **"stress"** - Structural analysis
- **"guy"** / **"anchor"** - Guy wire design

## Example

```javascript
const llm = new FemtoLLM();

// General query
const response = await llm.process("How do I size a guy wire?");
console.log(response);

// Calculation-based response
console.log(llm.analyzeCatenary(60, 3.0, 1.8));
console.log(llm.analyzePole('H1', 5000));
```

## Response Format

Responses are Markdown-formatted with:
- **Bold headers**
- Bullet points
- Code-style formulas
- Practical guidance
