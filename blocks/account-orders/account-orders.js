import { getOrders, orderDate } from '../../scripts/orders.js';
import { money } from '../../scripts/cart.js';

/**
 * Account orders - the order history list.
 *
 * Reads the orders placed in this browser. Each row expands to show what was
 * in that order, using a native <details> so it works without extra script
 * and reads correctly to a screen reader.
 *
 *   Empty  | You have not placed any orders yet.
 *   Source | /eds-ecommerce/data/orders.json   (demo data, used only when
 *                                               no real orders exist)
 *   (link)   Continue shopping
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

/**
 * Demo orders, used only when nothing real has been placed.
 * @param {string} source URL of a JSON sheet or file
 * @returns {Promise<Array<Object>>} the rows, or none on failure
 */
async function fetchDemoOrders(source) {
  try {
    const response = await fetch(source);
    if (!response.ok) return [];
    const json = await response.json();
    if (Array.isArray(json)) return json;
    return json.data || [];
  } catch (error) {
    return [];
  }
}

function buildItems(order) {
  const list = document.createElement('ul');
  list.className = 'account-orders-items';
  (order.items || []).forEach((item) => {
    const li = document.createElement('li');

    const name = item.path ? document.createElement('a') : document.createElement('span');
    if (item.path) name.href = item.path;
    name.className = 'account-orders-item-name';
    name.textContent = item.name;

    const qty = document.createElement('span');
    qty.className = 'account-orders-item-qty';
    qty.textContent = `x${item.quantity}`;

    const total = document.createElement('span');
    total.className = 'account-orders-item-total';
    total.textContent = money(item.price * item.quantity, order.currency);

    li.append(name, qty, total);
    list.append(li);
  });
  return list;
}

function buildOrder(order) {
  const wrap = document.createElement('details');
  wrap.className = 'account-orders-order';

  const head = document.createElement('summary');
  head.className = 'account-orders-head';
  head.innerHTML = `
    <span class="account-orders-id">${order.orderId}</span>
    <span class="account-orders-date">${orderDate(order.date)}</span>
    <span class="account-orders-status">${order.status || ''}</span>
    <span class="account-orders-count">${order.itemsCount} item${order.itemsCount === 1 ? '' : 's'}</span>
    <span class="account-orders-total">${money(order.total, order.currency)}</span>`;

  wrap.append(head);
  if (order.items && order.items.length) wrap.append(buildItems(order));
  return wrap;
}

export default async function decorate(block) {
  const { config, actions } = readBlock(block);

  let orders = getOrders();
  if (!orders.length && config.source) orders = await fetchDemoOrders(config.source);

  block.textContent = '';

  if (!orders.length) {
    const empty = document.createElement('p');
    empty.className = 'account-orders-empty';
    empty.textContent = config.empty || 'You have not placed any orders yet.';
    block.append(empty);
    if (actions[0]) block.append(actions[0]);
    return;
  }

  const list = document.createElement('div');
  list.className = 'account-orders-list';
  orders.forEach((order) => list.append(buildOrder(order)));
  block.append(list);

  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'account-orders-actions';
    actions.forEach((action) => row.append(action));
    block.append(row);
  }
}
