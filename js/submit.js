// ============================================================
// submit.js
// ============================================================

const DEADLINE  = new Date('2026-06-10T23:59:59+02:00');
const LIMITS    = { single: 47, double: 20, triple: 5 };
const tips      = {}; // { matchId: { type, value } | null }

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
    if (c[t.type] !== undefined) c[t.type]++;
    c.total++;
  }
  return c;
}

function updateCounter() {
  const c = getCounts();
  const sOk = c.single === LIMITS.single;
  const dOk = c.double === LIMITS.double;
  const tOk = c.triple === LIMITS.triple;

  const s = document.getElementById('cnt-single');
  const d = document.getElementById('cnt-double');
  const t = document.getElementById('cnt-triple');
  const tot = document.getElementById('cnt-total');
  const st  = document.getElementById('counter-status');

  s.textContent   = `${c.single}/${LIMITS.single}`;
  d.textContent   = `${c.double}/${LIMITS.double}`;
  t.textContent   = `${c.triple}/${LIMITS.triple}`;
  tot.textContent = `${c.total}/72`;

  s.className = `counter-pill single${sOk ? ' ok' : c.single > LIMITS.single ? ' err' : ''}`;
  d.className = `counter-pill double${dOk ? ' ok' : c.double > LIMITS.double ? ' err' : ''}`;
  t.className = `counter-pill triple${tOk ? ' ok' : c.triple > LIMITS.triple ? ' err' : ''}`;

  if (c.single > LIMITS.single)       st.innerHTML = `<span style="color:var(--danger)">Previše jednoznaka (max 47)</span>`;
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

// ---- Render match row ----
// Svi dugmadi se kreiraju jednom — samo se show/hide menja
function renderMatchRow(match) {
  const id = match.id;
  const row = document.createElement('div');
  row.className = 'match-row';
  row.id = `match-${id}`;

  // Broj
  const num = document.createElement('div');
  num.className = 'match-num';
  num.textContent = `#${id}`;

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

  // --- Single vrednosti (1/X/2) ---
  const singleGroup = document.createElement('div');
  singleGroup.className = 'value-btns';
  singleGroup.id = `sg-${id}`;
  for (const val of ['1', 'X', '2']) {
    const btn = document.createElement('button');
    btn.className = 'tip-btn val-btn';
    btn.textContent = val;
    btn.dataset.val = val;
    btn.addEventListener('click', () => selectValue(id, 'single', val));
    singleGroup.appendChild(btn);
  }

  // --- Double vrednosti (1X/X2/12) — inicijalno skrivene ---
  const doubleGroup = document.createElement('div');
  doubleGroup.className = 'value-btns';
  doubleGroup.id = `dg-${id}`;
  doubleGroup.style.display = 'none';
  for (const val of ['1X', 'X2', '12']) {
    const btn = document.createElement('button');
    btn.className = 'tip-btn val-btn';
    btn.textContent = val;
    btn.dataset.val = val;
    btn.addEventListener('click', () => selectValue(id, 'double', val));
    doubleGroup.appendChild(btn);
  }

  // --- Triple label — inicijalno skriveno ---
  const tripleLabel = document.createElement('span');
  tripleLabel.className = 'badge badge-triple';
  tripleLabel.id = `tl-${id}`;
  tripleLabel.textContent = 'AUTO ✓';
  tripleLabel.style.display = 'none';

  // Divider
  const divider = document.createElement('div');
  divider.className = 'divider';

  // --- DVOZNAK / TROZNAK dugmad ---
  const typeGroup = document.createElement('div');
  typeGroup.className = 'type-btns';

  const dBtn = document.createElement('button');
  dBtn.className = 'tip-btn type-double';
  dBtn.id = `db-${id}`;
  dBtn.textContent = 'DVOZNAK';
  dBtn.addEventListener('click', () => toggleType(id, 'double'));

  const tBtn = document.createElement('button');
  tBtn.className = 'tip-btn type-triple';
  tBtn.id = `tb-${id}`;
  tBtn.textContent = 'TROZNAK';
  tBtn.addEventListener('click', () => toggleType(id, 'triple'));

  typeGroup.appendChild(dBtn);
  typeGroup.appendChild(tBtn);

  controls.appendChild(singleGroup);
  controls.appendChild(doubleGroup);
  controls.appendChild(tripleLabel);
  controls.appendChild(divider);
  controls.appendChild(typeGroup);

  row.appendChild(num);
  row.appendChild(date);
  row.appendChild(teams);
  row.appendChild(controls);

  return row;
}

// ---- Prebaci prikaz grupe dugmadi ----
function showMode(matchId, mode) {
  document.getElementById(`sg-${matchId}`).style.display = mode === 'single' ? '' : 'none';
  document.getElementById(`dg-${matchId}`).style.display = mode === 'double' ? '' : 'none';
  document.getElementById(`tl-${matchId}`).style.display = mode === 'triple' ? '' : 'none';

  const db = document.getElementById(`db-${matchId}`);
  const tb = document.getElementById(`tb-${matchId}`);
  if (db) db.classList.toggle('active', mode === 'double');
  if (tb) tb.classList.toggle('active', mode === 'triple');
}

// ---- Highlight izabrane vrednosti ----
function highlightValue(matchId, mode, selectedVal) {
  const groupId = mode === 'single' ? `sg-${matchId}` : `dg-${matchId}`;
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.val-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === selectedVal);
  });
}

