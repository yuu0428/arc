(() => {
  const header = document.querySelector('.site-header');
  const logo = document.querySelector('.logo-fixed');
  const logoImg = logo?.querySelector('img');
  const menuToggleButton = document.querySelector('.menu-toggle');
  const circularNav = document.querySelector('[data-circular-nav]');
  const heroBackdrop = document.querySelector('.hero-backdrop');
  const heroScrollSection = document.querySelector('.hero-scroll');
  const heroViewport = heroScrollSection?.querySelector('.hero-viewport') || null;
  if (!header || !logo || !logoImg || !menuToggleButton || !circularNav) {
    return;
  }

  if (menuToggleButton.parentElement !== document.body) {
    document.body.appendChild(menuToggleButton);
  }

  let lastScrollY = window.pageYOffset;
  let ticking = false;
  let isMenuOpen = false;
  let heroReleased = false;
  let heroProgress = 0;

  menuToggleButton.setAttribute('aria-expanded', 'false');

  const resolveLogoAsset = (mode) => {
    const dataset = logoImg.dataset;
    const primaryKey = `src${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
    const candidates = [dataset[primaryKey], dataset.srcDefault, dataset.srcLight, dataset.srcDark];
    const assetPath = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    if (!assetPath) return '';
    try {
      return new URL(assetPath, window.location.href).href;
    } catch (error) {
      return assetPath;
    }
  };

  let currentLogoMode = 'default';

  const setLogoSourceForMode = (mode) => {
    const absolutePath = resolveLogoAsset(mode);
    if (!absolutePath || logoImg.src === absolutePath) return;
    logoImg.src = absolutePath;
    currentLogoMode = mode;
  };

  setLogoSourceForMode('default');

  const parseRGB = (value) => {
    if (!value) return null;
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(',').map((item) => item.trim());
    if (parts.length < 3) return null;
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    const a = parts[3] !== undefined ? Number(parts[3]) : 1;
    if ([r, g, b, a].some((component) => Number.isNaN(component))) {
      return null;
    }
    return { r, g, b, a };
  };

  const resolveBackgroundColor = (element, depth = 0) => {
    if (!element || depth > 10) {
      return parseRGB(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    }

    const style = getComputedStyle(element);
    const color = parseRGB(style.backgroundColor);
    if (color && color.a > 0 && style.backgroundImage === 'none') {
      return color;
    }
    return resolveBackgroundColor(element.parentElement, depth + 1);
  };

  const sampleColorAtPoint = (x, y, ignoreElements = []) => {
    if (heroBackdrop) {
      const heroRect = heroBackdrop.getBoundingClientRect();
      if (x >= heroRect.left && x <= heroRect.right && y >= heroRect.top && y <= heroRect.bottom) {
        const backdropColor = parseRGB(getComputedStyle(heroBackdrop).backgroundColor);
        if (backdropColor) {
          return backdropColor;
        }
      }
    }

    const suppressed = [];
    ignoreElements.forEach((element) => {
      if (!(element instanceof Element)) {
        return;
      }
      suppressed.push({ element, previous: element.style.pointerEvents });
      element.style.pointerEvents = 'none';
    });

    let elementBeneath = null;
    try {
      elementBeneath = document.elementFromPoint(x, y);
    } catch (error) {
      elementBeneath = null;
    } finally {
      suppressed.forEach(({ element, previous }) => {
        element.style.pointerEvents = previous;
      });
    }

    return resolveBackgroundColor(elementBeneath) || resolveBackgroundColor(document.body);
  };

  const evaluateLogoContrast = () => {
    const rect = logo.getBoundingClientRect();
    const sampleX = rect.left + rect.width / 2;
    const sampleY = rect.top + rect.height / 2;

    const sampledColor = sampleColorAtPoint(sampleX, sampleY, [logo]);

    const { r, g, b } = sampledColor || { r: 255, g: 255, b: 255, a: 1 };
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    let theme;
    if (luminance >= 0.65) {
      theme = 'light';
    } else if (luminance <= 0.35) {
      theme = 'dark';
    } else {
      theme = 'mid';
    }

    if (logo.dataset.theme !== theme) {
      logo.dataset.theme = theme;
    }

    const nextMode = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'default';
    if (currentLogoMode !== nextMode) {
      setLogoSourceForMode(nextMode);
    }
  };

  const evaluateMenuToggleContrast = () => {
    const rect = menuToggleButton.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const sampleX = rect.left + rect.width / 2;
    const sampleY = rect.top + rect.height / 2;

    const sampledColor = sampleColorAtPoint(sampleX, sampleY, [menuToggleButton]);
    const { r, g, b } = sampledColor || { r: 255, g: 255, b: 255, a: 1 };
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const shouldInvert = luminance <= 0.35;
    menuToggleButton.classList.toggle('is-inverted', shouldInvert);
  };

  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  const updateHeroProgress = () => {
    if (!heroScrollSection || !heroViewport) {
      return;
    }

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

  const handleScroll = () => {
    const currentY = window.pageYOffset;
    const delta = currentY - lastScrollY;

    if (!isMenuOpen) {
      if (delta > 6 && currentY > 120) {
        header.setAttribute('data-hidden', 'true');
      } else if (delta < -6 || currentY <= 120) {
        header.setAttribute('data-hidden', 'false');
      }
    }

    lastScrollY = currentY;
    updateHeroProgress();
    evaluateLogoContrast();
    evaluateMenuToggleContrast();
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
        updateHeroProgress();
        evaluateLogoContrast();
        evaluateMenuToggleContrast();
      })
  );
  const runInitialContrastCheck = () => {
    updateHeroProgress();
    evaluateLogoContrast();
    evaluateMenuToggleContrast();
  };

  document.addEventListener('DOMContentLoaded', runInitialContrastCheck);
  window.addEventListener('load', runInitialContrastCheck);
  runInitialContrastCheck();

  initializeCircularNav();

  function initializeCircularNav() {
    const overlay = circularNav;
    const wheel = overlay.querySelector('[data-nav-wheel]');
    if (!wheel) return;

    const items = Array.from(wheel.querySelectorAll('[data-nav-item]'));
    if (!items.length) return;

    const menuState = { isOpen: false };
    const gapAngle = 24;
    const arcSpan = 360 - gapAngle;
    const targetAngleOffset = 165;
    const displayOffset = -8;

    const navState = {
      rotation: 0,
      lastAngle: 0,
      pointerId: null,
      isDragging: false,
      startRotation: 0,
      didDrag: false,
      radius: 0,
      snapTimer: null,
      hideTimer: null,
      resizeTimer: null,
      baseAngles: [],
      step: 0,
      gapAngle,
      arcSpan,
      targetAngleOffset,
      displayOffset,
    };

    if (items.length === 1) {
      navState.baseAngles = [0];
      navState.step = 360;
    } else {
      navState.step = 360 / items.length;
      navState.baseAngles = items.map((_, index) => index * navState.step);
      const desiredGapCenter = -90;
      const lastBaseAngle = navState.baseAngles[items.length - 1] ?? 0;
      const gapCenterWithoutRotation = lastBaseAngle + navState.step / 2;
      navState.rotation = normalizeAngle(desiredGapCenter - gapCenterWithoutRotation + navState.targetAngleOffset);

      const firstTargetAngle = navState.baseAngles[0];
      const currentAngle = normalizeAngle(firstTargetAngle + navState.rotation);
      const correction = normalizeAngle(navState.targetAngleOffset - currentAngle);
      navState.rotation += correction;
    }

    let lastFocused = null;

    const closeTargets = overlay.querySelectorAll('[data-nav-close]');

    menuToggleButton.addEventListener('click', () => {
      const expanded = menuToggleButton.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        closeNav();
      } else {
        openNav();
      }
    });

    closeTargets.forEach((element) => {
      element.addEventListener('click', () => {
        closeNav();
      });
    });

    overlay.addEventListener('transitionend', (event) => {
      if (event.target !== overlay || event.propertyName !== 'opacity') return;
      if (!menuState.isOpen) {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
      }
    });

    wheel.addEventListener('pointerdown', handlePointerDown);
    wheel.addEventListener('pointermove', handlePointerMove);
    wheel.addEventListener('pointerup', handlePointerUp);
    wheel.addEventListener('pointercancel', handlePointerUp);
    wheel.addEventListener('pointerleave', handlePointerUp);
    wheel.addEventListener('wheel', handleWheel, { passive: false });

    window.addEventListener('resize', handleResize);

    items.forEach((item) => {
      item.addEventListener('click', (event) => {
        if (navState.didDrag) {
          navState.didDrag = false;
          return;
        }

        event.preventDefault();
        closeNav();
      });
    });

    function openNav() {
      if (menuState.isOpen) return;
      lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
        updateWheel(true);
      });
      menuState.isOpen = true;
      isMenuOpen = true;
      header.setAttribute('data-hidden', 'false');
      document.body.classList.add('nav-open');
      menuToggleButton.setAttribute('aria-expanded', 'true');
      menuToggleButton.setAttribute('aria-label', 'メニューを閉じる');
      evaluateMenuToggleContrast();
      focusActiveItem();
      document.addEventListener('keydown', handleKeydown);
    }

    function closeNav() {
      if (!menuState.isOpen) return;
      menuState.isOpen = false;
      isMenuOpen = false;
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
      menuToggleButton.setAttribute('aria-expanded', 'false');
      menuToggleButton.setAttribute('aria-label', 'メニューを開く');
      document.body.classList.remove('nav-open');
      document.removeEventListener('keydown', handleKeydown);
      wheel.classList.remove('is-dragging');
      navState.isDragging = false;
      navState.pointerId = null;
      navState.didDrag = false;
      window.clearTimeout(navState.snapTimer);
      window.clearTimeout(navState.resizeTimer);
      window.clearTimeout(navState.hideTimer);
      navState.snapTimer = null;
      navState.resizeTimer = null;
      navState.hideTimer = window.setTimeout(() => {
        if (!menuState.isOpen) {
          overlay.hidden = true;
          overlay.setAttribute('aria-hidden', 'true');
        }
      }, 260);

      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus({ preventScroll: true });
      } else {
        menuToggleButton.focus({ preventScroll: true });
      }
      evaluateMenuToggleContrast();
    }

    function handleKeydown(event) {
      if (!menuState.isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeNav();
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        rotateBy(-navState.step);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        rotateBy(navState.step);
      }
    }

    function handlePointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      navState.isDragging = true;
      navState.pointerId = event.pointerId;
      navState.startRotation = navState.rotation;
      navState.lastAngle = getPointerAngle(event);
      navState.didDrag = false;
      wheel.classList.add('is-dragging');
      if (wheel.setPointerCapture) {
        wheel.setPointerCapture(event.pointerId);
      }
    }

    function handlePointerMove(event) {
      if (!navState.isDragging || navState.pointerId !== event.pointerId) {
        return;
      }

      const angle = getPointerAngle(event);
      if (Number.isNaN(angle)) return;

      const delta = shortestAngle(navState.lastAngle, angle);
      navState.rotation += delta;
      navState.lastAngle = angle;

      if (Math.abs(navState.rotation - navState.startRotation) > navState.step * 0.2) {
        navState.didDrag = true;
      }

      updateWheel();
    }

    function handlePointerUp(event) {
      if (!navState.isDragging || (navState.pointerId !== null && navState.pointerId !== event.pointerId)) {
        return;
      }

      navState.isDragging = false;
      navState.pointerId = null;
      wheel.classList.remove('is-dragging');

      if (wheel.releasePointerCapture && event.pointerId !== undefined) {
        wheel.releasePointerCapture(event.pointerId);
      }

      snapToActive();
      navState.didDrag = false;
    }

    function handleWheel(event) {
      event.preventDefault();
      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Number.isNaN(delta)) return;

      navState.rotation += delta * 0.35;
      navState.didDrag = true;
      updateWheel();
      scheduleSnap();
    }

    function handleResize() {
      if (!menuState.isOpen) return;
      window.clearTimeout(navState.resizeTimer);
      navState.resizeTimer = window.setTimeout(() => {
        navState.radius = 0;
        updateWheel(true);
      }, 140);
    }

    function rotateBy(amount) {
      navState.rotation += amount;
      navState.didDrag = true;
      updateWheel();
      scheduleSnap();
    }

    function scheduleSnap() {
      window.clearTimeout(navState.snapTimer);
      navState.snapTimer = window.setTimeout(() => {
        snapToActive();
        navState.didDrag = false;
      }, 160);
    }

    function snapToActive() {
      const index = getActiveItemIndex();
      if (index === null) return;

      const targetAngle = navState.baseAngles[index];
      const current = normalizeAngle(targetAngle + navState.rotation - navState.targetAngleOffset);
      navState.rotation -= current;
      updateWheel();
      focusActiveItem();
    }

    function focusActiveItem() {
      const index = getActiveItemIndex();
      const item = items[index] || items[0];
      if (item) {
        item.focus({ preventScroll: true });
      }
    }

    function updateWheel(force = false) {
      const rect = wheel.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      if (force || !navState.radius) {
        navState.radius = Math.max(rect.width / 2 - 140, rect.width * 0.42);
      }

      const activeIndex = getActiveItemIndex();

      items.forEach((item, index) => {
        const baseAngle = navState.baseAngles[index] ?? 0;
        const angle = baseAngle + navState.rotation;
        const distance = Math.abs(normalizeAngle(angle - navState.targetAngleOffset));

        const proximity = Math.max(0, 1 - Math.min(distance / (navState.step * 1.1 || 1), 1));
        const scale = 0.84 + proximity * 0.22;
        const isActive = index === activeIndex;
        const opacity = isActive ? 1 : 0.85;

        const itemDistance = Math.max(navState.radius * 0.75, navState.radius - 60);
        const displayAngle = angle + navState.displayOffset;
        const transform = `translate(-50%, -40%) rotate(${displayAngle.toFixed(3)}deg) translateX(${itemDistance.toFixed(3)}px) rotate(180deg) scale(${scale.toFixed(3)})`;
        item.style.transform = transform;
        item.style.opacity = opacity;
        item.style.zIndex = String(100 + Math.round(proximity * 100));
        item.classList.toggle('is-active', isActive);
        item.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      const toPositive = (value) => ((value % 360) + 360) % 360;
      if (items.length >= 2) {
        const topAngle = toPositive(navState.baseAngles[0] + navState.rotation - navState.targetAngleOffset);
        const contactAngle = toPositive(navState.baseAngles[items.length - 1] + navState.rotation - navState.targetAngleOffset);
        const forwardDiff = (topAngle - contactAngle + 360) % 360;
        const gapCenter = (contactAngle + forwardDiff / 2) % 360;
        const arcStart = (gapCenter + navState.gapAngle / 2) % 360;
        const cssArcStart = (arcStart + 90 + navState.targetAngleOffset) % 360;
        wheel.style.setProperty('--nav-arc-start', `${cssArcStart}deg`);
      } else {
        const cssArcStart = (toPositive(navState.rotation - navState.targetAngleOffset) + 90 + navState.targetAngleOffset) % 360;
        wheel.style.setProperty('--nav-arc-start', `${cssArcStart}deg`);
      }

      wheel.style.setProperty('--nav-arc-span', `${navState.arcSpan}deg`);
    }

    function getActiveItemIndex() {
      let indexOfActive = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      items.forEach((_, index) => {
        const angle = navState.baseAngles[index] + navState.rotation;
        const distance = Math.abs(normalizeAngle(angle - navState.targetAngleOffset));
        if (distance < minDistance) {
          minDistance = distance;
          indexOfActive = index;
        }
      });

      return indexOfActive;
    }

    function getPointerAngle(event) {
      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radians = Math.atan2(event.clientY - cy, event.clientX - cx);
      return radians * (180 / Math.PI);
    }

    function shortestAngle(from, to) {
      let diff = to - from;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      return diff;
    }

    function normalizeAngle(angle) {
      const normalized = ((angle % 360) + 360) % 360;
      return normalized > 180 ? normalized - 360 : normalized;
    }

    overlay.circularNav = {
      open: openNav,
      close: closeNav,
    };
  }
})();
