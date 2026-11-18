const film = document.getElementById('hero-film');
const stage = document.getElementById('film-stage');
const playButton = document.getElementById('film-play');
if (film && stage) {
  film.addEventListener('loadedmetadata', () => {
    film.hidden = false;
    stage.classList.add('has-film');
    if (playButton && film.paused && !film.error) playButton.hidden = false;
  }, { once: true });
  film.addEventListener('error', () => {
    film.hidden = true;
    stage.classList.remove('has-film');
    if (playButton) playButton.hidden = true;
  });
  if (playButton) {
    playButton.addEventListener('click', () => {
      const playback = film.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => {
        playButton.classList.remove('is-dismissed');
        playButton.hidden = false;
      });
    });
    film.addEventListener('playing', () => {
      if (document.activeElement === playButton) film.focus({ preventScroll: true });
      playButton.classList.add('is-dismissed');
      playButton.tabIndex = -1;
      window.setTimeout(() => { playButton.hidden = true; }, 220);
    }, { once: true });
  }
  const source = film.dataset.src;
  fetch(source, { method: 'HEAD' }).then((response) => {
    if (!response.ok) return;
    film.src = source;
    film.load();
  }).catch(() => {});
}
