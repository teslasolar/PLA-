// Pole Loading Diagram - Visual moment diagrams
import { getState } from './state.js';

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 400;

export function createLoadingDiagram(poleId) {
    const state = getState();
    const pole = state.poles.find(p => p.id === poleId);
    if (!pole) return null;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');

    // Calculate loads
    const loads = calculatePoleLoads(pole, state);

    // Draw diagram
    drawPoleOutline(ctx, pole);
    drawLoadArrows(ctx, loads);
    drawMomentDiagram(ctx, loads, pole);
    drawLegend(ctx, loads);

    return canvas;
}

function calculatePoleLoads(pole, state) {
    const loads = {
        wind: [],
        conductor: [],
        equipment: [],
        guys: [],
        totalMoment: 0,
        groundLine: pole.embedment || 6,
        poleHeight: pole.height || 40
    };

    // Get connected spans
    const spans = state.spans.filter(s => s.from === pole.id || s.to === pole.id);

    spans.forEach(span => {
        const otherPole = state.poles.find(p =>
            p.id === (span.from === pole.id ? span.to : span.from)
        );
        if (!otherPole) return;

        // Calculate conductor tension
        const dx = otherPole.x - pole.x;
        const dz = otherPole.z - pole.z;
        const spanLength = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        const tension = span.tension || 2000; // lbs
        const height = span.attachHeight || 30;

        loads.conductor.push({
            height,
            magnitude: tension,
            angle,
            spanId: span.id
        });

        // Wind load on conductor
        const windPSF = state.params?.windPSF || 4;
        const diameter = span.diameter || 0.5; // inches
        const windLoad = windPSF * (diameter / 12) * spanLength / 2; // Half to each pole

        loads.wind.push({
            height,
            magnitude: windLoad,
            direction: 'transverse'
        });
    });

    // Equipment loads
    (pole.attachments || []).forEach(att => {
        if (att.weight) {
            loads.equipment.push({
                height: att.height,
                magnitude: att.weight,
                type: att.type
            });
        }
    });

    // Guy wire resistance
    (pole.guys || []).forEach(guy => {
        const guyLoad = guy.tension || 3000;
        const angle = guy.angle || 45;
        loads.guys.push({
            height: guy.attachHeight || 25,
            magnitude: guyLoad * Math.cos(angle * Math.PI / 180),
            angle: guy.direction || 0
        });
    });

    // Calculate total moment at ground line
    loads.conductor.forEach(c => {
        loads.totalMoment += c.magnitude * (c.height - loads.groundLine);
    });
    loads.wind.forEach(w => {
        loads.totalMoment += w.magnitude * (w.height - loads.groundLine);
    });
    loads.guys.forEach(g => {
        loads.totalMoment -= g.magnitude * (g.height - loads.groundLine);
    });

    return loads;
}

function drawPoleOutline(ctx, pole) {
    const height = pole.height || 40;
    const embedment = pole.embedment || 6;
    const scale = (CANVAS_HEIGHT - 80) / (height + 5);

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ground line
    const groundY = CANVAS_HEIGHT - 40 - embedment * scale;
    ctx.strokeStyle = '#4b5563';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ground fill
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, groundY, CANVAS_WIDTH, CANVAS_HEIGHT - groundY);

    // Pole
    const poleX = 80;
    const topY = CANVAS_HEIGHT - 40 - height * scale;
    const bottomY = CANVAS_HEIGHT - 40;

    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(poleX, topY);
    ctx.lineTo(poleX, bottomY);
    ctx.stroke();

    // Height markers
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let h = 0; h <= height; h += 10) {
        const y = groundY - h * scale;
        ctx.fillText(`${h}'`, poleX - 15, y + 3);
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(poleX - 10, y);
        ctx.lineTo(poleX - 5, y);
        ctx.stroke();
    }

    return { poleX, groundY, scale };
}

