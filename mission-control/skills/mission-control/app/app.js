const ui = { payload: null, sessionId: null, day: 'today', query: '', selectedId: null, limit: 35, loading: false, initialized: false, optionsSignature: '' };
const $ = (id) => document.getElementById(id);
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const dateParts = (date) => new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone }).formatToParts(date);
const dayKey = (iso) => { if (!iso) return ''; const parts = dateParts(new Date(iso)); const get = (type) => parts.find(x => x.type === type)?.value || ''; return `${get('year')}-${get('month')}-${get('day')}`; };
const todayKey = () => dayKey(new Date().toISOString());
const dayLabel = (iso) => iso ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: zone }).format(new Date(iso)) : 'Unknown day';
const timeLabel = (iso) => iso ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date(iso)) : '—';
const stateText = { working: 'Working', finished: 'Completed', waiting: 'No handoff yet', blocked: 'Blocked', interrupted: 'Interrupted', failed: 'Failed', unconfirmed: 'Unconfirmed' };
function node(tag, className, text) { const result = document.createElement(tag); if (className) result.className = className; if (text !== undefined) result.textContent = text; return result; }
function session() { return ui.payload?.sessions.find(x => x.id === ui.sessionId); }
function allAgents() { return ui.payload?.agents.filter(x => x.sessionId === ui.sessionId) || []; }
function dayAgents() { const agents = allAgents(); return ui.day === 'today' ? agents.filter(x => dayKey(x.updatedAt) === todayKey()) : agents; }
function visibleAgents() { const query = ui.query.toLowerCase(); return dayAgents().filter(x => !query || [x.who, x.label, x.description, x.status].some(y => (y || '').toLowerCase().includes(query))); }
function isCurrent(s) { return s?.id === ui.payload?.sessions[0]?.id; }

function renderSessionOptions() {
  const options = ui.payload?.sessions || [];
  const signature = options.map(x => `${x.id}:${x.agentCount}:${dayKey(x.updatedAt)}`).join('|');
  const select = $('session-select');
  if (signature !== ui.optionsSignature) {
    select.replaceChildren();
    options.forEach((s) => {
      const option = node('option'); option.value = s.id;
      const day = dayKey(s.updatedAt) === todayKey() ? 'today' : dayLabel(s.updatedAt);
      option.textContent = isCurrent(s) ? `Current session · updated ${day}` : `History · ${day} ${timeLabel(s.updatedAt)}`;
      select.append(option);
    });
    ui.optionsSignature = signature;
  }
  select.value = ui.sessionId || '';
  $('day-select').value = ui.day;
}

function renderHead() {
  const s = session(); const agents = dayAgents();
  $('day-marker').textContent = ui.day === 'today' ? `LIVE · ${dayLabel(new Date().toISOString()).toUpperCase()}` : 'SESSION HISTORY · ALL DAYS';
  $('scope-line').textContent = s ? (ui.day === 'today'
    ? `${agents.length} agents updated today in the current session.`
    : `${allAgents().length} agent threads · Last activity ${dayLabel(s.updatedAt)}.`)
    : 'Select a session to see its agents.';
  $('last-checked').textContent = timeLabel(ui.payload?.generatedAt);
  $('roster-title').textContent = ui.day === 'today' ? 'Today’s agents' : 'Session history';
  $('roster-note').textContent = 'Select an agent to see its recorded activity.';
  const attention = ui.payload?.attentionAvailable && Array.isArray(ui.payload.needsYou) ? ui.payload.needsYou.filter(x => x.sessionId === ui.sessionId) : [];
  $('attention-banner').hidden = attention.length === 0;
  if (attention.length) {
    $('attention-title').textContent = `${attention.length} explicit request${attention.length === 1 ? '' : 's'} need your input`;
    $('attention-copy').textContent = 'Open the relevant agent row in Codex for the question.';
  }
}

