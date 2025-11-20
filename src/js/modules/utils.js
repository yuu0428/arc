export const clamp01 = (value) => Math.max(0, Math.min(1, value));

export const parseRGB = (value) => {
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

export const resolveBackgroundColor = (element, depth = 0) => {
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

export const sampleColorAtPoint = (x, y, ignoreElements = [], heroBackdrop) => {
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

export const shortestAngle = (from, to) => {
  let diff = to - from;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
};

export const normalizeAngle = (angle) => {
  const normalized = ((angle % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
};
