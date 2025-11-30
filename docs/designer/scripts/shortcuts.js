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
    'w': { action: () => window.toggleWind?.(), desc: 'Toggle wind' },

    // File
    'ctrl+s': { action: () => window.saveProject?.(), desc: 'Save project', prevent: true },
    'ctrl+o': { action: () => window.loadProject?.(), desc: 'Load project', prevent: true },
    'ctrl+e': { action: () => window.exportProject?.(), desc: 'Export project', prevent: true },

    // Command palette
    'ctrl+k': { action: () => showCommandPalette(), desc: 'Command palette', prevent: true },
    '?': { action: () => showShortcuts(), desc: 'Show shortcuts' },

    // Analysis
    'ctrl+enter': { action: () => window.runAnalysis?.(), desc: 'Run analysis' },
    'ctrl+p': { action: () => window.generatePDF?.(), desc: 'Generate PDF', prevent: true },

    // Quick access
    'd': { action: () => window.showDashboard?.(), desc: 'Dashboard' },
    'a': { action: () => window.runAnalysis?.(), desc: 'Run analysis' },
    't': { action: () => window.showTemplates?.(), desc: 'Templates' },

    // Escape
    'escape': { action: () => { setTool('select'); window.closeAllModals?.(); closeCommandPalette(); }, desc: 'Cancel / Close' }
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
export function showShortcuts() {
    const list = getShortcutList();
    const html = `
        <div style="display:grid;grid-template-columns:auto 1fr;gap:0.5rem;font-size:0.85rem">
            ${list.map(s => `
                <code style="background:#333;padding:0.2rem 0.5rem;border-radius:3px">${s.key}</code>
                <span>${s.desc}</span>
            `).join('')}
        </div>
    `;

    const container = document.getElementById('shortcutsList');
    if (container) container.innerHTML = html;

    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'flex';
}

// Command palette - quick access to all features
const commands = [
    { name: 'Run Analysis', action: () => window.runAnalysis?.(), icon: '📊', category: 'Analysis' },
    { name: 'Sag-Tension Calculator', action: () => window.showSagModal?.(), icon: '📐', category: 'Analysis' },
    { name: 'Clearance Check', action: () => window.showClearances?.(), icon: '📏', category: 'Analysis' },
    { name: 'Loading Diagram', action: () => window.showLoadingDiagram?.(), icon: '📊', category: 'Analysis' },
    { name: 'Guying Calculator', action: () => window.showGuyingCalc?.(), icon: '🔗', category: 'Analysis' },
    { name: 'Stringing Chart', action: () => window.showStringing?.(), icon: '🧵', category: 'Analysis' },
    { name: 'Ruling Span', action: () => window.showRulingSpanDialog?.(), icon: '📏', category: 'Calculators' },
    { name: 'Voltage Drop', action: () => window.showVoltageDropCalculator?.(), icon: '⚡', category: 'Calculators' },
    { name: 'Transformer Sizing', action: () => window.showTransformerSizing?.(), icon: '🔌', category: 'Calculators' },
    { name: 'Fault Current', action: () => window.showFaultAnalysis?.(), icon: '💥', category: 'Calculators' },
    { name: 'Dashboard', action: () => window.showDashboard?.(), icon: '📊', category: 'Project' },
    { name: 'Progress Tracking', action: () => window.showProgressDialog?.(), icon: '📈', category: 'Project' },
    { name: 'Inspections', action: () => window.showInspectionDialog?.(), icon: '🔍', category: 'Project' },
    { name: 'Templates', action: () => window.showTemplates?.(), icon: '📋', category: 'Design' },
    { name: 'Bill of Materials', action: () => window.showBOM?.(), icon: '📦', category: 'Export' },
    { name: 'Cost Estimate', action: () => window.showCost?.(), icon: '💰', category: 'Export' },
    { name: 'Staking Sheet', action: () => window.showStaking?.(), icon: '📍', category: 'Export' },
    { name: 'GIS Import/Export', action: () => window.showGIS?.(), icon: '🗺️', category: 'Data' },
    { name: 'Terrain', action: () => window.showTerrainDialog?.(), icon: '🏔️', category: 'Data' },
    { name: 'Obstacles', action: () => window.showObstaclesDialog?.(), icon: '🌳', category: 'Data' },
    { name: 'Photos', action: () => window.showPhotos?.(), icon: '📷', category: 'Data' },
    { name: 'Version History', action: () => window.showVersions?.(), icon: '📜', category: 'Project' },
    { name: 'Annotations', action: () => window.showAnnotations?.(), icon: '✍️', category: 'Tools' },
    { name: 'Comments', action: () => window.showComments?.(), icon: '💬', category: 'Tools' },
    { name: 'Measure', action: () => window.showMeasure?.(), icon: '📐', category: 'Tools' },
    { name: 'Theme', action: () => window.showThemes?.(), icon: '🎨', category: 'Settings' },
    { name: 'Toggle Map', action: () => window.toggleMap?.(), icon: '🗺️', category: 'View' },
    { name: 'Toggle Wind', action: () => window.toggleWind?.(), icon: '💨', category: 'View' },
    { name: 'Export PDF', action: () => window.generatePDF?.(), icon: '📄', category: 'Export' },
    { name: 'Export JSON', action: () => window.exportProject?.(), icon: '💾', category: 'Export' },
    { name: 'Save Project', action: () => window.saveProject?.(), icon: '💾', category: 'File' },
    { name: 'Load Project', action: () => window.loadProject?.(), icon: '📂', category: 'File' },
];

