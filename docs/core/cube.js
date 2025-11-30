/**
 * Cube - 9-Node LLM Constellation
 * 8 vertices + 1 central coordinator
 */
import { FemtoLLM } from './femto-llm.js';

export class Cube {
    static V = ['NEU','NED','NWU','NWD','SEU','SED','SWU','SWD'];

    static POS = {
        NEU: [1,1,1], NED: [1,1,-1], NWU: [-1,1,1], NWD: [-1,1,-1],
        SEU: [1,-1,1], SED: [1,-1,-1], SWU: [-1,-1,1], SWD: [-1,-1,-1]
    };

    constructor(id) {
        this.id = id;
        this.verts = {};
        this.central = new FemtoLLM();
        this.edges = new Map();
        this.state = 'IDLE';

        for (const v of Cube.V) {
            this.verts[v] = new FemtoLLM();
        }
    }

    connect(a, b) {
        if (!this.edges.has(a)) this.edges.set(a, []);
        if (!this.edges.has(b)) this.edges.set(b, []);
        this.edges.get(a).push(b);
        this.edges.get(b).push(a);
        return this;
    }

    async processAt(v, input) {
        if (!this.verts[v]) throw new Error(`Unknown vertex: ${v}`);
        return await this.verts[v].process(input);
    }

    async processCenter(input) {
        return await this.central.process(input);
    }

    async broadcast(input) {
        const results = {};
        await Promise.all(Cube.V.map(async v => {
            results[v] = await this.processAt(v, input);
        }));
        return results;
    }

    async propagate(src, input) {
        const visited = new Set([src]);
        const queue = [src];
        const results = { [src]: await this.processAt(src, input) };

        while (queue.length) {
            const cur = queue.shift();
            for (const next of (this.edges.get(cur) || [])) {
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                    results[next] = await this.processAt(next, results[cur]);
                }
            }
        }
        return results;
    }

    setState(s) {
        const valid = ['IDLE','STARTING','EXECUTE','COMPLETE','STOPPED'];
        if (valid.includes(s)) this.state = s;
    }

    status() {
        return {
            id: this.id,
            state: this.state,
            vertices: Cube.V.length,
            edges: [...this.edges.values()].flat().length / 2
        };
    }
}

export default Cube;
