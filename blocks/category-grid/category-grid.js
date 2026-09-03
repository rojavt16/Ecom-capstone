import renderTeaser from '../product-teaser/product-teaser.js';

/**
 * Category grid - the product listing on a category page.
 *
 * With no configuration it infers the category from the page URL, so
 * /eds-ecommerce/pages/categories/jackets lists every indexed product whose
 * category is "jackets". Every row below is optional:
 *
 *   Category | jackets            (override the inferred category)
 *   Source   | /query-index.json
 *   Sheet    | products           (tab name in a multi-sheet workbook)
 *   Limit    | 12
 *   Currency | $
 *
 * Alternatively the author lists products by hand - one row per product,
 * image in the first cell, title in the second, price in the third. Authored
 * rows win and no request is made. The block stays flat either way: it calls
 * the shared teaser renderer rather than nesting a block in the document.
 */

const DEFAULT_SOURCE = '/query-index.json';
const DEFAULT_CURRENCY = '$';

/**
 * Splits authored rows into config entries and hand-listed product rows.
 * A row carrying an image is a product; any other two-cell row is config.
 * @param {Element} block The category-grid block
 * @returns {{config: Object, productRows: Array<Element>}} the split
 */
function readBlock(block) {
  const config = {};
  const productRows = [];
  [...block.children].forEach((row) => {
    if (row.querySelector('picture, img')) {
      productRows.push(row);
      return;
    }
    const [keyCell, valueCell] = row.children;
    if (!keyCell || !valueCell) return;
    const key = keyCell.textContent.trim().toLowerCase();
    if (!key) return;
    config[key] = {
      text: valueCell.textContent.trim(),
      link: valueCell.querySelector('a[href]'),
    };
  });
  return { config, productRows };
}

/** @returns {string} the text of a config entry, or '' when unset */
function value(config, key) {
  return config[key] ? config[key].text : '';
}

/**
 * The category slug for this page, taken from the last path segment.
 * @returns {string} the slug, or '' at the site root
 */
function categoryFromPath() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  return segments.length ? segments[segments.length - 1].toLowerCase() : '';
}

/**
 * Reads a product out of a hand-authored row.
 * @param {Element} row the authored row
 * @returns {Object} a product record
 */
function productFromRow(row) {
  const link = row.querySelector('a[href]');
  const img = row.querySelector('img');
  const cells = [...row.children].filter((cell) => !cell.querySelector('picture, img'));
  const texts = cells.map((cell) => cell.textContent.trim()).filter(Boolean);
  return {
    path: link ? link.getAttribute('href') : '',
    title: link ? link.textContent.trim() : texts[0] || '',
    price: texts.length > 1 ? texts[texts.length - 1] : '',
    image: img ? img.getAttribute('src') : '',
  };
}

/**
 * Fetches rows, accepting the query-index envelope, a multi-sheet workbook
 * and a bare array.
 * @param {string} source URL of the index or sheet
 * @param {string} sheet tab name, when the source is a multi-sheet workbook
 * @returns {Promise<Array<Object>>} the rows
 */
async function fetchRows(source, sheet) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${source}`);
  const json = await response.json();
  if (Array.isArray(json)) return json;
  if (json[':type'] === 'multi-sheet') {
    const names = json[':names'] || [];
    const picked = (sheet && json[sheet]) || json[names[0]];
    return (picked && picked.data) || [];
  }
  return json.data || [];
}

function message(block, copy) {
  const p = document.createElement('p');
  p.className = 'category-grid-empty';
  p.textContent = copy;
  block.append(p);
}

export default async function decorate(block) {
  const { config, productRows } = readBlock(block);

  const category = (value(config, 'category') || categoryFromPath()).toLowerCase();
  const source = (config.source && (config.source.link
    ? config.source.link.getAttribute('href')
    : config.source.text)) || DEFAULT_SOURCE;
  const sheet = value(config, 'sheet');
  const limit = Number.parseInt(value(config, 'limit'), 10);
  const currency = value(config, 'currency') || DEFAULT_CURRENCY;

  // read the authored rows before the block is emptied
  const authored = productRows.map(productFromRow);

  block.textContent = '';

  const list = document.createElement('ul');
  list.className = 'category-grid-items';
  block.append(list);

  if (authored.length) {
    authored.forEach((product) => list.append(renderTeaser(product, { currency })));
    return;
  }

  try {
    let rows = await fetchRows(source, sheet);
    rows = rows.filter((row) => (row.category || '').toLowerCase() === category);
    if (!Number.isNaN(limit) && limit > 0) rows = rows.slice(0, limit);

    if (!rows.length) {
      list.remove();
      message(block, 'No products in this category yet.');
      // eslint-disable-next-line no-console
      console.warn(`category-grid: nothing indexed with category "${category}"`);
      return;
    }

    rows.forEach((row) => list.append(renderTeaser(row, { currency })));
  } catch (error) {
    list.remove();
    message(block, 'Unable to load products.');
    // eslint-disable-next-line no-console
    console.error('category-grid:', source, error);
  }
}
