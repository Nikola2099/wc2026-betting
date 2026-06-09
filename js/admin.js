// ============================================================
// admin.js — admin panel logika
// ============================================================

let adminAuthenticated = false;
let allParticipants = [];
let allTips = [];
let matchResults = {}; // matchId → result
let activeGroup = 'all';

// ---- Login ----
document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('admin-pwd').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogin() {
  const pwd = document.getElementById('admin-pwd').value;
  if (pwd === ADMIN_PASSWORD) {
    adminAuthenticated = true;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    initAdmin();
  } else {
    const err = document.getElementById('login-error');
    err.textContent = 'Pogrešna lozinka.';
    err.style.display = 'block';
  }
}

document.getElementById('logout-link').addEventListener('click', e => {
  e.preventDefault();
  adminAuthenticated = false;
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('admin-pwd').value = '';
});

// ---- Panel navigation ----
document.querySelectorAll('.admin-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel-section').forEach(p => p.style.display = 'none');
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.panel}`).style.display = 'block';

    if (btn.dataset.panel === 'participants') loadParticipants();
    if (btn.dataset.panel === 'settings') loadSettings();
  });
});

// ---- Init ----
async function initAdmin() {
  await loadMatchResults();
  renderResultsPanel();
}

async function loadMatchResults() {
  const { data } = await supabase.from('matches').select('id, result');
  if (data) {
    for (const m of data) matchResults[m.id] = m.result;
  }
}

// ---- Rezultati panel ----
function renderResultsPanel() {
  // Group filter buttons
  const filter = document.getElementById('group-filter');
  for (const g of GROUPS) {
    const btn = document.createElement('button');
    btn.className = 'group-filter-btn';
    btn.dataset.group = g;
    btn.textContent = g;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.group-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGroup = g;
      renderMatchesList();
    });
    filter.appendChild(btn);
  }

  filter.querySelector('[data-group="all"]').addEventListener('click', () => {
    document.querySelectorAll('.group-filter-btn').forEach(b => b.classList.remove('active'));
    filter.querySelector('[data-group="all"]').classList.add('active');
    activeGroup = 'all';
    renderMatchesList();
  });

  renderMatchesList();
  updateResultsProgress();
}

function renderMatchesList() {
  const list = document.getElementById('matches-list');
  list.innerHTML = '';

  const filtered = activeGroup === 'all'
    ? MATCHES
    : MATCHES.filter(m => m.group === activeGroup);

  for (const match of filtered) {
    const row = document.createElement('div');
    row.className = 'admin-match-row';
    row.id = `admin-match-${match.id}`;

    row.innerHTML = `
      <div style="color:var(--text-muted); font-size:12px; font-weight:600;">#${match.id}</div>
      <div style="color:var(--text-muted); font-size:12px;">${formatDate(match.date)}</div>
      <div style="font-size:13px; font-weight:600;">
        ${escHtml(match.home)} <span style="color:var(--text-muted); font-weight:400;">vs</span> ${escHtml(match.away)}
        <span class="badge badge-group" style="margin-left:6px; font-size:10px;">Gr. ${match.group}</span>
      </div>
      <div class="result-btns" id="res-btns-${match.id}"></div>
    `;

    list.appendChild(row);
    renderResultBtns(match.id);
  }
}

function renderResultBtns(matchId) {
  const container = document.getElementById(`res-btns-${matchId}`);
  if (!container) return;
  container.innerHTML = '';

  const current = matchResults[matchId];

  for (const val of ['1', 'X', '2']) {
    const btn = document.createElement('button');
    btn.className = `result-btn${current === val ? ' active' : ''}`;
    btn.textContent = val;
    btn.addEventListener('click', () => saveResult(matchId, val));
    container.appendChild(btn);
  }

  // Clear button
  if (current) {
    const clr = document.createElement('button');
    clr.className = 'result-btn';
    clr.textContent = '✕';
    clr.title = 'Obriši rezultat';
    clr.style.color = 'var(--danger)';
    clr.addEventListener('click', () => saveResult(matchId, null));
    container.appendChild(clr);
  }
}

async function saveResult(matchId, value) {
  const { error } = await supabase
    .from('matches')
    .update({ result: value })
    .eq('id', matchId);

  if (!error) {
    matchResults[matchId] = value;
    renderResultBtns(matchId);
    updateResultsProgress();
    showSaveFlash();
  } else {
    alert('Greška pri čuvanju: ' + error.message);
  }
}

function updateResultsProgress() {
  const entered = Object.values(matchResults).filter(r => r !== null && r !== undefined).length;
  document.getElementById('results-progress').textContent = `${entered}/72 rezultata uneto`;
}

function showSaveFlash() {
  // small notification
  let el = document.getElementById('save-flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'save-flash';
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--success);color:#000;padding:8px 16px;border-radius:8px;font-weight:700;font-size:13px;z-index:999;transition:opacity .3s;';
    document.body.appendChild(el);
  }
  el.textContent = '✓ Sačuvano';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 1500);
}

// ---- Učesnici ----
async function loadParticipants() {
  const [{ data: participants }, { data: tips }] = await Promise.all([
    supabase.from('participants').select('id, name, created_at').order('created_at'),
    supabase.from('tips').select('participant_id'),
  ]);

  if (!participants) return;

  allParticipants = participants;
  allTips = tips || [];

  const tipCount = {};
  for (const t of allTips) {
    tipCount[t.participant_id] = (tipCount[t.participant_id] || 0) + 1;
  }

  document.getElementById('participants-count').textContent = `${participants.length} učesnika`;

  const tbody = document.getElementById('participants-body');
  tbody.innerHTML = '';

  participants.forEach((p, i) => {
    const tr = document.createElement('tr');
    const dt = new Date(p.created_at);
    const dateStr = dt.toLocaleString('sr-RS', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const tc = tipCount[p.id] || 0;
    tr.innerHTML = `
      <td style="color:var(--text-muted);">${i+1}</td>
      <td style="font-weight:600;">${escHtml(p.name)}</td>
      <td style="color:var(--text-muted); font-size:12px;">${dateStr}</td>
      <td>
        <span style="font-weight:700; color:${tc === 72 ? 'var(--success)' : 'var(--gold)'};">${tc}</span>
        <span style="color:var(--text-muted);">/72</span>
      </td>
      <td>
        <button class="btn btn-secondary" style="padding:3px 10px; font-size:12px;"
          onclick="deleteParticipant('${p.id}', '${escHtml(p.name)}')">
          Obriši
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteParticipant(id, name) {
  if (!confirm(`Obrisati učesnika "${name}" i sve njegove tipove?`)) return;
  const { error } = await supabase.from('participants').delete().eq('id', id);
  if (!error) {
    loadParticipants();
  } else {
    alert('Greška: ' + error.message);
  }
}

