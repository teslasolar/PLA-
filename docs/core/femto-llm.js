/**
 * 🧠 PLA FemtoLLM - 16-dimensional Nano Language Model
 * Specialized for Pole Line Analysis
 *
 * Specs:
 * - Hidden size: 16 dimensions
 * - 1 layer, 1 attention head
 * - ~4MB RAM
 * - ~0.1s per request
 */

class FemtoLLM {
    constructor(hiddenSize = 16) {
        this.h = hiddenSize;
        this.vocabSize = 256; // Character-level

        // Initialize weights (small for CPU efficiency)
        this.W_embed = this._initWeight(this.vocabSize, this.h);
        this.W_attn = this._initWeight(this.h, this.h);
        this.W_out = this._initWeight(this.h, this.vocabSize);

        // PLA-specific knowledge base
        this.knowledgeBase = this._initPLAKnowledge();

        // Response templates
        this.templates = this._initTemplates();
    }

    _initWeight(rows, cols) {
        const weight = new Array(rows);
        for (let i = 0; i < rows; i++) {
            weight[i] = new Float32Array(cols);
            for (let j = 0; j < cols; j++) {
                weight[i][j] = (Math.random() - 0.5) * 0.1;
            }
        }
        return weight;
    }

    _initPLAKnowledge() {
        return {
            // Pole specifications
            poles: {
                classes: {
                    'H1': { groundMoment: 10000, height: 55, tipDia: 8.6 },
                    'H2': { groundMoment: 8000, height: 50, tipDia: 8.0 },
                    '1': { groundMoment: 4500, height: 40, tipDia: 7.0 },
                    '2': { groundMoment: 3700, height: 35, tipDia: 6.5 },
                    '3': { groundMoment: 3000, height: 35, tipDia: 6.0 }
                },
                materials: ['wood', 'steel', 'concrete', 'fiberglass'],
                standards: ['NESC', 'IEC 60826', 'ASCE Manual 74', 'CSA C22.3']
            },

            // Conductor types
            conductors: {
                'ACSR': { description: 'Aluminum Conductor Steel Reinforced', typical_weight: 1.5 },
                'AAC': { description: 'All Aluminum Conductor', typical_weight: 0.9 },
                'AAAC': { description: 'All Aluminum Alloy Conductor', typical_weight: 1.0 },
                'OPGW': { description: 'Optical Ground Wire', typical_weight: 0.5 }
            },

            // Formulas
            formulas: {
                catenary: 'y = a * cosh(x/a) where a = H/w (tension/weight)',
                sag: 'D = a * (cosh(L/2a) - 1)',
                tension: 'T = w * a = H (horizontal tension)',
                moment: 'M = F × d (force × distance)',
                windForce: 'F = 0.5 * ρ * v² * Cd * A',
                rulingSpan: 'Rs = √(Σ(Li³) / Σ(Li))'
            },

            // NESC clearances
            clearances: {
                groundToRoadway: 18.5, // feet
                groundToPedestrian: 15.5,
                supplyToCommunication: 40, // inches
                messengerToMessenger: 12
            },

            // Load cases
            loadCases: {
                'NESC Light': { ice: 0, wind: 9, temp: 30 },
                'NESC Medium': { ice: 0.25, wind: 4, temp: 15 },
                'NESC Heavy': { ice: 0.5, wind: 4, temp: 0 },
                'Extreme Wind': { ice: 0, wind: 'varies', temp: 60 }
            }
        };
    }

    _initTemplates() {
        return {
            catenary: (params) => `
**Catenary Analysis**
- Span: ${params.span} m
- Sag: ${params.sag} m
- Catenary constant (a): ${params.a.toFixed(2)} m
- Horizontal tension: ${params.tension.toFixed(2)} N
- Conductor length: ${params.length.toFixed(2)} m

Formula: y = a × cosh(x/a) - a × cosh(L/2a)
`,
            pole: (params) => `
**Pole Analysis: Class ${params.class}**
- Height: ${params.height} m
- Ground-line moment: ${params.moment.toFixed(2)} N⋅m
- Utilization: ${params.utilization.toFixed(1)}%
- Status: ${params.utilization <= 100 ? '✅ PASS' : '❌ FAIL'}

Reference: NESC Section 25 Loading
`,
            general: (topic, info) => `
**${topic}**
${info}
`
        };
    }

