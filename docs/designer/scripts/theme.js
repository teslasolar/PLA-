// Theme Toggle - Dark/Light theme support

const THEMES = {
    dark: {
        '--bg': '#1f2937',
        '--bg2': '#374151',
        '--bg3': '#4b5563',
        '--bdr': 'rgba(107,114,128,.3)',
        '--txt': '#e2e8f0',
        '--txt2': '#94a3b8',
        '--txt3': '#64748b',
        '--acc': '#60a5fa',
        '--acc2': '#3b82f6',
        '--ok': '#10b981',
        '--warn': '#f59e0b',
        '--err': '#ef4444'
    },
    light: {
        '--bg': '#f8fafc',
        '--bg2': '#e2e8f0',
        '--bg3': '#cbd5e1',
        '--bdr': 'rgba(100,116,139,.3)',
        '--txt': '#1e293b',
        '--txt2': '#475569',
        '--txt3': '#64748b',
        '--acc': '#2563eb',
        '--acc2': '#1d4ed8',
        '--ok': '#059669',
        '--warn': '#d97706',
        '--err': '#dc2626'
    },
    blue: {
        '--bg': '#0f172a',
        '--bg2': '#1e293b',
        '--bg3': '#334155',
        '--bdr': 'rgba(59,130,246,.3)',
        '--txt': '#e2e8f0',
        '--txt2': '#94a3b8',
        '--txt3': '#64748b',
        '--acc': '#38bdf8',
        '--acc2': '#0ea5e9',
        '--ok': '#10b981',
        '--warn': '#fbbf24',
        '--err': '#f87171'
    },
    green: {
        '--bg': '#0f2318',
        '--bg2': '#1a3a28',
        '--bg3': '#2d5a3f',
        '--bdr': 'rgba(34,197,94,.3)',
        '--txt': '#d1fae5',
        '--txt2': '#86efac',
        '--txt3': '#4ade80',
        '--acc': '#4ade80',
        '--acc2': '#22c55e',
        '--ok': '#22c55e',
        '--warn': '#fbbf24',
        '--err': '#f87171'
    }
};

let currentTheme = 'dark';

export function setTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;

    currentTheme = themeName;
    const root = document.documentElement;

    Object.entries(theme).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });

    // Update meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.content = theme['--acc2'];
    }

    // Store preference
    localStorage.setItem('pla-theme', themeName);

    // Update UI
    updateThemeUI();

    // Dispatch event
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeName } }));
}

export function getTheme() {
    return currentTheme;
}

export function toggleTheme() {
    const themes = Object.keys(THEMES);
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
}

export function initTheme() {
    // Check for saved preference
    const saved = localStorage.getItem('pla-theme');
    if (saved && THEMES[saved]) {
        setTheme(saved);
        return;
    }

    // Check for system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light');
    } else {
        setTheme('dark');
    }

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('pla-theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function updateThemeUI() {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        const icons = { dark: '🌙', light: '☀️', blue: '💙', green: '💚' };
        btn.textContent = icons[currentTheme] || '🎨';
        btn.title = `Theme: ${currentTheme}`;
    }

    // Update any theme-dependent elements
    document.body.setAttribute('data-theme', currentTheme);
}

export function createThemeToggle() {
    const btn = document.createElement('button');
    btn.id = 'themeToggle';
    btn.className = 'btn btn-icon';
    btn.onclick = toggleTheme;
    updateThemeUI();
    return btn;
}

export function showThemeSelector() {
    const modal = document.getElementById('themeModal');
    const content = document.getElementById('themeContent');

    if (content) {
        content.innerHTML = `
            <div class="theme-selector">
                ${Object.entries(THEMES).map(([name, colors]) => `
                    <div class="theme-option ${currentTheme === name ? 'active' : ''}" onclick="window.selectTheme('${name}')">
                        <div class="theme-preview" style="background: ${colors['--bg']}; border: 2px solid ${colors['--acc']}">
                            <div class="preview-header" style="background: ${colors['--bg2']}"></div>
                            <div class="preview-sidebar" style="background: ${colors['--bg2']}"></div>
                            <div class="preview-accent" style="background: ${colors['--acc']}"></div>
                        </div>
                        <div class="theme-name">${name.charAt(0).toUpperCase() + name.slice(1)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="theme-info">
                <p>Theme is saved to your browser and will persist across sessions.</p>
            </div>
        `;
    }

    window.selectTheme = (name) => {
        setTheme(name);
        showThemeSelector(); // Refresh to update active state
    };

    if (modal) modal.style.display = 'flex';
}

// Additional CSS for theme selector (inject once)
export function injectThemeStyles() {
    if (document.getElementById('theme-styles')) return;

    const style = document.createElement('style');
    style.id = 'theme-styles';
    style.textContent = `
        .theme-selector {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 1rem;
            padding: 1rem 0;
        }
        .theme-option {
            cursor: pointer;
            text-align: center;
            padding: 0.5rem;
            border-radius: 8px;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .theme-option:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .theme-option.active {
            outline: 2px solid var(--acc);
            outline-offset: 2px;
        }
        .theme-preview {
            width: 80px;
            height: 60px;
            border-radius: 4px;
            margin: 0 auto 0.5rem;
            position: relative;
            overflow: hidden;
        }
        .preview-header {
            height: 12px;
            width: 100%;
        }
        .preview-sidebar {
            position: absolute;
            top: 12px;
            left: 0;
            width: 20px;
            height: 48px;
        }
        .preview-accent {
            position: absolute;
            bottom: 5px;
            right: 5px;
            width: 30px;
            height: 8px;
            border-radius: 2px;
        }
        .theme-name {
            font-size: 0.75rem;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
}

// Initialize on load
if (typeof window !== 'undefined') {
    injectThemeStyles();
}

export { THEMES };
