// ============================================================
// stats.js — statistika za narednih 5 utakmica
// ============================================================

const TIP_VALUES = ['1', 'X', '2', '1X', 'X2', '12', '1X2'];

function coversOutcome(tipValue, outcome) {
  if (tipValue === outcome) return true;
  if (tipValue === '1X')  return outcome === '1' || outcome === 'X';
  if (tipValue === 'X2')  return outcome === 'X' || outcome === '2';
  if (tipValue === '12')  return outcome === '1' || outcome === '2';
  if (tipValue === '1X2') return true;
  return false;
}

async function loadStats() {
  const [{ data: matchResults }, { count: totalParticipants }] = await Promise.all([
    supabase.from('matches').select('id, result'),
    supabase.from('participants').select('id', { count: 'exact', head: true }),
  ]);

  const resultMap = {};
  for (const m of matchResults) resultMap[m.id] = m.result;

  // Narednih 5 utakmica bez rezultata
  const upcoming = MATCHES.filter(m => !resultMap[m.id]).slice(0, 5);

  document.getElementById('loading').style.display = 'none';

  if (upcoming.length === 0) {
    document.getElementById('stats-content').style.display = 'block';
    document.getElementById('stats-grid').innerHTML =
      '<div class="no-upcoming">Sve utakmice grupne faze su završene.</div>';
    return;
  }

  document.getElementById('participants-info').textContent =
    `${totalParticipants} učesnika`;

  // Fetch tipova samo za tih 5 utakmica
  const upcomingIds = upcoming.map(m => m.id);
  const { data: tips } = await supabase
    .from('tips')
    .select('match_id, tip_value')
    .in('match_id', upcomingIds);

  // Statistika po utakmici: { matchId: { tipValue: count } }
  const matchStats = {};
  for (const id of upcomingIds) matchStats[id] = {};
  for (const t of tips || []) {
    matchStats[t.match_id][t.tip_value] = (matchStats[t.match_id][t.tip_value] || 0) + 1;
  }

  // Render
  const grid = document.getElementById('stats-grid');
  for (const match of upcoming) {
    grid.appendChild(buildMatchCard(match, matchStats[match.id], totalParticipants));
  }

  document.getElementById('stats-content').style.display = 'block';
}

function buildMatchCard(match, stats, totalParticipants) {
  const card = document.createElement('div');
  card.className = 'match-stat-card';

  // Ukupno tipova za ovu utakmicu
  const total = Object.values(stats).reduce((s, n) => s + n, 0);

  // Pokrivenost ishoda
  const cover = { '1': 0, 'X': 0, '2': 0 };
  for (const [val, cnt] of Object.entries(stats)) {
    for (const outcome of ['1', 'X', '2']) {
      if (coversOutcome(val, outcome)) cover[outcome] += cnt;
    }
  }

  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

  // Breakdown chipovi
  const chips = TIP_VALUES
    .filter(v => stats[v])
    .map(v => {
      const cls = v.length === 1 ? `v${v}` : (v === '1X2' ? 'v1X2' : `v${v}`);
      return `<div class="tip-chip">
        <span class="chip-val ${cls}">${v}</span>
        <span class="chip-count">${stats[v]}×</span>
        <span class="chip-count">${pct(stats[v])}%</span>
      </div>`;
    }).join('');

  card.innerHTML = `
    <div class="match-stat-header">
      <span class="match-stat-id">#${match.id}</span>
      <span class="match-stat-teams">${escHtml(match.home)} <span style="color:var(--text-muted);font-weight:400;font-size:13px">vs</span> ${escHtml(match.away)}</span>
      <span class="match-stat-date">${formatDate(match.date)}</span>
      <span class="match-stat-total">${total}/${totalParticipants} tipova</span>
    </div>

    <div class="outcome-bars">
      ${buildOutcomeRow('1', 'o1', cover['1'], pct(cover['1']))}
      ${buildOutcomeRow('X', 'oX', cover['X'], pct(cover['X']))}
      ${buildOutcomeRow('2', 'o2', cover['2'], pct(cover['2']))}
    </div>

    <div style="margin-top:14px; font-size:12px; color:var(--text-muted); font-weight:600;">Raspodela po tipu</div>
    <div class="tip-breakdown open">
      ${chips || '<span style="color:var(--text-muted);font-size:12px">Nema tipova</span>'}
    </div>
  `;

  return card;
}

function buildOutcomeRow(label, cls, count, pct) {
  return `
    <div class="outcome-row">
      <div class="outcome-label ${cls}">${label}</div>
      <div class="outcome-bar-wrap">
        <div class="outcome-bar-fill ${cls}" style="width:${pct}%"></div>
      </div>
      <div class="outcome-stats">${count}<span>/ ${pct}%</span></div>
    </div>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadStats();
