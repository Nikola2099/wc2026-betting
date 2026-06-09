// ============================================================
// submit.js
// ============================================================

const DEADLINE = new Date('2026-06-10T23:59:59+02:00');
const LIMITS   = { single: 47, double: 20, triple: 5 };
const tips     = {}; // { matchId: { type, value } }

// ---- Rok ----
function checkDeadline() {
  if (new Date() > DEADLINE) {
    document.getElementById('form-section').style.display    = 'none';
    document.getElementById('submit-btn-wrap').style.display = 'none';
    document.getElementById('closed-section').style.display  = 'block';
    return false;
  }
  return true;
}

// ---- Brojač ----
function getCounts() {
  const c = { single: 0, double: 0, triple: 0, total: 0 };
  for (const t of Object.values(tips)) {
    if (!t || t.value == null) continue;
    if (t.type in c) c[t.type]++;
    c.total++;
  }
  return c;
}

function updateCounter() {
  const c   = getCounts();
  const sOk = c.single === LIMITS.single;
  const dOk = c.double === LIMITS.double;
  const tOk = c.triple === LIMITS.triple;

  document.getElementById('cnt-single').textContent  = `${c.single}/${LIMITS.single}`;
  document.getElementById('cnt-double').textContent  = `${c.double}/${LIMITS.double}`;
  document.getElementById('cnt-triple').textContent  = `${c.triple}/${LIMITS.triple}`;
  document.getElementById('cnt-total').textContent   = `${c.total}/72`;

  document.getElementById('cnt-single').className = `counter-pill single${sOk ? ' ok' : c.single > LIMITS.single ? ' err' : ''}`;
  document.getElementById('cnt-double').className = `counter-pill double${dOk ? ' ok' : c.double > LIMITS.double ? ' err' : ''}`;
  document.getElementById('cnt-triple').className = `counter-pill triple${tOk ? ' ok' : c.triple > LIMITS.triple ? ' err' : ''}`;

  const st = document.getElementById('counter-status');
  if      (c.single > LIMITS.single)  st.innerHTML = `<span style="color:var(--danger)">Previše jednoznaka (max 47)</span>`;
  else if (c.double > LIMITS.double)  st.innerHTML = `<span style="color:var(--danger)">Previše dvoznaka (max 20)</span>`;
  else if (c.triple > LIMITS.triple)  st.innerHTML = `<span style="color:var(--danger)">Previše troznaka (max 5)</span>`;
  else if (sOk && dOk && tOk)         st.innerHTML = `<span style="color:var(--success)">✓ Sve ispravno popunjeno</span>`;
  else {
    const rem = 72 - c.total;
    st.innerHTML = rem > 0
      ? `<span style="color:var(--text-muted)">Preostalo: ${rem} utakmica</span>`
      : `<span style="color:var(--text-muted)">Proveri raspodelu tipova</span>`;
  }

  const nameOk = document.getElementById('participant-name').value.trim().length > 1;
  document.getElementById('submit-btn').disabled = !(sOk && dOk && tOk && nameOk);
}

function updateGroupCounters() {
  for (const g of GROUPS) {
    const el = document.getElementById(`gc-${g}`);
    if (!el) continue;
    const filled = getMatchesByGroup(g).filter(m => tips[m.id] && tips[m.id].value != null).length;
    el.textContent = `${filled}/${getMatchesByGroup(g).length}`;
  }
}

function showError(msg) {
  const el = document.getElementById('submit-error');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ---- Render jednog reda ----
// Koristi data-atribute, bez individualnih listenera
function renderMatchRow(match) {
  const row = document.createElement('div');
  row.className        = 'match-row';
  row.id               = `match-${match.id}`;
  row.dataset.matchId  = match.id;

  row.innerHTML = `
    <div class="match-num">#${match.id}</div>
    <div class="match-date">${formatDate(match.date)}</div>
    <div class="match-teams">${match.home} <span class="vs">vs</span> ${match.away}</div>
    <div class="tip-controls">
      <div class="value-btns" id="sg-${match.id}">
        <button class="tip-btn val-btn" data-mode="single" data-val="1">1</button>
        <button class="tip-btn val-btn" data-mode="single" data-val="X">X</button>
        <button class="tip-btn val-btn" data-mode="single" data-val="2">2</button>
      </div>
      <div class="value-btns" id="dg-${match.id}" style="display:none">
        <button class="tip-btn val-btn" data-mode="double" data-val="1X">1X</button>
        <button class="tip-btn val-btn" data-mode="double" data-val="X2">X2</button>
        <button class="tip-btn val-btn" data-mode="double" data-val="12">12</button>
      </div>
      <span class="badge badge-triple" id="tl-${match.id}" style="display:none">AUTO ✓</span>
      <div class="divider"></div>
      <div class="type-btns">
        <button class="tip-btn type-double" data-action="toggle-type" data-type="double">DVOZNAK</button>
        <button class="tip-btn type-triple" data-action="toggle-type" data-type="triple">TROZNAK</button>
      </div>
    </div>
  `;

  return row;
}

// ---- Prikaz grupe dugmadi ----
function showMode(matchId, mode) {
  const sg = document.getElementById(`sg-${matchId}`);
  const dg = document.getElementById(`dg-${matchId}`);
  const tl = document.getElementById(`tl-${matchId}`);
  if (sg) sg.style.display = mode === 'single' ? '' : 'none';
  if (dg) dg.style.display = mode === 'double' ? '' : 'none';
  if (tl) tl.style.display = mode === 'triple' ? '' : 'none';

  const row = document.getElementById(`match-${matchId}`);
  if (!row) return;
  row.querySelectorAll('.type-double, .type-triple').forEach(btn => {
    btn.classList.toggle('active',
      (btn.classList.contains('type-double') && mode === 'double') ||
      (btn.classList.contains('type-triple') && mode === 'triple')
    );
  });
}

function highlightValue(matchId, mode, selectedVal) {
  const groupId = mode === 'single' ? `sg-${matchId}` : `dg-${matchId}`;
  const group   = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.val-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === selectedVal);
  });
}

