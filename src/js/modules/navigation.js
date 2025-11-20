import { normalizeAngle, shortestAngle, sampleColorAtPoint } from './utils.js';

export function initializeCircularNav(circularNav, menuToggleButton, header, anchorRevealController, heroBackdrop) {
  const overlay = circularNav;
  const wheel = overlay.querySelector('[data-nav-wheel]');
  const backdrop = overlay.querySelector('.js-nav-backdrop');
  if (!wheel) return;

  const items = Array.from(wheel.querySelectorAll('[data-nav-item]'));
  if (!items.length) return;

  // ガイド要素の生成（初回のみ数秒表示）
  let guide = overlay.querySelector('.js-nav-guide');
  if (!guide) {
    guide = document.createElement('div');
    guide.className = 'nav-circular__guide js-nav-guide';
    overlay.appendChild(guide);
  }

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
    navState.step = -360 / items.length;
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
  let guideShown = false;
  const preventScroll = event => {
    if (!menuState.isOpen) return;
    event.preventDefault();
    event.stopPropagation();
  };

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
      const targetSelector = item.getAttribute('data-target');
      if (targetSelector) {
        const target = document.querySelector(targetSelector);
        if (target) {
          if (anchorRevealController) {
            anchorRevealController.handleManualTrigger(targetSelector);
          }
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      closeNav();
    });
  });

  const evaluateMenuToggleContrast = () => {
    const rect = menuToggleButton.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const sampleX = rect.left + rect.width / 2;
    const sampleY = rect.top + rect.height / 2;

    // Pass menuToggleButton as ignore element and heroBackdrop for background check
    const sampledColor = sampleColorAtPoint(sampleX, sampleY, [menuToggleButton], heroBackdrop);
    const { r, g, b } = sampledColor || { r: 255, g: 255, b: 255, a: 1 };
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const shouldInvert = luminance <= 0.35;
    menuToggleButton.classList.toggle('is-inverted', shouldInvert);
  };

  function openNav() {
    if (menuState.isOpen) return;
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      overlay.classList.add('is-visible');
      requestAnimationFrame(() => {
        updateWheel(true);
      });
    });
    menuState.isOpen = true;
    header.setAttribute('data-hidden', 'false');
    document.body.classList.add('nav-open');
    document.body.style.setProperty('overflow', 'hidden');
    overlay.addEventListener('wheel', preventScroll, { passive: false });
    overlay.addEventListener('touchmove', preventScroll, { passive: false });
    wheel.addEventListener('touchmove', preventScroll, { passive: false });
    backdrop?.addEventListener('touchmove', preventScroll, { passive: false });
    menuToggleButton.setAttribute('aria-expanded', 'true');
    menuToggleButton.setAttribute('aria-label', 'メニューを閉じる');
    evaluateMenuToggleContrast();
    focusActiveItem();
    document.addEventListener('keydown', handleKeydown);
    showGuideOnce();
  }

  function closeNav() {
    if (!menuState.isOpen) return;
    menuState.isOpen = false;
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    menuToggleButton.setAttribute('aria-expanded', 'false');
    menuToggleButton.setAttribute('aria-label', 'メニューを開く');
    document.body.classList.remove('nav-open');
    document.body.style.removeProperty('overflow');
    overlay.removeEventListener('wheel', preventScroll, { passive: false });
    overlay.removeEventListener('touchmove', preventScroll, { passive: false });
    wheel.removeEventListener('touchmove', preventScroll, { passive: false });
    backdrop?.removeEventListener('touchmove', preventScroll, { passive: false });
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

    if (Math.abs(navState.rotation - navState.startRotation) > navState.step * 0.08) {
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

    navState.rotation += delta * 0.22;
    navState.didDrag = true;
    updateWheel();
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
    }, 260);
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
      navState.radius = Math.max(rect.width / 2 - 100, rect.width * 0.46);
    }

    const activeIndex = getActiveItemIndex();

    items.forEach((item, index) => {
      const baseAngle = navState.baseAngles[index] ?? 0;
      const angle = baseAngle + navState.rotation;
      const distance = Math.abs(normalizeAngle(angle - navState.targetAngleOffset));

      const proximity = Math.max(0, 1 - Math.min(distance / (navState.step * 1.1 || 1), 1));
      const isActive = index === activeIndex;
      
      // Active item always gets maximum scale (1.06), others are scaled by proximity
      const scale = isActive ? 1.06 : (0.84 + proximity * 0.22);
      const opacity = isActive ? 1 : 0.85;

      const itemDistance = Math.max(navState.radius * 0.75, navState.radius - 60);
      const displayAngle = angle + navState.displayOffset;
      const transform = `translate(-50%, -40%) rotate(${displayAngle.toFixed(3)}deg) translateX(${itemDistance.toFixed(3)}px) rotate(${(180 - navState.displayOffset).toFixed(3)}deg) scale(${scale.toFixed(3)})`;
      item.style.transform = transform;
      item.style.opacity = opacity;
      item.style.zIndex = String(100 + Math.round(proximity * 100));
      item.classList.toggle('is-active', isActive);
      item.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    const toPositive = (value) => ((value % 360) + 360) % 360;
    if (items.length >= 2) {
      // ギャップをアイテム0→1の中間（実表示角度）に固定
      // テキスト側は translate(-50%, -40%) rotate(displayAngle) translateX(...) rotate(180deg) scale(...)
      // なので、displayOffset + targetAngleOffset + 180deg をマスク計算にも反映させる
      const base0 = navState.baseAngles[0] ?? 0;
      const displayAngle0 = toPositive(base0 + navState.rotation + navState.displayOffset + navState.targetAngleOffset + 180);
      const gapCenter = toPositive(displayAngle0 + navState.step / 2);
      const arcStart = toPositive(gapCenter + navState.gapAngle / 2 + 105);
      wheel.style.setProperty('--nav-arc-start', `${arcStart}deg`);
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

  function showGuideOnce() {
    if (guideShown || !guide) return;
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    guide.textContent = isMobile
      ? '左右スワイプで選択、タップで決定、外側タップか×で閉じる'
      : '←/→ で移動、Enterで決定、Escで閉じる';
    guide.classList.add('is-visible');
    guideShown = true;
    window.setTimeout(() => {
      guide?.classList.remove('is-visible');
    }, 2800);
  }

  return {
    evaluateMenuToggleContrast
  };
}
