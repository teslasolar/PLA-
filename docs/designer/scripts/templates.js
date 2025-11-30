// Templates - Pre-built pole configurations
import { getState, setState } from './state.js';

// Pre-defined pole configuration templates
export const TEMPLATES = {
    tangent_3ph: {
        name: 'Tangent - 3 Phase',
        description: 'Standard tangent pole for 3-phase distribution',
        pole: {
            class: 4,
            height: 40,
            species: 'SP'
        },
        framing: {
            type: 'crossarm',
            crossarms: [
                { height: 35, length: 8, position: 'top' }
            ],
            insulators: [
                { height: 35, offset: -3, phase: 'A' },
                { height: 35, offset: 0, phase: 'B' },
                { height: 35, offset: 3, phase: 'C' }
            ]
        },
        attachments: [],
        guys: []
    },

    tangent_1ph: {
        name: 'Tangent - 1 Phase',
        description: 'Standard tangent pole for single-phase distribution',
        pole: {
            class: 5,
            height: 35,
            species: 'SP'
        },
        framing: {
            type: 'single',
            insulators: [
                { height: 32, offset: 0, phase: 'A' }
            ]
        },
        attachments: [],
        guys: []
    },

    angle_small: {
        name: 'Small Angle (5-30°)',
        description: 'Angle pole for small deflection angles',
        pole: {
            class: 3,
            height: 40,
            species: 'SP'
        },
        framing: {
            type: 'double_crossarm',
            crossarms: [
                { height: 35, length: 8, position: 'top' },
                { height: 33, length: 8, position: 'bottom' }
            ]
        },
        guys: [
            { direction: 'bisector', attachHeight: 32, leadLength: 25 }
        ]
    },

    angle_large: {
        name: 'Large Angle (30-90°)',
        description: 'Heavy angle pole for large deflection angles',
        pole: {
            class: 2,
            height: 45,
            species: 'SP'
        },
        framing: {
            type: 'double_crossarm',
            crossarms: [
                { height: 40, length: 10, position: 'top' },
                { height: 37, length: 10, position: 'bottom' }
            ]
        },
        guys: [
            { direction: 'bisector', attachHeight: 38, leadLength: 30 },
            { direction: 'bisector', attachHeight: 35, leadLength: 30 }
        ]
    },

    deadend: {
        name: 'Deadend',
        description: 'Full deadend pole for line termination',
        pole: {
            class: 2,
            height: 45,
            species: 'SP'
        },
        framing: {
            type: 'deadend',
            crossarms: [
                { height: 40, length: 10, position: 'top' }
            ]
        },
        guys: [
            { direction: 'inline', attachHeight: 38, leadLength: 25 },
            { direction: 'inline', attachHeight: 35, leadLength: 25 }
        ]
    },

    transformer_25: {
        name: 'Transformer Pole (25 kVA)',
        description: 'Pole with 25 kVA transformer',
        pole: {
            class: 3,
            height: 40,
            species: 'SP'
        },
        framing: {
            type: 'crossarm',
            crossarms: [
                { height: 35, length: 8, position: 'top' }
            ]
        },
        attachments: [
            { type: 'transformer', height: 25, kva: 25, weight: 350 }
        ],
        guys: []
    },

    transformer_50: {
        name: 'Transformer Pole (50 kVA)',
        description: 'Pole with 50 kVA transformer',
        pole: {
            class: 2,
            height: 45,
            species: 'SP'
        },
        framing: {
            type: 'crossarm',
            crossarms: [
                { height: 40, length: 8, position: 'top' }
            ]
        },
        attachments: [
            { type: 'transformer', height: 28, kva: 50, weight: 500 }
        ],
        guys: [
            { direction: 90, attachHeight: 35, leadLength: 20 }
        ]
    },

    junction_3way: {
        name: '3-Way Junction',
        description: 'Junction pole for 3-way intersection',
        pole: {
            class: 2,
            height: 45,
            species: 'SP'
        },
        framing: {
            type: 'alley_arm',
            crossarms: [
                { height: 40, length: 10, position: 'top' },
                { height: 40, length: 10, position: 'perpendicular' }
            ]
        },
        guys: [
            { direction: 0, attachHeight: 38, leadLength: 25 },
            { direction: 120, attachHeight: 38, leadLength: 25 },
            { direction: 240, attachHeight: 38, leadLength: 25 }
        ]
    },

    riser: {
        name: 'Riser Pole',
        description: 'Pole with underground riser',
        pole: {
            class: 4,
            height: 40,
            species: 'SP'
        },
        framing: {
            type: 'crossarm',
            crossarms: [
                { height: 35, length: 8, position: 'top' }
            ]
        },
        attachments: [
            { type: 'riser', height: 0, details: 'URD Riser' },
            { type: 'arresters', height: 30, count: 3 }
        ],
        guys: []
    },

    service: {
        name: 'Service Point',
        description: 'Service drop point with meter base',
        pole: {
            class: 5,
            height: 35,
            species: 'SP'
        },
        framing: {
            type: 'single'
        },
        attachments: [
            { type: 'service_drop', height: 18 },
            { type: 'meter_base', height: 5 }
        ],
        guys: []
    },

    streetlight: {
        name: 'Streetlight Pole',
        description: 'Pole with streetlight attachment',
        pole: {
            class: 5,
            height: 35,
            species: 'SP'
        },
        framing: {
            type: 'single'
        },
        attachments: [
            { type: 'streetlight', height: 28, watts: 100 }
        ],
        guys: []
    }
};

