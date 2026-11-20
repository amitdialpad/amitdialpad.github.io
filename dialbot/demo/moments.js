(() => {
  const list = document.getElementById('moment-list');
  const listStatus = document.getElementById('moment-list-status');
  const viewer = document.getElementById('moment-viewer');
  const video = document.getElementById('moment-video');
  const idle = document.getElementById('moment-idle');
  const number = document.getElementById('active-number');
  const title = document.getElementById('active-title');
  const summary = document.getElementById('active-summary');
  const points = document.getElementById('active-points');
  const error = document.getElementById('moment-error');
  if (!list || !listStatus || !viewer || !video || !idle || !number || !title || !summary || !points || !error) return;

  let selection = 0;

  const select = async (chapter) => {
    video.pause();
    video.removeAttribute('src');
    video.querySelectorAll('track').forEach((track) => track.remove());
    error.hidden = true;
    selection = chapter.number;
    const label = String(chapter.number).padStart(2, '0');
    number.textContent = `Moment ${label} of 16`;
    title.textContent = chapter.title;
    summary.textContent = chapter.takeaway;
    points.replaceChildren();
    (chapter.points || []).forEach((point) => {
      const item = document.createElement('li');
      item.textContent = point;
      points.append(item);
    });
    points.hidden = !points.childElementCount;
    list.querySelectorAll('button').forEach((button) => {
      const active = Number(button.dataset.moment) === selection;
      button.classList.toggle('is-current', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });

    video.setAttribute('aria-label', `Moment ${label}: ${chapter.title}`);
    video.poster = chapter.media.poster || '';
    const track = document.createElement('track');
    track.kind = 'captions';
    track.label = 'English';
    track.srclang = 'en';
    track.src = chapter.media.captions;
    video.append(track);
    video.src = chapter.media.film;
    video.hidden = false;
    idle.hidden = true;
    video.load();
    try {
      await video.play();
    } catch {
      error.textContent = 'Press Play in the video to start this clip.';
      error.hidden = false;
    }
    if (window.matchMedia('(max-width: 760px)').matches) {
      viewer.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const init = async () => {
    try {
      const response = await fetch('./film-timeline.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Timeline unavailable');
      const data = await response.json();
      if (!Array.isArray(data.chapters) || data.chapters.length !== 16 || data.chapters.some((chapter, index) =>
        chapter.number !== index + 1 || !chapter.media?.film || !chapter.media?.captions)) {
        throw new Error('Timeline incomplete');
      }
      data.chapters.forEach((chapter) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.moment = String(chapter.number);
        button.setAttribute('aria-label', `Play moment ${chapter.number}: ${chapter.title}`);
        const badge = document.createElement('span');
        badge.className = 'moment-number';
        badge.textContent = String(chapter.number).padStart(2, '0');
        const name = document.createElement('span');
        name.className = 'moment-name';
        name.textContent = chapter.title;
        button.append(badge, name);
        button.addEventListener('click', () => select(chapter));
        item.append(button);
        list.append(item);
      });
      list.hidden = false;
      listStatus.hidden = true;
    } catch {
      listStatus.textContent = 'The moments could not load. Reload this page.';
    }
  };

  video.addEventListener('error', () => {
    if (!selection) return;
    error.textContent = 'This clip could not load. Choose another moment.';
    error.hidden = false;
  });

  init();
})();