// ---- Logika ----
function toggleType(matchId, type) {
  const current = tips[matchId];
  const curType = current ? current.type : 'single';

  if (curType === type) {
    // Vrati na single
    tips[matchId] = null;
    showMode(matchId, 'single');
    highlightValue(matchId, 'single', null);
    document.getElementById(`match-${matchId}`).className = 'match-row';
    updateCounter();
    updateGroupCounters();
    return;
  }

  if (type === 'triple') {
    tips[matchId] = { type: 'triple', value: '1X2' };
    showMode(matchId, 'triple');
    document.getElementById(`match-${matchId}`).className = 'match-row filled-triple';
  } else {
    tips[matchId] = { type: 'double', value: null };
    showMode(matchId, 'double');
    highlightValue(matchId, 'double', null);
    document.getElementById(`match-${matchId}`).className = 'match-row';
  }

  updateCounter();
  updateGroupCounters();
}

function selectValue(matchId, mode, value) {
  const current = tips[matchId];
  const curType = current ? current.type : 'single';

  // Ignorisi klik na single dugme dok je double/triple aktivan
  if (mode === 'single' && curType !== 'single') return;

  tips[matchId] = { type: mode, value };
  highlightValue(matchId, mode, value);
  document.getElementById(`match-${matchId}`).className = `match-row filled-${mode}`;
  updateCounter();
  updateGroupCounters();
}

// ---- Event delegation — jedan listener za sve klikove ----
function initClickHandler() {
  document.getElementById('matches-container').addEventListener('click', function(e) {
    const btn = e.target.closest('button[data-action], button[data-val]');
    if (!btn) return;

    const row = btn.closest('[data-match-id]');
    if (!row) return;
    const matchId = parseInt(row.dataset.matchId);

    if (btn.dataset.action === 'toggle-type') {
      toggleType(matchId, btn.dataset.type);
    } else if (btn.dataset.val) {
      selectValue(matchId, btn.dataset.mode, btn.dataset.val);
    }
  });
}

// ---- Render svih grupa ----
function renderMatches() {
  const container = document.getElementById('matches-container');
  container.innerHTML = '';

  for (const group of GROUPS) {
    const groupMatches = getMatchesByGroup(group);

    const section = document.createElement('div');
    section.className = 'group-section';

    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
      <span class="badge badge-group">Grupa ${group}</span>
      <h3>Grupa ${group}</h3>
      <span id="gc-${group}" style="font-size:12px;color:var(--text-muted)">0/${groupMatches.length}</span>
      <span class="chevron">▼</span>
    `;

    const body = document.createElement('div');
    body.className = 'group-body';

    header.addEventListener('click', () => {
      body.classList.toggle('hidden');
      header.classList.toggle('collapsed');
    });

    for (const match of groupMatches) {
      body.appendChild(renderMatchRow(match));
    }

    section.appendChild(header);
    section.appendChild(body);
    container.appendChild(section);
  }
}

// ---- Submit ----
document.getElementById('submit-btn').addEventListener('click', async () => {
  const name = document.getElementById('participant-name').value.trim();
  if (!name) { showError('Unesi ime i prezime.'); return; }

  const c = getCounts();
  if (c.single !== 47 || c.double !== 20 || c.triple !== 5) {
    showError('Proveri raspodelu tipova (47/20/5).');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled   = true;
  btn.textContent = 'Slanje...';

  try {
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .ilike('name', name)
      .maybeSingle();
    if (existing) {
      showError('Ime već postoji — svako može da pošalje tipove samo jednom.');
      btn.disabled = false;
      btn.textContent = 'Pošalji tipove';
      return;
    }

    const { data: participant, error: pErr } = await supabase
      .from('participants').insert({ name }).select('id').single();
    if (pErr) throw pErr;

    const tipsArr = Object.entries(tips)
      .filter(([, t]) => t && t.value)
      .map(([matchId, t]) => ({
        participant_id: participant.id,
        match_id:  parseInt(matchId),
        tip_type:  t.type,
        tip_value: t.value,
      }));

    for (let i = 0; i < tipsArr.length; i += 50) {
      const { error: tErr } = await supabase.from('tips').insert(tipsArr.slice(i, i + 50));
      if (tErr) throw tErr;
    }

    document.getElementById('success-modal').style.display = 'flex';
  } catch (err) {
    showError('Greška pri slanju: ' + (err.message || 'Pokušaj ponovo.'));
    btn.disabled   = false;
    btn.textContent = 'Pošalji tipove';
  }
});

document.getElementById('participant-name').addEventListener('input', updateCounter);

// ---- Init ----
if (checkDeadline()) {
  renderMatches();
  initClickHandler();
  updateCounter();
}
