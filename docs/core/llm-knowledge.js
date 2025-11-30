/**
 * PLA Knowledge Base for FemtoLLM
 */
export const PLA_KNOWLEDGE = {
    poleCapacity: {
        'H1': 6400, 'H2': 8000, 'H3': 10000, 'H4': 12400,
        '1': 4500, '2': 3700, '3': 3000, '4': 2400, '5': 1900
    },

    catenary: `**Catenary Equations**
• y = a × cosh(x/a) - a × cosh(L/2a)
• Sag: D = a × (cosh(L/2a) - 1)
• Tension: H = w × a
• Length: S = 2a × sinh(L/2a)
• Ruling Span: Rs = √(Σ(Li³) / Σ(Li))`,

    poleClass: `**Pole Classes (ANSI O5.1)**
• H1-H6: Transmission (6400-19800 lb-ft)
• Class 1-3: Distribution (3000-4500 lb-ft)
• Class 4-7: Services (1200-2400 lb-ft)
Setting depth: 10% + 2ft minimum`,

    conductor: `**Conductor Types**
• ACSR: Aluminum/steel core (most common)
• AAC: All aluminum (lighter, less strength)
• AAAC: Aluminum alloy (corrosion resistant)
• OPGW: Optical ground wire (communication)`,

    clearance: `**NESC Clearances**
• Roads: 18.5 ft (>22kV)
• Pedestrian: 15.5 ft
• Railroad: 27.0 ft
• Supply to comm: 40 inches
Check at max sag condition!`,

    loading: `**NESC Loading**
• Light: 0" ice, 9 psf, 30°F
• Medium: 0.25" ice, 4 psf, 15°F
• Heavy: 0.5" ice, 4 psf, 0°F
q = 0.00256 × V² (psf from mph)`,

    tension: `**Tension Calculations**
• H = a × w × g (horizontal)
• T = √(H² + V²) (total at support)
• Initial: 15-25% RTS typical
• Final after creep < initial`,

    moment: `**Ground-Line Moment**
M = Σ(F × h) for all loads
Apply NESC overload factors:
• Grade C transverse: 2.20
• Grade B transverse: 2.50`,

    guy: `**Guy Wire Design**
T = M / (h × cos(θ))
• Typical angle: 45°
• 3/8 EHS: <10,000 lb
• 7/16 EHS: <16,000 lb
• Anchor > guy tension`,

    help: `**PLA Assistant**
Ask about: catenary, sag, pole class, conductor, clearance, NESC, loading, wind, tension, moment, guy wire`
};

export default PLA_KNOWLEDGE;