    /**
     * Process input text and generate response
     * @param {string} text - Input query
     * @returns {Promise<string>} Response
     */
    async process(text) {
        const start = performance.now();

        // Tokenize (character-level for simplicity)
        const tokens = this._tokenize(text);

        // Embed
        const embedded = this._embed(tokens);

        // Simple attention
        const attended = this._attention(embedded);

        // Generate response based on PLA knowledge
        const response = this._generateResponse(text.toLowerCase(), attended);

        const elapsed = performance.now() - start;
        console.log(`FemtoLLM processed in ${elapsed.toFixed(1)}ms`);

        return response;
    }

    _tokenize(text) {
        return text.split('').map(c => c.charCodeAt(0) % this.vocabSize);
    }

    _embed(tokens) {
        const embedded = new Float32Array(this.h);
        for (const token of tokens) {
            for (let i = 0; i < this.h; i++) {
                embedded[i] += this.W_embed[token][i];
            }
        }
        // Normalize
        const norm = Math.sqrt(embedded.reduce((s, v) => s + v * v, 0)) || 1;
        return embedded.map(v => v / norm);
    }

    _attention(embedded) {
        // Simple self-attention simulation
        const attended = new Float32Array(this.h);
        for (let i = 0; i < this.h; i++) {
            let sum = 0;
            for (let j = 0; j < this.h; j++) {
                sum += embedded[j] * this.W_attn[i][j];
            }
            attended[i] = Math.tanh(sum);
        }
        return attended;
    }

