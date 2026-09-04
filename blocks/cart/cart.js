import { createOptimizedPicture } from '../../scripts/aem.js';
import {
  getItems, getTotals, updateQty, removeItem, money,
} from '../../scripts/cart.js';

/**
 * Cart page - the editable line items and totals on /cart.
 *
 * Line items and totals come from cart.js. Buttons are authored: any row
 * holding a link is moved, exactly as formatted, into the actions area
 * beneath the totals. Wording, destination and button style are all content
 * decisions - italic gives a secondary button, bold a primary one.
 *
 *   (link)  Continue shopping
 *   (link)  Proceed to checkout
 *   Empty | Your cart is empty      (a key/value row, not a link)
 *
 * Document order is the order shown. An empty cart shows only the first
 * action, since offering checkout with nothing in the basket makes no sense.
 */

/**
 * Splits the authored rows into config and buttons. A row containing a link
 * is a button and is kept as authored; anything else is a key/value pair.
 * @param {Element} block the cart block
 * @returns {{config: Object, actions: Array<Element>}} the split
 */
function readBlock(block) {
  const config = {};
  const actions = [];
  [...block.children].forEach((row) => {
    const link = row.querySelector('a[href]');
    if (link) {
      // decorateButtons has already styled this from the author's formatting,
      // so take the wrapper whole rather than rebuilding it
      actions.push(link.closest('.button-wrapper') || link);
      return;
    }
    const [keyCell, valueCell] = row.children;
    if (!keyCell || !valueCell) return;
    const key = keyCell.textContent.trim().toLowerCase();
    if (key) config[key] = valueCell.textContent.trim();
  });
  return { config, actions };
}

function value(config, key, fallback = '') {
  return config[key] || fallback;
}

function buildLine(item) {
  const li = document.createElement('li');
  li.className = 'cart-line';
  li.dataset.sku = item.sku;

  const media = document.createElement('div');
  media.className = 'cart-line-media';
  if (item.image) {
    media.append(createOptimizedPicture(item.image, item.name, false, [{ width: '200' }]));
  }

  const info = document.createElement('div');
  info.className = 'cart-line-info';

  const name = document.createElement('a');
  name.className = 'cart-line-name';
  name.href = item.path || '#';
  name.textContent = item.name;

  const unit = document.createElement('span');
  unit.className = 'cart-line-unit';
  unit.textContent = money(item.price, item.currency);

  info.append(name, unit);

  const qty = document.createElement('div');
  qty.className = 'cart-line-qty';

  const less = document.createElement('button');
  less.type = 'button';
  less.className = 'cart-qty-step';
  less.textContent = '−';
  less.setAttribute('aria-label', `Decrease quantity of ${item.name}`);

  const field = document.createElement('input');
  field.type = 'number';
  field.className = 'cart-qty-value';
  field.min = '1';
  field.value = item.quantity;
  field.setAttribute('aria-label', `Quantity of ${item.name}`);

  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'cart-qty-step';
  more.textContent = '+';
  more.setAttribute('aria-label', `Increase quantity of ${item.name}`);

  less.addEventListener('click', () => updateQty(item.sku, item.quantity - 1));
  more.addEventListener('click', () => updateQty(item.sku, item.quantity + 1));
  field.addEventListener('change', () => updateQty(item.sku, field.value));

  qty.append(less, field, more);

  const total = document.createElement('div');
  total.className = 'cart-line-total';
  total.textContent = money(item.price * item.quantity, item.currency);

  const drop = document.createElement('button');
  drop.type = 'button';
  drop.className = 'cart-line-remove';
  drop.textContent = 'Remove';
  drop.setAttribute('aria-label', `Remove ${item.name}`);
  drop.addEventListener('click', () => removeItem(item.sku));

  li.append(media, info, qty, total, drop);
  return li;
}

function buildTotals(actions) {
  const totals = getTotals();
  const box = document.createElement('div');
  box.className = 'cart-totals';

  const rows = [
    ['Subtotal', money(totals.subtotal, totals.currency)],
    ['Shipping', totals.shipping ? money(totals.shipping, totals.currency) : 'Free'],
  ];
  rows.forEach(([label, amount]) => {
    const row = document.createElement('p');
    row.className = 'cart-total-row';
    row.innerHTML = `<span>${label}</span><span>${amount}</span>`;
    box.append(row);
  });

  const grand = document.createElement('p');
  grand.className = 'cart-total-row cart-total-grand';
  grand.innerHTML = `<span>Total</span><span>${money(totals.total, totals.currency)}</span>`;
  box.append(grand);

  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'cart-actions';
    actions.forEach((action) => row.append(action));
    box.append(row);
  }
  return box;
}

export default function decorate(block) {
  // captured once: block.textContent is cleared on every re-render, but the
  // authored elements stay live and get put back
  const { config, actions } = readBlock(block);
  const emptyCopy = value(config, 'empty', 'Your cart is empty.');

  const render = () => {
    const items = getItems();
    block.textContent = '';

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.textContent = emptyCopy;
      block.append(empty);
      if (actions[0]) block.append(actions[0]);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'cart-lines';
    items.forEach((item) => list.append(buildLine(item)));

    block.append(list, buildTotals(actions));
  };

  document.addEventListener('cart:change', render);
  render();
}
