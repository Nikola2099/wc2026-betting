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

  // Match number
  const num = document.createElement('div');
  num.className = 'match-num';
  num.textContent = `#${match.id}`;

  // Date
  const date = document.createElement('div');
  date.className = 'match-date';
  date.textContent = formatDate(match.date);

  // Teams
  const teams = document.createElement('div');
  teams.className = 'match-teams';
  teams.innerHTML = `${match.home} <span class="vs">vs</span> ${match.away}`;

  // Controls
  const controls = document.createElement('div');
  controls.className = 'tip-controls';

  // Type buttons
  const typeBtns = document.createElement('div');
  typeBtns.className = 'type-btns';

  for (const [type, label] of [['single','1'], ['double','12'], ['triple','1X2']]) {
    const btn = document.createElement('button');
    btn.className = `tip-btn type-${type}`;
    btn.dataset.type = type;
    btn.title = type === 'single' ? 'Jednoznak' : type === 'double' ? 'Dvoznak' : 'Troznak';
    btn.textContent = label === '12' ? '½' : label; // visual label
    // Better labels
    if (type === 'single') btn.textContent = '1';
    if (type === 'double') btn.textContent = '½';
    if (type === 'triple') btn.textContent = '1X2';
    btn.addEventListener('click', () => selectType(match.id, type));
    typeBtns.appendChild(btn);
  }

  const div = document.createElement('div');
  div.className = 'divider';

  // Value buttons container
  const valueBtns = document.createElement('div');
  valueBtns.className = 'value-btns';
  valueBtns.id = `val-${match.id}`;

  controls.appendChild(typeBtns);
  controls.appendChild(div);
  controls.appendChild(valueBtns);

  row.appendChild(num);
  row.appendChild(date);
  row.appendChild(teams);
  row.appendChild(controls);

  return row;
}

// ---- Izbor tipa ----
function selectType(matchId, type) {
  // Provera limita pre promene
  const current = tips[matchId];
  const counts = getCounts();

  // Ako menjamo sa drugog tipa, oduzmi stari
  if (current && current.type !== type && current.value !== null) {
    // Proveri da li novi tip može da se doda
    const newCount = counts[type] + 1;
    if (newCount > LIMITS[type]) {
      showTypeError(type);
      return;
    }
  } else if (!current || current.value === null) {
    const newCount = counts[type] + 1;
    if (newCount > LIMITS[type]) {
      showTypeError(type);
      return;
    }
  }

  // Postavi tip
  if (type === 'triple') {
    tips[matchId] = { type: 'triple', value: '1X2' };
  } else {
    tips[matchId] = { type, value: null };
  }

  // Update UI
  const row = document.getElementById(`match-${matchId}`);

  // Highlight active type button
  row.querySelectorAll('.tip-btn[data-type]').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });

  // Render value buttons
  renderValueBtns(matchId, type);

  // Border color
  row.className = `match-row${type === 'triple' ? ' filled-triple' : ''}`;

  updateCounter();
}

function showTypeError(type) {
  const labels = { single: 'jednoznak (max 47)', double: 'dvoznak (max 20)', triple: 'troznak (max 5)' };
  const el = document.getElementById('submit-error');
  el.textContent = `Dostignut limit za ${labels[type]}`;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ---- Render vrednosti ----
function renderValueBtns(matchId, type) {
  const container = document.getElementById(`val-${matchId}`);
  container.innerHTML = '';

  if (type === 'triple') {
    const span = document.createElement('span');
    span.className = 'badge badge-triple';
    span.textContent = '1X2 ✓';
    container.appendChild(span);
    return;
  }

  for (const val of TYPE_OPTIONS[type]) {
    const btn = document.createElement('button');
    btn.className = 'tip-btn val-btn';
    btn.dataset.value = val;
    btn.textContent = val;

    // Restore selection if exists
    if (tips[matchId] && tips[matchId].value === val) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => selectValue(matchId, val));
    container.appendChild(btn);
  }
}

// ---- Izbor vrednosti ----
function selectValue(matchId, value) {
  if (!tips[matchId]) return;

  tips[matchId].value = value;

  // Update UI
  const container = document.getElementById(`val-${matchId}`);
  container.querySelectorAll('.val-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === value);
  });

  const row = document.getElementById(`match-${matchId}`);
  const type = tips[matchId].type;
  row.className = `match-row filled-${type}`;

  updateCounter();
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
