/**
 * Product gallery - a main viewer with a thumbnail strip.
 *
 * The author drops images into the block, in one row or several; order in
 * the document is the order shown. A single image renders without a
 * thumbnail strip, and an empty block removes itself - product-details
 * already shows the primary image, so there is no hole to fill.
 */

/**
 * Collects the authored images. An empty block yields none: product-details
 * already shows the primary image, so falling back to it here would just
 * repeat the same photo further down the page.
 * @param {Element} block the product-gallery block
 * @returns {Array<Element>} picture elements, possibly empty
 */
function collectImages(block) {
  return [...block.querySelectorAll('picture')];
}

export default function decorate(block) {
  const pictures = collectImages(block);
  block.textContent = '';
  if (!pictures.length) {
    // an author who left the block empty gets nothing, not a hole
    const section = block.closest('.section');
    if (section) section.remove();
    else block.remove();
    return;
  }

  const viewer = document.createElement('div');
  viewer.className = 'product-gallery-viewer';
  viewer.append(pictures[0]);
  block.append(viewer);

  // a single image needs no thumbnail strip
  if (pictures.length < 2) {
    block.classList.add('product-gallery-single');
    return;
  }

  const strip = document.createElement('div');
  strip.className = 'product-gallery-thumbs';
  strip.setAttribute('role', 'tablist');
  strip.setAttribute('aria-label', 'Product images');

  pictures.forEach((picture, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'product-gallery-thumb';
    thumb.setAttribute('role', 'tab');
    thumb.setAttribute('aria-label', `Image ${index + 1} of ${pictures.length}`);
    thumb.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    if (index === 0) thumb.classList.add('is-active');
    thumb.append(picture.cloneNode(true));

    thumb.addEventListener('click', () => {
      viewer.textContent = '';
      viewer.append(picture.cloneNode(true));
      [...strip.children].forEach((other, i) => {
        other.classList.toggle('is-active', i === index);
        other.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    });

    strip.append(thumb);
  });

  block.append(strip);
}
