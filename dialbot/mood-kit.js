// Local Personality Kit study. The fluid contour follows the current Dial Bot tile;
// the clipped halftone texture and dotted cues are proposed motion, not app footage.
const moodOrder = ['standby', 'listening', 'thinking', 'speaking', 'paused', 'heart', 'celebrate', 'thumbs'];
const expressionKinds = new Set(['heart', 'celebrate', 'thumbs']);
const displayNames = { celebrate: 'Celebration', thumbs: 'Thumbs up' };
const moodControls = document.querySelector('.emotion-controls');
const moodButtons = [...moodControls.querySelectorAll('button[data-state]')];
const moodFrame = document.querySelector('.motion-frame');
const moodCanvas = document.getElementById('mood-canvas');
const moodContext = moodCanvas.getContext('2d', { alpha: false });
const moodLabel = document.querySelector('.mood-stage-label');
const moodLive = document.getElementById('emotion-live');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cycleDelayMs = (mood) => expressionKinds.has(mood) ? 3800 : 5800;

const treatments = {
  standby:   { radius: 0.72, ripple: 0.8, fill: [64, 56, 79, 0.48], current: 0,    dot: 0.04 },
  listening: { radius: 1.00, ripple: 7.0, fill: [145, 112, 217, 0.84], current: 0.30, dot: 0.14 },
  thinking:  { radius: 0.84, ripple: 4.5, fill: [112, 84, 181, 0.79], current: 0.23, dot: 0.13 },
  speaking:  { radius: 1.13, ripple: 9.0, fill: [164, 127, 230, 0.88], current: 0.34, dot: 0.15 },
  paused:    { radius: 0.75, ripple: 0,   fill: [68, 60, 84, 0.68], current: 0,    dot: 0 },
  heart:     { radius: 0.93, ripple: 2.8, fill: [127, 97, 191, 0.77], current: 0.23, dot: 0.11 },
  celebrate: { radius: 1.00, ripple: 3.4, fill: [145, 111, 210, 0.81], current: 0.27, dot: 0.13 },
  thumbs:    { radius: 0.93, ripple: 2.8, fill: [127, 97, 191, 0.77], current: 0.23, dot: 0.11 }
};
let activeMood = 'thinking';
let isInView = false;
let isPointerOverControls = false;
let wasManuallySelected = false;
let cycleTimer = null;
let frameId = null;
let lastFrameTime = 0;
let transitionUntil = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let reactionEffect = null;
let lastWheelAt = 0;
let wheelDelta = 0;
let touchStartY = null;
let suppressClickUntil = 0;
const displayed = structuredClone(treatments.thinking);

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const rgba = (values) => `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${values[3]})`;

function contourPath(ctx, cx, cy, radius, ripple, time) {
  const points = [];
  for (let index = 0; index < 40; index += 1) {
    const angle = index * Math.PI * 2 / 40;
    const displacement = ripple * (0.65 * Math.sin(angle * 2 - time) + 0.35 * Math.sin(angle * 4 + time * 0.72));
    const distance = radius + displacement;
    points.push({ x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance });
  }
  const last = points.at(-1);
  const first = points[0];
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  ctx.closePath();
}

function drawCurrent(ctx, cx, cy, time, scale, opacity) {
  if (opacity < 0.005) return;
  const driftX = Math.sin(time * 0.82) * 9 * scale;
  const driftY = Math.cos(time * 0.64) * 7 * scale;
  const bend = Math.sin(time * 1.04) * 15 * scale;
  const x = cx + driftX;
  const y = cy + driftY;
  ctx.beginPath();
  ctx.moveTo(x - 47 * scale, y - 12 * scale);
  ctx.quadraticCurveTo(x - 22 * scale, y - 42 * scale + bend, x + 4 * scale, y - 8 * scale);
  ctx.quadraticCurveTo(x + 28 * scale, y + 18 * scale - bend, x + 46 * scale, y - 9 * scale);
  ctx.quadraticCurveTo(x + 30 * scale, y + 30 * scale + bend, x - 2 * scale, y + 19 * scale);
  ctx.quadraticCurveTo(x - 30 * scale, y + 23 * scale - bend, x - 47 * scale, y - 12 * scale);
  ctx.closePath();
  ctx.fillStyle = `rgba(218, 197, 248, ${opacity})`;
  ctx.fill();
}

