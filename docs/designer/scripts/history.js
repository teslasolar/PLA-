/**
 * PLA Designer - Undo/Redo History Manager
 */
import { state, fromJSON, toJSON } from './state.js';

const MAX_HISTORY = 50;
let history = [];
let historyIndex = -1;
let isUndoRedo = false;

// Save current state to history
export function saveState(action = 'change') {
    if (isUndoRedo) return;

    // Remove any future states if we're not at the end
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }

    // Add current state
    history.push({
        action,
        timestamp: Date.now(),
        data: JSON.parse(JSON.stringify(toJSON()))
    });

    // Trim if too long
    if (history.length > MAX_HISTORY) {
        history.shift();
    }

    historyIndex = history.length - 1;
    updateUI();
}

// Undo last action
export function undo() {
    if (!canUndo()) return false;

    isUndoRedo = true;
    historyIndex--;
    restoreState(history[historyIndex]);
    isUndoRedo = false;
    updateUI();
    return true;
}

// Redo next action
export function redo() {
    if (!canRedo()) return false;

    isUndoRedo = true;
    historyIndex++;
    restoreState(history[historyIndex]);
    isUndoRedo = false;
    updateUI();
    return true;
}

// Restore state from history entry
function restoreState(entry) {
    if (!entry) return;

    // Clear current state
    state.poles = [];
    state.spans = [];
    state.guys = [];
    state.equipment = [];

    // Restore from history
    fromJSON(entry.data);
}

// Check if undo is available
export function canUndo() {
    return historyIndex > 0;
}

// Check if redo is available
export function canRedo() {
    return historyIndex < history.length - 1;
}

// Get history info
export function getHistoryInfo() {
    return {
        current: historyIndex + 1,
        total: history.length,
        canUndo: canUndo(),
        canRedo: canRedo(),
        lastAction: history[historyIndex]?.action || 'none'
    };
}

// Clear history
export function clearHistory() {
    history = [];
    historyIndex = -1;
    saveState('init');
}

// Update UI buttons
function updateUI() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
        undoBtn.disabled = !canUndo();
        undoBtn.style.opacity = canUndo() ? '1' : '0.5';
    }
    if (redoBtn) {
        redoBtn.disabled = !canRedo();
        redoBtn.style.opacity = canRedo() ? '1' : '0.5';
    }
}

// Initialize with current state
export function initHistory() {
    clearHistory();
}

export default { saveState, undo, redo, canUndo, canRedo, getHistoryInfo, clearHistory, initHistory };
