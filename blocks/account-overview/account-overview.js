import { getOrders } from '../../scripts/orders.js';


function readBlock(block) {
  const fields = [];
  const actions = [];
  [...block.children].forEach((row) => {
    const link = row.querySelector('a[href]');
    if (link) {
      actions.push(link.closest('.button-wrapper') || link);
      return;
    }
    const [keyCell, valueCell] = row.children;
    if (!keyCell || !valueCell) return;
    const label = keyCell.textContent.trim();
    const detail = valueCell.textContent.trim();
    if (label && detail) fields.push([label, detail]);
  });
  return { fields, actions };
}

export default function decorate(block) {
  const { fields, actions } = readBlock(block);
  const orders = getOrders();

  block.textContent = '';

  if (fields.length) {
    const list = document.createElement('dl');
    list.className = 'account-overview-profile';
    fields.forEach(([label, detail]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = detail;
      list.append(dt, dd);
    });
    block.append(list);
  }

  const stat = document.createElement('p');
  stat.className = 'account-overview-stat';
  stat.innerHTML = `<strong>${orders.length}</strong> <span>${orders.length === 1 ? 'order placed' : 'orders placed'}</span>`;
  block.append(stat);

  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'account-overview-actions';
    actions.forEach((action) => row.append(action));
    block.append(row);
  }
}
