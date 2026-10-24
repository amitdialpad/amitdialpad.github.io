import { demoScript, feedbackScript, speakerLabels } from './demo-script.js?v=2';

const byId = id => document.getElementById(id);
const dialog = byId('tap-story');
const profile = byId('tap-profile');
const conversation = byId('tap-conversation');
const finish = byId('tap-finish');
const finishHeading = finish.querySelector('.tap-finish-statement');
const feedbackQuestion = byId('tap-feedback-question');
const feedbackStart = byId('tap-feedback-start');
const feedbackLater = byId('tap-feedback-later');
const thanksNote = byId('tap-thanks-note');
const transcript = byId('tap-transcript');
const scroller = byId('tap-conversation-scroll');
const deviceScreen = byId('tap-device-screen');
const micButton = byId('tap-mic-control');
const speakerButton = byId('tap-speaker-control');
const controlStatus = byId('tap-control-status');
const backHomeButton = byId('tap-back-home');
const stageGrid = byId('tap-stage-grid');
const finishGrid = byId('tap-finish-grid');
const finishLines = [byId('tap-finish-line-one'), byId('tap-finish-line-two')];
const finishWords = [['One', 'conversation.'], ['From', 'start', 'to', 'finish.']];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let run = 0;
let microphoneMuted = false;
let speakerMuted = false;
let audioContext;
let outputGain;
let audioBuffers = new Map();
let preloadPromise;
let activeSource;
let opener;
let endingAnimations = [];

function stopEndingTransition() {
  endingAnimations.forEach(animation => animation.cancel());
  endingAnimations = [];
  deviceScreen.classList.remove('is-feedback-transition');
}

// A quiet corner-radius change travels across each transformation grid.
function buildGrid(container, columns, rows, duration = 20) {
  const tiles = document.createDocumentFragment();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = (col - (columns - 1) / 2) / ((columns - 1) / 2);
      const y = (row - (rows - 1) / 2) / ((rows - 1) / 2);
      let nearest = { distance: Infinity, phase: 0 };
      for (let step = 0; step < 120; step++) {
        const phase = step / 120;
        const angle = phase * Math.PI * 2;
        const distance = Math.hypot(x - .74 * Math.sin(angle), y - .52 * Math.sin(2 * angle));
        if (distance < nearest.distance) nearest = { distance, phase };
      }
      const tile = document.createElement('span');
      if (nearest.distance < .24) {
        tile.className = 'tap-grid-morph';
        tile.style.setProperty('--grid-delay', `${(-nearest.phase * duration).toFixed(2)}s`);
      }
      if (nearest.distance < .16 && nearest.phase < .09) tile.classList.add('tap-grid-resting-round');
      tiles.append(tile);
    }
  }
  container.append(tiles);
}
buildGrid(stageGrid, 20, 12);
buildGrid(finishGrid, 10, 18, 14);

function syncControls() {
  micButton.classList.toggle('is-muted', microphoneMuted);
  micButton.setAttribute('aria-pressed', String(microphoneMuted));
  micButton.setAttribute('aria-label', microphoneMuted ? 'Unmute microphone' : 'Mute microphone');
  micButton.title = micButton.getAttribute('aria-label');
  speakerButton.classList.toggle('is-muted', speakerMuted);
  speakerButton.setAttribute('aria-pressed', String(speakerMuted));
  speakerButton.setAttribute('aria-label', speakerMuted ? 'Unmute speaker' : 'Mute speaker');
  speakerButton.title = speakerButton.getAttribute('aria-label');
  if (outputGain) outputGain.gain.value = speakerMuted ? 0 : 1;
}

function stopAudio() {
  if (activeSource) {
    try { activeSource.stop(); } catch { /* It may have finished already. */ }
    activeSource = null;
  }
}

