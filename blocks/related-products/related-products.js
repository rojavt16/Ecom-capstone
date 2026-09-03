import { getMetadata } from '../../scripts/aem.js';
import renderTeaser from '../product-teaser/product-teaser.js';

/**
 * Related products - a cross-sell row at the foot of a PDP.
 *
 * With no configuration it shows other products sharing this product's
 * category, taken from the page metadata, and never lists the product you
 * are already looking at. Every row is optional:
 *
 *   Title    | You may also like
 *   Category | jackets            (override the inferred category)
 *   Source   | /query-index.json
 *   Limit    | 4
 *   Currency | $
 *
 * The author may instead list products by hand - one row per product, image
 * first, then a linked title, then the price. Authored rows win.
 */

const DEFAULT_SOURCE = '/query-index.json';
const DEFAULT_CURRENCY = '$';
const DEFAULT_LIMIT = 4;

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

function value(config, key) {
  return config[key] ? config[key].text : '';
}

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

async function fetchRows(source) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${source}`);
  const json = await response.json();
  if (Array.isArray(json)) return json;
  return json.data || [];
}

export default async function decorate(block) {
  const { config, productRows } = readBlock(block);

  const category = (value(config, 'category') || getMetadata('category') || '').toLowerCase();
  const source = value(config, 'source') || DEFAULT_SOURCE;
  const currency = value(config, 'currency') || DEFAULT_CURRENCY;
  const parsed = Number.parseInt(value(config, 'limit'), 10);
  const limit = Number.isNaN(parsed) ? DEFAULT_LIMIT : parsed;
  const heading = value(config, 'title');

  const authored = productRows.map(productFromRow);
  const here = window.location.pathname;

  block.textContent = '';

  if (heading) {
    const h2 = document.createElement('h2');
    h2.className = 'related-products-title';
    h2.textContent = heading;
    block.append(h2);
  }

  const list = document.createElement('ul');
  list.className = 'related-products-items';
  block.append(list);

  if (authored.length) {
    authored.forEach((product) => list.append(renderTeaser(product, { currency })));
    return;
  }

  if (!category) {
    block.remove();
    return;
  }

  try {
    const rows = (await fetchRows(source))
      .filter((row) => (row.category || '').toLowerCase() === category)
      .filter((row) => row.path !== here)
      .slice(0, limit);

    if (!rows.length) {
      // nothing to cross-sell is not an error worth showing a shopper
      block.remove();
      return;
    }

    rows.forEach((row) => list.append(renderTeaser(row, { currency })));
  } catch (error) {
    block.remove();
    // eslint-disable-next-line no-console
    console.error('related-products:', source, error);
  }
}
