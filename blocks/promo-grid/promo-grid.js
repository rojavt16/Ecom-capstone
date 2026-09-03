import { createOptimizedPicture } from '../../scripts/aem.js';


const CONFIG_KEYS = ['title', 'cta', 'source', 'sheet', 'filter', 'limit', 'currency'];
const DEFAULT_SOURCE = '/query-index.json';
const DEFAULT_CURRENCY = '$';

/**
 * Splits authored rows into config entries and card rows.
 * @param {Element} block The promo-grid block
 * @returns {{config: Object, cardRows: Array<Element>}} the split
 */
function readBlock(block) {
  const config = {};
  const cardRows = [];
  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    const key = keyCell ? keyCell.textContent.trim().toLowerCase() : '';
    if (valueCell && CONFIG_KEYS.includes(key)) {
      config[key] = {
        text: valueCell.textContent.trim(),
        link: valueCell.querySelector('a[href]'),
      };
      return;
    }
    if (row.textContent.trim() || row.querySelector('picture')) cardRows.push(row);
  });
  return { config, cardRows };
}

/**
 * Fetches rows. Accepts the query-index / spreadsheet envelope, a multi-sheet
 * workbook, and a bare array, so a block still works against a mock endpoint.
 * @param {string} source URL of the index or sheet
 * @param {string} sheet tab name, when the source is a multi-sheet workbook
 * @returns {Promise<Array<Object>>} the rows
 */