function drawHalftone(ctx, cx, cy, radius, time, mood, baseOpacity) {
  if (baseOpacity < 0.005) return;
  const spacing = Math.max(8, Math.min(14, radius * 0.15));
  const count = Math.ceil(radius / spacing);
  ctx.fillStyle = '#eee2ff';
  for (let row = -count; row <= count; row += 1) {
    for (let col = -count; col <= count; col += 1) {
      const x = col * spacing;
      const y = row * spacing;
      const normalizedRadius = Math.hypot(x, y) / radius;
      if (normalizedRadius > 0.96) continue;
      let pattern = 0.5;
      if (mood === 'listening') pattern = 0.5 + 0.5 * Math.sin(normalizedRadius * 11 - time * 1.8);
      if (mood === 'thinking') pattern = 0.5 + 0.5 * Math.sin(Math.atan2(y, x) * 2.5 - normalizedRadius * 9 + time * 1.1);
      if (mood === 'speaking') pattern = 0.5 + 0.5 * Math.sin(x * 0.07 - time * 2.5);
      const edge = clamp((1 - normalizedRadius) * 2.7);
      ctx.globalAlpha = baseOpacity * (0.42 + pattern * 0.58) * edge;
      ctx.beginPath();
      ctx.arc(cx + x, cy + y, Math.max(1.15, spacing * (0.14 + 0.07 * pattern)), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawThinkingFlow(ctx, cx, cy, radius, time) {
  ctx.fillStyle = '#e7d7ff';
  for (let track = -1; track <= 1; track += 2) {
    for (let index = 0; index < 13; index += 1) {
      const progress = index / 12;
      const x = (progress - 0.5) * radius * 1.24;
      const wave = Math.sin(progress * Math.PI * 2 + time * 0.8 + track) * radius * 0.08;
      const y = track * radius * 0.22 + wave;
      const falloff = Math.sin(progress * Math.PI);
      ctx.globalAlpha = 0.20 + falloff * 0.26;
      ctx.beginPath();
      ctx.arc(cx + x, cy + y, 1.1 + falloff * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawSideDots(ctx, cx, cy, radius, time, mood) {
  if (mood !== 'listening' && mood !== 'speaking') return;
  ctx.fillStyle = '#c7a8f4';
  const rings = mood === 'speaking' ? 2 : 1;
  for (let ring = 0; ring < rings; ring += 1) {
    const offset = mood === 'speaking' ? 15 + ring * 13 + 3 * Math.sin(time * 2.4 - ring) : 11 + 2 * Math.sin(time * 1.4);
    const strength = mood === 'speaking' ? 0.17 - ring * 0.06 : 0.13;
    for (const side of [-1, 1]) {
      for (let index = -5; index <= 5; index += 1) {
        const angle = side === 1 ? index * 0.12 : Math.PI + index * 0.12;
        const dotRadius = radius + offset;
        const edge = 1 - Math.abs(index) / 6;
        ctx.globalAlpha = strength * edge;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * dotRadius, cy + Math.sin(angle) * dotRadius, 1.45 + edge * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawPausedDots(ctx, cx, cy, radius) {
  const spacing = Math.max(4.7, radius * 0.105);
  const dotRadius = clamp(radius * 0.037, 1.9, 3.1);
  ctx.fillStyle = '#b496e9';
  ctx.globalAlpha = 0.82;
  for (const side of [-1, 1]) {
    for (let row = -4; row <= 4; row += 1) {
      for (let col = -1; col <= 1; col += 1) {
        const x = cx + side * spacing * 2.55 + col * spacing;
        const y = cy + row * spacing;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawReaction(ctx, cx, cy, radius, now) {
  if (!reactionEffect) return;
  const duration = 2200;
  const progress = clamp((now - reactionEffect.startedAt) / duration);
  if (progress >= 1) {
    reactionEffect = null;
    return;
  }
  const still = prefersReducedMotion.matches;
  const travel = still ? 0.35 : 1 - Math.pow(1 - progress, 3);
  const opacity = still ? 0.82 : clamp(progress / 0.12) * clamp((1 - progress) / 0.38);
  if (reactionEffect.kind === 'heart') {
    const positions = [
      [-0.80, -0.73, -1], [-0.39, -0.95, -0.4], [0, -1.02, 0],
      [0.41, -0.93, 0.4], [0.82, -0.70, 1]
    ];
    ctx.fillStyle = '#f2d9ff';
    positions.forEach(([horizontal, vertical, direction], index) => {
      const stagger = still ? 1 : clamp((progress - index * 0.035) / 0.2);
      const originX = cx + horizontal * radius + direction * 10 * travel;
      const originY = cy + vertical * radius - radius * 0.19 * travel;
      const size = radius * 0.008;
      ctx.globalAlpha = opacity * stagger * 0.88;
      for (let dot = 0; dot < 20; dot += 1) {
        const angle = dot * Math.PI * 2 / 20;
        const x = 16 * Math.sin(angle) ** 3 * size;
        const y = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) * size;
        ctx.beginPath();
        ctx.arc(originX + x, originY + y, 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  } else if (reactionEffect.kind === 'celebrate') {
    ctx.fillStyle = '#f0d7ff';
    for (let index = 0; index < 9; index += 1) {
      const angle = -Math.PI * 0.9 + index * Math.PI * 0.8 / 8;
      const distance = radius * (1.04 + travel * 0.22) + (index % 2) * 5;
      const x = cx + Math.cos(angle) * distance;
      const y = cy + Math.sin(angle) * distance;
      ctx.globalAlpha = opacity * (index % 3 === 0 ? 0.9 : 0.65);
      for (const [dx, dy, size] of [[0, 0, 3], [-6, 0, 1.3], [6, 0, 1.3], [0, -6, 1.3], [0, 6, 1.3]]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (reactionEffect.kind === 'thumbs') {
    ctx.save();
    ctx.translate(cx + radius * 1.02, cy - radius * (0.24 + travel * 0.12));
    ctx.scale(Math.max(0.7, radius / 94), Math.max(0.7, radius / 94));
    ctx.globalAlpha = opacity * 0.76;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-3, -6);
    ctx.lineTo(1, -14);
    ctx.quadraticCurveTo(4, -18, 8, -15);
    ctx.quadraticCurveTo(11, -13, 9, -8);
    ctx.lineTo(7, -3);
    ctx.lineTo(16, -3);
    ctx.quadraticCurveTo(21, -3, 20, 2);
    ctx.lineTo(16, 14);
    ctx.quadraticCurveTo(15, 18, 10, 18);
    ctx.lineTo(-4, 18);
    ctx.quadraticCurveTo(-7, 17, -8, 15);
    ctx.lineTo(-15, 15);
    ctx.closePath();
    ctx.fillStyle = 'rgba(214, 186, 255, 0.22)';
    ctx.strokeStyle = '#d8baff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function resizeCanvas() {
  const bounds = moodCanvas.getBoundingClientRect();
  canvasWidth = Math.max(1, bounds.width);
  canvasHeight = Math.max(1, bounds.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  moodCanvas.width = Math.round(canvasWidth * dpr);
  moodCanvas.height = Math.round(canvasHeight * dpr);
  moodContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  render(performance.now(), true);
}

function render(now, snap = false) {
  if (!canvasWidth || !canvasHeight) return;
  const elapsed = lastFrameTime ? Math.min(now - lastFrameTime, 60) : 16;
  const easing = snap || prefersReducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 220);
  const target = treatments[activeMood];
  for (const key of ['radius', 'ripple', 'current', 'dot']) displayed[key] += (target[key] - displayed[key]) * easing;
  for (let index = 0; index < 4; index += 1) displayed.fill[index] += (target.fill[index] - displayed.fill[index]) * easing;
  lastFrameTime = now;

  const time = prefersReducedMotion.matches ? 0 : now / 1000;
  const background = moodContext.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  background.addColorStop(0, '#1a1b27');
  background.addColorStop(1, '#171824');
  moodContext.fillStyle = background;
  moodContext.fillRect(0, 0, canvasWidth, canvasHeight);

  const baseRadius = Math.min(canvasWidth * 0.18, canvasHeight * 0.25, 95);
  const breath = activeMood === 'standby' && !prefersReducedMotion.matches ? Math.sin(time * 0.8) * 0.65 : 0;
  const speech = activeMood === 'speaking' && !prefersReducedMotion.matches ? Math.sin(time * 2.35) * 3 : 0;
  const radius = baseRadius * displayed.radius + breath + speech;
  const cx = canvasWidth / 2;
  const cy = canvasHeight * 0.48;
  contourPath(moodContext, cx, cy, radius, prefersReducedMotion.matches ? 1.8 : displayed.ripple, time);
  moodContext.fillStyle = rgba(displayed.fill);
  moodContext.fill();
  moodContext.save();
  moodContext.clip();
  drawCurrent(moodContext, cx, cy, time, radius / 83, displayed.current);
  drawHalftone(moodContext, cx, cy, radius, time, activeMood, displayed.dot);
  if (activeMood === 'thinking') drawThinkingFlow(moodContext, cx, cy, radius, time);
  moodContext.restore();
  if (activeMood === 'paused') drawPausedDots(moodContext, cx, cy, radius);
  else drawSideDots(moodContext, cx, cy, radius, time, activeMood);
  drawReaction(moodContext, cx, cy, radius, now);
}

function shouldAnimate() {
  return isInView && !document.hidden && !prefersReducedMotion.matches && (activeMood !== 'paused' || performance.now() < transitionUntil);
}
function tick(now) {
  frameId = null;
  render(now);
  if (shouldAnimate()) frameId = requestAnimationFrame(tick);
}
function syncAnimation() {
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
  lastFrameTime = 0;
  if (shouldAnimate()) frameId = requestAnimationFrame(tick);
  else render(performance.now(), true);
}
function stopCycle() {
  if (cycleTimer !== null) clearTimeout(cycleTimer);
  cycleTimer = null;
}
function wheelOffset(index, selectedIndex) {
  let offset = (index - selectedIndex + moodOrder.length) % moodOrder.length;
  if (offset > moodOrder.length / 2) offset -= moodOrder.length;
  return offset;
}
function layoutWheel() {
  const step = moodButtons[0]?.getBoundingClientRect().height || 82;
  const selectedIndex = moodOrder.indexOf(activeMood);
  moodButtons.forEach((button, index) => {
    const offset = wheelOffset(index, selectedIndex);
    const hidden = Math.abs(offset) > 2;
    button.style.setProperty('--wheel-offset', `${offset * step}px`);
    button.classList.toggle('wheel-hidden', hidden);
    button.setAttribute('aria-hidden', String(hidden));
    button.tabIndex = index === selectedIndex ? 0 : -1;
  });
}
function syncCycle() {
  stopCycle();
  syncAnimation();
  if (isInView && !document.hidden && !prefersReducedMotion.matches && !wasManuallySelected && !isPointerOverControls) {
    cycleTimer = setTimeout(() => {
      const next = (moodOrder.indexOf(activeMood) + 1) % moodOrder.length;
      selectMood(moodOrder[next]);
      syncCycle();
    }, cycleDelayMs(activeMood));
  }
}
function selectMood(mood, announce = false) {
  if (!moodOrder.includes(mood)) return;
  activeMood = mood;
  reactionEffect = expressionKinds.has(mood) ? { kind: mood, startedAt: performance.now() } : null;
  transitionUntil = performance.now() + 1100;
  const title = displayNames[mood] || mood[0].toUpperCase() + mood.slice(1);
  moodLabel.textContent = title;
  moodButtons.forEach((button) => {
    const selected = button.dataset.state === mood;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  layoutWheel();
  if (announce) moodLive.textContent = `${title} personality moment preview`;
  syncAnimation();
}
function stopOnInteraction() {
  if (!wasManuallySelected) {
    wasManuallySelected = true;
    syncCycle();
  }
}

moodControls.addEventListener('pointerdown', stopOnInteraction);
moodControls.addEventListener('focusin', stopOnInteraction);
moodControls.addEventListener('pointerenter', () => { isPointerOverControls = true; syncCycle(); });
moodControls.addEventListener('pointerleave', () => { isPointerOverControls = false; syncCycle(); });
moodButtons.forEach((button) => button.addEventListener('click', () => {
  if (performance.now() < suppressClickUntil) return;
  stopOnInteraction();
  selectMood(button.dataset.state, true);
}));
moodControls.addEventListener('wheel', (event) => {
  if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  // This is a discrete wheel, not a scroll container. Keep vertical gestures here,
  // including the events received while the selection animation is settling.
  event.preventDefault();
  const now = performance.now();
  if (now - lastWheelAt < 420) return;
  const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? moodControls.clientHeight : 1);
  wheelDelta += pixels;
  if (Math.abs(wheelDelta) < 12) return;
  lastWheelAt = now;
  stopOnInteraction();
  const step = wheelDelta > 0 ? 1 : -1;
  wheelDelta = 0;
  selectMood(moodOrder[(moodOrder.indexOf(activeMood) + step + moodOrder.length) % moodOrder.length], true);
}, { passive: false });
moodControls.addEventListener('touchstart', (event) => {
  touchStartY = event.changedTouches[0]?.clientY ?? null;
}, { passive: true });
moodControls.addEventListener('touchend', (event) => {
  if (touchStartY === null) return;
  const travel = touchStartY - (event.changedTouches[0]?.clientY ?? touchStartY);
  touchStartY = null;
  if (Math.abs(travel) < 30) return;
  suppressClickUntil = performance.now() + 350;
  stopOnInteraction();
  const step = travel > 0 ? 1 : -1;
  selectMood(moodOrder[(moodOrder.indexOf(activeMood) + step + moodOrder.length) % moodOrder.length], true);
}, { passive: true });
moodControls.addEventListener('keydown', (event) => {
  const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
  if (!step && event.key !== 'Home' && event.key !== 'End') return;
  event.preventDefault();
  stopOnInteraction();
  const current = moodOrder.indexOf(activeMood);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? moodOrder.length - 1 : (current + step + moodOrder.length) % moodOrder.length;
  selectMood(moodOrder[next], true);
  moodButtons[next].focus({ preventScroll: true });
});
document.addEventListener('visibilitychange', syncCycle);
prefersReducedMotion.addEventListener('change', syncCycle);
new ResizeObserver(resizeCanvas).observe(moodCanvas);
new ResizeObserver(layoutWheel).observe(moodControls);
layoutWheel();
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    isInView = entry.isIntersecting;
    syncCycle();
  }, { threshold: 0.25 }).observe(moodFrame);
} else {
  isInView = true;
  syncCycle();
}
