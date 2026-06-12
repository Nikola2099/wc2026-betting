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
  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, created_at, tips(count)')
    .order('created_at');

  if (!participants) return;

  allParticipants = participants;

  const tipCount = {};
  for (const p of participants) {
    tipCount[p.id] = p.tips?.[0]?.count ?? 0;
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

  // Export Excel — dostupno samo nakon isteka roka
  const exportBtn = document.getElementById('export-csv-btn');
  const deadlinePassed = new Date() > new Date('2026-06-11T17:00:00+02:00');
  if (!deadlinePassed) {
    exportBtn.disabled = true;
    exportBtn.title = 'Export je dostupan tek nakon isteka roka (11. jun 2026. u 17:00)';
    exportBtn.textContent = '⬇ Excel (.xlsx) — dostupno nakon roka';
  } else {
    exportBtn.addEventListener('click', exportCSV);
  }

  document.getElementById('export-detail-btn').addEventListener('click', exportDetailTable);
}

// ---- Helper: fetch svih tipova sa paginacijom ----
async function fetchAllTips() {
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('tips')
      .select('participant_id, match_id, tip_type, tip_value')
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

// ---- Export Excel ----
async function exportCSV() {
  if (typeof XLSX === 'undefined') {
    alert('SheetJS biblioteka se nije učitala. Provjeri internet konekciju i pokušaj ponovo.');
    return;
  }
  const [[{ data: participants }, { data: matches }], tips] = await Promise.all([
    Promise.all([
      supabase.from('participants').select('id, name, created_at').order('name'),
      supabase.from('matches').select('id, result'),
    ]),
    fetchAllTips(),
  ]);

  if (!participants || !tips) return;

  const tipMap = {};
  for (const t of tips) {
    if (!tipMap[t.participant_id]) tipMap[t.participant_id] = {};
    tipMap[t.participant_id][t.match_id] = { value: t.tip_value, type: t.tip_type };
  }

  const resultMap = {};
  for (const m of matches || []) resultMap[m.id] = m.result;

  // ---- Sheet 1: Tipovi po učesniku ----
  const headers = ['#', 'Ime', ...MATCHES.map(m => `#${m.id} ${m.home} vs ${m.away}`), 'Ukupno'];
  const dataRows = participants.map((p, i) => {
    let correct = 0;
    const row = [i + 1, p.name];
    for (const m of MATCHES) {
      const t = tipMap[p.id]?.[m.id];
      const r = resultMap[m.id];
      let cell = t ? t.value : '';
      if (t && r) {
        const ok = t.type === 'triple' ? true
          : t.type === 'single' ? t.value === r
          : (t.value === '1X' ? r==='1'||r==='X' : t.value === 'X2' ? r==='X'||r==='2' : r==='1'||r==='2');
        if (ok) correct++;
      }
      row.push(cell);
    }
    row.push(correct);
    return row;
  });

  const ws1Data = [headers, ...dataRows];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

  // Širina kolona
  ws1['!cols'] = [{ wch: 4 }, { wch: 22 }, ...MATCHES.map(() => ({ wch: 8 })), { wch: 8 }];

  // ---- Sheet 2: Rang lista ----
  const scored = participants.map(p => {
    let correct = 0;
    for (const m of MATCHES) {
      const t = tipMap[p.id]?.[m.id];
      const r = resultMap[m.id];
      if (t && r) {
        const ok = t.type === 'triple' ? true
          : t.type === 'single' ? t.value === r
          : (t.value === '1X' ? r==='1'||r==='X' : t.value === 'X2' ? r==='X'||r==='2' : r==='1'||r==='2');
        if (ok) correct++;
      }
    }
    return { name: p.name, correct };
  }).sort((a, b) => b.correct - a.correct);

  let rank = 1;
  const rankRows = scored.map((p, i) => {
    if (i > 0 && p.correct < scored[i-1].correct) rank = i + 1;
    return [rank, p.name, p.correct];
  });

  const ws2 = XLSX.utils.aoa_to_sheet([['Mesto', 'Ime', 'Bodovi'], ...rankRows]);
  ws2['!cols'] = [{ wch: 7 }, { wch: 24 }, { wch: 8 }];

  // ---- Workbook ----
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Tipovi');
  XLSX.utils.book_append_sheet(wb, ws2, 'Rang lista');

  XLSX.writeFile(wb, 'SP2026-tipovi.xlsx');
}

// ---- Export Detaljna tabela ----
async function exportDetailTable() {
  if (typeof XLSX === 'undefined') {
    alert('SheetJS biblioteka se nije učitala.');
    return;
  }

  const btn = document.getElementById('export-detail-btn');
  btn.disabled = true;
  btn.textContent = 'Generisanje...';

  const [[{ data: participants }, { data: matches }], tips] = await Promise.all([
    Promise.all([
      supabase.from('participants').select('id, name, created_at').order('created_at'),
      supabase.from('matches').select('id, result'),
    ]),
    fetchAllTips(),
  ]);

  if (!participants || !tips) { btn.disabled = false; btn.textContent = '⬇ Detaljna tabela (.xlsx)'; return; }

  const resultMap = {};
  for (const m of matches || []) resultMap[m.id] = m.result;

  const tipMap = {};
  for (const t of tips) {
    if (!tipMap[t.participant_id]) tipMap[t.participant_id] = {};
    tipMap[t.participant_id][t.match_id] = { value: t.tip_value, type: t.tip_type };
  }

  // Bodovi po učesniku
  function calcCorrect(p) {
    let c = 0;
    for (const m of MATCHES) {
      const t = tipMap[p.id]?.[m.id];
      const r = resultMap[m.id];
      if (!t || !r) continue;
      const ok = t.type === 'triple' ? true
        : t.type === 'single' ? t.value === r
        : (t.value === '1X' ? r==='1'||r==='X' : t.value === 'X2' ? r==='X'||r==='2' : r==='1'||r==='2');
      if (ok) c++;
    }
    return c;
  }

  const scored = participants
    .map(p => ({ ...p, correct: calcCorrect(p) }))
    .sort((a, b) => b.correct - a.correct);

  // Header red: Utakmica | Rezultat | Ime1 | Ime2 | ...
  const header = ['#', 'Utakmica', 'Rez.', ...scored.map((p, i) => `${i+1}. ${p.name} (${p.correct})`), 'Bodovi →'];
  const rows = [header];

  for (const m of MATCHES) {
    const r = resultMap[m.id] || '–';
    const row = [m.id, `${m.home} vs ${m.away}`, r];
    for (const p of scored) {
      const t = tipMap[p.id]?.[m.id];
      row.push(t ? t.value : '–');
    }
    row.push('');
    rows.push(row);
  }

  // Bodovi red na kraju
  const scoreRow = ['', 'UKUPNO', '', ...scored.map(p => p.correct), ''];
  rows.push(scoreRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Širina kolona
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 30 },  // Utakmica
    { wch: 6 },   // Rez.
    ...scored.map(() => ({ wch: 14 })),
    { wch: 4 },
  ];

  // Zamrzni prve dve kolone i header red
  ws['!freeze'] = { xSplit: 3, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Detaljna tabela');
  XLSX.writeFile(wb, 'SP2026-detaljna-tabela.xlsx');

  btn.disabled = false;
  btn.textContent = '⬇ Detaljna tabela (.xlsx)';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
