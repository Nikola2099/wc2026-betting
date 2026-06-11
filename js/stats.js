// ============================================================
// stats.js — statistika za narednih 5 utakmica (tab u results)
// ============================================================

const TIP_VALUES = ['1', 'X', '2', '1X', 'X2', '12', '1X2'];

let statsLoaded = false;

async function loadStatsTab() {
  if (statsLoaded) return;
  statsLoaded = true;

  const container = document.getElementById('stats-tab-content');

  const [{ data: matchResults }, { data: participants }] = await Promise.all([
    supabase.from('matches').select('id, result'),
    supabase.from('participants').select('id, name'),
  ]);

  const resultMap = {};
  for (const m of matchResults) resultMap[m.id] = m.result;

  const nameMap = {};
  for (const p of participants || []) nameMap[p.id] = p.name;

  const upcoming = MATCHES.filter(m => !resultMap[m.id]);

  if (upcoming.length === 0) {
    container.innerHTML = '<div class="loading" style="color:var(--text-muted)">Sve utakmice grupne faze su završene.</div>';
    return;
  }

  const upcomingIds = upcoming.map(m => m.id);
  const tips = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('tips')
      .select('participant_id, match_id, tip_value')
      .in('match_id', upcomingIds)
      .range(from, from + PAGE - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    tips.push(...data);
    if (data.length < PAGE) break;
  }

  // { matchId: { tipValue: [name, ...] } }
  const matchStats = {};
  for (const id of upcomingIds) matchStats[id] = {};
  for (const t of tips || []) {
    if (!matchStats[t.match_id][t.tip_value]) matchStats[t.match_id][t.tip_value] = [];
    matchStats[t.match_id][t.tip_value].push(nameMap[t.participant_id] || '?');
  }

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  for (const match of upcoming) {
    grid.appendChild(buildMatchCard(match, matchStats[match.id], participants?.length || 0));
  }

  container.innerHTML = '';
  container.appendChild(grid);
}

function buildMatchCard(match, stats, totalParticipants) {
  const card = document.createElement('div');
  card.className = 'match-stat-card';

  const total = Object.values(stats).reduce((s, arr) => s + arr.length, 0);
  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

  // Header
  const header = document.createElement('div');
  header.className = 'match-stat-header';
  header.innerHTML = `
    <span class="match-stat-id">#${match.id}</span>
    <span class="match-stat-teams">${escHtml2(match.home)} <span style="color:var(--text-muted);font-weight:400;font-size:13px">vs</span> ${escHtml2(match.away)}</span>
    <span class="match-stat-date">${formatDate(match.date)}</span>
    <span class="match-stat-total">${total}/${totalParticipants} tipova</span>
  `;
  card.appendChild(header);

  // Chips + names panel
  const breakdown = document.createElement('div');
  breakdown.className = 'tip-breakdown';

  const namesPanel = document.createElement('div');
  namesPanel.className = 'names-panel';

  let activeChip = null;

  const presentValues = TIP_VALUES.filter(v => stats[v]);
  if (presentValues.length === 0) {
    breakdown.innerHTML = '<span style="color:var(--text-muted);font-size:12px">Nema tipova</span>';
  } else {
    for (const v of presentValues) {
      const names = stats[v];
      const chip = document.createElement('div');
      chip.className = 'tip-chip tip-chip-btn';
      chip.innerHTML = `
        <span class="chip-val v${v}">${v}</span>
        <span class="chip-count">${names.length}×</span>
        <span class="chip-count">${pct(names.length)}%</span>
      `;
      chip.addEventListener('click', () => {
        if (activeChip === chip) {
          chip.classList.remove('active');
          namesPanel.style.display = 'none';
          activeChip = null;
          return;
        }
        if (activeChip) activeChip.classList.remove('active');
        activeChip = chip;
        chip.classList.add('active');
        namesPanel.style.display = 'block';
        namesPanel.innerHTML = names
          .slice()
          .sort()
          .map(n => `<span class="name-tag">${escHtml2(n)}</span>`)
          .join('');
      });
      breakdown.appendChild(chip);
    }
  }

  card.appendChild(breakdown);
  card.appendChild(namesPanel);

  return card;
}

function escHtml2(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
