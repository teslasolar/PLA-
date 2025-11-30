/**
 * PLA Designer - NESC Loading Districts
 */
import { state, subscribe, notify } from './state.js';

// NESC Loading Districts
export const LOADING_DISTRICTS = {
    heavy: {
        name: 'Heavy',
        ice: 0.5,        // inches radial
        wind: 4,         // psf
        temp: 0,         // °F
        constant: 0.30,  // lb/ft additional
        description: 'Northern US, high elevation',
        color: '#3b82f6'
    },
    medium: {
        name: 'Medium',
        ice: 0.25,
        wind: 4,
        temp: 15,
        constant: 0.20,
        description: 'Central US, moderate climate',
        color: '#10b981'
    },
    light: {
        name: 'Light',
        ice: 0,
        wind: 9,
        temp: 30,
        constant: 0.05,
        description: 'Southern US, coastal',
        color: '#f59e0b'
    },
    warm_islands: {
        name: 'Warm Islands',
        ice: 0,
        wind: 9,
        temp: 50,
        constant: 0,
        description: 'Hawaii, tropical regions',
        color: '#ef4444'
    }
};

// NESC Grades
export const GRADES = {
    B: { name: 'Grade B', factor: 2.5, description: 'Crossings of railroads, limited access highways' },
    C: { name: 'Grade C', factor: 2.2, description: 'General requirements' },
    N: { name: 'Grade N', factor: 1.0, description: 'National standard (no overload)' }
};

// Current settings
let currentDistrict = 'medium';
let currentGrade = 'C';

// Get current district
export function getLoadingDistrict() {
    return { key: currentDistrict, ...LOADING_DISTRICTS[currentDistrict] };
}

// Set loading district
export function setLoadingDistrict(district) {
    if (LOADING_DISTRICTS[district]) {
        currentDistrict = district;
        updateUI();
        notify('loading', getLoadingDistrict());
        return true;
    }
    return false;
}

// Get current grade
export function getGrade() {
    return { key: currentGrade, ...GRADES[currentGrade] };
}

// Set grade
export function setGrade(grade) {
    if (GRADES[grade]) {
        currentGrade = grade;
        updateUI();
        notify('grade', getGrade());
        return true;
    }
    return false;
}

// Calculate combined loading
export function calculateLoading(conductorDia = 0.5) {
    const dist = LOADING_DISTRICTS[currentDistrict];

    // Ice weight per foot
    const iceWeight = dist.ice > 0 ? 1.24 * dist.ice * (conductorDia + dist.ice) : 0;

    // Wind load per foot
    const icedDia = conductorDia + 2 * dist.ice;
    const windLoad = dist.wind * icedDia / 12;

    return {
        district: dist.name,
        ice: dist.ice,
        wind: dist.wind,
        temp: dist.temp,
        iceWeight,
        windLoad,
        constant: dist.constant,
        totalVertical: iceWeight + dist.constant,
        resultant: Math.sqrt((iceWeight + dist.constant) ** 2 + windLoad ** 2)
    };
}

// Get overload factor
export function getOverloadFactor(isCrossing = false) {
    const grade = GRADES[currentGrade];
    return grade.factor;
}

// Update UI
function updateUI() {
    // Update district buttons
    document.querySelectorAll('[data-district]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.district === currentDistrict);
    });

    // Update grade buttons
    document.querySelectorAll('[data-grade]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.grade === currentGrade);
    });

    // Update display
    const districtDisplay = document.getElementById('currentDistrict');
    const gradeDisplay = document.getElementById('currentGrade');

    if (districtDisplay) {
        const dist = LOADING_DISTRICTS[currentDistrict];
        districtDisplay.innerHTML = `
            <span style="color:${dist.color}">●</span> ${dist.name}
            <span style="font-size:0.7rem;color:#94a3b8">(${dist.ice}" ice, ${dist.wind} psf wind)</span>
        `;
    }

    if (gradeDisplay) {
        gradeDisplay.textContent = `Grade ${currentGrade}`;
    }
}

// Build loading selector UI
export function buildLoadingSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="loading-selector">
            <div class="loading-section">
                <div class="loading-label">Loading District</div>
                <div class="loading-buttons">
                    ${Object.entries(LOADING_DISTRICTS).map(([key, dist]) => `
                        <button class="btn ${key === currentDistrict ? 'active' : ''}"
                                data-district="${key}"
                                onclick="setDistrict('${key}')"
                                title="${dist.description}"
                                style="border-left:3px solid ${dist.color}">
                            ${dist.name}
                        </button>
                    `).join('')}
                </div>
                <div id="currentDistrict" class="loading-info"></div>
            </div>
            <div class="loading-section">
                <div class="loading-label">Construction Grade</div>
                <div class="loading-buttons">
                    ${Object.entries(GRADES).map(([key, grade]) => `
                        <button class="btn ${key === currentGrade ? 'active' : ''}"
                                data-grade="${key}"
                                onclick="setGradeUI('${key}')"
                                title="${grade.description}">
                            ${grade.name}
                        </button>
                    `).join('')}
                </div>
                <div id="currentGrade" class="loading-info"></div>
            </div>
        </div>
    `;

    // Expose to window
    window.setDistrict = setLoadingDistrict;
    window.setGradeUI = setGrade;

    updateUI();
}

// Initialize
export function initLoading() {
    updateUI();
}

export default { LOADING_DISTRICTS, GRADES, getLoadingDistrict, setLoadingDistrict, getGrade, setGrade, calculateLoading, getOverloadFactor, buildLoadingSelector, initLoading };
