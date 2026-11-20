const film = document.getElementById('real-film');
const playButton = document.getElementById('film-play');

if (film && playButton) {
  const syncPlayButton = () => {
    const playing = !film.paused && !film.ended;
    if (playing && document.activeElement === playButton) film.focus({ preventScroll: true });
    playButton.hidden = playing;
  };

  playButton.addEventListener('click', () => {
    const playback = film.play();
    if (playback && typeof playback.catch === 'function') playback.catch(syncPlayButton);
  });
  for (const event of ['play', 'playing', 'pause', 'ended', 'emptied']) {
    film.addEventListener(event, syncPlayButton);
  }
  syncPlayButton();
}