async function fetchRows(source, sheet) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${source}`);
  const json = await response.json();
  if (Array.isArray(json)) return json;

  // a workbook with several tabs exposes each one by name rather than
  // returning a single data array
  if (json[':type'] === 'multi-sheet') {
    const names = json[':names'] || [];
    const picked = (sheet && json[sheet]) || json[names[0]];
    return (picked && picked.data) || [];
  }

  return json.data || [];
}

/**
 * Prefixes a currency symbol onto a bare number. A price the author already
 * wrote with a symbol or code is left exactly as typed.
 * @param {string} value the authored or indexed price
 * @param {string} currency symbol to prefix
 * @returns {string} the display price
 */
function formatPrice(value, currency) {
  const raw = String(value === undefined || value === null ? '' : value).trim();
  if (!raw) return '';
  if (!/^[\d.,]+$/.test(raw)) return raw;
  return `${currency}${raw}`;
}

/**
 * The numeric value behind a price, for cart arithmetic.
 * @param {string} value the authored or indexed price
 * @returns {number|null} the amount, or null when it cannot be read
 */
function priceAmount(value) {
  const amount = Number.parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isNaN(amount) ? null : amount;
}

/**
 * The "Add to cart" control. It carries the line-item data and announces it
 * on the document, so the Phase 4 cart module can subscribe without this
 * block having to import it.
 * @param {Object} item sku, title, price, currency, image and path
 * @returns {Element} the button
 */
function buildAddToCart(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'promo-card-add';
  button.textContent = 'Add to cart';
  Object.entries(item).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) button.dataset[key] = value;
  });
  button.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('cart:add', {
      bubbles: true,
      detail: { ...item, quantity: 1 },
    }));
    // until the cart module lands the click has no other effect, so confirm
    // it here rather than leaving the control looking dead
    button.classList.add('is-added');
    button.textContent = 'Added';
    window.setTimeout(() => {
      button.classList.remove('is-added');
      button.textContent = 'Add to cart';
    }, 1600);
  });
  return button;
}

function renderCard({
  href, picture, label, price, item,
}) {
  const li = document.createElement('li');
  li.className = 'promo-card';

  const link = document.createElement('a');
  link.className = 'promo-card-link';
  link.href = href || '#';

  if (picture) {
    const media = document.createElement('div');
    media.className = 'promo-card-media';
    media.append(picture);
    link.append(media);
  }

  // the diagonal arrow belongs to the category treatment only
  if (!item) {
    const arrow = document.createElement('span');
    arrow.className = 'promo-card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    link.append(arrow);
  }

  const caption = document.createElement('span');
  caption.className = 'promo-card-label';
  caption.textContent = label;
  link.append(caption);

  if (price) {
    const amount = document.createElement('span');
    amount.className = 'promo-card-price';
    amount.textContent = price;
    link.append(amount);
  }

  li.append(link);
  // a button may not sit inside an anchor, so it is a sibling
  if (item) li.append(buildAddToCart(item));
  return li;
}

function cardFromRow(row, products, currency) {
  const picture = row.querySelector('picture');
  const link = row.querySelector('a[href]');
  const cells = [...row.children].filter((cell) => !cell.querySelector('picture'));
  const texts = cells.map((cell) => cell.textContent.trim()).filter(Boolean);

  const label = link ? link.textContent.trim() : texts[0] || '';
  const href = link ? link.getAttribute('href') : '';
  if (!products) return renderCard({ href, picture, label });

  // the price is the last authored cell that is not the label
  const authoredPrice = texts.length > 1 ? texts[texts.length - 1] : '';
  return renderCard({
    href,
    picture,
    label,
    price: formatPrice(authoredPrice, currency),
    item: {
      sku: href ? href.split('/').pop() : label,
      title: label,
      price: priceAmount(authoredPrice),
      currency,
      path: href,
    },
  });
}

function cardFromIndex(entry, products, currency) {
  const label = entry.title || entry.name || entry.path || '';
  const picture = entry.image
    ? createOptimizedPicture(entry.image, label, false, [{ width: '600' }])
    : null;
  if (!products) return renderCard({ href: entry.path, picture, label });

  return renderCard({
    href: entry.path,
    picture,
    label,
    price: formatPrice(entry.price, currency),
    item: {
      sku: entry.sku || (entry.path || '').split('/').pop(),
      title: label,
      price: priceAmount(entry.price),
      currency,
      image: entry.image || '',
      path: entry.path || '',
    },
  });
}

function message(block, text) {
  const p = document.createElement('p');
  p.className = 'promo-grid-empty';
  p.textContent = text;
  block.append(p);
}

export default async function decorate(block) {
  const products = block.classList.contains('products');
  const { config, cardRows } = readBlock(block);

  const source = (config.source && (
    (config.source.link && config.source.link.getAttribute('href')) || config.source.text
  )) || DEFAULT_SOURCE;
  const sheet = config.sheet ? config.sheet.text : '';
  const filter = config.filter ? config.filter.text : '';
  const limit = Number.parseInt(config.limit ? config.limit.text : '', 10);
  const currency = (config.currency && config.currency.text) || DEFAULT_CURRENCY;
  const title = config.title ? config.title.text : '';
  const cta = config.cta ? config.cta.link : null;

  // take the authored cards before the block is emptied
  const authored = cardRows.map((row) => cardFromRow(row, products, currency));

  block.textContent = '';

  if (title || cta) {
    const header = document.createElement('div');
    header.className = 'promo-grid-header';
    if (title) {
      const h2 = document.createElement('h2');
      h2.textContent = title;
      header.append(h2);
    }
    if (cta) {
      // keep whatever the author formatted - bold gives .button.primary,
      // italic .button.secondary - and move the wrapper across intact rather
      // than replacing the class and imposing a look here
      cta.classList.add('promo-grid-cta');
      header.append(cta.closest('.button-wrapper') || cta);
    }
    block.append(header);
  }

  const list = document.createElement('ul');
  list.className = 'promo-grid-items';
  block.append(list);

  if (authored.length) {
    authored.forEach((card) => list.append(card));
    return;
  }

  try {
    let rows = await fetchRows(source, sheet);
    if (filter) rows = rows.filter((row) => (row.path || '').startsWith(filter));

    // a products grid must never fall back to rendering category pages
    const matched = rows.length;
    if (products) rows = rows.filter((row) => row.price);

    if (!Number.isNaN(limit) && limit > 0) rows = rows.slice(0, limit);

    if (!rows.length) {
      list.remove();
      message(block, matched && products
        ? 'No priced products found - add a price to the product page metadata.'
        : 'No items published yet.');
      return;
    }

    rows.forEach((entry) => list.append(cardFromIndex(entry, products, currency)));
  } catch (error) {
    list.remove();
    message(block, 'Unable to load items.');
    // eslint-disable-next-line no-console
    console.error('promo-grid:', source, error);
  }
}