// ---- Settings ----
async function loadSettings() {
  const { data } = await supabase.from('settings').select('key, value');
  if (!data) return;

  const settings = {};
  for (const s of data) settings[s.key] = s.value;

  const toggle = document.getElementById('toggle-open');
  toggle.checked = settings['submissions_open'] === 'true';

  toggle.addEventListener('change', async () => {
    await supabase.from('settings').update({ value: toggle.checked ? 'true' : 'false' })
      .eq('key', 'submissions_open');
    showSaveFlash();
  });

  // Export CSV
  document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
}

// ---- Export CSV ----
async function exportCSV() {
  const [{ data: participants }, { data: tips }] = await Promise.all([
    supabase.from('participants').select('id, name, created_at').order('name'),
    supabase.from('tips').select('participant_id, match_id, tip_type, tip_value'),
  ]);

  if (!participants || !tips) return;

  const tipMap = {};
  for (const t of tips) {
    if (!tipMap[t.participant_id]) tipMap[t.participant_id] = {};
    tipMap[t.participant_id][t.match_id] = `${t.tip_value}(${t.tip_type[0]})`;
  }

  const headers = ['Ime', ...MATCHES.map(m => `#${m.id} ${m.home}-${m.away}`)];
  const rows = participants.map(p => {
    const row = [p.name];
    for (const m of MATCHES) {
      row.push(tipMap[p.id]?.[m.id] || '');
    }
    return row;
  });

  const csv = [headers, ...rows].map(r =>
    r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')
  ).join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sp2026-tipovi.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