function detailCell(agent, agentsById) {
  const td = node('td'); td.colSpan = 5;
  const grid = node('div', 'detail-grid');
  const parent = agentsById.get(agent.parentId);
  const facts = [
    ['Started', `${dayLabel(agent.startedAt)} · ${timeLabel(agent.startedAt)}`],
    ['Assigned by', parent ? parent.who : 'Main session'],
  ];
  facts.forEach(([label, value]) => { const item = node('div', 'detail-item'); item.append(node('span', '', label), node('strong', '', value)); grid.append(item); });
  td.append(grid);
  const note = node('p', 'detail-note'); note.textContent = 'The full task brief and response remain in Codex.';
  td.append(note); return td;
}
function renderTable() {
  const rows = $('agent-rows'), focusedId = document.activeElement?.dataset?.agentId;
  const agents = visibleAgents(); rows.replaceChildren();
  $('visible-count').textContent = `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'}`;
  if (!agents.length) {
    const row = node('tr', 'empty-row'), cell = node('td', '', ui.day === 'today' ? 'No agent activity today in this session. Choose All days to see earlier work.' : 'No agents match this view.');
    cell.colSpan = 5; row.append(cell); rows.append(row); $('load-more').hidden = true; return;
  }
  const byId = new Map(allAgents().map(x => [x.id, x])); let lastDay = '';
  for (const agent of agents.slice(0, ui.limit)) {
    const day = dayKey(agent.updatedAt);
    if (ui.day === 'all' && day !== lastDay) { const group = node('tr', 'day-row'), heading = node('th', '', dayLabel(agent.updatedAt)); heading.colSpan = 5; heading.scope = 'rowgroup'; group.append(heading); rows.append(group); lastDay = day; }
    const row = node('tr', 'agent-row' + (ui.selectedId === agent.id ? ' selected' : '')); row.dataset.agentId = agent.id;
    const who = node('td', 'who-cell'); who.dataset.label = 'Agent';
    const button = node('button', 'row-open'); button.type = 'button'; button.dataset.agentId = agent.id; button.setAttribute('aria-expanded', String(ui.selectedId === agent.id)); button.setAttribute('aria-label', `Details for ${agent.who}, ${agent.label}`);
    button.setAttribute('aria-controls', `agent-detail-${agent.id}`);
    button.append(node('span', 'who-name', agent.who), node('span', 'row-chevron', '⌄')); who.append(button);
    const assignment = node('td', 'assignment-cell', agent.label); assignment.dataset.label = 'Assignment';
    const description = node('td', 'description-cell'); description.dataset.label = 'About the work';
    if (agent.description) description.textContent = agent.description;
    else {
      description.classList.add('description-unavailable');
      description.append(node('span', 'sr-only', 'No local assignment summary recorded'), node('span', '', '—'));
    }
    const status = node('td', 'state-cell'); status.dataset.label = 'State'; status.append(node('span', `status-badge ${agent.status}`, stateText[agent.status] || 'Unconfirmed'));
    const latest = node('td', 'latest-cell'); latest.dataset.label = 'Updated';
    const updatedTime = node('time', 'latest-date', `${dayLabel(agent.updatedAt)} · ${timeLabel(agent.updatedAt)}`);
    if (agent.updatedAt) updatedTime.dateTime = agent.updatedAt;
    latest.append(updatedTime);
    row.append(who, assignment, description, status, latest);
    row.addEventListener('click', () => { ui.selectedId = ui.selectedId === agent.id ? null : agent.id; renderTable(); });
    rows.append(row);
    if (ui.selectedId === agent.id) { const detail = node('tr', 'expanded-row'); detail.id = `agent-detail-${agent.id}`; detail.append(detailCell(agent, byId)); rows.append(detail); }
  }
  $('load-more').hidden = agents.length <= ui.limit;
  if (focusedId) [...rows.querySelectorAll('.row-open')].find(x => x.dataset.agentId === focusedId)?.focus({ preventScroll: true });
}
function render() { renderSessionOptions(); renderHead(); renderTable(); }
async function refresh() {
  if (ui.loading) return; ui.loading = true; $('sync-state').textContent = 'Checking…';
  try {
    const response = await fetch('/api/state', { cache: 'no-store' }); if (!response.ok) throw new Error('Index unavailable');
    const payload = await response.json(); ui.payload = payload;
    if (!payload.sessions.some(x => x.id === ui.sessionId)) ui.sessionId = payload.sessions[0]?.id || null;
    if (!ui.initialized) { ui.day = payload.agents.some(x => x.sessionId === ui.sessionId && dayKey(x.updatedAt) === todayKey()) ? 'today' : 'all'; ui.initialized = true; }
    if (ui.selectedId && !payload.agents.some(x => x.id === ui.selectedId)) ui.selectedId = null;
    $('sync-state').textContent = 'Live · read-only'; render();
  } catch (_) { $('sync-state').textContent = 'Offline'; const rows = $('agent-rows'); rows.replaceChildren(); const row = node('tr', 'empty-row'), cell = node('td', 'error-banner', 'Codex local index is unavailable. Retrying automatically.'); cell.colSpan = 5; row.append(cell); rows.append(row); }
  finally { ui.loading = false; }
}
$('session-select').addEventListener('change', (event) => { ui.sessionId = event.target.value; ui.day = ui.payload.agents.some(x => x.sessionId === ui.sessionId && dayKey(x.updatedAt) === todayKey()) ? 'today' : 'all'; ui.selectedId = null; ui.query = ''; ui.limit = 35; $('agent-search').value = ''; render(); });
$('day-select').addEventListener('change', (event) => { ui.day = event.target.value; ui.selectedId = null; ui.limit = 35; render(); });
$('agent-search').addEventListener('input', (event) => { ui.query = event.target.value.trim(); ui.limit = 35; renderTable(); });
$('load-more').addEventListener('click', () => { ui.limit += 35; renderTable(); });
$('refresh-button').addEventListener('click', refresh);
refresh(); setInterval(refresh, 5000);
