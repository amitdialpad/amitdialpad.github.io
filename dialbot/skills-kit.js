// The Skills player uses the finished chapter cuts without changing the full Demo film.
(() => {
  const section = document.getElementById('skills');
  if (!section) return;

  const skills = [
    { chapter: '02', name: 'Answer a question' },
    { chapter: '05', name: 'Start a meeting timer' },
    { chapter: '07', name: 'Find the evidence' },
    { chapter: '08', name: 'Capture the decision' },
    { chapter: '09', name: 'Recap the room' },
    { chapter: '10', name: 'Catch up' },
    { chapter: '12', name: 'Share the meeting link' },
    { chapter: '13', name: 'Plan a follow-up' }
  ];
  const mediaRevision = '20261120-final-2';

  const controls = section.querySelector('.skills-controls');
  const buttons = [...controls.querySelectorAll('button[data-skill]')];
  const rowIcon = '<span class="skills-row-action" aria-hidden="true"><svg class="skills-row-play-icon" viewBox="0 0 16 16"><path d="m5 3.5 7 4.5-7 4.5Z" fill="currentColor"/></svg><svg class="skills-row-pause-icon" viewBox="0 0 16 16" hidden><rect x="4" y="3" width="2.5" height="10" rx=".6" fill="currentColor"/><rect x="9.5" y="3" width="2.5" height="10" rx=".6" fill="currentColor"/></svg></span>';
  buttons.forEach(button => button.insertAdjacentHTML('beforeend', rowIcon));
  const video = document.getElementById('skills-video');
  const stage = document.getElementById('skills-stage');
  const source = video.querySelector('source');
  const name = document.getElementById('skill-current-name');
  const titleWrap = document.getElementById('skills-active-heading');
  const soundButton = document.getElementById('skill-sound');
  const soundOnIcon = soundButton.querySelector('.skills-sound-on-icon');
  const soundOffIcon = soundButton.querySelector('.skills-sound-off-icon');
  const previous = document.getElementById('skill-prev');
  const next = document.getElementById('skill-next');
  const playStatus = document.getElementById('skill-play-status');
  const live = document.getElementById('skills-live');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = -1;
  let headlineIndex = 0;
  let playRequest = 0;
  let titleTimer = null;
  let inView = false;
  let viewingSession = false;
  let idleHold = false;
  let idleTimer = null;

  function syncPlaybackControl() {
    const playing = !video.paused && !video.ended;
    stage.classList.toggle('is-playing', playing);
    const labelIndex = idleHold && selected >= 0 ? selected : headlineIndex;
    stage.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${skills[labelIndex].name} video`);
    buttons.forEach((button, index) => {
      const active = index === selected;
      const action = active && playing ? 'Pause' : active && video.currentTime > 0 && !video.ended ? 'Resume' : 'Play';
      button.setAttribute('aria-label', `${action} ${skills[index].name} video`);
      button.querySelector('.skills-row-play-icon').toggleAttribute('hidden', active && playing);
      button.querySelector('.skills-row-pause-icon').toggleAttribute('hidden', !active || !playing);
    });
  }

  function syncSoundControl() {
    const on = !video.muted;
    soundOnIcon.toggleAttribute('hidden', !on);
    soundOffIcon.toggleAttribute('hidden', on);
    soundButton.setAttribute('aria-pressed', String(on));
    soundButton.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
  }

  function updateTitle(skill) {
    if (titleTimer !== null) clearTimeout(titleTimer);
    titleWrap.querySelector('.skills-title-old')?.remove();
    const oldName = name.textContent;
    name.classList.remove('is-entering');
    name.textContent = skill.name;
    name.setAttribute('aria-label', `Play ${skill.name}`);
    if (reducedMotion.matches || oldName === skill.name) return;
    const ghost = document.createElement('span');
    ghost.className = 'skills-title-old';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = oldName;
    titleWrap.append(ghost);
    void name.offsetWidth;
    name.classList.add('is-entering');
    titleTimer = setTimeout(() => {
      ghost.remove();
      name.classList.remove('is-entering');
      titleTimer = null;
    }, 250);
  }

  function stopIdleRotation() {
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = null;
  }

  function startIdleRotation() {
    stopIdleRotation();
    if (!inView || document.hidden || viewingSession || idleHold || reducedMotion.matches) return;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (!inView || document.hidden || viewingSession || idleHold) return;
      headlineIndex = (headlineIndex + 1) % skills.length;
      updateTitle(skills[headlineIndex]);
      syncPlaybackControl();
      startIdleRotation();
    }, 3600);
  }

  function playCurrent() {
    idleHold = true;
    stopIdleRotation();
    viewingSession = true;
    const request = ++playRequest;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        if (request !== playRequest) return;
        viewingSession = false;
        syncPlaybackControl();
        playStatus.hidden = false;
        live.textContent = `${skills[selected].name} is ready. Click the video to continue.`;
      });
    }
  }

  function selectSkill(index, { play = false, announce = false, bringPlayer = false } = {}) {
    if (index < 0 || index >= skills.length) return;
    idleHold = true;
    stopIdleRotation();
    selected = index;
    headlineIndex = index;
    ++playRequest;
    const skill = skills[index];
    const path = `./assets/chapters/chapter-${skill.chapter}`;

    video.pause();
    video.poster = `${path}-poster.jpg`;
    source.src = `${path}.mp4?v=${mediaRevision}`;
    video.load();

    updateTitle(skill);
    playStatus.textContent = 'Playback paused. Click the video to continue.';
    playStatus.hidden = true;

    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (announce) live.textContent = skill.name;
    syncPlaybackControl();
    if (play) playCurrent();
    if (bringPlayer && window.innerWidth <= 900) {
      section.querySelector('.skills-player-column').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
    }
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (index === selected) {
        idleHold = true;
        stopIdleRotation();
        headlineIndex = index;
        updateTitle(skills[index]);
        toggleStagePlayback();
      } else selectSkill(index, { play: true, announce: true, bringPlayer: true });
    });
  });
  name.addEventListener('click', () => {
    selectSkill(headlineIndex, { play: true, announce: true, bringPlayer: true });
  });
  function toggleStagePlayback() {
    if (!idleHold || selected < 0) {
      selectSkill(headlineIndex, { play: true, announce: true });
      return;
    }
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      playCurrent();
    } else {
      viewingSession = false;
      idleHold = true;
      video.pause();
    }
  }
  stage.addEventListener('click', toggleStagePlayback);
  stage.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleStagePlayback();
  });
  soundButton.addEventListener('click', () => {
    video.muted = !video.muted;
    syncSoundControl();
  });
  previous.addEventListener('click', () => {
    const base = idleHold && selected >= 0 ? selected : headlineIndex;
    selectSkill((base - 1 + skills.length) % skills.length, { play: true, announce: true });
  });
  next.addEventListener('click', () => {
    const base = idleHold && selected >= 0 ? selected : headlineIndex;
    selectSkill((base + 1) % skills.length, { play: true, announce: true });
  });

  controls.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!step && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const base = idleHold && selected >= 0 ? selected : headlineIndex;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? skills.length - 1 : (base + step + skills.length) % skills.length;
    selectSkill(index, { play: true, announce: true, bringPlayer: true });
    buttons[index].focus({ preventScroll: true });
  });

  video.addEventListener('ended', () => {
    const finished = selected;
    const currentSource = source.getAttribute('src');
    if (currentSource !== `./assets/chapters/chapter-${skills[finished].chapter}.mp4?v=${mediaRevision}`) return;
    if (!viewingSession || !inView || document.hidden || finished === skills.length - 1) {
      viewingSession = false;
      idleHold = false;
      syncPlaybackControl();
      startIdleRotation();
      return;
    }
    selectSkill((finished + 1) % skills.length, { play: true, announce: true });
  });
  video.addEventListener('play', () => { playStatus.hidden = true; syncPlaybackControl(); });
  video.addEventListener('pause', syncPlaybackControl);
  video.addEventListener('volumechange', syncSoundControl);
  video.addEventListener('error', () => {
    playStatus.textContent = 'This skill video could not load. Choose another skill.';
    playStatus.hidden = false;
    live.textContent = playStatus.textContent;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      viewingSession = false;
      idleHold = false;
      video.pause();
      stopIdleRotation();
    } else {
      startIdleRotation();
    }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) {
        viewingSession = false;
        idleHold = false;
        video.pause();
        stopIdleRotation();
      } else {
        startIdleRotation();
      }
    }, { threshold: 0 }).observe(section);
  } else inView = true;
  reducedMotion.addEventListener?.('change', startIdleRotation);
  syncPlaybackControl();
  syncSoundControl();
  startIdleRotation();
})();
