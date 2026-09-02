export default function decorate(block) {
  const rows = [...block.children];

  const imageRow = rows[0];
  const titleRow = rows[1];
  const subtitleRow = rows[2];
  const ctaRow = rows[3];

  const image = imageRow?.querySelector('picture');
  const title = titleRow?.textContent.trim();
  const subtitle = subtitleRow?.textContent.trim();
  const cta = ctaRow?.querySelector('a');

  block.innerHTML = `
    <div class="hero-image">
      ${image ? image.outerHTML : ''}
    </div>

    <div class="hero-content">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      ${cta ? cta.outerHTML : ''}
    </div>
  `;
}