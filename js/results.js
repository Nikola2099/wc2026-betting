// ============================================================
// results.js — prikaz rezultata i rang liste
// ============================================================

const DEADLINE = new Date('2026-06-10T23:59:59+02:00');

function isCorrect(tipType, tipValue, result) {
  if (!result) return null; // još nema rezultata
  if (tipType === 'triple') return true;
  if (tipType === 'single') return tipValue === result;
  // double
  if (tipValue === '1X') return result === '1' || result === 'X';
  if (tipValue === 'X2') return result === 'X' || result === '2';
  if (tipValue === '12') return result === '1' || result === '2';
  return false;
}

function tipClass(tipType) {
  return tipType === 'single' ? 's' : tipType === 'double' ? 'd' : 't';
}

async function loadResults() {
  const isOpen = new Date() < DEADLINE;

  // Provjeri settings iz baze
  let submissionsOpen = isOpen;
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'submissions_open').single();
    if (data) submissionsOpen = data.value === 'true';
  } catch (_) {}

  document.getElementById('loading').style.display = 'none';

  if (submissionsOpen && isOpen) {
    document.getElementById('locked-section').style.display = 'block';
    return;
  }

  // Učitaj podatke
  const [{ data: participants }, { data: tips }, { data: matchResults }] = await Promise.all([
    supabase.from('participants').select('id, name, created_at').order('created_at'),
    supabase.from('tips').select('participant_id, match_id, tip_type, tip_value'),
    supabase.from('matches').select('id, result'),
  ]);

  if (!participants || participants.length === 0) {
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('leaderboard-list').innerHTML =
      '<div class="loading">Nema prijava.</div>';
    return;
  }

  // Mapa rezultata: matchId → result
  const resultMap = {};
  for (const m of matchResults) {
    resultMap[m.id] = m.result;
  }

  // Mapa tipova: participantId → { matchId → {type, value} }
  const tipMap = {};
  for (const t of tips) {
    if (!tipMap[t.participant_id]) tipMap[t.participant_id] = {};
    tipMap[t.participant_id][t.match_id] = { type: t.tip_type, value: t.tip_value };
  }

  // Izračunaj bodove
  const scored = participants.map(p => {
    const ptips = tipMap[p.id] || {};
    let correct = 0, played = 0;
    for (const match of MATCHES) {
      const r = resultMap[match.id];
      const t = ptips[match.id];
      if (!t) continue;
      played++;
      const ok = isCorrect(t.type, t.value, r);
      if (ok === true) correct++;
    }
    return { ...p, correct, played, total: MATCHES.filter(m => resultMap[m.id]).length };
  });

  // Sortiraj po bodovima
  scored.sort((a, b) => b.correct - a.correct);

  const maxCorrect = scored[0]?.correct || 0;
  const resultsEntered = MATCHES.filter(m => resultMap[m.id]).length;

  document.getElementById('stats-summary').textContent =
    `${participants.length} učesnika • ${resultsEntered}/72 utakmica sa rezultatom`;
  document.getElementById('results-section').style.display = 'block';

  // ---- Rang lista ----
  const list = document.getElementById('leaderboard-list');
  let rank = 1;
  for (let i = 0; i < scored.length; i++) {
    const p = scored[i];
    // Isti rank za iste bodove
    if (i > 0 && scored[i].correct < scored[i-1].correct) rank = i + 1;

    const row = document.createElement('div');
    row.className = `leaderboard-row${rank <= 3 ? ` top${rank}` : ''}`;

    const rankLabels = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const rankEl = document.createElement('div');
    rankEl.className = `rank-num r${rank <= 3 ? rank : ''}`;
    rankEl.textContent = rankLabels[rank] || rank;

    const info = document.createElement('div');
    info.innerHTML = `
      <div class="participant-name">${escHtml(p.name)}</div>
      <div class="participant-meta">
        ${p.correct} / ${resultsEntered} pogodaka
        ${rank === 1 && resultsEntered > 0 ? ' 🏆' : ''}
      </div>
      <div class="progress-bar" style="max-width: 200px;">
        <div class="progress-fill" style="width: ${resultsEntered > 0 ? Math.round(p.correct/resultsEntered*100) : 0}%"></div>
      </div>
    `;

    const scoreWrap = document.createElement('div');
    scoreWrap.style.textAlign = 'right';
    scoreWrap.innerHTML = `
      <div class="score-big">${p.correct}</div>
      <div class="score-max">/ ${resultsEntered}</div>
    `;

    const pct = document.createElement('div');
    pct.style.cssText = 'font-size:13px;color:var(--text-muted);text-align:right;min-width:48px;';
    pct.textContent = resultsEntered > 0
      ? `${Math.round(p.correct / resultsEntered * 100)}%` : '-';

    row.appendChild(rankEl);
    row.appendChild(info);
    row.appendChild(scoreWrap);
    row.appendChild(pct);
    list.appendChild(row);
  }

  // ---- Detaljna tabela ----
  buildDetailTable(scored, tipMap, resultMap);

  // ---- Tabs ----
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

function buildDetailTable(scored, tipMap, resultMap) {
  const thead = document.getElementById('detail-head');
  const tbody = document.getElementById('detail-body');

  // Header row: Ime | #1 | #2 | ... | #72 | Σ
  const hRow = document.createElement('tr');
  hRow.innerHTML = `<th style="position:sticky;left:0;background:var(--bg-card2);z-index:3;">Učesnik</th>`;
  for (const m of MATCHES) {
    hRow.innerHTML += `<th class="match-header" title="${m.home} vs ${m.away}">#${m.id}</th>`;
  }
  hRow.innerHTML += `<th style="position:sticky;right:0;background:var(--bg-card2);z-index:3;">Σ</th>`;
  thead.appendChild(hRow);

  // Result row
  const rRow = document.createElement('tr');
  rRow.innerHTML = `<td class="name-cell" style="font-size:11px;color:var(--text-muted);">Rezultat</td>`;
  for (const m of MATCHES) {
    const r = resultMap[m.id];
    rRow.innerHTML += `<td><span class="result-badge">${r || '–'}</span></td>`;
  }
  rRow.innerHTML += `<td class="score-cell">–</td>`;
  tbody.appendChild(rRow);

  // Participant rows
  for (const p of scored) {
    const ptips = tipMap[p.id] || {};
    const row = document.createElement('tr');
    row.innerHTML = `<td class="name-cell">${escHtml(p.name)}</td>`;

    for (const m of MATCHES) {
      const t = ptips[m.id];
      const r = resultMap[m.id];
      if (!t) {
        row.innerHTML += `<td>–</td>`;
        continue;
      }
      const ok = isCorrect(t.type, t.value, r);
      const cls = tipClass(t.type);
      const stateCls = ok === null ? '' : (ok ? ' ok' : ' bad');
      row.innerHTML += `<td><span class="tc ${cls}${stateCls}">${t.value}</span></td>`;
    }

    row.innerHTML += `<td class="score-cell">${p.correct}</td>`;
    tbody.appendChild(row);
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadResults();
