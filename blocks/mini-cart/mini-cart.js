import { getItems, getTotals, money } from '../../scripts/cart.js';

/**
 * Mini cart - the count and subtotal in the site chrome.
 *
 * Author it in the nav document's tools section so it appears on every page.
 * Clicking opens a panel listing what is in the cart, with a link through to
 * the cart page. Every row is optional:
 *
 * Buttons are authored: a row holding a link is moved into the panel exactly
 * as formatted, so the wording, destination and style stay content decisions.
 *
 *   (link)  View cart
 *   Label | Cart                  (key/value rows, not links)
 *   Empty | Your cart is empty
 */

function readBlock(block) {
  const config = {};
  const actions = [];
  [...block.children].forEach((row) => {
    const link = row.querySelector('a[href]');
    if (link) {
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

function renderPanel(panel, actions, emptyCopy) {
  const items = getItems();
  const totals = getTotals();
  panel.textContent = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'mini-cart-empty';
    empty.textContent = emptyCopy;
    panel.append(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'mini-cart-items';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'mini-cart-item';

    const name = document.createElement('span');
    name.className = 'mini-cart-item-name';
    name.textContent = item.name;

    const qty = document.createElement('span');
    qty.className = 'mini-cart-item-qty';
    qty.textContent = `x${item.quantity}`;

    const line = document.createElement('span');
    line.className = 'mini-cart-item-price';
    line.textContent = money(item.price * item.quantity, item.currency);

    li.append(name, qty, line);
    list.append(li);
  });

  const subtotal = document.createElement('p');
  subtotal.className = 'mini-cart-subtotal';
  subtotal.innerHTML = `<span>Subtotal</span><strong>${money(totals.subtotal, totals.currency)}</strong>`;

  panel.append(list, subtotal);
  actions.forEach((action) => panel.append(action));
}

export default function decorate(block) {
  const { config, actions } = readBlock(block);
  const label = config.label || 'Cart';
  const emptyCopy = config.empty || 'Your cart is empty.';

  block.textContent = '';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mini-cart-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', label);

  const count = document.createElement('span');
  count.className = 'mini-cart-count';
  toggle.append(count);

  const panel = document.createElement('div');
  panel.className = 'mini-cart-panel';
  panel.hidden = true;

  const sync = () => {
    const totals = getTotals();
    count.textContent = totals.count;
    block.classList.toggle('is-empty', totals.count === 0);
    if (!panel.hidden) renderPanel(panel, actions, emptyCopy);
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    panel.hidden = open;
    if (!open) renderPanel(panel, actions, emptyCopy);
  });

  // close when focus or a click leaves the mini cart
  document.addEventListener('click', (event) => {
    if (block.contains(event.target)) return;
    toggle.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
  });

  document.addEventListener('cart:change', sync);

  block.append(toggle, panel);
  sync();
}
