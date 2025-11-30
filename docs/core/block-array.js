/**
 * 🧊 BlockArray - 3D Compute Grid System
 * Sparse storage for 1000³ cubes with LLM integration
 */

class BlockArray {
    /**
     * Create a 3D block array
     * @param {Array} dimensions - [x, y, z] size (default 1000³)
     */
    constructor(dimensions = [1000, 1000, 1000]) {
        this.dimensions = dimensions;
        this.maxSize = dimensions[0] * dimensions[1] * dimensions[2];

        // Sparse storage using Map for memory efficiency
        this.data = new Map();
        this.llms = new Map();
        this.metadata = new Map();

        // Statistics
        this.stats = {
            cellsUsed: 0,
            llmsActive: 0,
            operations: 0
        };
    }

    /**
     * Convert 3D coordinates to string key
     */
    _key(x, y, z) {
        return `${x},${y},${z}`;
    }

    /**
     * Check if coordinates are valid
     */
    _validCoords(x, y, z) {
        return x >= 0 && x < this.dimensions[0] &&
               y >= 0 && y < this.dimensions[1] &&
               z >= 0 && z < this.dimensions[2];
    }

    /**
     * Set value at coordinates
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {any} value
     */
    set(x, y, z, value) {
        if (!this._validCoords(x, y, z)) {
            throw new Error(`Invalid coordinates: (${x}, ${y}, ${z})`);
        }

        const key = this._key(x, y, z);
        const isNew = !this.data.has(key);

        this.data.set(key, value);

        if (isNew) this.stats.cellsUsed++;
        this.stats.operations++;

        return this;
    }

    /**
     * Get value at coordinates
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {any}
     */
    get(x, y, z) {
        if (!this._validCoords(x, y, z)) {
            return undefined;
        }
        return this.data.get(this._key(x, y, z));
    }

    /**
     * Check if cell exists
     */
    has(x, y, z) {
        return this.data.has(this._key(x, y, z));
    }

    /**
     * Delete cell
     */
    delete(x, y, z) {
        const key = this._key(x, y, z);
        if (this.data.has(key)) {
            this.data.delete(key);
            this.llms.delete(key);
            this.metadata.delete(key);
            this.stats.cellsUsed--;
            return true;
        }
        return false;
    }

    /**
     * Attach LLM to coordinate
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {FemtoLLM} llm
     */
    attachLLM(x, y, z, llm = null) {
        if (!this._validCoords(x, y, z)) {
            throw new Error(`Invalid coordinates: (${x}, ${y}, ${z})`);
        }

        const key = this._key(x, y, z);
        const newLLM = llm || new FemtoLLM();
        this.llms.set(key, newLLM);
        this.stats.llmsActive++;

        return newLLM;
    }

    /**
     * Get LLM at coordinate
     */
    getLLM(x, y, z) {
        return this.llms.get(this._key(x, y, z));
    }

    /**
     * Process with LLM at coordinate
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} input
     */
    async processAt(x, y, z, input) {
        const llm = this.getLLM(x, y, z);
        if (!llm) {
            throw new Error(`No LLM at (${x}, ${y}, ${z})`);
        }
        return await llm.process(input);
    }

    /**
     * Set metadata for cell
     */
    setMeta(x, y, z, meta) {
        this.metadata.set(this._key(x, y, z), meta);
    }

    /**
     * Get metadata for cell
     */
    getMeta(x, y, z) {
        return this.metadata.get(this._key(x, y, z));
    }

    /**
     * Get neighbors of a cell
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {boolean} includeDiagonal - Include diagonal neighbors
     */
    getNeighbors(x, y, z, includeDiagonal = false) {
        const neighbors = [];

        // Face neighbors (6)
        const faceOffsets = [
            [-1, 0, 0], [1, 0, 0],
            [0, -1, 0], [0, 1, 0],
            [0, 0, -1], [0, 0, 1]
        ];

        for (const [dx, dy, dz] of faceOffsets) {
            const nx = x + dx, ny = y + dy, nz = z + dz;
            if (this._validCoords(nx, ny, nz) && this.has(nx, ny, nz)) {
                neighbors.push({ x: nx, y: ny, z: nz, value: this.get(nx, ny, nz) });
            }
        }

        if (includeDiagonal) {
            // Edge neighbors (12) and corner neighbors (8)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        if (dx === 0 && dy === 0 && dz === 0) continue;
                        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) === 1) continue; // Already added

