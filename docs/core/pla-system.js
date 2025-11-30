/**
 * 🔌 PLA System - Main Entry Point
 * Pole Line Analysis System with CPU-based AI
 *
 * Components:
 * - eVGPU: CPU-based compute engine
 * - FemtoLLM: 16-dim nano language model for PLA
 * - BlockArray: 1000³ sparse grid
 * - Cube: 9-node LLM constellation
 * - PLAScene: Three.js 3D visualization
 */

class PLASystem {
    constructor() {
        // Core components
        this.evgpu = null;
        this.femtoLLM = null;
        this.blockArray = null;
        this.cube = null;
        this.scene = null;

        // State
        this.initialized = false;
        this.poles = [];
        this.conductors = [];

        // Performance tracking
        this.metrics = {
            initTime: 0,
            analysisCount: 0,
            totalAnalysisTime: 0
        };
    }

    /**
     * Initialize the PLA system
     */
    async init() {
        const start = performance.now();
        console.log('🔌 Initializing PLA System...');

        // Initialize eVGPU
        this.evgpu = new eVGPU(navigator.hardwareConcurrency || 4);
        console.log(`⚡ eVGPU initialized with ${this.evgpu.cores} cores`);

        // Initialize FemtoLLM
        this.femtoLLM = new FemtoLLM(16);
        console.log('🧠 FemtoLLM initialized (16-dim)');

        // Initialize BlockArray (start small for browser)
        this.blockArray = new BlockArray([100, 100, 100]);
        console.log('🧊 BlockArray initialized (100³)');

        // Initialize Cube constellation
        this.cube = new Cube('pla-main');
        this.cube.connect('NEU', 'SWD'); // Diagonal connection
        this.cube.connect('NWU', 'SED');
        console.log('🎲 Cube constellation initialized');

        // Initialize 3D scene if container exists
        const container = document.getElementById('threejs-container');
        if (container && typeof THREE !== 'undefined') {
            this.scene = new PLAScene(container);
            this.scene.init();
            console.log('🎨 3D Scene initialized');

            // Add default demo power line
            this._createDemoPowerLine();
        }

        // Set up UI bindings
        this._bindUI();

        this.metrics.initTime = performance.now() - start;
        this.initialized = true;

        console.log(`✅ PLA System ready in ${this.metrics.initTime.toFixed(0)}ms`);
        return this;
    }

    /**
     * Create a demo power line
     */
    _createDemoPowerLine() {
        const spacing = 50;
        const poleCount = 5;

        for (let i = 0; i < poleCount; i++) {
            const x = (i - poleCount / 2 + 0.5) * spacing;
            this.scene.addPole({
                id: `demo_pole_${i}`,
                x: x,
                y: 0,
                z: 0,
                height: 15,
                material: i === 2 ? 'steel' : 'wood',
                type: 'tangent'
            });
        }

        for (let i = 0; i < poleCount - 1; i++) {
            const x1 = (i - poleCount / 2 + 0.5) * spacing;
            const x2 = (i + 1 - poleCount / 2 + 0.5) * spacing;

            this.scene.addConductor({
                id: `demo_span_${i}`,
                start: { x: x1, y: 13.5, z: 0 },
                end: { x: x2, y: 13.5, z: 0 },
                sag: 2.0,
                phases: 3,
                phaseOffset: 1.5
            });
        }
    }

    /**
     * Bind UI controls
     */
    _bindUI() {
        // Listen for object selection
        const container = document.getElementById('threejs-container');
        if (container) {
            container.addEventListener('objectSelected', (e) => {
                console.log('Selected:', e.detail);
                this._updateInfoPanel(e.detail);
            });
        }
    }

    _updateInfoPanel(detail) {
        const panel = document.getElementById('info-panel');
        if (!panel) return;

        const { object, userData } = detail;
        if (userData.type === 'pole') {
            panel.innerHTML = `
                <h4>Pole: ${object.name}</h4>
                <p>Height: ${userData.config.height}m</p>
                <p>Material: ${userData.config.material}</p>
            `;
        }
    }

    /**
     * Camera controls
     */
    resetCamera() {
        if (this.scene) {
            this.scene.resetCamera();
        }
    }

    toggleWireframe() {
        if (this.scene) {
            this.scene.toggleWireframe();
        }
    }

