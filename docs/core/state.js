/**
 * PLA Global State Manager
 * Reactive state for UI binding
 */
export class State {
    constructor() {
        this.data = {};
        this.listeners = new Map();
    }

    set(key, value) {
        const old = this.data[key];
        this.data[key] = value;
        this._notify(key, value, old);
    }

    get(key) {
        return this.data[key];
    }

    on(key, fn) {
        if (!this.listeners.has(key)) this.listeners.set(key, []);
        this.listeners.get(key).push(fn);
        return () => this.off(key, fn);
    }

    off(key, fn) {
        const list = this.listeners.get(key);
        if (list) {
            const i = list.indexOf(fn);
            if (i > -1) list.splice(i, 1);
        }
    }

    _notify(key, value, old) {
        const list = this.listeners.get(key);
        if (list) list.forEach(fn => fn(value, old, key));
    }
}

// Default state structure
export const defaultState = {
    backend: 'cpu',
    poles: [],
    conductors: [],
    analysis: null,
    selectedId: null,
    view: { x: 100, y: 50, z: 100 }
};

export const state = new State();
Object.entries(defaultState).forEach(([k, v]) => state.set(k, v));

export default state;
