import { demoScript, speakerLabels } from './demo-script.js';

const byId = id => document.getElementById(id);
const dialog = byId('tap-story');
const profile = byId('tap-profile');
const conversation = byId('tap-conversation');
const finish = byId('tap-finish');
const transcript = byId('tap-transcript');
const scroller = byId('tap-conversation-scroll');
const deviceScreen = byId('tap-device-screen');
const micButton = byId('tap-mic-control');
const speakerButton = byId('tap-speaker-control');
const controlStatus = byId('tap-control-status');
const replayButton = byId('tap-demo-replay');
const stageGrid = byId('tap-stage-grid');

let run = 0;
let microphoneMuted = false;
let speakerMuted = false;
let audioContext;
let outputGain;
let customerGain;
let audioBuffers = new Map();
let preloadPromise;
let activeSource;
let activeSpeaker;
let opener;

// Resolve's transformation grid stays behind the customer app. Tiles do not move;
// a single soft change in corner radius travels a figure-eight over 20 seconds.
function buildStageGrid() {
  const tiles = document.createDocumentFragment();
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 20; col++) {
      const x = (col - 9.5) / 9.5;
      const y = (row - 5.5) / 5.5;
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
        tile.style.setProperty('--grid-delay', `${(-nearest.phase * 20).toFixed(2)}s`);
      }
      if (nearest.distance < .16 && nearest.phase < .09) tile.classList.add('tap-grid-resting-round');
      tiles.append(tile);
    }
  }
  stageGrid.append(tiles);
}
buildStageGrid();

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
  if (customerGain) customerGain.gain.value = microphoneMuted ? 0 : 1;
}

function stopAudio() {
  if (activeSource) {
    try { activeSource.stop(); } catch { /* It may have finished already. */ }
    activeSource = null;
    activeSpeaker = null;
  }
}

function resetScene() {
  stopAudio();
  transcript.replaceChildren();
  profile.hidden = false;
  conversation.hidden = true;
  finish.hidden = true;
  replayButton.hidden = true;
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
    customerGain ||= audioContext.createGain();
    customerGain.connect(outputGain);
    outputGain.connect(audioContext.destination);
    syncControls();
    const spoken = demoScript.filter(event => event.type === 'line');
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

function scrollToLatest() {
  scroller.scrollTop = scroller.scrollHeight;
}

function playClip(id, speaker) {
  const buffer = audioBuffers.get(id);
  if (!audioContext || !buffer) return Promise.resolve();
  return new Promise(resolve => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(speaker === 'maya' ? customerGain : outputGain);
    activeSource = source;
    activeSpeaker = speaker;
    source.onended = () => {
      if (activeSource === source) {
        activeSource = null;
        activeSpeaker = null;
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
    const bubble = document.createElement('div');
    bubble.className = `tap-line ${event.speaker}`;
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
  while (event.speaker === 'maya' && microphoneMuted && token === run) {
    if (!(await delay(150, token))) return;
  }
  if (token !== run) return;
  const audioDuration = audioBuffers.get(event.id)?.duration;
  const duration = audioDuration || Math.max(2, event.text.split(/\s+/).length * .34);
  await Promise.all([streamLineBeats(event, duration, token), playClip(event.id, event.speaker)]);
  if (token !== run) return;
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
  conversation.hidden = true;
  finish.hidden = false;
  replayButton.hidden = false;
  deviceScreen.classList.remove('conversation-active');
  byId('replay-tap-demo').focus();
}

function endConversation() {
  run++;
  resetScene();
  byId('start-tap-demo').focus();
}

byId('open-tap-demo').addEventListener('click', openDemo);
byId('close-tap-demo').addEventListener('click', closeDemo);
byId('start-tap-demo').addEventListener('click', startDemo);
byId('tap-end-conversation').addEventListener('click', endConversation);
byId('replay-tap-demo').addEventListener('click', startDemo);
replayButton.addEventListener('click', startDemo);
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
