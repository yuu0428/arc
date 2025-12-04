import { sampleColorAtPoint } from './utils.js';
import logoDefault from '../../../images/logo1.webp';
import logoDark from '../../../images/logo11.webp';

export function initializeLogo(logo, logoImg, heroBackdrop) {
  if (!logo || !logoImg) return () => {};

  let currentLogoMode = 'default';

  logoImg.dataset.srcDefault = logoDefault;
  logoImg.dataset.srcLight = logoDefault;
  logoImg.dataset.srcDark = logoDark;

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

  const setLogoSourceForMode = (mode) => {
    const absolutePath = resolveLogoAsset(mode);
    if (!absolutePath || logoImg.src === absolutePath) return;
    logoImg.src = absolutePath;
    currentLogoMode = mode;
  };

  setLogoSourceForMode('default');

  const evaluateLogoContrast = () => {
    const rect = logo.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const images = document.querySelectorAll('img');
    const logoArea = rect.width * rect.height;
    let maxOverlapRatio = 0;

    images.forEach((img) => {
      if (img === logoImg) return;
      const imgRect = img.getBoundingClientRect();
      if (
        imgRect.bottom <= rect.top ||
        imgRect.top >= rect.bottom ||
        imgRect.right <= rect.left ||
        imgRect.left >= rect.right
      ) {
        return;
      }

      const intersectLeft = Math.max(rect.left, imgRect.left);
      const intersectTop = Math.max(rect.top, imgRect.top);
      const intersectRight = Math.min(rect.right, imgRect.right);
      const intersectBottom = Math.min(rect.bottom, imgRect.bottom);

      const intersectWidth = Math.max(0, intersectRight - intersectLeft);
      const intersectHeight = Math.max(0, intersectBottom - intersectTop);
      const intersectArea = intersectWidth * intersectHeight;

      const overlapRatio = intersectArea / logoArea;
      if (overlapRatio > maxOverlapRatio) {
        maxOverlapRatio = overlapRatio;
      }
    });

    if (maxOverlapRatio >= 0.5) {
      if (logo.dataset.theme !== 'dark') {
        logo.dataset.theme = 'dark';
      }
      if (currentLogoMode !== 'dark') {
        setLogoSourceForMode('dark');
      }
      return;
    }

    const sampleX = rect.left + rect.width / 2;
    const sampleY = rect.top + rect.height / 2;

    const sampledColor = sampleColorAtPoint(sampleX, sampleY, [logo], heroBackdrop);

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

  return evaluateLogoContrast;
}
