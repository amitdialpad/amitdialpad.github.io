const examples = [
  { label: 'Travel', symbol: 'A', business: 'Aero Airlines', tag: 'TRAVEL', title: 'Where next?', subtitle: 'Book. Change. Take off.', question: 'Is my flight on time?', assistant: 'Let me check your flight.', icon: '✈', answer: 'On time · Gate C12', detail: 'Boarding at 2:10 PM', human: 'Alex · Aero', message: 'I can help with your seat. I already have your flight details.', image: 'Airplane wing above clouds at sunrise', accent: '#245d85', soft: '#eaf4fa' },
  { label: 'Healthcare', symbol: 'N', business: 'Northside Health', tag: 'HEALTHCARE', title: 'Feel better.', subtitle: 'Care, on your time.', question: 'Can I move my appointment?', assistant: 'I’ll check the next opening.', icon: '✳', answer: 'Tuesday · 10:30 AM', detail: 'A new opening is available', human: 'Maya · Northside', message: 'I can help you choose a new time. I have your request here.', image: 'Warm modern clinic with a doctor in the background', accent: '#a4494c', soft: '#f9eeec' },
  { label: 'Finance', symbol: 'C', business: 'Clearway', tag: 'FINANCE', title: 'Money moves.', subtitle: 'Know what happens next.', question: 'Where is my transfer?', assistant: 'Let me check that for you.', icon: '↗', answer: 'Transfer in progress', detail: 'Latest status is available', human: 'Sam · Clearway', message: 'I have your transfer details. Let’s take a look.', image: 'Phone and banking card on a warm desk', accent: '#175c43', soft: '#edf6f0' },
  { label: 'Retail', symbol: 'M', business: 'Morrow Goods', tag: 'RETAIL', title: 'On its way.', subtitle: 'The good part is coming.', question: 'Where is my order?', assistant: 'I’ll look up your order.', icon: '▣', answer: 'Out for delivery', detail: 'Expected today · 4–6 PM', human: 'Jules · Morrow', message: 'I have your order here. I can help with delivery.', image: 'Parcel with folded clothes being prepared in a boutique', accent: '#9a5935', soft: '#faf2ea' },
];

const fields = { symbol: 'business-symbol', business: 'business-name', tag: 'scene-tag', title: 'scene-title', subtitle: 'scene-subtitle', question: 'customer-question', assistant: 'assistant-message', icon: 'answer-icon', answer: 'answer-title', detail: 'answer-detail', message: 'human-message' };
const template = document.getElementById('slide-template');
const track = document.getElementById('carousel-track');
const dots = [...document.querySelectorAll('.story-tab')];
const showcase = document.querySelector('.hero-showcase');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const slideOrder = [examples.length - 1, ...examples.map((_, index) => index), 0];
let current = 0;
let position = 1;
let moving = false;
let paused = false;

function createSlide(exampleIndex) {
  const example = examples[exampleIndex];
  const frame = template.content.firstElementChild.cloneNode(true);
  frame.setAttribute('aria-roledescription', 'slide');
  frame.setAttribute('aria-label', `${example.label} example`);
  for (const [key, id] of Object.entries(fields)) {
    const field = frame.querySelector(`#${id}`);
    field.textContent = example[key];
    field.removeAttribute('id');
  }
  const image = frame.querySelector('#scene-image');
  image.dataset.slide = String(exampleIndex);
  image.setAttribute('aria-label', example.image);
  image.removeAttribute('id');
  const appName = frame.querySelector('#app-name');
  appName.textContent = `${example.business} app`;
  appName.removeAttribute('id');
  frame.querySelector('.app-context-mark').textContent = example.symbol;
  frame.querySelector('#handoff-name').textContent = `${example.human.split(' · ')[0]} joined`;
  frame.querySelector('#handoff-name').removeAttribute('id');
  frame.style.setProperty('--app-accent', example.accent);
  frame.style.setProperty('--app-soft', example.soft);
  return frame;
}

slideOrder.forEach(index => track.append(createSlide(index)));
const frames = [...track.children];

function syncControls() {
  document.getElementById('slide-label').textContent = `${examples[current].label} example`;
  dots.forEach((dot, index) => {
    const active = index === current;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-selected', String(active));
    dot.tabIndex = active ? 0 : -1;
  });
  frames.forEach((frame, index) => frame.setAttribute('aria-hidden', String(index !== position)));
}

function place(animate) {
  track.style.transition = animate && !reduceMotion.matches ? 'transform 680ms cubic-bezier(.22, 1, .36, 1)' : 'none';
  track.style.transform = `translate3d(-${position * 100}%, 0, 0)`;
}

function move(direction) {
  if (moving) return;
  moving = !reduceMotion.matches;
  position += direction;
  current = (current + direction + examples.length) % examples.length;
  place(true);
  syncControls();
  if (reduceMotion.matches) finishMove();
}

function finishMove() {
  if (position === 0) position = examples.length;
  if (position === examples.length + 1) position = 1;
  place(false);
  syncControls();
  moving = false;
}

track.addEventListener('transitionend', event => {
  if (event.target === track && event.propertyName === 'transform') finishMove();
});
place(false);
syncControls();

dots.forEach(dot => dot.addEventListener('click', () => {
  const selected = Number(dot.dataset.slide);
  const forward = (selected - current + examples.length) % examples.length;
  if (!forward) return;
  const choices = [forward, forward - examples.length].filter(delta => position + delta >= 0 && position + delta <= examples.length + 1);
  choices.sort((a, b) => Math.abs(a) - Math.abs(b));
  move(choices[0]);
}));
document.querySelector('.story-tabs').addEventListener('keydown', event => {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  move(event.key === 'ArrowRight' ? 1 : -1);
  dots[current].focus();
});

showcase.addEventListener('mouseenter', () => { paused = true; });
showcase.addEventListener('mouseleave', () => { paused = false; });
showcase.addEventListener('focusin', () => { paused = true; });
showcase.addEventListener('focusout', event => { if (!showcase.contains(event.relatedTarget)) paused = false; });
let touchStartX = null;
const viewport = document.querySelector('.carousel-viewport');
viewport.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
viewport.addEventListener('touchend', event => {
  if (touchStartX === null) return;
  const distance = event.changedTouches[0].clientX - touchStartX;
  touchStartX = null;
  if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
}, { passive: true });
window.setInterval(() => { if (!paused && !moving && !document.hidden && !reduceMotion.matches) move(1); }, 7000);
