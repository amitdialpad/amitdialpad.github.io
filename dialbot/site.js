const film = document.getElementById('hero-film');
const stage = document.getElementById('film-stage');
const playButton = document.getElementById('film-play');
if (film && stage) {
  film.addEventListener('error', () => {
    film.hidden = true;
    stage.classList.add('has-error');
    if (playButton) playButton.hidden = true;
    const fallback = stage.querySelector('.film-placeholder');
    if (fallback) fallback.hidden = false;
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
}
