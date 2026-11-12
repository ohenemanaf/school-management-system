// Locates the element a tour step points at.
//   '[data-tour="x"]'          any CSS selector
//   { text: 'Add Room' }       a visible button, link, tab or heading containing that text
//   { text: 'X', selector }    the same, limited to elements matching `selector`
// Returns null when nothing visible matches; the step is then shown centred.

const DEFAULT_TEXT_SELECTOR = 'button, a, [role="tab"], h1, h2, h3, label, th';

export const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) !== 0;
};

export function findTarget(target) {
    if (!target) return null;
    if (typeof target === 'string') {
        return [...document.querySelectorAll(target)].find(isVisible) || null;
    }
    const wanted = target.text.toLowerCase();
    const candidates = [...document.querySelectorAll(target.selector || DEFAULT_TEXT_SELECTOR)]
        .filter((el) => !el.closest('[data-tour-ui]') && isVisible(el) && el.textContent.trim().toLowerCase().includes(wanted));
    // Prefer the tightest match (a button over the section that contains it).
    candidates.sort((a, b) => a.textContent.length - b.textContent.length);
    return candidates[0] || null;
}

/** Resolves once the target appears (pages load lazily), or with null after `timeout` ms. */
export function waitForTarget(target, timeout = 2500) {
    return new Promise((resolve) => {
        if (!target) return resolve(null);
        const started = Date.now();
        const look = () => {
            const el = findTarget(target);
            if (el || Date.now() - started > timeout) return resolve(el);
            setTimeout(look, 120);
        };
        look();
    });
}
