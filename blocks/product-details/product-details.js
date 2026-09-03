import { getMetadata, createOptimizedPicture } from '../../scripts/aem.js';
import { buildAddToCart, formatPrice } from '../product-teaser/product-teaser.js';

/**
 * Product details - the top of a PDP.
 *
 * Reads title, price, SKU and the primary image from the page's own metadata
 * rather than the query index, so it renders correctly even before the page
 * has been indexed. The author places an empty block; there is nothing to
 * configure and nothing to keep in sync with the metadata sheet.
 *
 *   Currency | $     (optional, overrides the default)
 *
 * If the page carries a "Key features" list it is moved into the details
 * panel, which is where the capstone brief puts it.
 */

const DEFAULT_CURRENCY = '$';

function readConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    if (!keyCell || !valueCell) return;
    const key = keyCell.textContent.trim().toLowerCase();
    if (key) config[key] = valueCell.textContent.trim();
  });
  return config;
}

/**
 * Finds the authored key features list and detaches it from the page.
 * @param {Element} block the product-details block
 * @returns {Element|null} the list, or null when the page has none
 */
function takeKeyFeatures(block) {
  const main = block.closest('main');
  if (!main) return null;
  const heading = main.querySelector('h2#key-features, h3#key-features');
  if (!heading) return null;
  const list = heading.nextElementSibling;
  if (!list || list.tagName !== 'UL') return null;
  const section = heading.closest('.section');
  heading.remove();
  list.remove();
  // drop the section if the features were all it held
  if (section && !section.textContent.trim() && !section.querySelector('picture, img')) {
    section.remove();
  }
  return list;
}

export default function decorate(block) {
  const config = readConfig(block);
  const currency = config.currency || DEFAULT_CURRENCY;

  const title = getMetadata('og:title') || document.title;
  const price = getMetadata('price');
  const sku = getMetadata('sku');
  const image = getMetadata('og:image');

  const features = takeKeyFeatures(block);

  block.textContent = '';

  const media = document.createElement('div');
  media.className = 'product-details-media';
  if (image) {
    media.append(createOptimizedPicture(image, title, true, [{ width: '900' }]));
  }

  const info = document.createElement('div');
  info.className = 'product-details-info';

  const heading = document.createElement('h1');
  heading.className = 'product-details-title';
  heading.textContent = title;
  info.append(heading);

  if (price) {
    const amount = document.createElement('p');
    amount.className = 'product-details-price';
    amount.textContent = formatPrice(price, currency);
    info.append(amount);
  }

  if (sku) {
    const code = document.createElement('p');
    code.className = 'product-details-sku';
    code.textContent = sku;
    info.append(code);
  }

  if (features) {
    features.className = 'product-details-features';
    info.append(features);
  }

  info.append(buildAddToCart({
    sku: sku || window.location.pathname.split('/').pop(),
    title,
    price: Number.parseFloat(String(price || '').replace(/[^\d.-]/g, '')) || null,
    currency,
    image: image || '',
    path: window.location.pathname,
  }));

  block.append(media, info);
}