function resetScene() {
  stopEndingTransition();
  stopAudio();
  dialog.classList.remove('is-finished');
  transcript.replaceChildren();
  profile.hidden = false;
  conversation.hidden = true;
  finish.hidden = true;
  finish.classList.remove('title-complete', 'finish-meta-visible', 'finish-ready', 'is-feedback-invite', 'is-feedback-thanks');
  finishHeading.setAttribute('aria-hidden', 'false');
  feedbackQuestion.setAttribute('aria-hidden', 'true');
  feedbackQuestion.setAttribute('aria-label', 'How was that call?');
  feedbackQuestion.textContent = '';
  feedbackStart.hidden = true;
  feedbackLater.hidden = true;
  thanksNote.hidden = true;
  finishLines.forEach(line => line.replaceChildren());
  backHomeButton.hidden = true;
  deviceScreen.classList.remove('conversation-active');
  microphoneMuted = false;
  speakerMuted = false;
  controlStatus.textContent = '';
  syncControls();
}

async function preloadAudio() {
  if (preloadPromise) return preloadPromise;
  preloadPromise = (async () => {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    outputGain ||= audioContext.createGain();
    outputGain.connect(audioContext.destination);
    syncControls();
    const spoken = [...demoScript, ...feedbackScript].filter(event => event.type === 'line');
    const results = await Promise.allSettled(spoken.map(async event => {
      const response = await fetch(`./audio/${event.id}.mp3`);
      if (!response.ok) throw new Error(`Audio ${event.id} unavailable`);
      const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
      audioBuffers.set(event.id, buffer);
    }));
    const failed = results.filter(result => result.status === 'rejected').length;
    if (failed) console.warn(`${failed} Tap demo audio clips were unavailable. Captions will continue.`);
  })();
  return preloadPromise;
}

function openDemo() {
  opener = document.activeElement;
  run++;
  resetScene();
  dialog.showModal();
  document.body.classList.add('tap-demo-open');
  byId('start-tap-demo').focus();
  preloadAudio().catch(() => {});
}

function closeDemo() {
  run++;
  stopEndingTransition();
  stopAudio();
  dialog.close();
  document.body.classList.remove('tap-demo-open');
  opener?.focus();
}

function delay(ms, token) {
  return new Promise(resolve => {
    const finishWait = () => resolve(token === run);
    window.setTimeout(finishWait, ms);
  });
}

async function showFinish(token) {
  conversation.hidden = true;
  finish.hidden = false;
  dialog.classList.add('is-finished');
  deviceScreen.classList.remove('conversation-active');
  finish.classList.remove('title-complete', 'finish-meta-visible', 'finish-ready', 'is-feedback-invite', 'is-feedback-thanks');
  finishHeading.setAttribute('aria-hidden', 'false');
  feedbackQuestion.setAttribute('aria-hidden', 'true');
  feedbackQuestion.textContent = '';
  feedbackStart.hidden = true;
  finishLines.forEach(line => line.replaceChildren());
  finishHeading.focus({ preventScroll: true });

  if (reducedMotion.matches) {
    finishLines.forEach((line, index) => { line.textContent = finishWords[index].join(' '); });
    finish.classList.add('finish-meta-visible', 'finish-ready');
    await showFeedbackInvite(token);
    return;
  }

  const caret = document.createElement('span');
  caret.className = 'tap-finish-caret';
  for (let lineIndex = 0; lineIndex < finishWords.length; lineIndex++) {
    const line = finishLines[lineIndex];
    line.append(caret);
    for (const [wordIndex, word] of finishWords[lineIndex].entries()) {
      if (wordIndex) line.insertBefore(document.createTextNode(' '), caret);
      for (const character of word) {
        if (token !== run) return;
        line.insertBefore(document.createTextNode(character), caret);
        if (!await delay(character === '.' ? 155 : 43, token)) return;
      }
      if (!await delay(125, token)) return;
    }
    if (lineIndex === 0 && !await delay(200, token)) return;
  }
  caret.remove();
  if (token !== run) return;
  finish.classList.add('title-complete');
  // Let the star finish its delayed sweep before the byline and action arrive.
  if (!await delay(1400, token)) return;
  finish.classList.add('finish-meta-visible');
  if (!await delay(270, token)) return;
  finish.classList.add('finish-ready');
  await showFeedbackInvite(token);
}

async function showFeedbackInvite(token) {
  // Give the original ending time to land before the optional next chapter.
  if (!await delay(reducedMotion.matches ? 2200 : 2800, token)) return;
  finish.classList.add('is-feedback-invite');
  finishHeading.setAttribute('aria-hidden', 'true');
  if (!await delay(reducedMotion.matches ? 180 : 350, token)) return;
  feedbackQuestion.setAttribute('aria-hidden', 'false');
  feedbackQuestion.setAttribute('aria-label', 'How was that call?');
  if (!await typeFeedbackHeading('How was that call?', token)) return;
  if (!await delay(reducedMotion.matches ? 80 : 180, token)) return;
  feedbackStart.hidden = false;
  feedbackLater.hidden = false;
  feedbackQuestion.focus({ preventScroll: true });
}

