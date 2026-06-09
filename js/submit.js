// ============================================================
// submit.js
// ============================================================

const DEADLINE = new Date('2026-06-10T23:59:59+02:00');
const LIMITS = { single: 47, double: 20, triple: 5 };

// tips[matchId] = { type: 'single'|'double'|'triple', value: string|null }
const tips = {};

// ---- Provera roka ----
function checkDeadline() {
  if (new Date() > DEADLINE) {
    document.getElementById('form-section').style.display = 'none';
    document.getElementById('submit-btn-wrap').style.display = 'none';
    document.getElementById('closed-section').style.display = 'block';
    return false;
  }
  return true;
}

// ---- Brojač ----
function getCounts() {
  const c = { single: 0, double: 0, triple: 0, total: 0 };
  for (const t of Object.values(tips)) {
    if (!t || t.value === null) continue;
    c[t.type]++;
    c.total++;
  }
  return c;
}

function updateCounter() {
  const c = getCounts();

  document.getElementById('cnt-single').textContent = `${c.single}/${LIMITS.single}`;
  document.getElementById('cnt-double').textContent = `${c.double}/${LIMITS.double}`;
  document.getElementById('cnt-triple').textContent = `${c.triple}/${LIMITS.triple}`;
  document.getElementById('cnt-total').textContent  = `${c.total}/72`;

  const sOk = c.single === LIMITS.single;
  const dOk = c.double === LIMITS.double;
  const tOk = c.triple === LIMITS.triple;

  document.getElementById('cnt-single').className = `counter-pill single${sOk ? ' ok' : c.single > LIMITS.single ? ' err' : ''}`;
  document.getElementById('cnt-double').className = `counter-pill double${dOk ? ' ok' : c.double > LIMITS.double ? ' err' : ''}`;
  document.getElementById('cnt-triple').className = `counter-pill triple${tOk ? ' ok' : c.triple > LIMITS.triple ? ' err' : ''}`;

  const valid = sOk && dOk && tOk;
  const statusEl = document.getElementById('counter-status');

  if (c.single > LIMITS.single) {
    statusEl.innerHTML = `<span style="color:var(--danger)">Previše jednoznaka (max 47)</span>`;
  } else if (c.double > LIMITS.double) {
    statusEl.innerHTML = `<span style="color:var(--danger)">Previše dvoznaka (max 20)</span>`;
  } else if (c.triple > LIMITS.triple) {
    statusEl.innerHTML = `<span style="color:var(--danger)">Previše troznaka (max 5)</span>`;
  } else if (valid) {
    statusEl.innerHTML = `<span style="color:var(--success)">✓ Sve ispravno popunjeno</span>`;
  } else {
    const rem = 72 - c.total;
    statusEl.innerHTML = rem > 0
      ? `<span style="color:var(--text-muted)">Preostalo: ${rem} utakmica</span>`
      : `<span style="color:var(--text-muted)">Proveri raspodelu tipova</span>`;
  }

  const nameOk = document.getElementById('participant-name').value.trim().length > 1;
  document.getElementById('submit-btn').disabled = !(valid && nameOk);
}

function updateGroupCounters() {
  for (const group of GROUPS) {
    const filled = getMatchesByGroup(group).filter(m => tips[m.id] && tips[m.id].value !== null).length;
    const el = document.getElementById(`gc-${group}`);
    if (el) el.textContent = `${filled}/${getMatchesByGroup(group).length}`;
  }
}

// ---- Render match row ----
function renderMatchRow(match) {
  const row = document.createElement('div');
  row.className = 'match-row';
  row.id = `match-${match.id}`;

  // Broj
  const num = document.createElement('div');
  num.className = 'match-num';
  num.textContent = `#${match.id}`;

  // Datum
  const date = document.createElement('div');
  date.className = 'match-date';
  date.textContent = formatDate(match.date);

  // Timovi
  const teams = document.createElement('div');
  teams.className = 'match-teams';
  teams.innerHTML = `${match.home} <span class="vs">vs</span> ${match.away}`;

  // Kontrole
  const controls = document.createElement('div');
  controls.className = 'tip-controls';

  // Levo: value buttons (1/X/2 ili 1X/X2/12 ili AUTO)
  const valueArea = document.createElement('div');
  valueArea.className = 'value-btns';
  valueArea.id = `val-${match.id}`;

  // Dodaj inicijalne 1/X/2 dugmiće odmah
  ['1', 'X', '2'].forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'tip-btn val-btn';
    btn.textContent = val;
    btn.addEventListener('click', () => onValueClick(match.id, 'single', val));
    valueArea.appendChild(btn);
  });

  const divider = document.createElement('div');
  divider.className = 'divider';

  // Desno: DVOZNAK + TROZNAK
  const typeArea = document.createElement('div');
  typeArea.className = 'type-btns';

  const dBtn = document.createElement('button');
  dBtn.className = 'tip-btn type-double';
  dBtn.id = `dbtn-${match.id}`;
  dBtn.textContent = 'DVOZNAK';
  dBtn.addEventListener('click', () => onTypeClick(match.id, 'double'));

  const tBtn = document.createElement('button');
  tBtn.className = 'tip-btn type-triple';
  tBtn.id = `tbtn-${match.id}`;
  tBtn.textContent = 'TROZNAK';
  tBtn.addEventListener('click', () => onTypeClick(match.id, 'triple'));

  typeArea.appendChild(dBtn);
  typeArea.appendChild(tBtn);

  controls.appendChild(valueArea);
  controls.appendChild(divider);
  controls.appendChild(typeArea);

  row.appendChild(num);
  row.appendChild(date);
  row.appendChild(teams);
  row.appendChild(controls);

  return row;
}

