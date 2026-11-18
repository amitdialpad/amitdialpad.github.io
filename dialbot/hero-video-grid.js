// The low-contrast tile movement follows the Tap demonstration's phased grid.
// Only the rim is built: the film covers the middle of the stage.
const heroVideoGrid = document.getElementById('hero-video-grid');
if (heroVideoGrid) {
  const columns = 42;
  const rows = 24;
  const duration = 24;
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      if (row >= 3 && row < rows - 3 && col >= 3 && col < columns - 3) continue;
      const x = (col - (columns - 1) / 2) / ((columns - 1) / 2);
      const y = (row - (rows - 1) / 2) / ((rows - 1) / 2);
      let nearest = { distance: Infinity, phase: 0 };
      for (let step = 0; step < 120; step += 1) {
        const phase = step / 120;
        const angle = phase * Math.PI * 2;
        const distance = Math.hypot(x - .88 * Math.sin(angle), y - .82 * Math.cos(angle));
        if (distance < nearest.distance) nearest = { distance, phase };
      }
      const tile = document.createElement('span');
      tile.style.gridColumn = String(col + 1);
      tile.style.gridRow = String(row + 1);
      if (nearest.distance < .20) {
        tile.classList.add('is-morphing');
        tile.style.setProperty('--grid-delay', `${(-nearest.phase * duration).toFixed(2)}s`);
      }
      if (nearest.distance < .16 && nearest.phase < .09) tile.classList.add('is-resting-round');
      fragment.append(tile);
    }
  }
  heroVideoGrid.append(fragment);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;
  const syncMotion = () => {
    heroVideoGrid.classList.toggle('is-active', inView && !document.hidden && !reducedMotion.matches);
  };
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncMotion();
  }, { threshold: .08 }).observe(heroVideoGrid);
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
}
