import { BOT_EMOTIONS, BOT_EXPRESSIONS, drawBotEmotionFrame } from './bot-sequence-renderer.js';

// Follows the isolated Meetings visual preview. It supplies simulated states
// to the same Bot tile renderer, without joining or listening to a meeting.
const scenes = [
  { name: 'Standby', emotion: BOT_EMOTIONS.STANDBY, duration: 1700 },
  { name: 'Listening', emotion: BOT_EMOTIONS.LISTENING, duration: 2100 },
  { name: 'Thinking', emotion: BOT_EMOTIONS.THINKING, duration: 2100 },
  { name: 'Speaking', emotion: BOT_EMOTIONS.SPEAKING, duration: 2100 },
  { name: 'Love', emotion: BOT_EMOTIONS.SPEAKING, expression: BOT_EXPRESSIONS.HEART, duration: 2200 },
  { name: 'Celebration', emotion: BOT_EMOTIONS.SPEAKING, expression: BOT_EXPRESSIONS.CELEBRATE, duration: 2200 },
  { name: 'Thumbs up', emotion: BOT_EMOTIONS.SPEAKING, expression: BOT_EXPRESSIONS.THUMBS, duration: 2200 },
  { name: 'Paused', emotion: BOT_EMOTIONS.PAUSED, duration: 2100 },
  { name: 'Standby', emotion: BOT_EMOTIONS.STANDBY, duration: 1600 }
];

const player = document.getElementById('sequence-demo');
const stack = document.getElementById('sequence-canvas-stack');
const firstCanvas = document.getElementById('sequence-canvas');
const secondCanvas = document.getElementById('sequence-canvas-next');
const stateLabel = document.getElementById('sequence-state');
const firstContext = firstCanvas?.getContext('2d', { alpha: false });
const secondContext = secondCanvas?.getContext('2d', { alpha: false });

if (player && stack && firstContext && secondContext && stateLabel) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const transitionDuration = 400;
  const labelHalfDuration = 200;
  const contexts = new Map([[firstCanvas, firstContext], [secondCanvas, secondContext]]);
  let front = firstCanvas;
  let back = secondCanvas;
  let transition = null;
  let elapsed = 0;
  let lastTime = null;
  let lastDrawTime = -Infinity;
  let currentSceneIndex = -1;
  let previousSceneElapsed = 0;
  let labelTimer = null;
  let labelTarget = scenes[0].name;
  let frameId = null;
  let inView = false;

  function sceneAt (time) {
    let start = 0;
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      if (time < start + scene.duration) return { scene, index, elapsedInScene: time - start };
      start += scene.duration;
    }
    return { scene: scenes[0], index: 0, elapsedInScene: 0 };
  }

  function drawScene (canvas, scene, time, elapsedInScene) {
    drawBotEmotionFrame(contexts.get(canvas), {
      emotion: scene.emotion,
      timeMs: time,
      expression: scene.expression || null,
      expressionElapsedMs: elapsedInScene,
      label: '',
      labelOpacity: 0,
      reducedMotion: motion.matches
    });
  }

  function settleLabel () {
    if (labelTimer !== null) window.clearTimeout(labelTimer);
    labelTimer = null;
    stateLabel.textContent = labelTarget;
    stateLabel.style.opacity = '1';
    stack.setAttribute('aria-label', `Dial Bot in ${labelTarget.toLowerCase()}`);
  }

  function changeLabel (name, animate) {
    if (name === labelTarget) return;
    labelTarget = name;
    if (!animate || motion.matches) {
      settleLabel();
      return;
    }
    if (labelTimer !== null) window.clearTimeout(labelTimer);
    stateLabel.style.opacity = '0';
    labelTimer = window.setTimeout(settleLabel, labelHalfDuration);
  }

  function finishTransition () {
    if (!transition) return;
    const { outgoing, incoming } = transition;
    incoming.classList.replace('is-back', 'is-front');
    outgoing.classList.replace('is-front', 'is-back');
    outgoing.style.opacity = '1';
    front = incoming;
    back = outgoing;
    transition = null;
  }

  function draw (time) {
    const { scene, index, elapsedInScene } = sceneAt(elapsed);
    if (currentSceneIndex === -1) {
      currentSceneIndex = index;
      changeLabel(scene.name, false);
    } else if (index !== currentSceneIndex) {
      finishTransition();
      const outgoingScene = scenes[currentSceneIndex];
      if (outgoingScene.emotion !== scene.emotion && !motion.matches) {
        // The back layer stays opaque while the outgoing front layer fades,
        // so the closing panel cannot show through at the midpoint.
        drawScene(back, scene, time, elapsedInScene);
        transition = {
          outgoing: front,
          incoming: back,
          scene: outgoingScene,
          elapsedInScene: previousSceneElapsed,
          startedAt: time
        };
        front.style.opacity = '0';
      }
      currentSceneIndex = index;
      changeLabel(scene.name, true);
    }

    if (transition) {
      drawScene(transition.outgoing, transition.scene, time, transition.elapsedInScene);
      drawScene(transition.incoming, scene, time, elapsedInScene);
      if (time - transition.startedAt >= transitionDuration) finishTransition();
    } else {
      drawScene(front, scene, time, elapsedInScene);
    }
    previousSceneElapsed = elapsedInScene;
    lastDrawTime = time;
  }

  function tick (time) {
    frameId = null;
    if (!inView || document.hidden) return;
    if (motion.matches) {
      onMotionChange();
      return;
    }
    if (lastTime !== null) elapsed = (elapsed + Math.min(time - lastTime, 100)) % totalDuration;
    lastTime = time;
    // Only the brief bridges use the higher rate; idle rendering stays at 12fps.
    if (time - lastDrawTime >= 1000 / (transition ? 24 : 12) || currentSceneIndex === -1) draw(time);
    resume();
  }

  function pause () {
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
    lastTime = null;
    finishTransition();
    settleLabel();
  }

  function resume () {
    if (frameId === null && inView && !document.hidden && !motion.matches) {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  function onMotionChange () {
    pause();
    elapsed = 0;
    currentSceneIndex = -1;
    previousSceneElapsed = 0;
    draw(window.performance.now());
    resume();
  }

  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
  motion.addEventListener('change', onMotionChange);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) resume();
      else pause();
    }, { threshold: 0.2 }).observe(player);
  } else {
    inView = true;
  }

  draw(window.performance.now());
  resume();
}
