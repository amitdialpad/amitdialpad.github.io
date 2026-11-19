const WIDTH = 960;
const HEIGHT = 540;
const FRAME_RATE = 12;
const FRAME_INTERVAL_MS = 1000 / FRAME_RATE;
const STATIC_FRAME_INTERVAL_MS = 500;
export const BOT_EMOTIONS = Object.freeze({
  STANDBY: 'standby',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  PAUSED: 'paused'
});
export const BOT_EXPRESSIONS = Object.freeze({
  HEART: 'heart',
  CELEBRATE: 'celebrate',
  THUMBS: 'thumbs'
});
const EMOTIONS = new Set(Object.values(BOT_EMOTIONS));
const EXPRESSIONS = new Set(Object.values(BOT_EXPRESSIONS));
const ANIMATED_EMOTIONS = new Set([
  BOT_EMOTIONS.LISTENING,
  BOT_EMOTIONS.THINKING,
  BOT_EMOTIONS.SPEAKING
]);

const LABELS = {
  standby: 'Standby',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  paused: 'Paused'
};

const COLORS = {
  backgroundTop: '#1a1b27',
  backgroundBottom: '#171824',
  pale: '#eeeaf7'
};
const FULL_CIRCLE = Math.PI * 2;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT * 0.48;
const BASE_RADIUS = HEIGHT * 0.25;
const TREATMENTS = {
  standby: { radius: 0.72, ripple: 0.8, fill: 'rgba(64, 56, 79, 0.48)', current: 0, dot: 0.04 },
  listening: { radius: 1, ripple: 7, fill: 'rgba(145, 112, 217, 0.84)', current: 0.3, dot: 0.14 },
  thinking: { radius: 0.84, ripple: 4.5, fill: 'rgba(112, 84, 181, 0.79)', current: 0.23, dot: 0.13 },
  speaking: { radius: 1.13, ripple: 9, fill: 'rgba(164, 127, 230, 0.88)', current: 0.34, dot: 0.15 },
  paused: { radius: 0.75, ripple: 0, fill: 'rgba(68, 60, 84, 0.68)', current: 0, dot: 0 }
};