    /**
     * Add a pole
     */
    addPole(config) {
        if (!this.scene) return null;

        const pole = this.scene.addPole(config);
        this.poles.push(config);

        // Store in BlockArray
        const x = Math.floor(config.x + 50);
        const z = Math.floor((config.z || 0) + 50);
        this.blockArray.set(x, 0, z, {
            type: 'pole',
            config
        });

        return pole;
    }

    /**
     * Run structural analysis
     */
    runAnalysis() {
        const start = performance.now();

        const results = {
            poles: [],
            overall: 'PASS'
        };

        // Analyze each pole
        for (const poleConfig of this.poles) {
            const analysis = new PoleAnalysis({
                height: poleConfig.height * 3.28084, // m to ft
                poleClass: poleConfig.class || '2',
                material: poleConfig.material || 'wood'
            });

            // Add typical loads
            analysis.addConductorLoad({
                windSpan: 150,
                weightSpan: 150,
                attachmentHeight: poleConfig.height * 3.28084 * 0.9
            });
            analysis.addPoleWindLoad(4);

            const result = analysis.analyze();
            results.poles.push({
                id: poleConfig.id,
                ...result
            });

            if (result.status === 'FAIL') {
                results.overall = 'FAIL';
            }
        }

        const elapsed = performance.now() - start;
        this.metrics.analysisCount++;
        this.metrics.totalAnalysisTime += elapsed;

        // Display results
        this._displayResults(results);

        return results;
    }

    _displayResults(results) {
        const panel = document.getElementById('pole-results');
        if (!panel) {
            console.log('Analysis Results:', results);
            return;
        }

        let html = `<strong>Analysis Complete</strong>\n`;
        html += `Overall: ${results.overall}\n\n`;

        for (const pole of results.poles) {
            html += `Pole ${pole.id || 'Unknown'}:\n`;
            html += `  Moment: ${pole.groundLineMoment?.toFixed(0) || 'N/A'} lb-ft\n`;
            html += `  Utilization: ${pole.utilization?.toFixed(1) || 'N/A'}%\n`;
            html += `  Status: ${pole.status || 'N/A'}\n\n`;
        }

        panel.textContent = html;
    }

    /**
     * Calculate catenary
     */
    calculateCatenary() {
        const span = parseFloat(document.getElementById('span')?.value || 50);
        const sag = parseFloat(document.getElementById('sag')?.value || 2.5);
        const weight = parseFloat(document.getElementById('weight')?.value || 1.5);

        const catenary = new CatenaryCurve(span, sag, weight);
        const result = this.femtoLLM.analyzeCatenary(span, sag, weight);

        const panel = document.getElementById('catenary-results');
        if (panel) {
            panel.innerHTML = result.replace(/\n/g, '<br>');
        }

        return catenary.toJSON();
    }

    /**
     * Calculate pole loading
     */
    calculatePoleLoad() {
        const height = parseFloat(document.getElementById('poleHeight')?.value || 15);
        const poleClass = document.getElementById('poleClass')?.value || '2';
        const windSpeed = parseFloat(document.getElementById('windSpeed')?.value || 25);

        // Use eVGPU for wind calculation
        const windResult = this.evgpu.windPressure(windSpeed, 25, 50);

        const analysis = new PoleAnalysis({
            height: height * 3.28084,
            poleClass: poleClass
        });

        // Add loads based on wind speed
        const windPressure = 0.00256 * windSpeed * windSpeed * 2.237 * 2.237; // m/s to mph
        analysis.addConductorLoad({ windPressure: windPressure });
        analysis.addPoleWindLoad(windPressure);

        const result = analysis.analyze();
        const report = analysis.generateReport();

        const panel = document.getElementById('pole-results');
        if (panel) {
            panel.textContent = report;
        }

        return result;
    }

    /**
     * Ask FemtoLLM
     */
    async askLLM() {
        const input = document.getElementById('llm-input');
        const output = document.getElementById('llm-output');

        if (!input || !output) return;

        const question = input.value.trim();
        if (!question) return;

        output.innerHTML = '<em>Processing...</em>';

        try {
            const response = await this.femtoLLM.process(question);
            output.innerHTML = response.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        } catch (error) {
            output.innerHTML = `<span style="color:red">Error: ${error.message}</span>`;
        }
    }

