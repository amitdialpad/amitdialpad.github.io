const film = document.getElementById('hero-film');
const stage = document.getElementById('film-stage');
if (film && stage) {
  film.addEventListener('loadedmetadata', () => {
    film.hidden = false;
    stage.classList.add('has-film');
  }, { once: true });
  film.addEventListener('error', () => {
    film.hidden = true;
    stage.classList.remove('has-film');
  });
  const source = film.dataset.src;
  fetch(source, { method: 'HEAD' }).then((response) => {
    if (!response.ok) return;
    film.src = source;
    film.load();
  }).catch(() => {});
}
