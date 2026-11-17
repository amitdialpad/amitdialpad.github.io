const byId = (id) => document.getElementById(id);
const projectChoice = byId('project-choice');
const searchField = byId('task-search');
const stateFilter = byId('state-filter');
const taskList = byId('public-task-list');
const refreshButton = byId('refresh-snapshot');
let snapshot = null;
let activeProject = null;
let activeOwner = '';
let refreshing = false;
let activeView = ['work', 'decisions', 'activity', 'checks'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'work';

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = String(value);
  return node;
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'time unavailable';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric',
    minute: '2-digit', timeZone: 'UTC',
  }).format(date) + ' UTC';
}

function requestedProject() {
  return new URLSearchParams(location.search).get('project') === 'workloop' ? 'workloop' : 'dialbot';
}

function stateLabel(state) {
  return { working: 'Working', open: 'Open', ready: 'Ready for test', blocked: 'Blocked', done: 'Done' }[state] || state;
}

function validTask(task) {
  if (!['id', 'title', 'owner', 'state', 'focus'].every((key) => typeof task[key] === 'string')) return false;
  if (!task.detail) return true;
  if (typeof task.detail !== 'object' || Array.isArray(task.detail)) return false;
  const allowed = ['stateDetail', 'nextProof', 'blocker', 'evidence', 'codeActivity', 'reviewPending'];
  if (!Object.keys(task.detail).every((key) => allowed.includes(key))) return false;
  if (!allowed.filter((key) => key !== 'reviewPending').every((key) =>
    task.detail[key] === undefined || task.detail[key] === null || typeof task.detail[key] === 'string')) return false;
  return task.detail.reviewPending === undefined || (Array.isArray(task.detail.reviewPending)
    && task.detail.reviewPending.every((key) => typeof key === 'string'));
}

function validSnapshot(data) {
  return [1, 2].includes(data?.schemaVersion)
    && !Number.isNaN(new Date(data.generatedAt).getTime())
    && Array.isArray(data.projects)
    && data.projects.length === 2
    && data.projects.every((project) =>
      ['dialbot', 'workloop'].includes(project.id)
      && typeof project.name === 'string'
      && typeof project.summary === 'string'
      && Number.isInteger(project.counts?.total)
      && Array.isArray(project.tasks)
      && project.tasks.length === project.counts.total
      && project.tasks.every(validTask));
}

function namesFor(tasks) {
  const known = ['Amit', 'Jimut', 'Yacine', 'Vishal', 'Joshua'];
  return known.filter((name) => tasks.some((task) => task.owner.includes(name)));
}

function renderOwners() {
  const holder = byId('owner-chips');
  holder.replaceChildren();
  const names = namesFor(activeProject.tasks);
  const options = [['', 'All owners', activeProject.tasks.length],
    ...names.map((name) => [name, name, activeProject.tasks.filter((task) => task.owner.includes(name)).length])];
  for (const [name, label, count] of options) {
    const button = element('button', 'owner-chip', `${label} · ${count}`);
    button.type = 'button';
    button.dataset.owner = name;
    button.setAttribute('aria-pressed', String(activeOwner === name));
    button.addEventListener('click', () => {
      activeOwner = name;
      renderOwners();
      renderTasks();
    });
    holder.append(button);
  }
}

function detailRow(label, value) {
  const row = element('div');
  row.append(element('dt', '', label), element('dd', '', value));
  return row;
}

