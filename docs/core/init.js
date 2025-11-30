/**
 * PLA System Initializer
 * Loads modules and initializes compute backends
 */
export class PLA {
    static instance = null;

    constructor() {
        this.gpu = null;
        this.cpu = null;
        this.llm = null;
        this.grid = null;
        this.ready = false;
    }

    static async init() {
        if (PLA.instance) return PLA.instance;

        const pla = new PLA();
        console.log('🔌 PLA initializing...');

        // Try WebGPU first, fallback to CPU
        try {
            const { WebGPUCompute } = await import('./webgpu.js');
            pla.gpu = await WebGPUCompute.init();
            console.log('⚡ WebGPU ready');
        } catch (e) {
            console.log('⚡ WebGPU unavailable, using CPU');
        }

        // CPU fallback always available
        const { eVGPU } = await import('./evgpu.js');
        pla.cpu = new eVGPU();

        // Load FemtoLLM
        const { FemtoLLM } = await import('./femto-llm.js');
        pla.llm = new FemtoLLM();

        // Load BlockArray
        const { BlockArray } = await import('./block-array.js');
        pla.grid = new BlockArray([100, 100, 100]);

        pla.ready = true;
        PLA.instance = pla;
        console.log('✅ PLA ready');

        return pla;
    }

    compute(a, b, op) {
        if (this.gpu) return this.gpu.compute(a, b, op);
        return this.cpu.tensor(a, b, op);
    }

    async ask(question) {
        return await this.llm.process(question);
    }
}

export default PLA;
