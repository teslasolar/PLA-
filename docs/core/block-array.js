/**
 * BlockArray - Sparse 3D Grid
 * Efficient storage for 1000³ space
 */
export class BlockArray {
    constructor(dims = [1000, 1000, 1000]) {
        this.dims = dims;
        this.data = new Map();
        this.meta = new Map();
    }

    _key(x, y, z) { return `${x},${y},${z}`; }

    _valid(x, y, z) {
        return x >= 0 && x < this.dims[0] &&
               y >= 0 && y < this.dims[1] &&
               z >= 0 && z < this.dims[2];
    }

    set(x, y, z, v) {
        if (!this._valid(x, y, z)) return false;
        this.data.set(this._key(x, y, z), v);
        return true;
    }

    get(x, y, z) {
        return this.data.get(this._key(x, y, z));
    }

    has(x, y, z) {
        return this.data.has(this._key(x, y, z));
    }

    delete(x, y, z) {
        const k = this._key(x, y, z);
        this.meta.delete(k);
        return this.data.delete(k);
    }

    setMeta(x, y, z, m) {
        this.meta.set(this._key(x, y, z), m);
    }

    getMeta(x, y, z) {
        return this.meta.get(this._key(x, y, z));
    }

    neighbors(x, y, z) {
        const offsets = [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
        const result = [];
        for (const [dx, dy, dz] of offsets) {
            const nx = x + dx, ny = y + dy, nz = z + dz;
            if (this.has(nx, ny, nz)) {
                result.push({ x: nx, y: ny, z: nz, v: this.get(nx, ny, nz) });
            }
        }
        return result;
    }

    forEach(fn) {
        for (const [k, v] of this.data) {
            const [x, y, z] = k.split(',').map(Number);
            fn(x, y, z, v);
        }
    }

    find(pred) {
        const results = [];
        this.forEach((x, y, z, v) => {
            if (pred(v, x, y, z)) results.push({ x, y, z, v });
        });
        return results;
    }

    clear() {
        this.data.clear();
        this.meta.clear();
    }

    stats() {
        return {
            dims: this.dims,
            cells: this.data.size,
            capacity: this.dims.reduce((a, b) => a * b),
            utilPct: (this.data.size / this.dims.reduce((a, b) => a * b)) * 100
        };
    }

    toJSON() {
        const cells = [];
        this.forEach((x, y, z, v) => cells.push({ x, y, z, v }));
        return { dims: this.dims, cells };
    }

    static fromJSON(j) {
        const ba = new BlockArray(j.dims);
        for (const c of j.cells) ba.set(c.x, c.y, c.z, c.v);
        return ba;
    }
}

export default BlockArray;