// ---- Toggle DVOZNAK / TROZNAK ----
function toggleType(matchId, type) {
  const current   = tips[matchId];
  const curType   = current ? current.type : 'single';

  // Klik na isti tip → vrati na single
  if (curType === type) {
    tips[matchId] = null;
    showMode(matchId, 'single');
    highlightValue(matchId, 'single', null);
    document.getElementById(`match-${matchId}`).className = 'match-row';
    updateCounter();
    updateGroupCounters();
    return;
  }

  // Proveri limit (broji samo matcheve koji imaju TIP tog tipa, ma bez obzira na vrednost)
  const counts = getCounts();
  const prevType  = current ? current.type : null;
  const prevHasVal = current && current.value != null;
  // Koliko je VEC ovog tipa sa vrednostima
  const typeCount = counts[type] || 0;
  // Ako prelazimo SA tog istog tipa, ne dodajemo novi
  const adding = prevType !== type;
  if (adding && typeCount >= LIMITS[type]) {
    showError(`Dostignut limit za ${type === 'double' ? 'dvoznak (max 20)' : 'troznak (max 5)'}`);
    return;
  }

  if (type === 'triple') {
    tips[matchId] = { type: 'triple', value: '1X2' };
    showMode(matchId, 'triple');
    document.getElementById(`match-${matchId}`).className = 'match-row filled-triple';
  } else {
    // double — vrednost se bira naknadno
    tips[matchId] = { type: 'double', value: null };
    showMode(matchId, 'double');
    highlightValue(matchId, 'double', null);
    document.getElementById(`match-${matchId}`).className = 'match-row';
  }

  updateCounter();
  updateGroupCounters();
}

// ---- Izbor vrednosti ----
function selectValue(matchId, mode, value) {
  const current = tips[matchId];
  const curType = current ? current.type : 'single';

  // Ako klikamo single dok je double/triple aktivan — ignorisi
  if (mode === 'single' && curType !== 'single' && curType !== null) return;

  // Limit check za single (double i triple su već limitirani u toggleType)
  if (mode === 'single' && curType !== 'single') {
    const counts = getCounts();
    if (counts.single >= LIMITS.single) {
      showError('Dostignut limit za jednoznak (max 47)');
      return;
    }
  }

  tips[matchId] = { type: mode, value };
  highlightValue(matchId, mode, value);
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