function drawLoadArrows(ctx, loads) {
    const poleX = 80;
    const scale = (CANVAS_HEIGHT - 80) / (loads.poleHeight + 5);
    const groundY = CANVAS_HEIGHT - 40 - loads.groundLine * scale;

    // Conductor tension arrows
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 2;

    loads.conductor.forEach(c => {
        const y = groundY - (c.height - loads.groundLine) * scale;
        const arrowLen = Math.min(60, c.magnitude / 50);

        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(poleX, y);
        ctx.lineTo(poleX + arrowLen, y);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(poleX + arrowLen, y);
        ctx.lineTo(poleX + arrowLen - 8, y - 4);
        ctx.lineTo(poleX + arrowLen - 8, y + 4);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.font = '9px sans-serif';
        ctx.fillText(`${c.magnitude}#`, poleX + arrowLen + 5, y + 3);
    });

    // Wind load arrows (transverse)
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';

    loads.wind.forEach(w => {
        const y = groundY - (w.height - loads.groundLine) * scale;
        const arrowLen = Math.min(40, w.magnitude / 20);

        ctx.beginPath();
        ctx.moveTo(poleX + 20, y);
        ctx.lineTo(poleX + 20 + arrowLen, y);
        ctx.stroke();

        ctx.font = '8px sans-serif';
        ctx.fillText(`W:${Math.round(w.magnitude)}#`, poleX + 25 + arrowLen, y + 3);
    });

    // Guy resistance arrows
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = '#10b981';

    loads.guys.forEach(g => {
        const y = groundY - (g.height - loads.groundLine) * scale;
        const arrowLen = Math.min(50, g.magnitude / 80);

        ctx.beginPath();
        ctx.moveTo(poleX, y);
        ctx.lineTo(poleX - arrowLen, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(poleX - arrowLen, y);
        ctx.lineTo(poleX - arrowLen + 8, y - 4);
        ctx.lineTo(poleX - arrowLen + 8, y + 4);
        ctx.closePath();
        ctx.fill();
    });
}

function drawMomentDiagram(ctx, loads, pole) {
    const scale = (CANVAS_HEIGHT - 80) / (loads.poleHeight + 5);
    const groundY = CANVAS_HEIGHT - 40 - loads.groundLine * scale;
    const momentScale = 0.005;

    // Moment diagram on right side
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.lineWidth = 2;

    const diagramX = 200;
    let moment = 0;
    const points = [];

    // Calculate moment at each height
    for (let h = loads.poleHeight; h >= 0; h -= 1) {
        moment = 0;
        loads.conductor.forEach(c => {
            if (c.height >= h) {
                moment += c.magnitude * (c.height - h);
            }
        });
        loads.wind.forEach(w => {
            if (w.height >= h) {
                moment += w.magnitude * (w.height - h);
            }
        });
        loads.guys.forEach(g => {
            if (g.height >= h) {
                moment -= g.magnitude * (g.height - h);
            }
        });

        const y = groundY - (h - loads.groundLine) * scale;
        const x = diagramX + moment * momentScale;
        points.push({ x, y });
    }

    // Draw filled moment diagram
    ctx.beginPath();
    ctx.moveTo(diagramX, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(diagramX, points[points.length - 1].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ground line moment label
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`M=${Math.round(loads.totalMoment / 1000)}k ft-lb`, diagramX + 5, groundY + 15);
}

function drawLegend(ctx, loads) {
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';

    const legendY = 20;

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(10, legendY, 12, 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Tension', 26, legendY + 10);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(80, legendY, 12, 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Wind', 96, legendY + 10);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(140, legendY, 12, 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Guy', 156, legendY + 10);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(200, legendY, 12, 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Moment', 216, legendY + 10);
}

export function showLoadingDiagram(poleId) {
    const canvas = createLoadingDiagram(poleId);
    if (!canvas) return;

    const content = document.getElementById('loadingDiagramContent');
    if (content) {
        content.innerHTML = '';
        content.appendChild(canvas);
    }

    const modal = document.getElementById('loadingDiagramModal');
    if (modal) modal.style.display = 'flex';
}

export function getPoleMoment(poleId) {
    const state = getState();
    const pole = state.poles.find(p => p.id === poleId);
    if (!pole) return 0;

    const loads = calculatePoleLoads(pole, state);
    return loads.totalMoment;
}