export function applyTemplate(poleId, templateId) {
    const template = TEMPLATES[templateId];
    if (!template) return false;

    const state = getState();
    const poleIndex = state.poles.findIndex(p => p.id === poleId);
    if (poleIndex === -1) return false;

    const pole = { ...state.poles[poleIndex] };

    // Apply template properties
    pole.class = template.pole.class;
    pole.height = template.pole.height;
    pole.species = template.pole.species;
    pole.template = templateId;
    pole.framing = template.framing;
    pole.attachments = JSON.parse(JSON.stringify(template.attachments));

    // Apply guys based on pole position and connected spans
    if (template.guys.length > 0) {
        pole.guys = template.guys.map(g => {
            const guy = { ...g };
            // Calculate actual direction based on span angles
            if (g.direction === 'bisector') {
                guy.direction = calculateBisector(poleId, state);
            } else if (g.direction === 'inline') {
                guy.direction = calculateInlineDirection(poleId, state);
            }
            return guy;
        });
    }

    // Update state
    const newPoles = [...state.poles];
    newPoles[poleIndex] = pole;
    setState({ ...state, poles: newPoles });

    return true;
}

function calculateBisector(poleId, state) {
    const spans = state.spans.filter(s => s.from === poleId || s.to === poleId);
    if (spans.length < 2) return 0;

    const pole = state.poles.find(p => p.id === poleId);
    const angles = spans.map(span => {
        const otherPoleId = span.from === poleId ? span.to : span.from;
        const other = state.poles.find(p => p.id === otherPoleId);
        if (!other) return 0;
        return Math.atan2(other.z - pole.z, other.x - pole.x) * 180 / Math.PI;
    });

    // Bisector is perpendicular to average of span directions
    const avgAngle = (angles[0] + angles[1]) / 2;
    return (avgAngle + 90) % 360;
}

function calculateInlineDirection(poleId, state) {
    const spans = state.spans.filter(s => s.from === poleId || s.to === poleId);
    if (spans.length === 0) return 0;

    const pole = state.poles.find(p => p.id === poleId);
    const span = spans[0];
    const otherPoleId = span.from === poleId ? span.to : span.from;
    const other = state.poles.find(p => p.id === otherPoleId);
    if (!other) return 0;

    // Guy direction opposite to span direction
    return (Math.atan2(other.z - pole.z, other.x - pole.x) * 180 / Math.PI + 180) % 360;
}

export function getTemplateList() {
    return Object.entries(TEMPLATES).map(([id, t]) => ({
        id,
        name: t.name,
        description: t.description
    }));
}

export function showTemplatesDialog(poleId) {
    const modal = document.getElementById('templatesModal');
    const content = document.getElementById('templatesContent');

    if (content) {
        content.innerHTML = `
            <div class="templates-list">
                ${getTemplateList().map(t => `
                    <div class="template-item" onclick="window.selectTemplate('${t.id}')">
                        <div class="template-name">${t.name}</div>
                        <div class="template-desc">${t.description}</div>
                    </div>
                `).join('')}
            </div>
            ${poleId ? `<input type="hidden" id="templateTargetPole" value="${poleId}">` : ''}
        `;
    }

    window.selectTemplate = (templateId) => {
        const targetPole = document.getElementById('templateTargetPole')?.value;
        if (targetPole) {
            applyTemplate(targetPole, templateId);
            closeModal('templatesModal');
            window.dispatchEvent(new CustomEvent('templateApplied', { detail: { poleId: targetPole, templateId } }));
        } else {
            // Store for next pole creation
            window.nextPoleTemplate = templateId;
            closeModal('templatesModal');
        }
    };

    if (modal) modal.style.display = 'flex';
}

// Auto-apply template to new poles
export function createPoleFromTemplate(x, z, templateId) {
    const template = TEMPLATES[templateId] || TEMPLATES.tangent_3ph;
    const state = getState();

    const newPole = {
        id: `P${state.poles.length + 1}`,
        x, z,
        class: template.pole.class,
        height: template.pole.height,
        species: template.pole.species,
        template: templateId,
        framing: template.framing,
        attachments: JSON.parse(JSON.stringify(template.attachments)),
        guys: []
    };

    setState({
        ...state,
        poles: [...state.poles, newPole]
    });

    return newPole;
}