async function typeFeedbackHeading(message, token) {
  feedbackQuestion.textContent = '';
  if (reducedMotion.matches) {
    feedbackQuestion.textContent = message;
  } else {
    const caret = document.createElement('span');
    caret.className = 'tap-finish-caret';
    feedbackQuestion.append(caret);
    for (const character of message) {
      if (token !== run) { caret.remove(); return false; }
      feedbackQuestion.insertBefore(document.createTextNode(character), caret);
      if (!await delay(/[?.!]/.test(character) ? 180 : 55, token)) { caret.remove(); return false; }
    }
    caret.remove();
  }
  return token === run;
}

function scrollToLatest() {
  scroller.scrollTop = scroller.scrollHeight;
}

function playClip(id) {
  const buffer = audioBuffers.get(id);
  if (!audioContext || !buffer) return Promise.resolve();
  return new Promise(resolve => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(outputGain);
    activeSource = source;
    source.onended = () => {
      if (activeSource === source) {
        activeSource = null;
      }
      resolve();
    };
    source.start();
  });
}

async function streamWords(text, target, duration, token) {
  const words = text.split(/\s+/);
  const step = Math.max(75, Math.min(650, (duration * 1000) / words.length));
  for (const word of words) {
    if (token !== run) return;
    target.textContent += (target.textContent ? ' ' : '') + word;
    scrollToLatest();
    if (!(await delay(step, token))) return;
  }
}

async function streamLineBeats(event, duration, token) {
  const beats = event.beats || [event.text];
  const totalWords = event.text.split(/\s+/).length;
  for (const beat of beats) {
    if (token !== run) return;
    transcript.querySelector('.tap-line.is-speaking')?.classList.remove('is-speaking');
    const bubble = document.createElement('div');
    bubble.className = `tap-line ${event.speaker} is-speaking`;
    const speaker = document.createElement('span');
    speaker.className = 'tap-line-speaker sr-only';
    speaker.textContent = speakerLabels[event.speaker];
    const text = document.createElement('span');
    text.className = 'tap-line-text';
    bubble.append(speaker, text);
    transcript.append(bubble);
    scrollToLatest();
    await streamWords(beat, text, duration * beat.split(/\s+/).length / totalWords, token);
    if (token === run) text.textContent = beat;
  }
}

async function showLine(event, token) {
  if (token !== run) return;
  const audioDuration = audioBuffers.get(event.id)?.duration;
  const duration = audioDuration || Math.max(2, event.text.split(/\s+/).length * .34);
  await Promise.all([streamLineBeats(event, duration, token), playClip(event.id)]);
  if (token !== run) return;
  transcript.querySelector('.tap-line.is-speaking')?.classList.remove('is-speaking');
  await delay(360, token);
}

async function showCheck(event, token) {
  const status = document.createElement('div');
  status.className = 'tap-check';
  status.setAttribute('role', 'status');
  const dots = document.createElement('span');
  dots.className = 'tap-check-dots';
  dots.setAttribute('aria-hidden', 'true');
  dots.textContent = '•••';
  const label = document.createElement('span');
  label.textContent = event.text;
  status.append(dots, label);
  transcript.append(status);
  scrollToLatest();
  await delay(event.wait ?? 1000, token);
  if (token === run) status.classList.add('complete');
}

