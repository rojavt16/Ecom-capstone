export default async function decorate(block) {
  try {
    const apiUrl = block.querySelector('a')?.href;

    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const categories = await response.json();

    block.innerHTML = categories.map((category) => `
      <div class="promo-card">
        <h3>${category.name || category}</h3>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading categories:', error);
    block.innerHTML = '<p>Unable to load categories.</p>';
  }
}