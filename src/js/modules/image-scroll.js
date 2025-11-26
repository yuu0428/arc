let isInitialized = false;

export function initializeImageScroll() {
  if (isInitialized) return;

  const scrollTopTrack = document.querySelector('.js-scroll-top .js-scroll-track');
  const scrollBottomTrack = document.querySelector('.js-scroll-bottom .js-scroll-track');
  const imageScrollContainer = document.querySelector('#image-scroll');

  if (!scrollTopTrack || !scrollBottomTrack) {
    console.warn('Scroll tracks not found');
    return;
  }

  const topImages = import.meta.glob('../../../images/scroll-top/*.webp', { eager: true, import: 'default' });
  const bottomImages = import.meta.glob('../../../images/scroll-bottom/*.webp', { eager: true, import: 'default' });

  const sortByIndex = (entries, pattern) =>
    entries
      .map(([path, src]) => {
        const match = path.match(pattern);
        return { src, index: match ? Number(match[1]) : 0 };
      })
      .sort((a, b) => a.index - b.index);

  const topImageList = sortByIndex(Object.entries(topImages), /scroll-top(\d+)\.webp$/);
  const bottomImageList = sortByIndex(Object.entries(bottomImages), /scroll-bottom(\d+)\.webp$/);

  if (!topImageList.length || !bottomImageList.length) {
    console.warn('Scroll images not found');
    return;
  }

  const duplicateCount = 2;
  const loadPromises = [];

  const appendImages = (track, images, altPrefix) => {
    for (let i = 0; i < duplicateCount; i++) {
      images.forEach(({ src, index }) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `${altPrefix} ${index}`;
        img.loading = 'lazy';
        track.appendChild(img);
        const loadPromise = new Promise((resolve) => {
          if (img.complete && img.naturalWidth) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        loadPromises.push(loadPromise);
      });
    }
  };

  appendImages(scrollTopTrack, topImageList, 'Scroll top');
  appendImages(scrollBottomTrack, bottomImageList, 'Scroll bottom');

  Promise.all(loadPromises).then(() => {
    if (imageScrollContainer) {
      imageScrollContainer.classList.add('image-scroll--ready');
    }
  });

  isInitialized = true;
}
