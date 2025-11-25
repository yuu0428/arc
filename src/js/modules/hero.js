import { clamp01 } from './utils.js';

export function initializeHero(heroScrollSection, heroViewport) {
  if (!heroScrollSection || !heroViewport) {
    return () => {};
  }

  let heroProgress = 0;
  let heroReleased = false;

  const updateHeroProgress = () => {
    const sectionRect = heroScrollSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight || heroViewport.getBoundingClientRect().height || 1;
    const nextProgress = clamp01(-sectionRect.top / viewportHeight);

    if (Math.abs(nextProgress - heroProgress) > 0.001) {
      heroProgress = nextProgress;
      heroScrollSection.style.setProperty('--hero-progress', heroProgress.toFixed(4));
    }

    const shouldRelease = heroProgress >= 0.98;
    if (shouldRelease !== heroReleased) {
      heroReleased = shouldRelease;
      heroScrollSection.classList.toggle('is-released', heroReleased);
      heroScrollSection.classList.toggle('is-dismissed', heroReleased);
    }
  };

  return updateHeroProgress;
}
