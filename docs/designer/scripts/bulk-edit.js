// Bulk Edit - Edit multiple poles at once
import { getState, setState } from './state.js';
import { saveState } from './history.js';

let selectedPoles = new Set();

export function selectPole(poleId, addToSelection = false) {
    if (addToSelection) {
        if (selectedPoles.has(poleId)) {
            selectedPoles.delete(poleId);
        } else {
            selectedPoles.add(poleId);
        }
    } else {
        selectedPoles.clear();
        selectedPoles.add(poleId);
    }
    updateSelectionUI();
}

export function selectAllPoles() {
    const state = getState();
    selectedPoles = new Set(state.poles.map(p => p.id));
    updateSelectionUI();
}

export function clearSelection() {
    selectedPoles.clear();
    updateSelectionUI();
}

export function selectByProperty(property, value, operator = '===') {
    const state = getState();
    selectedPoles.clear();

    state.poles.forEach(pole => {
        let match = false;
        const poleValue = pole[property];

        switch (operator) {
            case '===': match = poleValue === value; break;
            case '!==': match = poleValue !== value; break;
            case '>': match = poleValue > value; break;
            case '<': match = poleValue < value; break;
            case '>=': match = poleValue >= value; break;
            case '<=': match = poleValue <= value; break;
            case 'includes': match = String(poleValue).includes(value); break;
        }

        if (match) selectedPoles.add(pole.id);
    });

    updateSelectionUI();
    return selectedPoles.size;
}

export function selectByBox(x1, z1, x2, z2) {
    const state = getState();
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);

    state.poles.forEach(pole => {
        if (pole.x >= minX && pole.x <= maxX && pole.z >= minZ && pole.z <= maxZ) {
            selectedPoles.add(pole.id);
        }
    });

    updateSelectionUI();
    return selectedPoles.size;
}

export function getSelectedPoles() {
    return Array.from(selectedPoles);
}

export function getSelectionCount() {
    return selectedPoles.size;
}

export function bulkUpdate(property, value) {
    if (selectedPoles.size === 0) return 0;

    saveState('bulk_edit');
    const state = getState();

    const newPoles = state.poles.map(pole => {
        if (selectedPoles.has(pole.id)) {
            return { ...pole, [property]: value };
        }
        return pole;
    });

    setState({ ...state, poles: newPoles });
    return selectedPoles.size;
}

export function bulkUpdateMultiple(updates) {
    if (selectedPoles.size === 0) return 0;

    saveState('bulk_edit');
    const state = getState();

    const newPoles = state.poles.map(pole => {
        if (selectedPoles.has(pole.id)) {
            return { ...pole, ...updates };
        }
        return pole;
    });

    setState({ ...state, poles: newPoles });
    return selectedPoles.size;
}

export function bulkTransform(transformFn) {
    if (selectedPoles.size === 0) return 0;

    saveState('bulk_transform');
    const state = getState();

    const newPoles = state.poles.map(pole => {
        if (selectedPoles.has(pole.id)) {
            return transformFn(pole);
        }
        return pole;
    });

    setState({ ...state, poles: newPoles });
    return selectedPoles.size;
}

export function bulkMove(dx, dz) {
    return bulkTransform(pole => ({
        ...pole,
        x: pole.x + dx,
        z: pole.z + dz
    }));
}

export function bulkDelete() {
    if (selectedPoles.size === 0) return 0;

    saveState('bulk_delete');
    const state = getState();
    const count = selectedPoles.size;

    // Remove poles
    const newPoles = state.poles.filter(p => !selectedPoles.has(p.id));

    // Remove spans connected to deleted poles
    const newSpans = state.spans.filter(s =>
        !selectedPoles.has(s.from) && !selectedPoles.has(s.to)
    );

    setState({ ...state, poles: newPoles, spans: newSpans });
    selectedPoles.clear();
    updateSelectionUI();

    return count;
}

export function bulkAddAttachment(attachment) {
    return bulkTransform(pole => ({
        ...pole,
        attachments: [...(pole.attachments || []), { ...attachment }]
    }));
}

export function bulkRemoveAttachment(type) {
    return bulkTransform(pole => ({
        ...pole,
        attachments: (pole.attachments || []).filter(a => a.type !== type)
    }));
}

function updateSelectionUI() {
    // Update visual selection in 3D view
    document.querySelectorAll('.pole-marker').forEach(el => {
        el.classList.remove('selected', 'multi-selected');
    });

    selectedPoles.forEach(id => {
        const el = document.querySelector(`[data-pole-id="${id}"]`);
        if (el) {
            el.classList.add(selectedPoles.size > 1 ? 'multi-selected' : 'selected');
        }
    });

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('selectionChanged', {
        detail: { selected: Array.from(selectedPoles), count: selectedPoles.size }
    }));
}

