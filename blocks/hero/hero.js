/**
 * Hero slideshow.
 *
 * Authoring: one row per slide, two cells - the image in the first, the
 * title / subtitle / CTA in the second. A block whose rows all have a single
 * cell is treated as one slide, so an existing single-slide hero still works.
 */

const AUTOPLAY_MS = 7000;

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Splits the block into slides.
 * @param {Element} block The hero block
 * @returns {Array<Array<Element>>} one array of cells per slide
 */
function readSlides(block) {
  const rows = [...block.children];
  const multi = rows.some((row) => row.children.length > 1);
  if (multi) return rows.map((row) => [...row.children]);
  return [rows.flatMap((row) => [...row.children])];
}

function buildSlide(cells, index) {
  const slide = document.createElement('section');
  slide.className = 'hero-slide';
  slide.dataset.slide = index;
  if (index > 0) slide.setAttribute('aria-hidden', 'true');

  const media = document.createElement('div');
  media.className = 'hero-media';
  const content = document.createElement('div');
  content.className = 'hero-content';

  cells.forEach((cell) => {
    const picture = cell.querySelector('picture');
    if (picture) {
      media.append(picture);
      return;
    }
    while (cell.firstChild) content.append(cell.firstChild);
  });

  // the first slide carries the page heading, per the semantic structure the
  // capstone asks for (section / h1 / p / a)
  if (index === 0) {
    const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading && heading.tagName !== 'H1') {
      const h1 = document.createElement('h1');
      h1.id = heading.id;
      h1.innerHTML = heading.innerHTML;
      heading.replaceWith(h1);
    }
  }

  slide.append(media, content);
  return slide;
}

function buildControls(count) {
  const controls = document.createElement('div');
  controls.className = 'hero-controls';

  const dots = document.createElement('div');
  dots.className = 'hero-dots';
  dots.setAttribute('role', 'tablist');
  dots.setAttribute('aria-label', 'Choose slide');
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-dot';
    dot.dataset.slide = i;
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Slide ${i + 1} of ${count}`);
    dots.append(dot);
  }

  const status = document.createElement('div');
  status.className = 'hero-status';

  const counter = document.createElement('span');
  counter.className = 'hero-counter';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'hero-next';
  next.setAttribute('aria-label', 'Next slide');

  status.append(counter, next);
  controls.append(dots, status);
  return {
    controls, dots, counter, next,
  };
}

export default function decorate(block) {
  const slideCells = readSlides(block);
  const slides = slideCells.map(buildSlide);

  block.textContent = '';

  const track = document.createElement('div');
  track.className = 'hero-track';
  slides.forEach((s) => track.append(s));
  block.append(track);

  if (slides.length < 2) {
    block.classList.add('hero-single');
    return;
  }

  const {
    controls, dots, counter, next,
  } = buildControls(slides.length);
  block.append(controls);

  let current = 0;
  let timer = null;

  const show = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('is-active', active);
      if (active) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
    });
    [...dots.children].forEach((dot, i) => {
      dot.classList.toggle('is-active', i === current);
      dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
    counter.textContent = `${pad(current + 1)} / ${pad(slides.length)}`;
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  const start = () => {
    stop();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = window.setInterval(() => show(current + 1), AUTOPLAY_MS);
  };

  dots.addEventListener('click', (e) => {
    const dot = e.target.closest('.hero-dot');
    if (!dot) return;
    show(Number(dot.dataset.slide));
    start();
  });

  next.addEventListener('click', () => {
    show(current + 1);
    start();
  });

  block.addEventListener('mouseenter', stop);
  block.addEventListener('mouseleave', start);
  block.addEventListener('focusin', stop);

  show(0);
  start();
}
