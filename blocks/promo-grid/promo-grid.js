import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Promo grid - a row of cards, either authored by hand or pulled from the
 * query index.
 *
 * Config rows (all optional, any order):
 *   Title   | Categories
 *   CTA     | Shop now                  (a link)
 *   Source  | /query-index.json
 *   Filter  | /eds-ecommerce/pages/category/
 *   Limit   | 4
 *
 * Any row whose first cell is not one of those keys is treated as a card:
 *   (image) | Plants                    (link the label to the category page)
 *
 * Hand-authored cards win: when the block has any, no fetch is made.
 */

const CONFIG_KEYS = ['title', 'cta', 'source', 'filter', 'limit'];
const DEFAULT_SOURCE = '/query-index.json';

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
 * Fetches index rows. Accepts the query-index envelope and a bare array, so a
 * block still works while pointed at a mock endpoint.
 * @param {string} source URL of the index
 * @returns {Promise<Array<Object>>} the rows
 */
async function fetchRows(source) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${source}`);
  const json = await response.json();
  if (Array.isArray(json)) return json;
  return json.data || [];
}

function renderCard({ href, picture, label }) {
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

  const arrow = document.createElement('span');
  arrow.className = 'promo-card-arrow';
  arrow.setAttribute('aria-hidden', 'true');

  const caption = document.createElement('span');
  caption.className = 'promo-card-label';
  caption.textContent = label;

  link.append(arrow, caption);
  li.append(link);
  return li;
}

function cardFromRow(row) {
  const picture = row.querySelector('picture');
  const link = row.querySelector('a[href]');
  const label = link
    ? link.textContent.trim()
    : [...row.children]
      .filter((cell) => !cell.querySelector('picture'))
      .map((cell) => cell.textContent.trim())
      .filter(Boolean)
      .join(' ');
  return renderCard({ href: link ? link.getAttribute('href') : '', picture, label });
}

function cardFromIndex(entry) {
  const label = entry.title || entry.name || entry.path || '';
  const picture = entry.image
    ? createOptimizedPicture(entry.image, label, false, [{ width: '600' }])
    : null;
  return renderCard({ href: entry.path, picture, label });
}

function message(block, text) {
  const p = document.createElement('p');
  p.className = 'promo-grid-empty';
  p.textContent = text;
  block.append(p);
}

export default async function decorate(block) {
  const { config, cardRows } = readBlock(block);

  const source = (config.source && (
    (config.source.link && config.source.link.getAttribute('href')) || config.source.text
  )) || DEFAULT_SOURCE;
  const filter = config.filter ? config.filter.text : '';
  const limit = Number.parseInt(config.limit ? config.limit.text : '', 10);
  const title = config.title ? config.title.text : '';
  const cta = config.cta ? config.cta.link : null;

  // take the authored cards before the block is emptied
  const authored = cardRows.map(cardFromRow);

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
      cta.className = 'promo-grid-cta';
      header.append(cta);
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
    let rows = await fetchRows(source);
    if (filter) rows = rows.filter((row) => (row.path || '').startsWith(filter));
    if (!Number.isNaN(limit) && limit > 0) rows = rows.slice(0, limit);

    if (!rows.length) {
      list.remove();
      message(block, 'No items published yet.');
      return;
    }

    rows.forEach((entry) => list.append(cardFromIndex(entry)));
  } catch (error) {
    list.remove();
    message(block, 'Unable to load items.');
    // eslint-disable-next-line no-console
    console.error('promo-grid:', source, error);
  }
}
