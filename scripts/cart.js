/**
 * Client-side cart.
 *
 * State lives in localStorage so it survives navigation between pages, which
 * is all an EDS site has - there is no server here. Every mutation emits
 * `cart:change` on the document, so the mini cart, the cart page and the
 * checkout summary all stay in step without knowing about each other.
 *
 * Importing this module also wires up the `cart:add` event that the product
 * teaser and product details buttons already dispatch, so adding a product
 * works on any page that loads a cart-aware block.
 */

const STORAGE_KEY = 'ecom-cart';
const SHIPPING_FLAT = 4.99;
const FREE_SHIPPING_OVER = 50;

/**
 * Reads the stored cart. A private window, cleared storage or corrupt JSON
 * all yield an empty cart rather than throwing.
 * @returns {Array<Object>} the line items
 */
export function getItems() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function save(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    // storage unavailable - the cart still works for this page view
  }
  document.dispatchEvent(new CustomEvent('cart:change', {
    bubbles: true,
    detail: { items },
  }));
  return items;
}

/**
 * Normalises whatever a block sends into the stored line-item shape.
 * @param {Object} product the product as the button announced it
 * @returns {Object|null} a line item, or null when there is no sku to key on
 */
function toLineItem(product) {
  if (!product) return null;
  const sku = String(product.sku || '').trim();
  if (!sku) return null;
  const quantity = Number.parseInt(product.quantity, 10);
  return {
    sku,
    name: product.name || product.title || sku,
    price: Number.parseFloat(product.price) || 0,
    currency: product.currency || '$',
    image: product.image || '',
    path: product.path || '',
    quantity: Number.isNaN(quantity) || quantity < 1 ? 1 : quantity,
  };
}

/**
 * Adds a product, or increments it when already in the cart.
 * @param {Object} product sku, name/title, price, currency, image, path, quantity
 * @returns {Array<Object>} the updated items
 */
export function addItem(product) {
  const line = toLineItem(product);
  if (!line) return getItems();

  const items = getItems();
  const existing = items.find((item) => item.sku === line.sku);
  if (existing) existing.quantity += line.quantity;
  else items.push(line);
  return save(items);
}

/**
 * Removes a line entirely.
 * @param {string} sku the line to drop
 * @returns {Array<Object>} the updated items
 */
export function removeItem(sku) {
  return save(getItems().filter((item) => item.sku !== sku));
}

/**
 * Sets an absolute quantity. A quantity below one removes the line.
 * @param {string} sku the line to change
 * @param {number} qty the new quantity
 * @returns {Array<Object>} the updated items
 */
export function updateQty(sku, qty) {
  const quantity = Number.parseInt(qty, 10);
  if (Number.isNaN(quantity) || quantity < 1) return removeItem(sku);

  const items = getItems();
  const line = items.find((item) => item.sku === sku);
  if (!line) return items;
  line.quantity = quantity;
  return save(items);
}

/** Empties the cart. @returns {Array<Object>} the empty list */
export function clear() {
  return save([]);
}

/**
 * Totals for the current cart. Shipping is a placeholder rule, not a real
 * carrier quote - the capstone stops short of a payment gateway.
 * @returns {Object} count, subtotal, shipping, total and currency
 */
export function getTotals() {
  const items = getItems();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = count === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  return {
    count,
    subtotal,
    shipping,
    total: subtotal + shipping,
    currency: items.length ? items[0].currency : '$',
  };
}

/**
 * Formats an amount for display.
 * @param {number} amount the value
 * @param {string} currency symbol to prefix
 * @returns {string} e.g. "$79.99"
 */
export function money(amount, currency = '$') {
  return `${currency}${Number(amount || 0).toFixed(2)}`;
}

// the teaser and details buttons announce additions rather than importing
// this module, so the wiring happens here, once, on first import
document.addEventListener('cart:add', (event) => addItem(event.detail));