// ---- Klik na DVOZNAK ili TROZNAK ----
function onTypeClick(matchId, type) {
  const current = tips[matchId];
  const currentType = current ? current.type : 'single';

  // Klik na aktivan tip → vrati na single
  if (currentType === type) {
    tips[matchId] = null;
    refreshRow(matchId, 'single', null);
    updateCounter();
    updateGroupCounters();
    return;
  }

  // Proveri limit
  const counts = getCounts();
  // Oduzmi stari tip ako je bio popunjen
  const prevFilled = current && current.value !== null ? 1 : 0;
  const prevType = current ? current.type : null;
  const currentTypeCount = counts[type] - (prevType === type ? prevFilled : 0);

  if (currentTypeCount >= LIMITS[type]) {
    showError(`Dostignut limit za ${type === 'double' ? 'dvoznak (max 20)' : 'troznak (max 5)'}`);
    return;
  }

  if (type === 'triple') {
    tips[matchId] = { type: 'triple', value: '1X2' };
    refreshRow(matchId, 'triple', '1X2');
  } else {
    tips[matchId] = { type: 'double', value: null };
    refreshRow(matchId, 'double', null);
  }

  updateCounter();
  updateGroupCounters();
}

// ---- Klik na vrednost (1/X/2 ili 1X/X2/12) ----
function onValueClick(matchId, type, value) {
  const current = tips[matchId];
  const currentType = current ? current.type : 'single';

  // Ako klikamo single vrednost dok smo u double modu — ignorisi
  // (single dugmici se ne prikazuju u double/triple modu)

  // Proveri limit samo ako menjamo tip
  if (currentType !== type) {
    const counts = getCounts();
    const prevFilled = current && current.value !== null ? 1 : 0;
    const prevType = current ? current.type : null;
    const newCount = counts[type] - (prevType === type ? prevFilled : 0);
    if (newCount >= LIMITS[type]) {
      showError(`Dostignut limit za ${type === 'single' ? 'jednoznak (max 47)' : type === 'double' ? 'dvoznak (max 20)' : 'troznak (max 5)'}`);
      return;
    }
  }

  tips[matchId] = { type, value };
  refreshRow(matchId, type, value);
  updateCounter();
  updateGroupCounters();
}

// ---- Osvezi prikaz jednog reda ----
function refreshRow(matchId, type, selectedValue) {
  const row = document.getElementById(`match-${matchId}`);
  const valueArea = document.getElementById(`val-${matchId}`);

  // Odredi klasu reda
  row.className = selectedValue !== null ? `match-row filled-${type}` : 'match-row';

  // Highlight type dugmiće
  const dBtn = document.getElementById(`dbtn-${matchId}`);
  const tBtn = document.getElementById(`tbtn-${matchId}`);
  if (dBtn) dBtn.classList.toggle('active', type === 'double');
  if (tBtn) tBtn.classList.toggle('active', type === 'triple');

  // Osvezi value area
  valueArea.innerHTML = '';

  if (type === 'triple') {
    const span = document.createElement('span');
    span.className = 'badge badge-triple';
    span.textContent = 'AUTO ✓';
    valueArea.appendChild(span);
    return;
  }

  const options = type === 'double' ? ['1X', 'X2', '12'] : ['1', 'X', '2'];
  options.forEach(val => {
    const btn = document.createElement('button');
    btn.className = `tip-btn val-btn${val === selectedValue ? ' active' : ''}`;
    btn.textContent = val;
    btn.addEventListener('click', () => onValueClick(matchId, type, val));
    valueArea.appendChild(btn);
  });
}

function showError(msg) {
  const el = document.getElementById('submit-error');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ---- Render sve grupe ----
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

  const counts = getCounts();
  if (counts.single !== 47 || counts.double !== 20 || counts.triple !== 5) {
    showError('Proveri raspodelu tipova (47/20/5).');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Slanje...';

  try {
    const { data: participant, error: pErr } = await supabase
      .from('participants').insert({ name }).select('id').single();
    if (pErr) throw pErr;

    const tipsArr = Object.entries(tips)
      .filter(([, t]) => t && t.value)
      .map(([matchId, t]) => ({
        participant_id: participant.id,
        match_id: parseInt(matchId),
        tip_type: t.type,
        tip_value: t.value,
      }));

    for (let i = 0; i < tipsArr.length; i += 50) {
      const { error: tErr } = await supabase.from('tips').insert(tipsArr.slice(i, i + 50));
      if (tErr) throw tErr;
    }

    document.getElementById('success-modal').style.display = 'flex';
  } catch (err) {
    showError('Greška pri slanju: ' + (err.message || 'Pokušaj ponovo.'));
    btn.disabled = false;
    btn.textContent = 'Pošalji tipove';
  }
});

document.getElementById('participant-name').addEventListener('input', updateCounter);

// ---- Init ----
if (checkDeadline()) {
  renderMatches();
  updateCounter();
}
