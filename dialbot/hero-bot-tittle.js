// Decorative hero typography, not a live Bot activity signal.
const heroBotTittle = document.querySelector('.hero-bot-tittle');
if (heroBotTittle) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  const syncHeroBot = () => {
    heroBotTittle.classList.toggle('is-playing', visible && !document.hidden && !reducedMotion.matches);
  };
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    syncHeroBot();
  }, { threshold: 0.1 });
  observer.observe(heroBotTittle);
  document.addEventListener('visibilitychange', syncHeroBot);
  reducedMotion.addEventListener('change', syncHeroBot);
}
