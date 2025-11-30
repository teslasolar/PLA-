/**
 * Python Sandbox Controller
 */
let py = null;

const EXAMPLES = {
    cat: `import numpy as np

span, sag, weight = 60, 3.0, 1.8
a = span / (2 * np.arcsinh(sag * 2 / span))
H = a * weight * 9.81
L = 2 * a * np.sinh(span / (2 * a))

print("Catenary Analysis")
print(f"Span: {span}m | Sag: {sag}m")
print(f"a: {a:.2f}m | H: {H:.0f}N | L: {L:.2f}m")`,

    wind: `import numpy as np

v = 25  # m/s
dia = 25.4  # mm
span = 50  # m

q = 0.613 * v**2
f = q * (dia / 1000) * span

print("Wind Load Analysis")
print(f"Wind: {v}m/s → {q:.1f}Pa")
print(f"Force: {f:.1f}N on {span}m span")`,

    pole: `import numpy as np

height = 45  # ft
loads = [(200, 40), (200, 38), (200, 36), (50, 28)]
capacity = 3700  # Class 2

M = sum(f * h for f, h in loads)
util = (M * 2.2 / capacity) * 100

print("Pole Analysis (Class 2)")
print(f"Moment: {M} lb-ft")
print(f"Util: {util:.1f}%")
print(f"Status: {'PASS' if util <= 100 else 'FAIL'}")`
};

async function init() {
    try {
        py = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/" });
        await py.loadPackage('numpy');
        document.getElementById('status').textContent = 'Python Ready (Ctrl+Enter to run)';
    } catch (e) {
        document.getElementById('status').textContent = 'Failed to load Python';
    }
}

async function run() {
    if (!py) return;
    const code = document.getElementById('code').value;
    const out = document.getElementById('out');
    out.textContent = 'Running...';

    try {
        py.runPython('import sys; from io import StringIO; sys.stdout = StringIO()');
        await py.runPythonAsync(code);
        out.textContent = py.runPython('sys.stdout.getvalue()') || '(no output)';
        out.style.color = '#58a6ff';
    } catch (e) {
        out.textContent = e.message;
        out.style.color = '#f85149';
    }
}

function clear() {
    document.getElementById('out').textContent = '';
}

function load(name) {
    if (EXAMPLES[name]) document.getElementById('code').value = EXAMPLES[name];
}

document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') run();
});

init();
