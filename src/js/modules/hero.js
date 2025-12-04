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
      const progressValue = heroProgress.toFixed(4);
      heroScrollSection.style.setProperty('--hero-progress', progressValue);
      const backdropShade = Math.round(255 * heroProgress);
      const backdropColor = `rgb(${backdropShade}, ${backdropShade}, ${backdropShade})`;
      heroScrollSection.style.setProperty('--hero-backdrop-color', backdropColor);
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
