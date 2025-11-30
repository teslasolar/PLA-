/**
 * PLA Designer - State Management
 */

export const state = {
    // Project data
    poles: [],
    spans: [],
    guys: [],
    equipment: [],
    markers: [],

    // UI state
    selected: null,
    tool: 'select',
    view3d: true,
    spanStart: null,

    // Counters
    poleCounter: 0,
    spanCounter: 0,
    guyCounter: 0,
    equipCounter: 0,

    // Settings
    settings: {
        gridEnabled: true,
        snapEnabled: true,
        snapSize: 5,
        units: 'imperial'
    }
};

// Listeners for state changes
const listeners = new Map();

export function subscribe(key, callback) {
    if (!listeners.has(key)) {
        listeners.set(key, []);
    }
    listeners.get(key).push(callback);
}

export function notify(key, value) {
    if (listeners.has(key)) {
        listeners.get(key).forEach(cb => cb(value));
    }
}

// State getters
export function getPole(id) {
    return state.poles.find(p => p.id === id);
}

export function getSpan(id) {
    return state.spans.find(s => s.id === id);
}

export function getConnectedSpans(poleId) {
    return state.spans.filter(s => s.pole1 === poleId || s.pole2 === poleId);
}

// State modifiers
export function addPole(pole) {
    state.poles.push(pole);
    notify('poles', state.poles);
    notify('update', state);
}

export function removePole(id) {
    state.poles = state.poles.filter(p => p.id !== id);
    // Also remove connected spans
    state.spans = state.spans.filter(s => s.pole1 !== id && s.pole2 !== id);
    notify('poles', state.poles);
    notify('spans', state.spans);
    notify('update', state);
}

export function addSpan(span) {
    state.spans.push(span);
    notify('spans', state.spans);
    notify('update', state);
}

export function removeSpan(id) {
    state.spans = state.spans.filter(s => s.id !== id);
    notify('spans', state.spans);
    notify('update', state);
}

export function select(id) {
    state.selected = id;
    notify('selected', id);
}

export function setTool(tool) {
    state.tool = tool;
    notify('tool', tool);
}

// Project serialization
export function toJSON() {
    return {
        version: '1.0',
        created: new Date().toISOString(),
        poles: state.poles,
        spans: state.spans,
        guys: state.guys,
        equipment: state.equipment,
        settings: state.settings
    };
}

export function fromJSON(data) {
    if (data.poles) state.poles = data.poles;
    if (data.spans) state.spans = data.spans;
    if (data.guys) state.guys = data.guys;
    if (data.equipment) state.equipment = data.equipment;
    if (data.settings) state.settings = { ...state.settings, ...data.settings };

    // Update counters
    state.poleCounter = state.poles.length;
    state.spanCounter = state.spans.length;

    notify('update', state);
}

export function clear() {
    state.poles = [];
    state.spans = [];
    state.guys = [];
    state.equipment = [];
    state.selected = null;
    state.poleCounter = 0;
    state.spanCounter = 0;
    notify('update', state);
}

export default state;