function renderTasks() {
  if (!activeProject) return;
  const query = searchField.value.trim().toLowerCase();
  const state = stateFilter.value;
  const opened = new Set([...taskList.querySelectorAll('details[open]')].map((node) => node.dataset.taskId));
  const focusedTaskId = document.activeElement?.closest?.('details')?.dataset.taskId;
  const shown = activeProject.tasks.map((task, index) => ({ task, index })).filter(({ task }) => {
    if (activeOwner && !task.owner.includes(activeOwner)) return false;
    if (state && task.state !== state) return false;
    if (!query) return true;
    const detailText = Object.values(task.detail || {}).join(' ');
    return [task.title, task.owner, stateLabel(task.state), task.focus, detailText]
      .some((value) => value.toLowerCase().includes(query));
  });
  byId('task-visible-count').textContent = `${activeProject.tasks.length} ${activeProject.name.toUpperCase()} TASKS · ${shown.length} VISIBLE`;
  taskList.replaceChildren();
  if (!shown.length) {
    taskList.append(element('p', 'project-empty', 'No work item matches those filters in this project.'));
    return;
  }
  for (const { task, index } of shown) {
    const card = element('details', 'task-card');
    card.dataset.taskId = task.id;
    card.open = opened.has(task.id);
    const summary = element('summary');
    const identity = element('span', 'task-identity');
    identity.append(element('strong', 'task-title', task.title), element('small', 'task-owner', task.owner));
    const previewText = task.state === 'blocked' && task.detail?.blocker
      ? task.detail.blocker : task.detail?.nextProof || task.focus;
    const preview = element('small', 'task-preview');
    preview.append(element('b', '', task.state === 'blocked' ? 'Blocker: ' : task.detail?.nextProof ? 'Next proof: ' : 'Current focus: '));
    preview.append(document.createTextNode(previewText));
    identity.append(preview);
    const stateTag = element('span', `state-tag state-${task.state}`, stateLabel(task.state));
    summary.append(element('span', 'task-index', String(index + 1).padStart(2, '0')), identity, stateTag);
    const details = element('dl', 'task-detail');
    details.append(detailRow('State', task.detail?.stateDetail || stateLabel(task.state)));
    const fields = [
      ['Next proof', task.detail?.nextProof],
      ['Blocker', task.detail?.blocker],
      ['Evidence', task.detail?.evidence],
      ['Automatic activity', task.detail?.codeActivity],
    ];
    for (const [label, value] of fields) if (value) details.append(detailRow(label, value));
    if (!task.detail?.nextProof) details.append(detailRow('Current focus', task.focus));
    if (!task.detail) details.append(detailRow('More detail', 'Task detail is being added to this public view.'));
    if (task.detail?.reviewPending?.length) details.append(detailRow('Detail update', 'The latest task detail is being reviewed for this public view.'));
    card.append(summary, details);
    taskList.append(card);
  }
  if (focusedTaskId) {
    const focusedCard = [...taskList.querySelectorAll('details')].find((card) => card.dataset.taskId === focusedTaskId);
    focusedCard?.querySelector('summary')?.focus({ preventScroll: true });
  }
}

function renderTextEntries(holder, items, emptyText, kind) {
  holder.replaceChildren();
  if (!Array.isArray(items) || !items.length) {
    holder.append(element('p', 'project-empty', emptyText));
    return;
  }
  for (const item of items) {
    const row = element('article', kind);
    if (item.title) row.append(element('strong', '', item.title));
    row.append(element('p', '', item.reviewPending
      ? 'The latest decision detail is being reviewed for this public view.'
      : item.detail || item.text || ''));
    holder.append(row);
  }
}

function renderDecisions() {
  renderTextEntries(byId('decision-list'), activeProject.decisions,
    'No separate project decision is published yet.', 'decision-item');
  renderTextEntries(byId('recent-decisions'), activeProject.recentDecisions,
    'No new discussion decision is published yet.', 'recent-item');
}

function renderActivity() {
  renderTextEntries(byId('activity-list'), activeProject.activity,
    'No code activity is confidently mapped to this project in the latest update.', 'activity-entry');
}

function renderQa() {
  const holder = byId('project-qa');
  holder.replaceChildren();
  const qa = activeProject.qa;
  if (!qa?.available) {
    holder.append(element('h3', 'qa-head', 'No linked project QA run yet.'));
    holder.append(element('p', 'project-empty', 'This does not imply that the project has passed or failed QA.'));
    return;
  }
  const head = element('div', 'qa-heading');
  head.append(element('h3', 'qa-head', 'Latest mapped QA checks'));
  head.append(element('span', 'qa-date', `Generated ${dateLabel(qa.generatedAt)}`));
  holder.append(head);
  const totals = element('div', 'qa-totals');
  for (const [count, label, className] of [[qa.passed, 'Pass', 'pass'], [qa.failed, 'Fail', 'fail'], [qa.notRun, 'Not run', 'not-run']]) {
    const item = element('span', `qa-total ${className}`, `${count} ${label}`);
    totals.append(item);
  }
  holder.append(totals);
  if (Array.isArray(qa.scenarios) && qa.scenarios.length) {
    const list = element('div', 'qa-scenarios');
    qa.scenarios.forEach((scenario, index) => {
      const row = element('div', 'qa-scenario');
      const body = element('span', 'qa-scenario-body');
      body.append(element('strong', '', scenario.title));
      const description = [scenario.owner ? `Area owner: ${scenario.owner}` : '', scenario.detail || '']
        .filter(Boolean).join(' · ');
      if (description) body.append(element('small', '', description));
      const status = scenario.status === 'pass' ? 'Pass' : scenario.status === 'fail' ? 'Fail' : 'Not run';
      row.append(element('span', 'qa-number', String(index + 1).padStart(2, '0')),
        body, element('span', `qa-status ${scenario.status}`, status));
      list.append(row);
    });
    holder.append(list);
  }
  holder.append(element('p', 'qa-foot', 'Automated checks are code evidence. Live experience and product acceptance remain separate.'));
}

