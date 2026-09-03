/**
 * Product specs - the attribute table on a PDP.
 *
 * The author writes one row per attribute, name in the first cell and value
 * in the second:
 *
 *   Material | 100% cotton denim
 *   Fit      | Regular
 *   Care     | Machine wash cold
 *
 * Rendered as a definition list, which is the semantic fit for name/value
 * pairs and reads correctly to a screen reader.
 */

export default function decorate(block) {
  const rows = [...block.children];
  const list = document.createElement('dl');
  list.className = 'product-specs-list';

  rows.forEach((row) => {
    const [nameCell, valueCell] = row.children;
    if (!nameCell) return;
    const name = nameCell.textContent.trim();
    const detail = valueCell ? valueCell.textContent.trim() : '';
    // an author may leave a spare row behind; skip anything with no name
    if (!name) return;

    const dt = document.createElement('dt');
    dt.textContent = name;
    const dd = document.createElement('dd');
    dd.textContent = detail;
    list.append(dt, dd);
  });

  block.textContent = '';
  if (!list.children.length) return;
  block.append(list);
}