                        const nx = x + dx, ny = y + dy, nz = z + dz;
                        if (this._validCoords(nx, ny, nz) && this.has(nx, ny, nz)) {
                            neighbors.push({ x: nx, y: ny, z: nz, value: this.get(nx, ny, nz) });
                        }
                    }
                }
            }
        }

        return neighbors;
    }

    /**
     * Iterate over all cells
     * @param {function} callback - (x, y, z, value) => void
     */
    forEach(callback) {
        for (const [key, value] of this.data) {
            const [x, y, z] = key.split(',').map(Number);
            callback(x, y, z, value);
        }
    }

    /**
     * Find cells matching condition
     * @param {function} predicate - (value, x, y, z) => boolean
     */
    find(predicate) {
        const results = [];
        for (const [key, value] of this.data) {
            const [x, y, z] = key.split(',').map(Number);
            if (predicate(value, x, y, z)) {
                results.push({ x, y, z, value });
            }
        }
        return results;
    }

    /**
     * Get slice of array
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {number} index - Index along axis
     */
    getSlice(axis, index) {
        const slice = [];
        const axisIndex = { x: 0, y: 1, z: 2 }[axis];

        for (const [key, value] of this.data) {
            const coords = key.split(',').map(Number);
            if (coords[axisIndex] === index) {
                slice.push({ coords, value });
            }
        }

        return slice;
    }

    /**
     * Clear all data
     */
    clear() {
        this.data.clear();
        this.llms.clear();
        this.metadata.clear();
        this.stats.cellsUsed = 0;
        this.stats.llmsActive = 0;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            dimensions: [...this.dimensions],
            maxCapacity: this.maxSize,
            utilization: (this.stats.cellsUsed / this.maxSize) * 100,
            memoryEstimate: this.stats.cellsUsed * 100 // ~100 bytes per cell estimate
        };
    }

    /**
     * Export to JSON
     */
    toJSON() {
        const cells = [];
        this.forEach((x, y, z, value) => {
            cells.push({ x, y, z, value, meta: this.getMeta(x, y, z) });
        });
        return {
            dimensions: this.dimensions,
            cells: cells
        };
    }

    /**
     * Import from JSON
     */
    static fromJSON(json) {
        const array = new BlockArray(json.dimensions);
        for (const cell of json.cells) {
            array.set(cell.x, cell.y, cell.z, cell.value);
            if (cell.meta) {
                array.setMeta(cell.x, cell.y, cell.z, cell.meta);
            }
        }
        return array;
    }
}

/**
 * 🎲 Cube - 9-node LLM constellation
 * 8 vertices + 1 central node
 */
class Cube {
    static VERTICES = ['NEU', 'NED', 'NWU', 'NWD', 'SEU', 'SED', 'SWU', 'SWD'];

    constructor(id) {
        this.id = id;

        // Initialize vertex LLMs
        this.vertices = {};
        for (const v of Cube.VERTICES) {
            this.vertices[v] = new FemtoLLM();
        }

        // Central coordinator LLM
        this.central = new FemtoLLM();

        // Connections between vertices
        this.edges = new Map();

        // State machine (PackML-style)
        this.state = 'IDLE';
        this.states = ['IDLE', 'STARTING', 'EXECUTE', 'COMPLETING', 'COMPLETE', 'STOPPING', 'STOPPED', 'ABORTING', 'ABORTED'];
    }

    /**
     * Connect two vertices
     */
    connect(v1, v2) {
        if (!this.edges.has(v1)) this.edges.set(v1, []);
        if (!this.edges.has(v2)) this.edges.set(v2, []);

        this.edges.get(v1).push(v2);
        this.edges.get(v2).push(v1);

        return this;
    }

    /**
     * Get vertex LLM
     */
    getVertex(name) {
        return this.vertices[name];
    }

    /**
     * Process at vertex
     */
    async processVertex(vertex, input) {
        if (!this.vertices[vertex]) {
            throw new Error(`Unknown vertex: ${vertex}`);
        }
        return await this.vertices[vertex].process(input);
    }

    /**
     * Process at central node
     */
    async processCenter(input) {
        return await this.central.process(input);
    }

    /**
     * Broadcast to all vertices
     */
    async broadcast(input) {
        const results = {};
        await Promise.all(
            Cube.VERTICES.map(async v => {
                results[v] = await this.processVertex(v, input);
            })
        );
        return results;
    }

    /**
     * Propagate along edges from source
     */
    async propagate(source, input) {
        const visited = new Set([source]);
        const queue = [source];
        const results = { [source]: await this.processVertex(source, input) };

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.edges.get(current) || [];

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                    results[neighbor] = await this.processVertex(neighbor, results[current]);
                }
            }
        }

        return results;
    }

    /**
     * Get vertex coordinates (unit cube)
     */
    static getVertexPosition(vertex) {
        const positions = {
            'NEU': [1, 1, 1],    // North-East-Up
            'NED': [1, 1, -1],   // North-East-Down
            'NWU': [-1, 1, 1],   // North-West-Up
            'NWD': [-1, 1, -1],  // North-West-Down
            'SEU': [1, -1, 1],   // South-East-Up
            'SED': [1, -1, -1],  // South-East-Down
            'SWU': [-1, -1, 1],  // South-West-Up
            'SWD': [-1, -1, -1]  // South-West-Down
        };
        return positions[vertex] || [0, 0, 0];
    }

    /**
     * Transition state
     */
    setState(newState) {
        if (this.states.includes(newState)) {
            this.state = newState;
        }
    }

    /**
     * Get cube status
     */
    getStatus() {
        return {
            id: this.id,
            state: this.state,
            vertices: Cube.VERTICES.length,
            connections: [...this.edges.entries()].reduce((n, [k, v]) => n + v.length, 0) / 2
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlockArray, Cube };
}
if (typeof window !== 'undefined') {
    window.BlockArray = BlockArray;
    window.Cube = Cube;
}
