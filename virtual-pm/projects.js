const projectChoice = document.getElementById('project-choice');
const searchField = document.getElementById('task-search');
const ownerFilter = document.getElementById('owner-filter');
const stateFilter = document.getElementById('state-filter');
const taskList = document.getElementById('public-task-list');
const refreshButton = document.getElementById('refresh-snapshot');
let publicSnapshot = null;
let activeProject = null;
let refreshInFlight = false;

function makeElement(tag, className, textValue) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textValue !== undefined) node.textContent = textValue;
  return node;
}

function snapshotDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'date unavailable';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
  }).format(date) + ' UTC';
}

function projectIdFromUrl() {
  const requested = new URLSearchParams(window.location.search).get('project');
  return requested === 'workloop' ? 'workloop' : 'dialbot';
}

function ownerNames(tasks) {
  const known = ['Amit', 'Jimut', 'Yacine', 'Vishal', 'Joshua'];
  return known.filter((name) => tasks.some((task) => task.owner.includes(name)));
}

function validPublicSnapshot(snapshot) {
  return snapshot?.schemaVersion === 1
    && !Number.isNaN(new Date(snapshot.generatedAt).getTime())
    && Array.isArray(snapshot.projects)
    && snapshot.projects.length === 2
    && snapshot.projects.every((project) =>
      ['dialbot', 'workloop'].includes(project.id)
      && typeof project.name === 'string'
      && typeof project.summary === 'string'
      && Number.isInteger(project.counts?.total)
      && Array.isArray(project.tasks)
      && project.tasks.length === project.counts.total
      && project.tasks.every((task) =>
        ['title', 'owner', 'state', 'focus'].every((field) => typeof task[field] === 'string')));
}

function stateLabel(state) {
  return { working: 'Working', open: 'Open', ready: 'Ready for test', blocked: 'Blocked', done: 'Done' }[state] || state;
}

function renderTaskList() {
  if (!activeProject) return;
  const query = searchField.value.trim().toLocaleLowerCase();
  const owner = ownerFilter.value;
  const state = stateFilter.value;
  const rows = activeProject.tasks.map((task, index) => ({ task, index })).filter(({ task }) => {
    if (owner && !task.owner.includes(owner)) return false;
    if (state && task.state !== state) return false;
    if (!query) return true;
    return [task.title, task.owner, stateLabel(task.state), task.focus].some((value) => value.toLocaleLowerCase().includes(query));
  });

  taskList.replaceChildren();
  document.getElementById('task-visible-count').textContent = `${rows.length} of ${activeProject.counts.total} tasks shown`;
  if (!rows.length) {
    taskList.append(makeElement('p', 'project-empty', 'No tasks match those filters.'));
    return;
  }

  for (const { task, index } of rows) {
    const row = makeElement('article', 'public-task-row');
    row.append(makeElement('span', 'public-task-number', String(index + 1).padStart(2, '0')));
    const main = makeElement('div', 'public-task-main');
    main.append(makeElement('h3', '', task.title));
    const proof = makeElement('p');
    proof.append(makeElement('strong', '', task.state === 'done' ? 'Work covered: ' : 'Current focus: '), document.createTextNode(task.focus));
    main.append(proof);
    row.append(main, makeElement('span', 'public-task-owner', task.owner));
    const stateClass = task.state === 'ready' ? 'state-ready'
      : task.state === 'done' ? 'state-done'
      : task.state === 'blocked' ? 'state-blocked' : '';
    row.append(makeElement('span', `public-task-state ${stateClass}`, stateLabel(task.state)));
    taskList.append(row);
  }
}

function renderQa(project) {
  const panel = document.getElementById('project-qa');
  panel.replaceChildren();
  const qa = project.qa;
  if (!qa?.available) {
    panel.append(makeElement('h3', 'project-qa-head', 'No linked project QA run yet.'));
    panel.append(makeElement('p', '', 'The project plan is real; this public snapshot does not yet have a project-specific QA report to show.'));
    return;
  }
  panel.append(makeElement('h3', 'project-qa-head', 'Latest mapped QA check summary'));
  if (qa.generatedAt) panel.append(makeElement('p', 'project-qa-date', `Report generated ${snapshotDate(qa.generatedAt)}.`));
  const totals = makeElement('div', 'project-qa-totals');
  for (const [number, label] of [[qa.passed, 'Passed'], [qa.failed, 'Failed'], [qa.notRun, 'Not run']]) {
    const item = makeElement('div', 'project-qa-total');
    item.append(makeElement('strong', '', String(number)), makeElement('span', '', label));
    totals.append(item);
  }
  panel.append(totals, makeElement('p', '', 'Automated checks show code evidence. Live experience and product acceptance remain separate.'));
}