let paletteVisible = false;

function showCommandPalette() {
    let modal = document.getElementById('commandPalette');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'commandPalette';
        modal.className = 'command-palette';
        modal.innerHTML = `
            <div class="palette-content">
                <input type="text" id="paletteSearch" class="palette-input" placeholder="Type a command..." autofocus>
                <div id="paletteResults" class="palette-results"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = modal.querySelector('#paletteSearch');
        input.addEventListener('input', (e) => filterCommands(e.target.value));
        input.addEventListener('keydown', handlePaletteNav);
    }

    modal.style.display = 'flex';
    paletteVisible = true;
    const input = modal.querySelector('#paletteSearch');
    input.value = '';
    input.focus();
    filterCommands('');
}

function closeCommandPalette() {
    const modal = document.getElementById('commandPalette');
    if (modal) {
        modal.style.display = 'none';
        paletteVisible = false;
    }
}

let selectedIndex = 0;
let filteredCommands = [];

function filterCommands(query) {
    const results = document.getElementById('paletteResults');
    if (!results) return;

    const q = query.toLowerCase();
    filteredCommands = commands.filter(c =>
        c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );

    selectedIndex = 0;

    results.innerHTML = filteredCommands.map((c, i) => `
        <div class="palette-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}" onclick="window.runCommand(${i})">
            <span class="palette-icon">${c.icon}</span>
            <span class="palette-name">${c.name}</span>
            <span class="palette-category">${c.category}</span>
        </div>
    `).join('') || '<div class="palette-empty">No commands found</div>';
}

function handlePaletteNav(e) {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
        updateSelection();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        runCommand(selectedIndex);
    }
}

function updateSelection() {
    const items = document.querySelectorAll('.palette-item');
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === selectedIndex);
    });
}

function runCommand(index) {
    const cmd = filteredCommands[index];
    if (cmd) {
        closeCommandPalette();
        cmd.action();
    }
}

// Export for global access
window.runCommand = runCommand;
window.showCommandPalette = showCommandPalette;

// Alias for backwards compatibility
export const showShortcutsHelp = showShortcuts;

export { showCommandPalette, closeCommandPalette };
export default { initShortcuts, getShortcutList, showShortcuts, showCommandPalette };
