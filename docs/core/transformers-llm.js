/**
 * Transformers.js LLM Integration
 * Uses small models that run entirely in browser
 * Models cached in IndexedDB after first download
 */

// Model options (all under 100MB)
export const MODELS = {
    distilgpt2: {
        id: 'Xenova/distilgpt2',
        task: 'text-generation',
        size: '~80MB',
        desc: 'Small GPT-2 for text generation'
    },
    t5small: {
        id: 'Xenova/flan-t5-small',
        task: 'text2text-generation',
        size: '~77MB',
        desc: 'Instruction-tuned T5'
    },
    minilm: {
        id: 'Xenova/all-MiniLM-L6-v2',
        task: 'feature-extraction',
        size: '~23MB',
        desc: 'Sentence embeddings'
    }
};

let pipeline = null;
let currentModel = null;

/**
 * Initialize Transformers.js pipeline
 * @param {string} modelKey - Key from MODELS object
 * @param {function} onProgress - Progress callback
 */
export async function initLLM(modelKey = 'distilgpt2', onProgress = null) {
    const model = MODELS[modelKey];
    if (!model) throw new Error(`Unknown model: ${modelKey}`);

    // Dynamic import of transformers.js
    const { pipeline: createPipeline } = await import(
        'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1'
    );

    console.log(`Loading ${model.id} (${model.size})...`);

    pipeline = await createPipeline(model.task, model.id, {
        progress_callback: onProgress
    });

    currentModel = modelKey;
    console.log(`${model.id} ready!`);
    return pipeline;
}

/**
 * Generate text with loaded model
 * @param {string} prompt - Input prompt
 * @param {object} options - Generation options
 */
export async function generate(prompt, options = {}) {
    if (!pipeline) throw new Error('Model not loaded. Call initLLM first.');

    const defaults = {
        max_new_tokens: 50,
        temperature: 0.7,
        do_sample: true,
        top_k: 50
    };

    const result = await pipeline(prompt, { ...defaults, ...options });

    // Handle different output formats
    if (Array.isArray(result)) {
        return result[0]?.generated_text || result[0]?.translation_text || '';
    }
    return result;
}

/**
 * Get embeddings from MiniLM model
 * @param {string} text - Text to embed
 */
export async function embed(text) {
    if (currentModel !== 'minilm') {
        await initLLM('minilm');
    }
    const output = await pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

/**
 * Compute cosine similarity between two texts
 */
export async function similarity(text1, text2) {
    const [emb1, emb2] = await Promise.all([embed(text1), embed(text2)]);
    let dot = 0, mag1 = 0, mag2 = 0;
    for (let i = 0; i < emb1.length; i++) {
        dot += emb1[i] * emb2[i];
        mag1 += emb1[i] * emb1[i];
        mag2 += emb2[i] * emb2[i];
    }
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * PLA-specific query handler
 * Uses embeddings to match against knowledge base
 */
export class PLAAssistant {
    constructor() {
        this.knowledge = [
            { q: 'catenary sag tension', a: 'Catenary: y = a×cosh(x/a). Horizontal tension H = w×a×g where w is weight/length.' },
            { q: 'pole class capacity', a: 'ANSI O5.1 pole classes: H1=6400, 1=4500, 2=3700, 3=3000 lb-ft at ground line.' },
            { q: 'NESC clearance ground', a: 'NESC Rule 232: Min clearances - Roads: 18.5ft, Pedestrian: 15.5ft, Residential: 12ft.' },
            { q: 'wind load pressure', a: 'Wind pressure q = 0.613×v². For 25m/s: q = 383 Pa. Force F = q×d×L.' },
            { q: 'ruling span calculation', a: 'Ruling span RS = sqrt(Σspan³/Σspan). Used for uniform sag across unequal spans.' },
            { q: 'guy wire tension', a: 'Guy tension T = H/cos(θ). Anchor load = T×sin(θ). Typical lead = 0.5-1.0× pole height.' }
        ];
        this.embeddings = null;
    }

    async init() {
        await initLLM('minilm');
        // Pre-compute knowledge embeddings
        this.embeddings = await Promise.all(
            this.knowledge.map(k => embed(k.q))
        );
        return this;
    }

    async ask(question) {
        if (!this.embeddings) await this.init();

        const qEmb = await embed(question);

        // Find best match
        let bestIdx = 0, bestSim = -1;
        for (let i = 0; i < this.embeddings.length; i++) {
            let dot = 0;
            for (let j = 0; j < qEmb.length; j++) {
                dot += qEmb[j] * this.embeddings[i][j];
            }
            if (dot > bestSim) {
                bestSim = dot;
                bestIdx = i;
            }
        }

        if (bestSim > 0.5) {
            return this.knowledge[bestIdx].a;
        }
        return 'I can help with catenary, poles, NESC clearances, wind loads, and guy wires. Try asking about those!';
    }
}

export default { initLLM, generate, embed, similarity, PLAAssistant, MODELS };
