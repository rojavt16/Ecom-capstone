import { createOptimizedPicture, loadCSS } from '../../scripts/aem.js';

/**
 * Shared product teaser card.
 *
 * Rendered by category-grid on the PLP, and reusable by home page promos and
 * PDP related-products. It exports renderTeaser rather than a decorate
 * default, so a grid calls it directly and the document stays flat - no
 * nested block markup for the author to maintain.
 */

const CURRENCY = '$';
const ADD_LABEL = 'Add to cart';
const ADDED_LABEL = 'Added';
const ADDED_MS = 1600;

let stylesLoaded;

function ensureStyles() {
  if (!stylesLoaded) stylesLoaded = loadCSS(`${window.hlx.codeBasePath}/blocks/product-teaser/product-teaser.css`);
  return stylesLoaded;
}

/**
 * Prefixes a currency symbol onto a bare number, leaving a price the author
 * already wrote with a symbol untouched.
 * @param {string} value the indexed or authored price
 * @param {string} currency symbol to prefix
 * @returns {string} the display price
 */
export function formatPrice(value, currency = CURRENCY) {
  const raw = String(value === undefined || value === null ? '' : value).trim();
  if (!raw) return '';
  if (!/^[\d.,]+$/.test(raw)) return raw;
  return `${currency}${raw}`;
}

/**
 * The numeric value behind a price, for cart arithmetic.
 * @param {string} value the indexed or authored price
 * @returns {number|null} the amount, or null when it cannot be read
 */
export function priceAmount(value) {
  const amount = Number.parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isNaN(amount) ? null : amount;
}

function buildAddToCart(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'product-teaser-add';
  button.textContent = ADD_LABEL;
  Object.entries(item).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) button.dataset[key] = value;
  });

  button.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('cart:add', {
      bubbles: true,
      detail: { ...item, quantity: 1 },
    }));
    // the cart module lands in phase 4; confirm the click until then
    button.classList.add('is-added');
    button.textContent = ADDED_LABEL;
    window.setTimeout(() => {
      button.classList.remove('is-added');
      button.textContent = ADD_LABEL;
    }, ADDED_MS);
  });

  return button;
}

/**
 * Builds one product card.
 * @param {Object} product path, title, image, price and sku
 * @param {Object} options currency, and whether to show the add to cart control
 * @returns {Element} an <li> holding the teaser
 */
export default function renderTeaser(product, options = {}) {
  const { currency = CURRENCY, addToCart = true } = options;
  ensureStyles();

  const title = product.title || product.name || '';
  const price = formatPrice(product.price, currency);

  const li = document.createElement('li');
  li.className = 'product-teaser';

  const link = document.createElement('a');
  link.className = 'product-teaser-link';
  link.href = product.path || '#';

  if (product.image) {
    const media = document.createElement('div');
    media.className = 'product-teaser-media';
    media.append(createOptimizedPicture(product.image, title, false, [{ width: '600' }]));
    link.append(media);
  }

  const name = document.createElement('span');
  name.className = 'product-teaser-title';
  name.textContent = title;
  link.append(name);

  if (price) {
    const amount = document.createElement('span');
    amount.className = 'product-teaser-price';
    amount.textContent = price;
    link.append(amount);
  }

  li.append(link);

  // a button may not sit inside an anchor, so it is a sibling
  if (addToCart) {
    li.append(buildAddToCart({
      sku: product.sku || (product.path || '').split('/').pop(),
      title,
      price: priceAmount(product.price),
      currency,
      image: product.image || '',
      path: product.path || '',
    }));
  }

  return li;
}