function renderProject(id, resetFilters = true) {
  const previous = resetFilters ? null : { search: searchField.value, owner: ownerFilter.value, state: stateFilter.value };
  const project = publicSnapshot?.projects.find((item) => item.id === id) || publicSnapshot?.projects[0];
  if (!project) throw new Error('No public project found');
  activeProject = project;
  projectChoice.value = project.id;
  document.title = `${project.name} work — Workloop`;
  document.getElementById('project-title').textContent = `${project.name} work`;
  document.getElementById('project-summary').textContent = project.summary;
  const publishedAt = new Date(publicSnapshot.generatedAt);
  const stale = !Number.isNaN(publishedAt.getTime()) && Date.now() - publishedAt.getTime() > 24 * 60 * 60 * 1000;
  document.getElementById('project-snapshot-meta').textContent = `Selected real project fields · Last published ${snapshotDate(publicSnapshot.generatedAt)} · Read-only${stale ? ' · This snapshot may be out of date' : ''}`;

  const stats = document.getElementById('project-stats');
  stats.replaceChildren();
  for (const [count, label] of [
    [project.counts.total, 'tasks'], [project.counts.working, 'working'],
    [project.counts.open, 'open'], [project.counts.ready, 'ready'],
    [project.counts.blocked, 'blocked'], [project.counts.done, 'done'],
  ]) {
    if (!count && label !== 'tasks') continue;
    const item = makeElement('span', 'project-stat');
    item.append(makeElement('strong', '', String(count)), document.createTextNode(` ${label}`));
    stats.append(item);
  }

  ownerFilter.replaceChildren(new Option('All owners', ''));
  for (const name of ownerNames(project.tasks)) ownerFilter.add(new Option(name, name));
  stateFilter.replaceChildren(new Option('All states', ''));
  for (const state of [...new Set(project.tasks.map((task) => task.state))]) stateFilter.add(new Option(stateLabel(state), state));
  searchField.value = previous?.search || '';
  if (previous?.owner && [...ownerFilter.options].some((item) => item.value === previous.owner)) ownerFilter.value = previous.owner;
  if (previous?.state && [...stateFilter.options].some((item) => item.value === previous.state)) stateFilter.value = previous.state;
  renderTaskList();
  renderQa(project);
}

for (const control of [searchField, ownerFilter, stateFilter]) {
  control.addEventListener(control === searchField ? 'input' : 'change', renderTaskList);
}
projectChoice.addEventListener('change', () => {
  const id = projectChoice.value;
  history.replaceState(null, '', `${window.location.pathname}?project=${encodeURIComponent(id)}${window.location.hash}`);
  renderProject(id);
});
window.addEventListener('popstate', () => { if (publicSnapshot) renderProject(projectIdFromUrl()); });

async function refreshSnapshot() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  refreshButton.disabled = true;
  try {
    const response = await fetch('./public-projects.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Public snapshot unavailable');
    const snapshot = await response.json();
    if (!validPublicSnapshot(snapshot)) {
      throw new Error('Invalid public snapshot');
    }
    const selectedId = activeProject?.id || projectIdFromUrl();
    publicSnapshot = snapshot;
    renderProject(selectedId, !activeProject);
  } catch {
    if (publicSnapshot) {
      const meta = document.getElementById('project-snapshot-meta');
      if (!meta.textContent.includes('Could not refresh')) meta.textContent += ' · Could not refresh; showing last loaded snapshot';
      return;
    }
    document.getElementById('project-title').textContent = 'Project snapshot unavailable';
    document.getElementById('project-summary').textContent = 'Please try again later.';
    document.getElementById('project-snapshot-meta').textContent = 'No project data is being shown.';
    taskList.replaceChildren(makeElement('p', 'project-empty', 'The public project feed could not be loaded.'));
    document.getElementById('project-qa').replaceChildren(makeElement('p', 'project-empty', 'QA data is unavailable.'));
  } finally {
    refreshInFlight = false;
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener('click', refreshSnapshot);
refreshSnapshot();
setInterval(refreshSnapshot, 60 * 1000);
