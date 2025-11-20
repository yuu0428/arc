import { sampleColorAtPoint } from './utils.js';

export function initializeLogo(logo, logoImg, heroBackdrop) {
  if (!logo || !logoImg) return () => {};

  let currentLogoMode = 'default';

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

  // Initial set
  setLogoSourceForMode('default');

  const evaluateLogoContrast = () => {
    const rect = logo.getBoundingClientRect();
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