    /**
     * Run code in sandbox
     */
    async runCode() {
        const editor = document.getElementById('code-editor');
        const output = document.getElementById('code-output');

        if (!editor || !output) return;

        const code = editor.value;
        output.textContent = 'Running...\n';

        try {
            // Check if Pyodide is available
            if (typeof loadPyodide !== 'undefined') {
                if (!this.pyodide) {
                    output.textContent = 'Loading Python runtime...\n';
                    this.pyodide = await loadPyodide();
                    await this.pyodide.loadPackage('numpy');

                    // Define PLA module in Pyodide
                    this.pyodide.runPython(this._getPLAModule());
                }

                // Capture stdout
                this.pyodide.runPython(`
                    import sys
                    from io import StringIO
                    sys.stdout = StringIO()
                `);

                // Run user code
                await this.pyodide.runPythonAsync(code);

                // Get output
                const stdout = this.pyodide.runPython('sys.stdout.getvalue()');
                output.textContent = stdout || '(No output)';
            } else {
                // Fallback: JavaScript simulation
                output.textContent = 'Python runtime not loaded.\nUsing JavaScript simulation...\n\n';
                output.textContent += this._simulateCode(code);
            }
        } catch (error) {
            output.textContent = `Error: ${error.message}`;
            output.style.color = '#ff6b6b';
        }
    }

    _getPLAModule() {
        return `
import numpy as np

class CatenaryCurve:
    def __init__(self, span, sag, weight=1.5):
        self.span = span
        self.sag = sag
        self.weight = weight
        self.a = self._calc_a()

    def _calc_a(self):
        return self.span / (2 * np.arcsinh(self.sag * 2 / self.span))

    def get_tension(self, weight=None):
        w = weight or self.weight
        return self.a * w * 9.81

    def get_length(self):
        return 2 * self.a * np.sinh(self.span / (2 * self.a))

    def get_points(self, n=50):
        x = np.linspace(-self.span/2, self.span/2, n)
        y = self.a * np.cosh(x / self.a) - self.a * np.cosh(self.span / (2 * self.a))
        return x + self.span/2, -y

class PoleAnalysis:
    def __init__(self, height, diameter_base=0.5, pole_class='2'):
        self.height = height
        self.diameter_base = diameter_base
        self.pole_class = pole_class

    def calculate_moment(self, force, height):
        return force * height

# Make available
pla = type('pla', (), {'CatenaryCurve': CatenaryCurve, 'PoleAnalysis': PoleAnalysis})()
`;
    }

    _simulateCode(code) {
        // Simple code simulation for demo
        let result = '';

        if (code.includes('CatenaryCurve')) {
            const spanMatch = code.match(/span[=:]\s*(\d+)/);
            const sagMatch = code.match(/sag[=:]\s*([\d.]+)/);

            const span = spanMatch ? parseInt(spanMatch[1]) : 50;
            const sag = sagMatch ? parseFloat(sagMatch[1]) : 2.5;

            const catenary = new CatenaryCurve(span, sag);

            result += `Catenary Analysis:\n`;
            result += `Span: ${span} m\n`;
            result += `Sag: ${sag} m\n`;
            result += `Horizontal Tension: ${catenary.getHorizontalTension().toFixed(2)} N\n`;
            result += `Conductor Length: ${catenary.getLength().toFixed(2)} m\n`;
        }

        if (code.includes('PoleAnalysis')) {
            result += `\nPole Analysis:\n`;
            result += `(JavaScript simulation - load Pyodide for full Python support)\n`;
        }

        return result || 'Code executed (no output captured)';
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            evgpu: this.evgpu?.getMetrics(),
            blockArray: this.blockArray?.getStats(),
            cube: this.cube?.getStatus(),
            metrics: this.metrics,
            poles: this.poles.length,
            conductors: this.conductors.length
        };
    }

    /**
     * Export project data
     */
    exportProject() {
        const data = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            scene: this.scene?.exportData(),
            blockArray: this.blockArray?.toJSON(),
            metrics: this.metrics
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Import project data
     */
    importProject(json) {
        const data = typeof json === 'string' ? JSON.parse(json) : json;

        if (data.scene && this.scene) {
            // Clear existing
            this.scene.poles.clear();
            this.scene.conductors.clear();

            // Recreate from data
            for (const pole of data.scene.poles || []) {
                this.scene.addPole(pole.config);
            }
            for (const conductor of data.scene.conductors || []) {
                this.scene.addConductor(conductor.config);
            }
        }

        if (data.blockArray) {
            this.blockArray = BlockArray.fromJSON(data.blockArray);
        }

        console.log('Project imported successfully');
    }
}

// Auto-initialize if this is loaded in browser
if (typeof window !== 'undefined') {
    window.PLASystem = PLASystem;

    // Create global instance
    window.PLA = window.PLA || null;
}
