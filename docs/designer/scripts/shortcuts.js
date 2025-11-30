/**
 * PLA Designer - Keyboard Shortcuts
 */
import { undo, redo } from './history.js';
import { state, setTool } from './state.js';

const shortcuts = {
    // Tools
    'v': { action: () => setTool('select'), desc: 'Select tool' },
    's': { action: () => setTool('span'), desc: 'Span tool' },
    'g': { action: () => setTool('guy'), desc: 'Guy wire tool' },
    'p': { action: () => window.addPoleAtCenter?.(), desc: 'Add pole at center' },

    // Edit
    'ctrl+z': { action: () => undo(), desc: 'Undo' },
    'ctrl+shift+z': { action: () => redo(), desc: 'Redo' },
    'ctrl+y': { action: () => redo(), desc: 'Redo' },
    'delete': { action: () => window.deleteSelected?.(), desc: 'Delete selected' },
    'backspace': { action: () => window.deleteSelected?.(), desc: 'Delete selected' },

    // View
    '+': { action: () => window.zoomIn?.(), desc: 'Zoom in' },
    '=': { action: () => window.zoomIn?.(), desc: 'Zoom in' },
    '-': { action: () => window.zoomOut?.(), desc: 'Zoom out' },
    '0': { action: () => window.resetView?.(), desc: 'Reset view' },
    'm': { action: () => window.toggleMap?.(), desc: 'Toggle map' },

    // File
    'ctrl+s': { action: () => window.saveProject?.(), desc: 'Save project', prevent: true },
    'ctrl+o': { action: () => window.loadProject?.(), desc: 'Load project', prevent: true },
    'ctrl+e': { action: () => window.exportProject?.(), desc: 'Export project', prevent: true },

    // Analysis
    'ctrl+enter': { action: () => window.runAnalysis?.(), desc: 'Run analysis' },
    'ctrl+p': { action: () => window.generatePDF?.(), desc: 'Generate PDF', prevent: true },

    // Escape
    'escape': { action: () => { setTool('select'); window.closeAllModals?.(); }, desc: 'Cancel / Close' }
};

// Parse key combo from event
function getKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');

    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';

    parts.push(key);
    return parts.join('+');
}

// Handle keydown
function handleKeyDown(e) {
    // Don't trigger if typing in input
    if (e.target.matches('input, textarea, select')) return;

    const combo = getKeyCombo(e);
    const shortcut = shortcuts[combo];

    if (shortcut) {
        if (shortcut.prevent) e.preventDefault();
        shortcut.action();
    }
}

// Initialize shortcuts
export function initShortcuts() {
    document.addEventListener('keydown', handleKeyDown);
    console.log('⌨️ Shortcuts initialized');
}

// Get all shortcuts for help display
export function getShortcutList() {
    return Object.entries(shortcuts).map(([key, { desc }]) => ({
        key: key.replace('ctrl', '⌘/Ctrl').replace('shift', '⇧').replace('alt', '⌥'),
        desc
    }));
}

// Show shortcuts modal
export function showShortcutsHelp() {
    const list = getShortcutList();
    const html = `
        <div style="display:grid;grid-template-columns:auto 1fr;gap:0.5rem;font-size:0.85rem">
            ${list.map(s => `
                <code style="background:#333;padding:0.2rem 0.5rem;border-radius:3px">${s.key}</code>
                <span>${s.desc}</span>
            `).join('')}
        </div>
    `;

    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.querySelector('.modal-body').innerHTML = html;
        modal.style.display = 'flex';
    }
}

export default { initShortcuts, getShortcutList, showShortcutsHelp };
