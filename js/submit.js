// ============================================================
// submit.js — logika forme za unos tipova
// ============================================================

const DEADLINE = new Date('2026-06-10T23:59:59+02:00');
const LIMITS = { single: 47, double: 20, triple: 5 };

// tips[matchId] = { type: 'single'|'double'|'triple', value: '1'|'X'|'2'|'1X'|'X2'|'12'|'1X2' }
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

// ---- Opcije po tipu ----
const TYPE_OPTIONS = {
  single: ['1', 'X', '2'],
  double: ['1X', 'X2', '12'],
  triple: ['1X2'],
};

// ---- Brojač ----
function getCounts() {
  const c = { single: 0, double: 0, triple: 0, total: 0 };
  for (const t of Object.values(tips)) {
    if (t.value !== null) {
      c[t.type]++;
      c.total++;
    }
  }
  return c;
}

function updateCounter() {
  const c = getCounts();

  const sEl = document.getElementById('cnt-single');
  const dEl = document.getElementById('cnt-double');
  const tEl = document.getElementById('cnt-triple');
  const totEl = document.getElementById('cnt-total');
  const statusEl = document.getElementById('counter-status');

  sEl.textContent = `${c.single}/${LIMITS.single}`;
  dEl.textContent = `${c.double}/${LIMITS.double}`;
  tEl.textContent = `${c.triple}/${LIMITS.triple}`;
  totEl.textContent = `${c.total}/72`;

  sEl.className = `counter-pill single${c.single === LIMITS.single ? ' ok' : (c.single > LIMITS.single ? ' err' : '')}`;
  dEl.className = `counter-pill double${c.double === LIMITS.double ? ' ok' : (c.double > LIMITS.double ? ' err' : '')}`;
  tEl.className = `counter-pill triple${c.triple === LIMITS.triple ? ' ok' : (c.triple > LIMITS.triple ? ' err' : '')}`;

  const valid = c.single === LIMITS.single && c.double === LIMITS.double && c.triple === LIMITS.triple;

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

// ---- Render match row ----
function renderMatchRow(match) {
  const row = document.createElement('div');
  row.className = 'match-row';
  row.id = `match-${match.id}`;
  row.dataset.matchId = match.id;

  const num = document.createElement('div');
  num.className = 'match-num';
  num.textContent = `#${match.id}`;

  const date = document.createElement('div');
  date.className = 'match-date';
  date.textContent = formatDate(match.date);

  const teams = document.createElement('div');
  teams.className = 'match-teams';
  teams.innerHTML = `${match.home} <span class="vs">vs</span> ${match.away}`;

  const controls = document.createElement('div');
  controls.className = 'tip-controls';

  // Leva strana: value buttons (menja se po modu)
  const valueArea = document.createElement('div');
  valueArea.className = 'value-btns';
  valueArea.id = `val-${match.id}`;

  const divider = document.createElement('div');
  divider.className = 'divider';

  // Desna strana: DVOZNAK + TROZNAK uvek vidljivi
  const typeArea = document.createElement('div');
  typeArea.className = 'type-btns';

  const dBtn = document.createElement('button');
  dBtn.className = 'tip-btn type-double';
  dBtn.dataset.type = 'double';
  dBtn.textContent = 'DVOZNAK';
  dBtn.title = 'Dupla šansa: 1X, X2 ili 12';
  dBtn.addEventListener('click', () => toggleDouble(match.id));

  const tBtn = document.createElement('button');
  tBtn.className = 'tip-btn type-triple';
  tBtn.dataset.type = 'triple';
  tBtn.textContent = 'TROZNAK';
  tBtn.title = 'Automatski pogodak (1X2)';
  tBtn.addEventListener('click', () => toggleTriple(match.id));

  typeArea.appendChild(dBtn);
  typeArea.appendChild(tBtn);

  // Inicijalno popuni 1/X/2 direktno (pre dodavanja u DOM)
  for (const val of ['1', 'X', '2']) {
    const btn = document.createElement('button');
    btn.className = 'tip-btn val-btn';
    btn.dataset.value = val;
    btn.textContent = val;
    btn.addEventListener('click', () => selectValue(match.id, val, 'single'));
    valueArea.appendChild(btn);
  }

  controls.appendChild(valueArea);
  controls.appendChild(divider);
  controls.appendChild(typeArea);

  row.appendChild(num);
  row.appendChild(date);
  row.appendChild(teams);
  row.appendChild(controls);

  return row;
}

// ---- Prikaži value buttons u zavisnosti od moda ----
function renderValueArea(matchId, mode) {
  const container = document.getElementById(`val-${matchId}`);
  container.innerHTML = '';

  if (mode === 'triple') {
    const span = document.createElement('span');
    span.className = 'badge badge-triple';
    span.textContent = 'AUTO ✓';
    container.appendChild(span);
    return;
  }

  const options = mode === 'double' ? ['1X', 'X2', '12'] : ['1', 'X', '2'];
  const currentVal = tips[matchId] && tips[matchId].type === mode ? tips[matchId].value : null;

  for (const val of options) {
    const btn = document.createElement('button');
    btn.className = 'tip-btn val-btn';
    btn.dataset.value = val;
    btn.textContent = val;
    if (currentVal === val) btn.classList.add('active');
    btn.addEventListener('click', () => selectValue(matchId, val, mode));
    container.appendChild(btn);
  }
}

// ---- Toggle DVOZNAK ----
function toggleDouble(matchId) {
  const current = tips[matchId];
  const currentMode = current ? current.type : 'single';

  if (currentMode === 'double') {
    // Vrati na single, poništi tip
    tips[matchId] = null;
    updateTypeButtons(matchId, 'single');
    renderValueArea(matchId, 'single');
    document.getElementById(`match-${matchId}`).className = 'match-row';
    updateCounter();
    updateGroupCounters();
    return;
  }

  // Proveri limit
  const counts = getCounts();
  // Ako prelazimo sa completed single/triple, limit se smanjuje
  const prevType = current && current.value ? current.type : null;
  const effectiveDoubleCount = prevType === 'double' ? counts.double - 1 : counts.double;
  if (effectiveDoubleCount >= LIMITS.double && prevType !== 'double') {
    showTypeError('double');
    return;
  }

  tips[matchId] = { type: 'double', value: null };
  updateTypeButtons(matchId, 'double');
  renderValueArea(matchId, 'double');
  document.getElementById(`match-${matchId}`).className = 'match-row';
  updateCounter();
  updateGroupCounters();
}

// ---- Toggle TROZNAK ----
function toggleTriple(matchId) {
  const current = tips[matchId];
  const currentMode = current ? current.type : 'single';

  if (currentMode === 'triple') {
    // Vrati na single, poništi tip
    tips[matchId] = null;
    updateTypeButtons(matchId, 'single');
    renderValueArea(matchId, 'single');
    document.getElementById(`match-${matchId}`).className = 'match-row';
    updateCounter();
    updateGroupCounters();
    return;
  }

  // Proveri limit
  const counts = getCounts();
  const prevType = current && current.value ? current.type : null;
  const effectiveTripleCount = prevType === 'triple' ? counts.triple - 1 : counts.triple;
  if (effectiveTripleCount >= LIMITS.triple && prevType !== 'triple') {
    showTypeError('triple');
    return;
  }

  tips[matchId] = { type: 'triple', value: '1X2' };
  updateTypeButtons(matchId, 'triple');
  renderValueArea(matchId, 'triple');
  document.getElementById(`match-${matchId}`).className = 'match-row filled-triple';
  updateCounter();
  updateGroupCounters();
}

// ---- Highlight type buttons ----
function updateTypeButtons(matchId, mode) {
  const row = document.getElementById(`match-${matchId}`);
  row.querySelector('.type-double').classList.toggle('active', mode === 'double');
  row.querySelector('.type-triple').classList.toggle('active', mode === 'triple');
}

function showTypeError(type) {
  const labels = { single: 'jednoznak (max 47)', double: 'dvoznak (max 20)', triple: 'troznak (max 5)' };
  const el = document.getElementById('submit-error');
  el.textContent = `Dostignut limit za ${labels[type]}`;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ---- Izbor vrednosti ----
function selectValue(matchId, value, mode) {
  // Proveri limit ako prelazimo na novi tip
  const current = tips[matchId];
  const counts = getCounts();

  if (!current || current.type !== mode) {
    // Novi tip — proveri limit
    if (mode === 'single') {
      const prevType = current ? current.type : null;
      const effectiveCount = prevType === 'single' && current.value ? counts.single - 1 : counts.single;
      if (effectiveCount >= LIMITS.single && prevType !== 'single') {
        showTypeError('single');
        return;
      }
    }
  }

  tips[matchId] = { type: mode, value };

  // Update value buttons
  const container = document.getElementById(`val-${matchId}`);
  container.querySelectorAll('.val-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === value);
  });

  // Update type buttons highlight
  updateTypeButtons(matchId, mode);

  // Border
  document.getElementById(`match-${matchId}`).className = `match-row filled-${mode}`;

  updateCounter();
  updateGroupCounters();
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
      <span class="group-count" id="gc-${group}" style="font-size:12px;color:var(--text-muted)">0/${groupMatches.length}</span>
      <span class="chevron">▼</span>
    `;

    const body = document.createElement('div');
    body.className = 'group-body';
    body.id = `group-body-${group}`;

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

// ---- Update group counters ----
function updateGroupCounters() {
  for (const group of GROUPS) {
    const groupMatches = getMatchesByGroup(group);
    const filled = groupMatches.filter(m => tips[m.id] && tips[m.id].value !== null).length;
    const el = document.getElementById(`gc-${group}`);
    if (el) el.textContent = `${filled}/${groupMatches.length}`;
  }
}

// Override updateCounter to also update group counters
const _updateCounter = updateCounter;
// We'll call updateGroupCounters from the patched update

// ---- Submit ----
document.getElementById('submit-btn').addEventListener('click', async () => {
  const name = document.getElementById('participant-name').value.trim();
  if (!name) {
    document.getElementById('submit-error').textContent = 'Unesi ime i prezime.';
    return;
  }

  const counts = getCounts();
  if (counts.single !== 47 || counts.double !== 20 || counts.triple !== 5) {
    document.getElementById('submit-error').textContent = 'Proveri raspodelu tipova (47/20/5).';
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Slanje...';
  document.getElementById('submit-error').textContent = '';

  try {
    // 1. Kreiraj učesnika
    const { data: participant, error: pErr } = await supabase
      .from('participants')
      .insert({ name })
      .select('id')
      .single();

    if (pErr) throw pErr;

    // 2. Pripremi batch tipova
    const tipsArr = Object.entries(tips).map(([matchId, t]) => ({
      participant_id: participant.id,
      match_id: parseInt(matchId),
      tip_type: t.type,
      tip_value: t.value,
    }));

    // 3. Insert tipova u batchevima
    const BATCH = 50;
    for (let i = 0; i < tipsArr.length; i += BATCH) {
      const { error: tErr } = await supabase
        .from('tips')
        .insert(tipsArr.slice(i, i + BATCH));
      if (tErr) throw tErr;
    }

    // 4. Prikaži success
    const modal = document.getElementById('success-modal');
    modal.style.display = 'flex';

  } catch (err) {
    console.error(err);
    document.getElementById('submit-error').textContent =
      'Greška pri slanju: ' + (err.message || 'Pokušaj ponovo.');
    btn.disabled = false;
    btn.textContent = 'Pošalji tipove';
  }
});

// Name input triggers counter update (for button enable)
document.getElementById('participant-name').addEventListener('input', updateCounter);

// ---- Patch updateCounter to also update group counters ----
const origUpdateCounter = updateCounter;
function patchedUpdateCounter() {
  origUpdateCounter();
  updateGroupCounters();
}
// Replace all calls — we'll just call patchedUpdateCounter after type/value select

// ---- Init ----
if (checkDeadline()) {
  renderMatches();
  updateCounter();
}