async function showCard(event, token) {
  const card = document.createElement('div');
  card.className = `tap-card ${event.style}`;
  const kicker = document.createElement('span');
  kicker.className = 'tap-card-kicker';
  kicker.textContent = event.label;
  const title = document.createElement('strong');
  if (event.style === 'compare') {
    title.className = 'tap-rate-values';
    const [previous, current] = event.title.split('→').map(value => value.trim());
    for (const [label, value, className] of [['At transfer', previous, 'tap-rate-previous'], ['Now', current, 'tap-rate-current']]) {
      const column = document.createElement('span');
      column.className = className;
      const caption = document.createElement('small');
      caption.textContent = label;
      const amount = document.createElement('b');
      amount.textContent = value;
      column.append(caption, amount);
      title.append(column);
      if (className === 'tap-rate-previous') {
        const arrow = document.createElement('span');
        arrow.className = 'tap-rate-arrow';
        arrow.textContent = '→';
        title.append(arrow);
      }
    }
  } else {
    title.textContent = event.title;
  }
  const detail = document.createElement('p');
  detail.textContent = event.detail;
  card.append(kicker, title);
  if (event.rows) {
    const rows = document.createElement('dl');
    rows.className = 'tap-review-rows';
    for (const [label, value] of event.rows) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      rows.append(row);
    }
    card.append(rows);
  }
  if (event.style === 'face-id') {
    const face = document.createElement('span');
    face.className = 'tap-face-id-mark';
    face.setAttribute('aria-hidden', 'true');
    face.textContent = '◌';
    card.prepend(face);
  }
  card.append(detail);
  transcript.append(card);
  scrollToLatest();
  if (event.style === 'face-id') {
    await delay(1600, token);
    if (token !== run) return;
    card.classList.add('approved');
    kicker.textContent = 'Face ID confirmed';
    title.textContent = 'Confirmed with Face ID';
    card.querySelector('.tap-face-id-mark').textContent = '✓';
    await delay(1000, token);
    return;
  }
  await delay(event.style === 'review' || event.style === 'transfer-review' ? 1800 : 1250, token);
}

async function showHandoff(event, token) {
  await delay(1100, token);
  if (token !== run) return;
  const banner = document.createElement('div');
  banner.className = 'tap-handoff';
  banner.textContent = event.name;
  transcript.append(banner);
  scrollToLatest();
  await delay(1600, token);
}

async function startDemo() {
  const token = ++run;
  resetScene();
  profile.hidden = true;
  conversation.hidden = false;
  deviceScreen.classList.add('conversation-active');
  try {
    await preloadAudio();
    await audioContext.resume();
  } catch {
    // Captions remain available if audio cannot load.
  }
  if (token !== run) return;
  for (const event of demoScript) {
    if (token !== run) return;
    if (event.type === 'line') await showLine(event, token);
    if (event.type === 'check') await showCheck(event, token);
    if (event.type === 'card') await showCard(event, token);
    if (event.type === 'handoff') await showHandoff(event, token);
  }
  if (token !== run) return;
  await showFinish(token);
}

async function startFeedback() {
  const token = ++run;
  finish.hidden = true;
  conversation.hidden = false;
  dialog.classList.remove('is-finished');
  deviceScreen.classList.add('conversation-active');
  scrollToLatest();
  try {
    await preloadAudio();
    await audioContext.resume();
  } catch {
    // Captions remain available if audio cannot load.
  }
  if (token !== run) return;
  for (const event of feedbackScript) {
    if (token !== run) return;
    if (event.type === 'line') await showLine(event, token);
    if (event.type === 'card') await showCard(event, token);
  }
  if (token !== run) return;
  if (!await delay(950, token)) return;
  await showFeedbackThanks(token);
}

async function showFeedbackThanks(token) {
  if (token !== run) return;
  finish.hidden = false;
  finish.classList.remove('title-complete', 'is-feedback-invite');
  finish.classList.add('is-feedback-thanks', 'finish-meta-visible', 'finish-ready');
  finishHeading.setAttribute('aria-hidden', 'true');
  feedbackQuestion.setAttribute('aria-hidden', 'true');
  feedbackQuestion.setAttribute('aria-label', 'Thanks, Maya.');
  feedbackQuestion.textContent = '';
  feedbackStart.hidden = true;
  feedbackLater.hidden = true;
  thanksNote.hidden = true;
  backHomeButton.hidden = true;
  deviceScreen.classList.add('is-feedback-transition');
  const exit = conversation.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reducedMotion.matches ? 180 : 520, easing: 'cubic-bezier(.77, 0, .175, 1)', fill: 'forwards' });
  const enter = finish.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reducedMotion.matches ? 200 : 620, delay: reducedMotion.matches ? 0 : 110, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'both' });
  endingAnimations = [exit, enter];
  await Promise.allSettled(endingAnimations.map(animation => animation.finished));
  if (token !== run) return;
  conversation.hidden = true;
  deviceScreen.classList.remove('conversation-active');
  dialog.classList.add('is-finished');
  stopEndingTransition();
  if (!await delay(reducedMotion.matches ? 80 : 150, token)) return;
  feedbackQuestion.setAttribute('aria-hidden', 'false');
  if (!await typeFeedbackHeading('Thanks, Maya.', token)) return;
  feedbackQuestion.focus({ preventScroll: true });
  if (!await delay(reducedMotion.matches ? 80 : 220, token)) return;
  thanksNote.hidden = false;
  if (!await delay(reducedMotion.matches ? 180 : 580, token)) return;
  backHomeButton.hidden = false;
}

