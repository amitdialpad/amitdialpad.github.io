(() => {
  const video = document.getElementById('chapter-film');
  const fallback = document.getElementById('chapter-media-pending');
  const mediaStatus = document.getElementById('chapter-media-status');
  const transport = document.getElementById('chapter-transport');
  const playToggle = document.getElementById('chapter-play-toggle');
  const scrub = document.getElementById('chapter-scrub');
  const timeReadout = document.getElementById('chapter-time-readout');
  const muteToggle = document.getElementById('chapter-mute-toggle');
  const posterPlay = document.getElementById('chapter-poster-play');
  const captionToggle = document.getElementById('chapter-captions-toggle');
  const currentLabel = document.getElementById('demo-current-label');
  const backToStory = document.getElementById('back-to-story');
  const chapterList = document.getElementById('chapter-list');
  const viewer = document.getElementById('chapter-viewer');
  if (!video || !fallback || !mediaStatus || !transport || !playToggle || !scrub ||
      !timeReadout || !muteToggle || !posterPlay || !captionToggle || !currentLabel ||
      !backToStory || !chapterList || !viewer) return;

  let story = null;
  let chapters = [];
  let mode = 'story';
  let lastStoryTime = 0;
  let mediaReady = false;
  let pendingSeek = 0;
  let requestedSeek = null;
  let captionsOn = false;
  let playbackFrameId = null;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '00:00';
    const total = Math.round(seconds);
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' +
      String(total % 60).padStart(2, '0');
  };

  const updateTransport = () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const position = requestedSeek ?? (Number.isFinite(video.currentTime) ? video.currentTime : 0);
    const ended = video.ended || (duration > 0 && position >= duration);
    const action = ended ? 'Replay' : video.paused ? 'Play' : 'Pause';
    playToggle.dataset.state = action.toLowerCase();
    playToggle.setAttribute('aria-label', action + ' film');
    playToggle.title = action + ' film';
    scrub.max = String(duration);
    scrub.value = String(Math.min(position, duration));
    scrub.style.setProperty('--chapter-progress', String(duration ? position / duration * 100 : 0) + '%');
    scrub.setAttribute('aria-valuetext', formatTime(position) + ' of ' + formatTime(duration));
    timeReadout.textContent = formatTime(position) + ' / ' + formatTime(duration);
    const muteAction = video.muted || video.volume === 0 ? 'Unmute' : 'Mute';
    muteToggle.dataset.muted = String(muteAction === 'Unmute');
    muteToggle.setAttribute('aria-label', muteAction + ' film');
    muteToggle.title = muteAction + ' film';
    posterPlay.hidden = !mediaReady || !video.paused || position > 0.1;
  };

  const play = () => {
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(updateTransport);
  };

  const togglePlayback = () => {
    if (!mediaReady) return;
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      play();
    } else video.pause();
  };

  const showFallback = (message, detail) => {
    mediaReady = false;
    video.hidden = true;
    transport.hidden = true;
    posterPlay.hidden = true;
    fallback.hidden = false;
    fallback.querySelector('strong').textContent = message;
    fallback.querySelector('span:last-child').textContent = detail;
    mediaStatus.textContent = message;
  };

  const loadVariant = (variant, startSeconds, startPlaying) => {
    video.pause();
    mediaReady = false;
    requestedSeek = null;
    pendingSeek = startSeconds || 0;
    video.hidden = false;
    transport.hidden = true;
    posterPlay.hidden = true;
    fallback.hidden = false;
    fallback.querySelector('strong').textContent = 'Loading the video.';
    fallback.querySelector('span:last-child').textContent = 'Please wait a moment.';
    mediaStatus.textContent = 'Loading video';
    video.querySelectorAll('track').forEach((track) => track.remove());
    captionToggle.disabled = !variant.captions;
    if (variant.captions) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.label = 'English';
      track.srclang = 'en';
      track.src = variant.captions;
      video.append(track);
      video.textTracks[0].mode = captionsOn ? 'showing' : 'disabled';
    }
    video.poster = variant.poster || story.poster;
    video.src = variant.film;
    video.load();
    if (startPlaying) play();
  };

  const selectChapter = (chapter) => {
    if (mode === 'story' && mediaReady) lastStoryTime = video.currentTime;
    mode = 'chapter';
    currentLabel.textContent = 'Chapter ' + String(chapter.number).padStart(2, '0') +
      ' · ' + chapter.title;
    backToStory.hidden = false;
    video.setAttribute('aria-label', 'Dial Bot demo chapter ' + chapter.number + ': ' + chapter.title);
    posterPlay.setAttribute('aria-label', 'Play chapter ' + chapter.number);
    posterPlay.lastElementChild.textContent = 'Play clip';
    chapterList.querySelectorAll('.chapter-button').forEach((button) => {
      const active = Number(button.dataset.chapter) === chapter.number;
      button.classList.toggle('is-current', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    loadVariant(chapter.media, 0, true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewer.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const returnToStory = () => {
    if (!story) return;
    mode = 'story';
    currentLabel.textContent = 'Short story · ' + formatTime(story.durationSeconds);
    backToStory.hidden = true;
    video.setAttribute('aria-label', 'Dial Bot short meeting story');
    posterPlay.setAttribute('aria-label', 'Play the Dial Bot demo');
    posterPlay.lastElementChild.textContent = 'Play demo';
    chapterList.querySelectorAll('.chapter-button').forEach((button) => {
      button.classList.remove('is-current');
      button.removeAttribute('aria-current');
    });
    loadVariant(story, lastStoryTime, true);
  };

  const buildChapters = () => {
    chapterList.replaceChildren();
    chapters.forEach((chapter) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const number = document.createElement('span');
      const title = document.createElement('span');
      button.type = 'button';
      button.className = 'chapter-button';
      button.dataset.chapter = String(chapter.number);
      button.setAttribute('aria-label', 'Play chapter ' + chapter.number + ': ' + chapter.title);
      number.className = 'chapter-number';
      number.textContent = String(chapter.number).padStart(2, '0');
      title.className = 'chapter-name';
      title.textContent = chapter.title;
      button.append(number, title);
      button.addEventListener('click', () => selectChapter(chapter));
      item.append(button);
      chapterList.append(item);
    });
    chapterList.hidden = false;
  };

  video.addEventListener('loadedmetadata', () => {
    mediaReady = true;
    video.hidden = false;
    transport.hidden = false;
    fallback.hidden = true;
    if (pendingSeek > 0) video.currentTime = Math.min(pendingSeek, Math.max(0, video.duration - 0.1));
    pendingSeek = 0;
    mediaStatus.textContent = (mode === 'story' ? 'Story' : 'Chapter clip') +
      ' ready, ' + formatTime(video.duration) + ' long';
    updateTransport();
  });
  video.addEventListener('error', () => {
    showFallback('This video could not load.', 'Choose another chapter or return to the story.');
  });
  video.addEventListener('timeupdate', () => {
    if (mode === 'story') lastStoryTime = video.currentTime;
    updateTransport();
  });
  const followPlayback = () => {
    updateTransport();
    playbackFrameId = video.paused || video.ended ? null : requestAnimationFrame(followPlayback);
  };
  video.addEventListener('play', () => {
    if (playbackFrameId === null) playbackFrameId = requestAnimationFrame(followPlayback);
    updateTransport();
  });
  for (const event of ['pause', 'ended', 'volumechange']) {
    video.addEventListener(event, () => {
      if (event !== 'volumechange' && playbackFrameId !== null) {
        cancelAnimationFrame(playbackFrameId);
        playbackFrameId = null;
      }
      updateTransport();
    });
  }
  video.addEventListener('seeked', () => {
    requestedSeek = null;
    if (mode === 'story') lastStoryTime = video.currentTime;
    updateTransport();
  });
  scrub.addEventListener('input', () => {
    if (!mediaReady) return;
    requestedSeek = Math.max(0, Math.min(video.duration, Number(scrub.value)));
    video.currentTime = requestedSeek;
    updateTransport();
  });
  playToggle.addEventListener('click', togglePlayback);
  posterPlay.addEventListener('click', togglePlayback);
  video.addEventListener('click', togglePlayback);
  video.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key.toLowerCase() === 'k') {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      video.currentTime = Math.max(0, Math.min(video.duration || 0,
        video.currentTime + (event.key === 'ArrowRight' ? 5 : -5)));
    } else if (event.key.toLowerCase() === 'm') {
      event.preventDefault();
      video.muted = !video.muted;
      updateTransport();
    }
  });
  muteToggle.addEventListener('click', () => {
    if (video.muted || video.volume === 0) {
      if (video.volume === 0) video.volume = 1;
      video.muted = false;
    } else video.muted = true;
    updateTransport();
  });
  captionToggle.addEventListener('click', () => {
    captionsOn = !captionsOn;
    const captions = video.textTracks[0];
    if (captions) captions.mode = captionsOn ? 'showing' : 'disabled';
    captionToggle.setAttribute('aria-pressed', String(captionsOn));
    captionToggle.setAttribute('aria-label', captionsOn ? 'Turn captions off' : 'Turn captions on');
    captionToggle.title = captionsOn ? 'Turn captions off' : 'Turn captions on';
  });
  backToStory.addEventListener('click', returnToStory);

  const initialize = async () => {
    try {
      const storyTimeline = './story-timeline.json';
      const [storyResponse, chapterResponse] = await Promise.all([
        fetch(storyTimeline, { cache: 'no-store' }),
        fetch('./film-timeline.json', { cache: 'no-store' })
      ]);
      if (!storyResponse.ok || !chapterResponse.ok) throw new Error('Timeline unavailable');
      story = await storyResponse.json();
      const chapterTimeline = await chapterResponse.json();
      if (!story.film || !story.captions || !Number.isFinite(story.durationSeconds) ||
          !Array.isArray(chapterTimeline.chapters) || chapterTimeline.chapters.length !== 16 ||
          chapterTimeline.chapters.some((chapter, index) =>
            chapter.number !== index + 1 || !chapter.media?.film || !chapter.media?.captions)) {
        throw new Error('Timeline incomplete');
      }
      chapters = chapterTimeline.chapters;
      buildChapters();
      currentLabel.textContent = 'Short story · ' + formatTime(story.durationSeconds);
      loadVariant(story, 0, false);
    } catch {
      showFallback('The demo is unavailable.', 'Please reload this local preview.');
    }
  };
  initialize();
})();
