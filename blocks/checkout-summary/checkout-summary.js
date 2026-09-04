import {
  getItems, getTotals, clear, money,
} from '../../scripts/cart.js';
import { placeOrder } from '../../scripts/orders.js';

/**
 * Checkout summary - a read-only review of the order, with no payment step.
 *
 * Buttons are authored: any row holding a link is moved into the actions
 * area exactly as formatted. Link one of them to this same page with
 * ?status=confirmed and it becomes the "place order" action - the cart is
 * recorded as an order, emptied, and the confirmation shown.
 *
 *   (link)  Place order          -> ?status=confirmed
 *   (link)  Back to cart         -> the cart page
 *   Empty      | Your cart is empty
 *   Next steps | We will email you when your order ships.
 *   Confirmed  | Thank you for your order.
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

function buildLines(items) {
  const list = document.createElement('ul');
  list.className = 'checkout-summary-lines';

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'checkout-summary-line';

    const name = document.createElement('span');
    name.className = 'checkout-summary-name';
    name.textContent = item.name;

    const qty = document.createElement('span');
    qty.className = 'checkout-summary-qty';
    qty.textContent = `x${item.quantity}`;

    const total = document.createElement('span');
    total.className = 'checkout-summary-line-total';
    total.textContent = money(item.price * item.quantity, item.currency);

    li.append(name, qty, total);
    list.append(li);
  });

  return list;
}

function buildTotals(totals) {
  const box = document.createElement('div');
  box.className = 'checkout-summary-totals';

  const rows = [
    ['Subtotal', money(totals.subtotal, totals.currency)],
    ['Shipping', totals.shipping ? money(totals.shipping, totals.currency) : 'Free'],
  ];
  rows.forEach(([label, amount]) => {
    const row = document.createElement('p');
    row.className = 'checkout-summary-row';
    row.innerHTML = `<span>${label}</span><span>${amount}</span>`;
    box.append(row);
  });

  const grand = document.createElement('p');
  grand.className = 'checkout-summary-row checkout-summary-grand';
  grand.innerHTML = `<span>Total</span><span>${money(totals.total, totals.currency)}</span>`;
  box.append(grand);

  return box;
}

/**
 * Renders the post-purchase state.
 * @param {Element} block the block
 * @param {Object} order the stored order
 * @param {Object} config authored copy
 * @param {Array<Element>} actions authored buttons
 */
function renderConfirmed(block, order, config, actions) {
  block.classList.add('is-confirmed');

  const thanks = document.createElement('h2');
  thanks.className = 'checkout-summary-thanks';
  thanks.textContent = config.confirmed || 'Thank you for your order.';
  block.append(thanks);

  if (order) {
    const reference = document.createElement('p');
    reference.className = 'checkout-summary-reference';
    reference.innerHTML = `<span>Order reference</span><strong>${order.orderId}</strong>`;
    block.append(reference);

    block.append(buildLines(order.items));
    block.append(buildTotals({
      subtotal: order.total,
      shipping: 0,
      total: order.total,
      currency: order.currency,
      count: order.itemsCount,
    }));
  }

  if (config['next steps']) {
    const next = document.createElement('p');
    next.className = 'checkout-summary-next';
    next.textContent = config['next steps'];
    block.append(next);
  }

  // the place-order link would re-submit; only later actions still make sense
  actions.slice(1).forEach((action) => block.append(action));
}

export default function decorate(block) {
  const { config, actions } = readBlock(block);
  const confirmed = new URLSearchParams(window.location.search).get('status') === 'confirmed';

  // read the cart before anything clears it
  const items = getItems();
  const totals = getTotals();

  block.textContent = '';

  if (confirmed) {
    const order = placeOrder(items, totals);
    if (order) clear();
    renderConfirmed(block, order, config, actions);
    return;
  }

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'checkout-summary-empty';
    empty.textContent = config.empty || 'Your cart is empty.';
    block.append(empty);
    // the last action is the way back, not the way forward
    if (actions.length > 1) block.append(actions[actions.length - 1]);
    return;
  }

  block.append(buildLines(items), buildTotals(totals));

  if (config['next steps']) {
    const next = document.createElement('p');
    next.className = 'checkout-summary-next';
    next.textContent = config['next steps'];
    block.append(next);
  }

  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'checkout-summary-actions';
    actions.forEach((action) => row.append(action));
    block.append(row);
  }
}