function showView(view) {
  activeView = view;
  for (const name of ['work', 'decisions', 'activity', 'checks']) byId(name).hidden = name !== view;
  for (const link of document.querySelectorAll('[data-view]')) {
    if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function renderProject(id, resetFilters = true) {
  const project = snapshot?.projects.find((item) => item.id === id) || snapshot?.projects[0];
  if (!project) throw new Error('No project found');
  activeProject = project;
  projectChoice.value = project.id;
  document.title = `${project.name} work — Workloop`;
  byId('project-title').textContent = `${project.name} work`;
  byId('project-summary').textContent = project.id === 'dialbot'
    ? 'Meeting experience · Owners, next proof, and open issues'
    : 'Plan and QA checks · Owners, next proof, and open issues';
  byId('project-sheet-name').textContent = `${project.name.toUpperCase()} / SHARED PLAN`;
  const last = new Date(snapshot.generatedAt);
  const stale = !Number.isNaN(last.getTime()) && Date.now() - last.getTime() > 24 * 60 * 60 * 1000;
  byId('project-snapshot-meta').textContent = `PUBLIC PROJECT · UPDATED ${dateLabel(snapshot.generatedAt)} · AUTO-REFRESHES EVERY MINUTE${stale ? ' · THIS UPDATE MAY BE OLD' : ''}`;
  const stats = byId('project-stats');
  stats.replaceChildren();
  for (const [count, label] of [
    [project.counts.working, 'Working'], [project.counts.open, 'Open'],
    [project.counts.ready, 'Ready'], [project.counts.blocked, 'Blocked'],
    [project.counts.done, 'Done'],
  ]) if (count) stats.append(element('span', 'project-stat', `${count} ${label}`));
  const previousState = resetFilters ? '' : stateFilter.value;
  stateFilter.replaceChildren(new Option('All states', ''));
  for (const state of [...new Set(project.tasks.map((task) => task.state))]) stateFilter.add(new Option(stateLabel(state), state));
  if (resetFilters) {
    activeOwner = '';
    searchField.value = '';
    stateFilter.value = '';
  } else if (activeOwner && !namesFor(project.tasks).includes(activeOwner)) {
    activeOwner = '';
  }
  if (previousState && [...stateFilter.options].some((option) => option.value === previousState)) stateFilter.value = previousState;
  renderOwners();
  renderTasks();
  renderDecisions();
  renderActivity();
  renderQa();
  showView(activeView);
}

for (const control of [searchField, stateFilter]) {
  control.addEventListener(control === searchField ? 'input' : 'change', renderTasks);
}
for (const link of document.querySelectorAll('[data-view]')) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const view = link.dataset.view;
    const url = new URL(location.href);
    url.hash = view;
    history.pushState(null, '', url);
    showView(view);
  });
}
projectChoice.addEventListener('change', () => {
  const id = projectChoice.value;
  activeView = 'work';
  const url = new URL(location.href);
  url.searchParams.set('project', id);
  url.hash = '';
  history.pushState(null, '', url);
  renderProject(id);
});
window.addEventListener('popstate', () => {
  activeView = ['work', 'decisions', 'activity', 'checks'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'work';
  if (snapshot) renderProject(requestedProject());
});

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  refreshButton.disabled = true;
  try {
    const response = await fetch('./public-projects.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Project feed unavailable');
    const next = await response.json();
    if (!validSnapshot(next)) throw new Error('Invalid project feed');
    if (snapshot && next.generatedAt === snapshot.generatedAt) {
      byId('project-snapshot-meta').textContent =
        byId('project-snapshot-meta').textContent.replace(' · COULD NOT REFRESH; SHOWING LAST LOADED UPDATE', '');
      return;
    }
    const selected = activeProject?.id || requestedProject();
    const firstLoad = !snapshot;
    snapshot = next;
    renderProject(selected, firstLoad);
  } catch {
    const meta = byId('project-snapshot-meta');
    if (snapshot && !meta.textContent.includes('COULD NOT REFRESH')) {
      meta.textContent += ' · COULD NOT REFRESH; SHOWING LAST LOADED UPDATE';
    }
    else {
      byId('project-title').textContent = 'Project data unavailable';
      byId('project-summary').textContent = 'Refresh to try again.';
      meta.textContent = 'THE PUBLIC PROJECT FEED COULD NOT BE LOADED';
      taskList.replaceChildren(element('p', 'project-empty', 'No project data is being shown.'));
    }
  } finally {
    refreshing = false;
    refreshButton.disabled = false;
  }
}
refreshButton.addEventListener('click', refresh);
refresh();
setInterval(refresh, 60 * 1000);
