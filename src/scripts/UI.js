// ui_script.js (replace your current file)
import { setTableTopMaterial, setBaseMaterial, setTableTopShape } from './table.js';

/**
 * Initialize a material selector control.
 *
 * @param {string|Element} containerSel - selector or element for the control container ('.nav-button' root)
 * @param {string[]} materials - human-readable labels (shown in subtext)
 * @param {string[]} materialKeys - keys passed to the setter function
 * @param {Function} setMaterialFn - function(key) to apply the chosen material to the scene
 * @param {number} defaultIndex - initial selected index (defaults to 0)
 */
function initMaterialControl(containerSel, materials, materialKeys, setMaterialFn, defaultIndex = 0) {
    const container = typeof containerSel === 'string' ? document.querySelector(containerSel) : containerSel;
    if (!container) return;

    const subtextEl = container.querySelector('.nav-option-subtext');
    const dots = Array.from(container.querySelectorAll('.nav-dot'));
    let currentIndex = Math.max(0, Math.min(defaultIndex, materials.length - 1));

    function updateDots(index) {
        dots.forEach((dot, i) => {
            const isActive = i === index;
            if (isActive) {
                dot.classList.add('active');
                // If the container is hovered use the hover color, otherwise selected color.
                dot.style.backgroundColor = "#ffe9a0";
                dot.setAttribute('aria-selected', 'true');
                dot.setAttribute('tabindex', '0');
            } else {
                dot.classList.remove('active');
                dot.style.backgroundColor = 'rgba(51,51,51,0.30)';
                dot.setAttribute('aria-selected', 'false');
                dot.setAttribute('tabindex', '-1');
            }
        });
    }

    // initialize UI
    if (subtextEl) subtextEl.textContent = materials[currentIndex];
    if (typeof setMaterialFn === 'function') setMaterialFn(materialKeys[currentIndex]);
    updateDots(currentIndex);

    // clicking the container cycles through options (unless they clicked a dot)
    container.addEventListener('click', (evt) => {
        if (evt.target.classList && evt.target.classList.contains('nav-dot')) return;

        if (!subtextEl) return;
        subtextEl.style.opacity = 0;

        setTimeout(() => {
            currentIndex = (currentIndex + 1) % materials.length;
            subtextEl.textContent = materials[currentIndex];
            subtextEl.style.opacity = 1;

            if (typeof setMaterialFn === 'function') setMaterialFn(materialKeys[currentIndex]);
            updateDots(currentIndex);
        }, 150);
    });

    // dot click & keyboard handling (use index based on order in DOM)
    dots.forEach((dot, i) => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            if (i === currentIndex) return;

            if (!subtextEl) return;
            subtextEl.style.opacity = 0;

            setTimeout(() => {
                currentIndex = i;
                subtextEl.textContent = materials[currentIndex];
                subtextEl.style.opacity = 1;

                if (typeof setMaterialFn === 'function') setMaterialFn(materialKeys[currentIndex]);
                updateDots(currentIndex);
            }, 120);
        });

        dot.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dot.click();
            }
        });
    });
}

initMaterialControl(
    '#top-material-button',
    ["Glass", "Veneer Wood", "Plaster"],
    ["glass", "wood", "plaster"],
    setTableTopMaterial,
    1 // starting with "Glass"
);

initMaterialControl(
    '#base-material-button',
    ["Veneer Wood", "Plaster"],
    ["wood", "plaster"],
    setBaseMaterial,
    1 // starting with "Plaster"
);

initMaterialControl(
    '#top-shape-button',
    ["Circle", "Ellipse", "Rectangle"],
    ["circle", "ellipse", "rectangle"],
    setTableTopShape,
    1 // starting with "Circle"
);

document.addEventListener("DOMContentLoaded", () => {
    const helpBtn = document.querySelector(".help-btn");
    helpBtn.addEventListener("click", () => {
        const active = helpBtn.classList.toggle("active");
        helpBtn.setAttribute("aria-pressed", active ? "true" : "false");
    });
});