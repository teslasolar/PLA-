/**
 * FemtoLLM - 16-dim Nano Language Model
 * Specialized for Pole Line Analysis
 */
import { PLA_KNOWLEDGE } from './llm-knowledge.js';

export class FemtoLLM {
    constructor(h = 16) {
        this.h = h;
        this.vocab = 256;
        this.W = this._init(h, h);
        this.kb = PLA_KNOWLEDGE;
    }

    _init(r, c) {
        return Array(r).fill(0).map(() =>
            Array(c).fill(0).map(() => (Math.random() - 0.5) * 0.1)
        );
    }

    async process(text) {
        const q = text.toLowerCase();
        const emb = this._embed(text);
        const ctx = this._attend(emb);
        return this._respond(q, ctx);
    }

    _embed(text) {
        const e = new Float32Array(this.h);
        for (const c of text) {
            const i = c.charCodeAt(0) % this.vocab;
            for (let j = 0; j < this.h; j++) e[j] += this.W[i % this.h][j];
        }
        const n = Math.sqrt(e.reduce((s, v) => s + v * v, 0)) || 1;
        return e.map(v => v / n);
    }

    _attend(e) {
        return e.map((_, i) => {
            let s = 0;
            for (let j = 0; j < this.h; j++) s += e[j] * this.W[i][j];
            return Math.tanh(s);
        });
    }

    _respond(q, ctx) {
        if (q.includes('catenary') || q.includes('sag')) return this.kb.catenary;
        if (q.includes('pole') && q.includes('class')) return this.kb.poleClass;
        if (q.includes('conductor') || q.includes('acsr')) return this.kb.conductor;
        if (q.includes('clearance') || q.includes('nesc')) return this.kb.clearance;
        if (q.includes('wind') || q.includes('load')) return this.kb.loading;
        if (q.includes('tension')) return this.kb.tension;
        if (q.includes('moment') || q.includes('struct')) return this.kb.moment;
        if (q.includes('guy') || q.includes('anchor')) return this.kb.guy;
        return this.kb.help;
    }

    analyzeCatenary(span, sag, w = 1.5) {
        const a = span / (2 * Math.asinh(sag * 2 / span));
        const H = a * w * 9.81;
        const L = 2 * a * Math.sinh(span / (2 * a));
        return `**Catenary**\nSpan: ${span}m | Sag: ${sag}m\na: ${a.toFixed(2)}m | H: ${H.toFixed(0)}N | L: ${L.toFixed(2)}m`;
    }

    analyzePole(cls, M) {
        const cap = this.kb.poleCapacity[cls] || 3000;
        const util = (M / cap) * 100;
        return `**Pole ${cls}**\nMoment: ${M} lb-ft | Capacity: ${cap} lb-ft\nUtil: ${util.toFixed(1)}% | ${util <= 100 ? 'PASS' : 'FAIL'}`;
    }
}

export default FemtoLLM;