function clamp (value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// A lightly changing contour reads as one voice presence, even at tile size.
// The fill stays matte: no glossy orb, specular highlight, or central logo.
function drawContour (ctx, cx, cy, radius, ripple, t, fill, stroke, width) {
  const points = [];
  for (let i = 0; i < 40; i++) {
    const angle = i * FULL_CIRCLE / 40;
    const displacement = ripple * (
      0.65 * Math.sin(angle * 2 - t) + 0.35 * Math.sin(angle * 4 + t * 0.72)
    );
    const distance = radius + displacement;
    points.push({ x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance });
  }
  const last = points.at(-1);
  const first = points[0];
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

// A broad, flat current moves through the body rather than tracing its edge.
function drawCurrent (ctx, cx, cy, t, scale, opacity) {
  if (opacity < 0.005) return;
  const driftX = Math.sin(t * 0.82) * 9 * scale;
  const driftY = Math.cos(t * 0.64) * 7 * scale;
  const bend = Math.sin(t * 1.04) * 15 * scale;
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

/** Adds low-contrast dots inside the presence, with motion tied to its real mood. */
function drawHalftone (ctx, cx, cy, radius, t, emotion, opacity) {
  if (opacity < 0.005) return;
  const spacing = Math.max(8, Math.min(14, radius * 0.15));
  const count = Math.ceil(radius / spacing);
  ctx.fillStyle = '#eee2ff';
  for (let row = -count; row <= count; row++) {
    for (let col = -count; col <= count; col++) {
      const x = col * spacing;
      const y = row * spacing;
      const normalizedRadius = Math.hypot(x, y) / radius;
      if (normalizedRadius > 0.96) continue;
      let pattern = 0.5;
      if (emotion === BOT_EMOTIONS.LISTENING) {
        pattern = 0.5 + 0.5 * Math.sin(normalizedRadius * 11 - t * 1.8);
      }
      if (emotion === BOT_EMOTIONS.THINKING) {
        pattern = 0.5 + 0.5 * Math.sin(Math.atan2(y, x) * 2.5 - normalizedRadius * 9 + t * 1.1);
      }
      if (emotion === BOT_EMOTIONS.SPEAKING) pattern = 0.5 + 0.5 * Math.sin(x * 0.07 - t * 2.5);
      const edge = clamp((1 - normalizedRadius) * 2.7, 0, 1);
      ctx.globalAlpha = opacity * (0.42 + pattern * 0.58) * edge;
      ctx.beginPath();
      ctx.arc(cx + x, cy + y, Math.max(1.15, spacing * (0.14 + 0.07 * pattern)), 0, FULL_CIRCLE);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Gives Thinking a quiet pair of moving dot paths within the body. */
function drawThinkingFlow (ctx, cx, cy, radius, t) {
  ctx.fillStyle = '#e7d7ff';
  for (const track of [-1, 1]) {
    for (let index = 0; index < 13; index++) {
      const progress = index / 12;
      const x = (progress - 0.5) * radius * 1.24;
      const wave = Math.sin(progress * FULL_CIRCLE + t * 0.8 + track) * radius * 0.08;
      const falloff = Math.sin(progress * Math.PI);
      ctx.globalAlpha = 0.2 + falloff * 0.26;
      ctx.beginPath();
      ctx.arc(cx + x, cy + track * radius * 0.22 + wave, 1.1 + falloff * 1.1, 0, FULL_CIRCLE);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Lets Listening and Speaking read at small tile sizes without a large pulse. */
function drawSideDots (ctx, cx, cy, radius, t, emotion) {
  if (emotion !== BOT_EMOTIONS.LISTENING && emotion !== BOT_EMOTIONS.SPEAKING) return;
  ctx.fillStyle = '#c7a8f4';
  const rings = emotion === BOT_EMOTIONS.SPEAKING ? 2 : 1;
  for (let ring = 0; ring < rings; ring++) {
    const offset = emotion === BOT_EMOTIONS.SPEAKING
      ? 15 + ring * 13 + 3 * Math.sin(t * 2.4 - ring)
      : 11 + 2 * Math.sin(t * 1.4);
    const strength = emotion === BOT_EMOTIONS.SPEAKING ? 0.17 - ring * 0.06 : 0.13;
    for (const side of [-1, 1]) {
      for (let index = -5; index <= 5; index++) {
        const angle = side === 1 ? index * 0.12 : Math.PI + index * 0.12;
        const edge = 1 - Math.abs(index) / 6;
        ctx.globalAlpha = strength * edge;
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(angle) * (radius + offset),
          cy + Math.sin(angle) * (radius + offset),
          1.45 + edge * 0.5, 0, FULL_CIRCLE
        );
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** Keeps Paused visibly distinct from Standby while remaining still. */
function drawPausedDots (ctx, cx, cy, radius) {
  const spacing = Math.max(4.7, radius * 0.105);
  const dotRadius = clamp(radius * 0.037, 1.9, 3.1);
  ctx.fillStyle = '#b496e9';
  ctx.globalAlpha = 0.82;
  for (const side of [-1, 1]) {
    for (let row = -4; row <= 4; row++) {
      for (let col = -1; col <= 1; col++) {
        ctx.beginPath();
        ctx.arc(
          cx + side * spacing * 2.55 + col * spacing,
          cy + row * spacing, dotRadius, 0, FULL_CIRCLE
        );
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// The same matte body carries every state. Dots express activity without taking over the tile.
function drawPresence (ctx, emotion, t, energy, reducedMotion) {
  const treatment = TREATMENTS[emotion];
  const breath = emotion === BOT_EMOTIONS.STANDBY && !reducedMotion ? Math.sin(t * 0.8) * 0.65 : 0;
  const speech = emotion === BOT_EMOTIONS.SPEAKING && !reducedMotion ? Math.sin(t * 2.35) * 3 : 0;
  const radius = BASE_RADIUS * treatment.radius + breath + speech + energy * 9;
  drawContour(
    ctx, CENTER_X, CENTER_Y, radius, reducedMotion ? 1.8 : treatment.ripple,
    t, treatment.fill, null, 0
  );
  ctx.save();
  ctx.clip();
  drawCurrent(ctx, CENTER_X, CENTER_Y, t, radius / 83, treatment.current);
  drawHalftone(ctx, CENTER_X, CENTER_Y, radius, t, emotion, treatment.dot);
  if (emotion === BOT_EMOTIONS.THINKING) drawThinkingFlow(ctx, CENTER_X, CENTER_Y, radius, t);
  ctx.restore();
  if (emotion === BOT_EMOTIONS.PAUSED) drawPausedDots(ctx, CENTER_X, CENTER_Y, radius);
  else drawSideDots(ctx, CENTER_X, CENTER_Y, radius, t, emotion);
}

/** Draws one brief expression around the existing presence without adding a video track. */
function drawExpression (ctx, expression, elapsedMs, radius, reducedMotion) {
  if (!EXPRESSIONS.has(expression) || elapsedMs < 0 || elapsedMs >= 2200) return;
  const progress = clamp(elapsedMs / 2200, 0, 1);
  const travel = reducedMotion ? 0.35 : 1 - (1 - progress) ** 3;
  const opacity = reducedMotion
    ? 0.82
    : clamp(progress / 0.12, 0, 1) * clamp((1 - progress) / 0.38, 0, 1);
  ctx.save();
  if (expression === BOT_EXPRESSIONS.HEART) {
    const positions = [
      [-0.80, -0.73, -1], [-0.39, -0.95, -0.4], [0, -1.02, 0],
      [0.41, -0.93, 0.4], [0.82, -0.70, 1]
    ];
    ctx.fillStyle = '#f2d9ff';
    positions.forEach(([horizontal, vertical, direction], index) => {
      const stagger = reducedMotion ? 1 : clamp((progress - index * 0.035) / 0.2, 0, 1);
      const x0 = CENTER_X + horizontal * radius + direction * 10 * travel;
      const y0 = CENTER_Y + vertical * radius - radius * 0.19 * travel;
      const size = radius * 0.008;
      ctx.globalAlpha = opacity * stagger * 0.88;
      for (let dot = 0; dot < 20; dot++) {
        const angle = dot * FULL_CIRCLE / 20;
        const x = 16 * Math.sin(angle) ** 3 * size;
        const y = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle)
          - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) * size;
        ctx.beginPath();
        ctx.arc(x0 + x, y0 + y, 1.35, 0, FULL_CIRCLE);
        ctx.fill();
      }
    });
  } else if (expression === BOT_EXPRESSIONS.CELEBRATE) {
    ctx.fillStyle = '#f0d7ff';
    for (let index = 0; index < 9; index++) {
      const angle = -Math.PI * 0.9 + index * Math.PI * 0.8 / 8;
      const distance = radius * (1.04 + travel * 0.22) + (index % 2) * 5;
      const x = CENTER_X + Math.cos(angle) * distance;
      const y = CENTER_Y + Math.sin(angle) * distance;
      ctx.globalAlpha = opacity * (index % 3 === 0 ? 0.9 : 0.65);
      const dots = [[0, 0, 3], [-6, 0, 1.3], [6, 0, 1.3], [0, -6, 1.3], [0, 6, 1.3]];
      for (const [dx, dy, size] of dots) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, size, 0, FULL_CIRCLE);
        ctx.fill();
      }
    }
  } else {
    ctx.translate(CENTER_X + radius * 1.02, CENTER_Y - radius * (0.24 + travel * 0.12));
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
  }
  ctx.restore();
}

/** Paints one approved mood into an existing Meetings canvas without owning its video track. */
export function drawBotEmotionFrame (ctx, {
  emotion = BOT_EMOTIONS.STANDBY,
  timeMs = 0,
  inputLevel = 0,
  label = LABELS[emotion],
  labelOpacity = 1,
  width = WIDTH,
  height = HEIGHT,
  reducedMotion = false,
  expression = null,
  expressionElapsedMs = 0
} = {}) {
  if (!EMOTIONS.has(emotion)) throw new RangeError(`Unsupported Bot emotion: ${emotion}`);
  if (width !== WIDTH || height !== HEIGHT) {
    ctx.save();
    ctx.scale(width / WIDTH, height / HEIGHT);
  }
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, COLORS.backgroundTop);
  background.addColorStop(1, COLORS.backgroundBottom);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const t = reducedMotion ? 0 : timeMs / 1000;
  const energy = emotion === BOT_EMOTIONS.LISTENING && !reducedMotion
    ? clamp(inputLevel, 0, 1)
    : 0;
  drawPresence(ctx, emotion, t, energy, reducedMotion);
  drawExpression(
    ctx, expression, expressionElapsedMs, BASE_RADIUS * TREATMENTS[emotion].radius, reducedMotion
  );

  if (label && labelOpacity >= 0.02) {
    ctx.save();
    ctx.globalAlpha = clamp(labelOpacity, 0, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.pale;
    ctx.font = '500 20px system-ui, sans-serif';
    ctx.fillText(String(label).slice(0, 60), CENTER_X, 488);
    ctx.restore();
  }
  if (width !== WIDTH || height !== HEIGHT) ctx.restore();
}
