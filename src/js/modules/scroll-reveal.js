import { clamp01 } from './utils.js';

export function initializeScrollReveal() {
  const elementsToReveal = [
    ...document.querySelectorAll('.js-about-heading, .js-about-text, .js-about-image, .js-person-card'),
  ];
  
  if (!elementsToReveal.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const harutoElement = document.querySelector('.js-person-card[data-person="haruto"]');
  const rikoElement = document.querySelector('.js-person-card[data-person="riko"]');

  const computeProgress = (element, viewportHeight, targetY, range) => {
    const rect = element.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const distanceBelowCenter = Math.max(0, centerY - targetY);
    return clamp01(1 - distanceBelowCenter / range);
  };

  const updateFade = () => {
    if (prefersReducedMotion.matches || !document.body.classList.contains('has-scroll-reveal')) {
      elementsToReveal.forEach((target) => target.style.removeProperty('--scroll-fade-progress'));
      return;
    }

    const viewportHeight = window.innerHeight || 1;
    const targetY = viewportHeight * 0.65;
    const range = Math.max(1, viewportHeight * 0.35);

    const sharedProgress =
      harutoElement && harutoElement.isConnected
        ? computeProgress(harutoElement, viewportHeight, targetY, range)
        : null;

    elementsToReveal.forEach((target) => {
      let progress;
      if (sharedProgress !== null && (target === harutoElement || target === rikoElement)) {
        progress = sharedProgress;
      } else {
        progress = computeProgress(target, viewportHeight, targetY, range);
      }
      target.style.setProperty('--scroll-fade-progress', progress.toFixed(3));
    });
  };

  const applyMotionPreference = () => {
    if (prefersReducedMotion.matches) {
      document.body.classList.remove('has-scroll-reveal');
      elementsToReveal.forEach((target) => target.style.removeProperty('--scroll-fade-progress'));
    } else {
      document.body.classList.add('has-scroll-reveal');
      updateFade();
    }
  };

  applyMotionPreference();
  prefersReducedMotion.addEventListener('change', applyMotionPreference);
  window.addEventListener('scroll', () => {
    window.requestAnimationFrame(updateFade);
  }, { passive: true });
  window.addEventListener('resize', () => {
    window.requestAnimationFrame(updateFade);
  });
  updateFade();
}
