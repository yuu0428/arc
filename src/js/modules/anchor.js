export function initializeAnchorRevealOverride() {
  const greetingsElements = Array.from(document.querySelectorAll('.js-person-card'));
  const anchorMap = new Map();
  if (greetingsElements.length) {
    anchorMap.set('#greetings', { elements: greetingsElements, timer: null });
  }
  if (!anchorMap.size) {
    return null;
  }

  const ACTIVE_CLASS = 'anchor-jump-visible';
  const HOLD_DURATION = 1200;

  const applyForSelector = (selector) => {
    if (typeof selector !== 'string' || !anchorMap.has(selector)) {
      return;
    }
    const entry = anchorMap.get(selector);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    entry.elements.forEach((element) => element.classList.add(ACTIVE_CLASS));
    entry.timer = window.setTimeout(() => {
      entry.elements.forEach((element) => element.classList.remove(ACTIVE_CLASS));
    }, HOLD_DURATION);
  };

  const handleAnchorClick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const anchor = target.closest('a[href^="#"]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    applyForSelector(href);
  };

  document.addEventListener('click', handleAnchorClick, true);
  window.addEventListener('hashchange', () => {
    applyForSelector(window.location.hash);
  });
  window.addEventListener('load', () => {
    applyForSelector(window.location.hash);
  });

  return {
    handleManualTrigger: (selector) => {
      applyForSelector(selector);
    },
  };
}