export function showBulkEditDialog() {
    const modal = document.getElementById('bulkEditModal');
    const content = document.getElementById('bulkEditContent');
    const state = getState();

    if (content) {
        content.innerHTML = `
            <div class="bulk-edit-panel">
                <div class="selection-info">
                    <strong>${selectedPoles.size}</strong> poles selected
                    <button class="btn btn-sm" onclick="window.selectAllPoles()">Select All</button>
                    <button class="btn btn-sm" onclick="window.clearBulkSelection()">Clear</button>
                </div>

                <div class="bulk-section">
                    <h4>Select By Property</h4>
                    <div class="form-row">
                        <select id="bulkSelectProp" class="input">
                            <option value="class">Class</option>
                            <option value="height">Height</option>
                            <option value="species">Species</option>
                        </select>
                        <select id="bulkSelectOp" class="input">
                            <option value="===">equals</option>
                            <option value="!==">not equals</option>
                            <option value=">">greater than</option>
                            <option value="<">less than</option>
                        </select>
                        <input type="text" id="bulkSelectVal" class="input" placeholder="value">
                        <button class="btn" onclick="window.runBulkSelect()">Select</button>
                    </div>
                </div>

                <div class="bulk-section">
                    <h4>Bulk Update</h4>
                    <div class="form-row">
                        <label>Class:</label>
                        <select id="bulkClass" class="input">
                            <option value="">--</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Height:</label>
                        <select id="bulkHeight" class="input">
                            <option value="">--</option>
                            <option value="35">35'</option>
                            <option value="40">40'</option>
                            <option value="45">45'</option>
                            <option value="50">50'</option>
                            <option value="55">55'</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>Species:</label>
                        <select id="bulkSpecies" class="input">
                            <option value="">--</option>
                            <option value="SP">Southern Pine (SP)</option>
                            <option value="WC">Western Cedar (WC)</option>
                            <option value="DF">Douglas Fir (DF)</option>
                        </select>
                    </div>
                    <button class="btn success" onclick="window.applyBulkUpdate()">Apply Changes</button>
                </div>

                <div class="bulk-section">
                    <h4>Bulk Actions</h4>
                    <div class="btn-group">
                        <button class="btn" onclick="window.showBulkMove()">Move</button>
                        <button class="btn" onclick="window.showBulkAddEquip()">Add Equipment</button>
                        <button class="btn danger" onclick="window.bulkDeletePoles()">Delete Selected</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Expose functions to window
    window.selectAllPoles = () => { selectAllPoles(); showBulkEditDialog(); };
    window.clearBulkSelection = () => { clearSelection(); showBulkEditDialog(); };

    window.runBulkSelect = () => {
        const prop = document.getElementById('bulkSelectProp').value;
        let val = document.getElementById('bulkSelectVal').value;
        const op = document.getElementById('bulkSelectOp').value;

        // Convert numeric values
        if (prop === 'class' || prop === 'height') val = parseInt(val);

        const count = selectByProperty(prop, val, op);
        showBulkEditDialog();
    };

    window.applyBulkUpdate = () => {
        const updates = {};

        const cls = document.getElementById('bulkClass').value;
        const ht = document.getElementById('bulkHeight').value;
        const sp = document.getElementById('bulkSpecies').value;

        if (cls) updates.class = parseInt(cls);
        if (ht) updates.height = parseInt(ht);
        if (sp) updates.species = sp;

        if (Object.keys(updates).length > 0) {
            const count = bulkUpdateMultiple(updates);
            alert(`Updated ${count} poles`);
            showBulkEditDialog();
        }
    };

    window.showBulkMove = () => {
        const dx = prompt('Move X (feet):', '0');
        const dz = prompt('Move Z (feet):', '0');
        if (dx !== null && dz !== null) {
            bulkMove(parseFloat(dx), parseFloat(dz));
        }
    };

    window.showBulkAddEquip = () => {
        const type = prompt('Equipment type (transformer, switch, fuse):', 'transformer');
        const height = prompt('Height (feet):', '25');
        if (type && height) {
            bulkAddAttachment({ type, height: parseFloat(height) });
        }
    };

    window.bulkDeletePoles = () => {
        if (confirm(`Delete ${selectedPoles.size} poles and connected spans?`)) {
            const count = bulkDelete();
            alert(`Deleted ${count} poles`);
            showBulkEditDialog();
        }
    };

    if (modal) modal.style.display = 'flex';
}

// Keyboard shortcuts for multi-select
document.addEventListener('keydown', (e) => {
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        selectAllPoles();
    }
});
