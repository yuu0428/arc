let isInitialized = false;

export function initializeImageScroll() {
  if (isInitialized) return;

  const scrollTopTrack = document.querySelector('.js-scroll-top .js-scroll-track');
  const scrollBottomTrack = document.querySelector('.js-scroll-bottom .js-scroll-track');

  if (!scrollTopTrack || !scrollBottomTrack) {
    console.warn('Scroll tracks not found');
    return;
  }

  const topImages = import.meta.glob('../../../images/scroll-top/*.jpg', { eager: true, import: 'default' });
  const bottomImages = import.meta.glob('../../../images/scroll-bottom/*.jpg', { eager: true, import: 'default' });

  const sortByIndex = (entries, pattern) =>
    entries
      .map(([path, src]) => {
        const match = path.match(pattern);
        return { src, index: match ? Number(match[1]) : 0 };
      })
      .sort((a, b) => a.index - b.index);

  const topImageList = sortByIndex(Object.entries(topImages), /scroll-top(\d+)\.jpg$/);
  const bottomImageList = sortByIndex(Object.entries(bottomImages), /scroll-bottom(\d+)\.jpg$/);

  if (!topImageList.length || !bottomImageList.length) {
    console.warn('Scroll images not found');
    return;
  }

  const duplicateCount = 2;

  const appendImages = (track, images, altPrefix) => {
    for (let i = 0; i < duplicateCount; i++) {
      images.forEach(({ src, index }) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `${altPrefix} ${index}`;
        img.loading = 'lazy';
        track.appendChild(img);
      });
    }
  };

  appendImages(scrollTopTrack, topImageList, 'Scroll top');
  appendImages(scrollBottomTrack, bottomImageList, 'Scroll bottom');

  isInitialized = true;
}
