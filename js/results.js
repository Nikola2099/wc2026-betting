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
    if (i > 0 && scored[i].correct < scored[i-1].correct) rank = i + 1;

    const rankLabels = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const pct = resultsEntered > 0 ? `${Math.round(p.correct / resultsEntered * 100)}%` : '-';
    const scoreColor = rank === 1 ? 'var(--success)' : rank <= 3 ? 'var(--gold)' : 'var(--text)';

    const row = document.createElement('div');
    row.className = `leaderboard-row${rank <= 3 ? ` top${rank}` : ''}`;
    row.innerHTML = `
      <div class="rank-num r${rank <= 3 ? rank : ''}">${rankLabels[rank] || rank}</div>
      <div class="participant-name" title="${escHtml(p.name)}">${escHtml(p.name)}</div>
      <div class="score-big" style="color:${scoreColor}">${p.correct}</div>
      <div style="font-size:11px;color:var(--text-muted);text-align:right">${pct}</div>
    `;
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

  // Header: Utakmica | Rez. | ime1 | ime2 | ...
  const hRow = document.createElement('tr');
  let hHtml = `<th class="match-col">Utakmica</th><th class="res-col">Rez.</th>`;
  for (const p of scored) {
    const parts = escHtml(p.name).split(' ');
    const scoreColor = p.correct >= 50 ? 'var(--success)' : p.correct >= 35 ? 'var(--gold)' : 'var(--text-muted)';
    hHtml += `<th title="${escHtml(p.name)}" style="font-size:10px;padding:5px 4px;max-width:70px;">${parts[0]}<br><span style="font-weight:400;color:var(--text-muted)">${parts[1]||''}</span><br><span style="font-weight:800;font-size:12px;color:${scoreColor}">${p.correct}</span></th>`;
  }
  hRow.innerHTML = hHtml;
  thead.appendChild(hRow);

  // Red sa ukupnim bodovima
  const sumRow = document.createElement('tr');
  let sHtml = `<td class="name-cell" style="font-size:11px;color:var(--text-muted);">Ukupno</td><td class="res-cell" style="text-align:center;color:var(--text-muted);font-size:11px;">–</td>`;
  for (const p of scored) {
    const c = p.correct >= 50 ? 'var(--success)' : p.correct >= 35 ? 'var(--gold)' : 'var(--text-muted)';
    sHtml += `<td class="score-row" style="text-align:center;color:${c}">${p.correct}</td>`;
  }
  sumRow.innerHTML = sHtml;
  tbody.appendChild(sumRow);

  // Red po utakmica
  for (const m of MATCHES) {
    const r = resultMap[m.id];
    const row = document.createElement('tr');
    let rHtml = `
      <td class="name-cell">#${m.id} ${escHtml(m.home)} vs ${escHtml(m.away)}</td>
      <td class="res-cell" style="text-align:center;"><span class="result-badge">${r || '–'}</span></td>`;
    for (const p of scored) {
      const ptips = tipMap[p.id] || {};
      const t = ptips[m.id];
      if (!t) { rHtml += `<td>–</td>`; continue; }
      const ok = isCorrect(t.type, t.value, r);
      const cls = ok === null ? '' : (ok ? ' ok' : ' bad');
      rHtml += `<td style="text-align:center;"><span class="tc${cls}">${t.value}</span></td>`;
    }
    row.innerHTML = rHtml;
    tbody.appendChild(row);
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadResults();
