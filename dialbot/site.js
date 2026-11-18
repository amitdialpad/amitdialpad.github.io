const expressionMedia = {
  standby: null,
  listening: 'dialbot-listening-renderer',
  thinking: 'dialbot-thinking-renderer',
  speaking: 'dialbot-speaking-renderer',
  paused: 'dialbot-paused-renderer'
};
const expressionOrder = Object.keys(expressionMedia);
const expressionControls = document.querySelector('.emotion-controls');
const expressionButtons = [...expressionControls.querySelectorAll('button[data-state]')];
const expressionFrame = document.querySelector('.motion-frame');
const expressionVideo = document.getElementById('emotion-video');
const standbyPanel = document.getElementById('standby-panel');
const expressionLive = document.getElementById('emotion-live');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cycleIntervalMs = 6500;
let activeExpression = 'listening';
let expressionInView = false;
let pointerOverControls = false;
let manualSelection = false;
let cycleTimer = null;

function playExpressionIfVisible() {
  if (activeExpression === 'standby' || !expressionInView || document.hidden || reduceMotion.matches) {
    expressionVideo.pause();
    return;
  }
  expressionVideo.play().catch(() => {});
}

function stopCycle() {
  if (cycleTimer !== null) window.clearInterval(cycleTimer);
  cycleTimer = null;
}

function canCycle() {
  return expressionInView && !document.hidden && !reduceMotion.matches && !manualSelection && !pointerOverControls;
}

function syncCycle() {
  stopCycle();
  playExpressionIfVisible();
  if (canCycle()) {
    cycleTimer = window.setInterval(() => {
      const nextIndex = (expressionOrder.indexOf(activeExpression) + 1) % expressionOrder.length;
      selectExpression(expressionOrder[nextIndex]);
    }, cycleIntervalMs);
  }
}

function selectExpression(expression, announce = false) {
  if (!(expression in expressionMedia)) return;
  const changed = activeExpression !== expression;
  activeExpression = expression;
  expressionButtons.forEach((button) => {
    const selected = button.dataset.state === expression;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  const name = expression[0].toUpperCase() + expression.slice(1);
  if (announce) expressionLive.textContent = `${name} expression selected`;
  if (expression === 'standby') {
    expressionVideo.pause();
    expressionVideo.hidden = true;
    standbyPanel.hidden = false;
    return;
  }

  standbyPanel.hidden = true;
  expressionVideo.hidden = false;
  if (changed) {
    const asset = expressionMedia[expression];
    expressionVideo.pause();
    expressionVideo.poster = `./assets/motion/${asset}.png`;
    expressionVideo.src = `./assets/motion/${asset}.mp4`;
    expressionVideo.setAttribute('aria-label', `Actual Dial Bot ${expression} animation from a controlled app capture`);
    expressionVideo.load();
  }
  playExpressionIfVisible();
}

function stopOnInteraction() {
  if (!manualSelection) {
    manualSelection = true;
    syncCycle();
  }
}
expressionControls.addEventListener('pointerdown', stopOnInteraction);
expressionControls.addEventListener('focusin', stopOnInteraction);
expressionControls.addEventListener('pointerenter', () => {
  pointerOverControls = true;
  syncCycle();
});
expressionControls.addEventListener('pointerleave', () => {
  pointerOverControls = false;
  syncCycle();
});
expressionButtons.forEach((button) => button.addEventListener('click', () => {
  stopOnInteraction();
  selectExpression(button.dataset.state, true);
}));
document.addEventListener('visibilitychange', syncCycle);
reduceMotion.addEventListener('change', syncCycle);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    expressionInView = entry.isIntersecting;
    syncCycle();
  }, { threshold: 0.45 }).observe(expressionFrame);
} else {
  expressionInView = true;
  syncCycle();
}

const film = document.getElementById('hero-film');
const stage = document.getElementById('film-stage');
if (film && stage) {
  film.addEventListener('loadedmetadata', () => {
    film.hidden = false;
    stage.classList.add('has-film');
  }, { once: true });
  film.addEventListener('error', () => {
    film.hidden = true;
    stage.classList.remove('has-film');
  });
  const source = film.dataset.src;
  fetch(source, { method: 'HEAD' }).then((response) => {
    if (!response.ok) return;
    film.src = source;
    film.load();
  }).catch(() => {});
}