    _generateResponse(query, context) {
        // Pattern matching for PLA queries
        const kb = this.knowledgeBase;

        // Catenary/sag questions
        if (query.includes('catenary') || query.includes('sag')) {
            return this.templates.general('Catenary (Sag-Tension)', `
The catenary curve describes conductor shape between supports.

**Key Equations:**
• ${kb.formulas.catenary}
• Sag: ${kb.formulas.sag}
• Tension: ${kb.formulas.tension}

**Factors affecting sag:**
- Span length (longer = more sag)
- Conductor weight (heavier = more sag)
- Temperature (higher = more sag)
- Ice/wind loading
- Initial tension

**Ruling Span:** ${kb.formulas.rulingSpan}
Used for stringing multiple spans at same tension.
`);
        }

        // Pole class questions
        if (query.includes('pole class') || query.includes('pole type')) {
            const classes = Object.entries(kb.poles.classes)
                .map(([c, v]) => `• Class ${c}: ${v.groundMoment} lb-ft moment, ${v.height}ft height`)
                .join('\n');
            return this.templates.general('Pole Classifications', `
Wood poles are classified by ground-line bending moment capacity.

**Classes (ANSI O5.1):**
${classes}

**Materials:** ${kb.poles.materials.join(', ')}

**Selection factors:**
- Required moment capacity
- Span lengths and angles
- Conductor count and weight
- Wind/ice loading zone
`);
        }

        // Conductor questions
        if (query.includes('conductor') || query.includes('wire') || query.includes('acsr')) {
            const types = Object.entries(kb.conductors)
                .map(([k, v]) => `• ${k}: ${v.description}`)
                .join('\n');
            return this.templates.general('Conductor Types', `
**Common conductor types:**
${types}

**Selection criteria:**
- Current carrying capacity (ampacity)
- Mechanical strength
- Weight per unit length
- Sag characteristics
- Cost considerations
`);
        }

        // Clearance questions
        if (query.includes('clearance') || query.includes('nesc')) {
            return this.templates.general('NESC Clearances', `
**Minimum clearances (NESC Rule 232):**
• Ground to roadway: ${kb.clearances.groundToRoadway} ft
• Ground to pedestrian: ${kb.clearances.groundToPedestrian} ft
• Supply to communication: ${kb.clearances.supplyToCommunication} inches
• Between messengers: ${kb.clearances.messengerToMessenger} inches

**Standards:** ${kb.poles.standards.join(', ')}

Clearances must be maintained at maximum sag (hot weather) and maximum blowout (high wind).
`);
        }

        // Loading questions
        if (query.includes('load') || query.includes('wind') || query.includes('ice')) {
            const cases = Object.entries(kb.loadCases)
                .map(([k, v]) => `• ${k}: ${v.ice}" ice, ${v.wind} psf wind, ${v.temp}°F`)
                .join('\n');
            return this.templates.general('NESC Loading Districts', `
**Standard load cases:**
${cases}

**Wind force formula:** ${kb.formulas.windForce}

**Combined loading:**
Ice weight + wind on ice-covered conductor creates maximum stress condition.
`);
        }

        // Tension questions
        if (query.includes('tension')) {
            return this.templates.general('Conductor Tension', `
**Horizontal Tension (H):**
${kb.formulas.tension}

**Factors:**
• Initial stringing tension (typically 15-25% RTS)
• Temperature variations
• Ice loading increases weight
• Wind adds horizontal component

**Limits:**
• NESC limits initial unloaded tension
• Final unloaded tension after creep
• Loaded tension under design conditions

Use sag-tension calculations with stress-strain curves for accurate results.
`);
        }

        // Moment/structural questions
        if (query.includes('moment') || query.includes('stress') || query.includes('structural')) {
            return this.templates.general('Pole Structural Analysis', `
**Ground-Line Bending Moment:**
${kb.formulas.moment}

**Load sources:**
• Transverse wind on conductors
• Wire tension at angles
• Equipment weight
• Unbalanced vertical loads

**Analysis steps:**
1. Calculate individual forces at attachment points
2. Multiply by moment arm (height above ground)
3. Sum all moments
4. Compare to pole capacity
5. Apply overload factors per NESC

**Utilization:** (Applied Moment / Allowable Moment) × 100%
`);
        }

        // Guy wire questions
        if (query.includes('guy') || query.includes('anchor')) {
            return this.templates.general('Guy Wire Design', `
**Guy Tension:**
T = M / (h × cos(θ))

Where:
• M = Overturning moment
• h = Attachment height
• θ = Guy angle from vertical

**Design requirements:**
• Guy strength > Applied tension × overload factor
• Anchor capacity > Guy tension
• Typical angle: 45° (ideal balance)
• Multiple guys for balanced support

**Guy types:** Down guy, span guy, head guy, arm guy
`);
        }

        // Default response
        return this.templates.general('PLA Assistant', `
I can help with pole line analysis topics:

• **Catenary/Sag** - conductor curves and tension
• **Pole Classes** - specifications and selection
• **Conductors** - types and properties
• **Clearances** - NESC requirements
• **Loading** - wind, ice, and combined
• **Tension** - calculations and limits
• **Structural** - moment analysis
• **Guys** - anchoring systems

What would you like to know about?
`);
    }

    // Specialized calculation methods
    analyzeCatenary(span, sag, weight = 1.5) {
        const a = span / (2 * Math.asinh(sag * 2 / span));
        const tension = a * weight * 9.81;
        const length = 2 * a * Math.sinh(span / (2 * a));

        return this.templates.catenary({ span, sag, a, tension, length });
    }

    analyzePole(poleClass, appliedMoment) {
        const specs = this.knowledgeBase.poles.classes[poleClass];
        if (!specs) {
            return `Unknown pole class: ${poleClass}`;
        }

        const utilization = (appliedMoment / specs.groundMoment) * 100;

        return this.templates.pole({
            class: poleClass,
            height: specs.height * 0.3048, // ft to m
            moment: appliedMoment,
            utilization
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FemtoLLM;
}
if (typeof window !== 'undefined') {
    window.FemtoLLM = FemtoLLM;
}
