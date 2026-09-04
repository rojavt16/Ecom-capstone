/**
 * Mock order store.
 *
 * The capstone stops short of a payment gateway, so a "placed" order is just
 * a snapshot of the cart written to localStorage. It exists so the checkout
 * confirmation and the My Account orders list share one source rather than
 * each inventing their own fixture data.
 */

const STORAGE_KEY = 'ecom-orders';

/**
 * Every order placed in this browser, newest first.
 * @returns {Array<Object>} the orders
 */
export function getOrders() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

/**
 * A short, human-readable reference. Not unique across browsers, which is
 * fine for a front-end-only demo.
 * @returns {string} e.g. "ORD-LZ4K9P"
 */
function newOrderId() {
  return `ORD-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

/**
 * Records a cart as an order.
 * @param {Array<Object>} items the cart lines
 * @param {Object} totals the cart totals
 * @returns {Object|null} the stored order, or null for an empty cart
 */
export function placeOrder(items, totals) {
  if (!items || !items.length) return null;

  const order = {
    orderId: newOrderId(),
    date: new Date().toISOString(),
    status: 'Confirmed',
    total: totals.total,
    currency: totals.currency,
    itemsCount: totals.count,
    items: items.map((item) => ({
      sku: item.sku,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      path: item.path,
      image: item.image,
    })),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([order, ...getOrders()]));
  } catch (error) {
    // storage unavailable - the confirmation still renders for this view
  }

  document.dispatchEvent(new CustomEvent('orders:change', {
    bubbles: true,
    detail: { order },
  }));
  return order;
}

/**
 * Formats an ISO date for display.
 * @param {string} iso the stored date
 * @returns {string} e.g. "3 Sep 2026"
 */
export function orderDate(iso) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