function endConversation() {
  run++;
  resetScene();
  byId('start-tap-demo').focus();
}

function returnHome() {
  run++;
  resetScene();
  byId('start-tap-demo').focus();
}

byId('open-tap-demo').addEventListener('click', openDemo);
byId('open-tap-demo-stay').addEventListener('click', openDemo);
byId('close-tap-demo').addEventListener('click', closeDemo);
byId('start-tap-demo').addEventListener('click', startDemo);
byId('tap-end-conversation').addEventListener('click', endConversation);
feedbackStart.addEventListener('click', startFeedback);
feedbackLater.addEventListener('click', returnHome);
backHomeButton.addEventListener('click', returnHome);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDemo(); });
micButton.addEventListener('click', () => {
  microphoneMuted = !microphoneMuted;
  syncControls();
  controlStatus.textContent = microphoneMuted ? 'Microphone muted' : 'Microphone on';
});
speakerButton.addEventListener('click', () => {
  speakerMuted = !speakerMuted;
  syncControls();
  controlStatus.textContent = speakerMuted ? 'Speaker muted' : 'Speaker on';
});

// Local design review: open directly on the final frame without playing the script.
const localPreview = location.hostname === '127.0.0.1' ? new URLSearchParams(location.search).get('preview') : null;
if (localPreview === 'thanks') {
  dialog.showModal();
  document.body.classList.add('tap-demo-open');
  profile.hidden = true;
  finish.hidden = false;
  dialog.classList.add('is-finished');
  finish.classList.add('is-feedback-thanks', 'finish-meta-visible', 'finish-ready');
  finishHeading.setAttribute('aria-hidden', 'true');
  feedbackQuestion.setAttribute('aria-hidden', 'false');
  feedbackQuestion.setAttribute('aria-label', 'Thanks, Maya.');
  feedbackQuestion.textContent = 'Thanks, Maya.';
  feedbackStart.hidden = true;
  feedbackLater.hidden = true;
  thanksNote.hidden = false;
  backHomeButton.hidden = false;
} else if (localPreview === 'feedback-close') {
  dialog.showModal();
  document.body.classList.add('tap-demo-open');
  profile.hidden = true;
  conversation.hidden = false;
  deviceScreen.classList.add('conversation-active');
  for (const event of feedbackScript.slice(-2)) {
    if (event.type === 'line') {
      const bubble = document.createElement('div');
      bubble.className = `tap-line ${event.speaker}`;
      const text = document.createElement('span');
      text.className = 'tap-line-text';
      text.textContent = event.text;
      bubble.append(text);
      transcript.append(bubble);
    } else if (event.type === 'card') {
      showCard(event, run);
    }
  }
  delay(900, run).then(ready => { if (ready) showFeedbackThanks(run); });
} else if (localPreview === 'end') {
  dialog.showModal();
  document.body.classList.add('tap-demo-open');
  profile.hidden = true;
  // Keep the last exchange visible when the feedback chapter resumes.
  for (const event of demoScript.filter(item => item.id === '18' || item.id === '19')) {
    const bubble = document.createElement('div');
    bubble.className = `tap-line ${event.speaker}`;
    const speaker = document.createElement('span');
    speaker.className = 'tap-line-speaker sr-only';
    speaker.textContent = speakerLabels[event.speaker];
    const text = document.createElement('span');
    text.className = 'tap-line-text';
    text.textContent = event.text;
    bubble.append(speaker, text);
    transcript.append(bubble);
  }
  showFinish(run);
}
