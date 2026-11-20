const chapterList = document.getElementById('chapter-feature-list');

if (chapterList) {
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const stopMedia = item => item.querySelectorAll('video').forEach(video => video.pause());

  async function loadChapters() {
    try {
      const response = await fetch('./assets/chapters/manifest.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Chapter manifest returned ' + response.status);
      const data = await response.json();
      const chapters = data.chapters;
      if (!Array.isArray(chapters) || chapters.length !== 16 ||
          chapters.some((chapter, index) => chapter.number !== index + 1)) {
        throw new Error('Expected sixteen ordered chapters');
      }

      chapters.forEach((chapter, index) => {
        const number = String(chapter.number).padStart(2, '0');
        const details = make('details', 'feature-item chapter-item');
        details.dataset.chapter = index;
        details.open = index === 0;

        const summary = make('summary');
        summary.append(make('span', 'feature-index', number));
        summary.append(make('strong', '', chapter.title + '.'));
        const preview = make('span', 'feature-preview', (chapter.cues || []).join(' · '));
        if (chapter.reviewStatus === 'planned-visualization') {
          preview.append(make('span', 'chapter-status', ' Planned'));
        }
        summary.append(preview, make('span', 'feature-mark'));
        summary.lastElementChild.setAttribute('aria-hidden', 'true');
        details.append(summary);

        const detail = make('div', 'feature-detail chapter-detail');
        const grid = make('div', 'chapter-detail-grid');
        const media = make('div', 'chapter-media');
        const video = make('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'none';
        video.poster = chapter.poster;
        video.setAttribute('aria-label', 'Chapter ' + number + ': ' + chapter.title);
        const source = make('source');
        source.src = chapter.video;
        source.type = 'video/mp4';
        const track = make('track');
        track.kind = 'captions';
        track.src = chapter.captions;
        track.srclang = 'en';
        track.label = 'English';
        video.append(source, track);
        video.append('Your browser does not support video playback.');

        const button = make('button', 'chapter-media-play');
        button.type = 'button';
        button.setAttribute('aria-label', 'Play chapter ' + number + ': ' + chapter.title);
        button.append(make('span', '', '▶'));
        button.firstElementChild.setAttribute('aria-hidden', 'true');
        const error = make('span', 'chapter-media-error');
        error.setAttribute('role', 'status');
        error.hidden = true;
        media.append(video, button, error);

        const copy = make('div', 'chapter-detail-copy');
        const cues = (chapter.cues || []).join(' · ');
        copy.append(make('span', 'chapter-detail-kicker', 'Chapter ' + number + (cues ? ' · ' + cues : '')));
        copy.append(make('p', '', chapter.description));
        grid.append(media, copy);
        detail.append(grid);
        details.append(detail);
        chapterList.append(details);

        const setPlaying = playing => {
          button.classList.toggle('is-playing', playing);
          button.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' chapter ' + number + ': ' + chapter.title);
          button.firstElementChild.textContent = playing ? 'Ⅱ' : '▶';
        };
        video.addEventListener('play', () => setPlaying(true));
        video.addEventListener('pause', () => setPlaying(false));
        video.addEventListener('ended', () => setPlaying(false));
        video.addEventListener('error', () => {
          error.textContent = 'This chapter video could not be loaded.';
          error.hidden = false;
        });
        button.addEventListener('click', async () => {
          if (!video.paused) { video.pause(); return; }
          try { await video.play(); }
          catch (_) {
            error.textContent = 'This chapter video could not be played.';
            error.hidden = false;
          }
        });
        summary.addEventListener('click', event => {
          event.preventDefault();
          if (details.open) {
            details.open = false;
            stopMedia(details);
            return;
          }
          chapterList.querySelectorAll('.chapter-item').forEach(other => {
            if (other !== details) { other.open = false; stopMedia(other); }
          });
          details.open = true;
        });
      });
    } catch (error) {
      console.error('Chapter videos unavailable:', error);
      chapterList.replaceChildren(make('p', 'chapter-load-error', 'The chapter videos are unavailable right now.'));
      chapterList.firstElementChild.setAttribute('role', 'status');
    }
  }

  loadChapters();
}
