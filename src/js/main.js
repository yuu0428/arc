import '../css/main.css';
import { initializeHero } from './modules/hero.js';
import { initializeLogo } from './modules/logo.js';
import { initializeCircularNav } from './modules/navigation.js';
import { initializeScrollReveal } from './modules/scroll-reveal.js';
import { initializeAnchorRevealOverride } from './modules/anchor.js';
import { initializeFallSim } from './modules/fall-sim.js';

(() => {
  const header = document.querySelector('.js-header');
  const logo = document.querySelector('.js-logo');
  const logoImg = logo?.querySelector('.js-logo-img');
  const menuToggleButton = document.querySelector('.js-menu-toggle');
  const circularNav = document.querySelector('.js-nav-circular');
  const heroBackdrop = document.querySelector('.js-hero-backdrop');
  const heroScrollSection = document.querySelector('.js-hero-scroll');
  const heroViewport = heroScrollSection?.querySelector('.js-hero-viewport') || null;

  if (!header || !logo || !logoImg || !menuToggleButton || !circularNav) {
    return;
  }

  if (menuToggleButton.parentElement !== document.body) {
    document.body.appendChild(menuToggleButton);
  }

  menuToggleButton.setAttribute('aria-expanded', 'false');

  // Initialize Modules
  const updateHeroProgress = initializeHero(heroScrollSection, heroViewport);
  const evaluateLogoContrast = initializeLogo(logo, logoImg, heroBackdrop);
  const anchorRevealController = initializeAnchorRevealOverride();
  const { evaluateMenuToggleContrast } = initializeCircularNav(circularNav, menuToggleButton, header, anchorRevealController, heroBackdrop) || {};
  initializeScrollReveal();
  initializeFallSim();

  // Scroll Handling
  let lastScrollY = window.pageYOffset;
  let ticking = false;
  // Note: isMenuOpen is tracked inside navigation.js but we need to know it here for header hiding
  // For now, we'll check the body class or attribute
  const isMenuOpen = () => document.body.classList.contains('nav-open');

  const handleScroll = () => {
    const currentY = window.pageYOffset;
    const delta = currentY - lastScrollY;

    if (!isMenuOpen()) {
      if (delta > 6 && currentY > 120) {
        header.setAttribute('data-hidden', 'true');
      } else if (delta < -6 || currentY <= 120) {
        header.setAttribute('data-hidden', 'false');
      }
    }

    lastScrollY = currentY;
    if (updateHeroProgress) updateHeroProgress();
    if (evaluateLogoContrast) evaluateLogoContrast();
    if (evaluateMenuToggleContrast) evaluateMenuToggleContrast();
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener(
    'resize',
    () =>
      window.requestAnimationFrame(() => {
        if (updateHeroProgress) updateHeroProgress();
        if (evaluateLogoContrast) evaluateLogoContrast();
        if (evaluateMenuToggleContrast) evaluateMenuToggleContrast();
      })
  );

  const runInitialContrastCheck = () => {
    if (updateHeroProgress) updateHeroProgress();
    if (evaluateLogoContrast) evaluateLogoContrast();
    if (evaluateMenuToggleContrast) evaluateMenuToggleContrast();
  };

  document.addEventListener('DOMContentLoaded', runInitialContrastCheck);
  window.addEventListener('load', runInitialContrastCheck);
  runInitialContrastCheck();

})();
