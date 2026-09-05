const BASE_URL = 'http://localhost:5000';
const SVG_NS = 'http://www.w3.org/2000/svg';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/* ---------- small helpers ---------- */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function fmtMoney(v) {
  return currencyFormatter.format(v);
}

function fmtCompact(v) {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return `$${Math.round(v)}`;
}

function fmtDate(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function monthShort(key) {
  const [, m] = key.split('-').map(Number);
  return MONTH_NAMES[m - 1];
}

function niceRoundUp(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / pow;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}

function pctChange(curr, prev) {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

/* ---------- aggregation ---------- */

function computeMonthlySeries(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (t.amount > 0) {
      const k = t.date.slice(0, 7);
      map.set(k, (map.get(k) || 0) + t.amount);
    }
  }
  const keys = [...map.keys()].sort();
  return keys.map((k) => ({ key: k, label: monthShort(k), total: map.get(k) }));
}

function computeCategoryBreakdown(transactions, cap = 8) {
  const map = new Map();
  for (const t of transactions) {
    if (t.amount > 0) {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    }
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, cap);
  const rest = sorted.slice(cap);
  const restTotal = rest.reduce((s, [, v]) => s + v, 0);
  const rows = top.map(([name, total], i) => ({ name, total, color: `var(--series-${i + 1})` }));
  if (restTotal > 0) rows.push({ name: 'Other', total: restTotal, color: 'var(--other)' });
  return rows;
}

function computeKpis(transactions) {
  const perMonth = new Map();
  for (const t of transactions) {
    const k = t.date.slice(0, 7);
    if (!perMonth.has(k)) perMonth.set(k, { spent: 0, income: 0 });
    const rec = perMonth.get(k);
    if (t.amount > 0) rec.spent += t.amount;
    else rec.income += -t.amount;
  }
  const keys = [...perMonth.keys()].sort();
  const latestKey = keys[keys.length - 1];
  const prevKey = keys.length > 1 ? keys[keys.length - 2] : null;
  const latest = perMonth.get(latestKey);
  const prev = prevKey ? perMonth.get(prevKey) : null;

  const highest = transactions.reduce((max, t) => (max === null || t.amount > max.amount ? t : max), null);

  return {
    monthLabel: monthLabel(latestKey),
    spent: latest.spent,
    income: latest.income,
    net: latest.income - latest.spent,
    spentDelta: prev ? pctChange(latest.spent, prev.spent) : null,
    incomeDelta: prev ? pctChange(latest.income, prev.income) : null,
    highest: highest ? { amount: highest.amount, description: highest.description } : { amount: 0, description: '' },
  };
}

/* ---------- renderers ---------- */

function renderKpis(kpis) {
  const row = document.getElementById('kpi-row');
  row.textContent = '';

  const tiles = [
    { label: `Spent in ${kpis.monthLabel}`, value: fmtMoney(kpis.spent), delta: kpis.spentDelta, goodWhen: 'down' },
    { label: `Income in ${kpis.monthLabel}`, value: fmtMoney(kpis.income), delta: kpis.incomeDelta, goodWhen: 'up' },
    { label: `Net in ${kpis.monthLabel}`, value: `${kpis.net >= 0 ? '+' : '-'}${fmtMoney(Math.abs(kpis.net))}` },
    { label: 'Highest transaction', value: fmtMoney(kpis.highest.amount), sub: kpis.highest.description },
  ];

  for (const t of tiles) {
    const tile = el('div', 'kpi-tile');
    tile.appendChild(el('p', 'kpi-label', t.label));
    tile.appendChild(el('p', 'kpi-value', t.value));

    if (t.delta !== null && t.delta !== undefined) {
      const isGood = (t.goodWhen === 'down' && t.delta < 0) || (t.goodWhen === 'up' && t.delta > 0);
      const arrow = t.delta > 0 ? '▲' : t.delta < 0 ? '▼' : '—';
      tile.appendChild(el('p', 'kpi-delta' + (isGood ? ' good' : ''), `${arrow} ${Math.abs(t.delta).toFixed(1)}% vs last month`));
    } else if (t.sub) {
      tile.appendChild(el('p', 'kpi-delta', t.sub));
    }

    row.appendChild(tile);
  }
}

function renderCategoryBars(rows) {
  const container = document.getElementById('cat-list');
  container.textContent = '';

  if (rows.length === 0) {
    container.appendChild(el('p', 'card-sub', 'No spending yet.'));
    return;
  }

  const max = Math.max(...rows.map((r) => r.total));

  for (const r of rows) {
    const rowEl = el('div', 'cat-row');

    const top = el('div', 'cat-row-top');
    const dot = el('span', 'cat-dot');
    dot.style.background = r.color;
    top.appendChild(dot);
    top.appendChild(el('span', 'cat-name', r.name));
    top.appendChild(el('span', 'cat-amount', fmtMoney(r.total)));
    rowEl.appendChild(top);

    const track = el('div', 'cat-track');
    const fill = el('div', 'cat-fill');
    fill.style.width = `${((r.total / max) * 100).toFixed(1)}%`;
    fill.style.background = r.color;
    track.appendChild(fill);
    rowEl.appendChild(track);

    container.appendChild(rowEl);
  }
}

function renderTransactions(transactions, catColorMap) {
  const tbody = document.getElementById('txn-body');
  tbody.textContent = '';

  const sub = document.getElementById('txn-sub');
  sub.textContent = `Showing ${Math.min(10, transactions.length)} of ${transactions.length}`;

  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  for (const t of recent) {
    const tr = document.createElement('tr');

    tr.appendChild(el('td', 'txn-desc', t.description));

    const tdCat = document.createElement('td');
    const catWrap = el('div', 'txn-cat');
    const dot = el('span', 'cat-dot');
    dot.style.background = catColorMap.get(t.category) || 'var(--other)';
    catWrap.appendChild(dot);
    catWrap.appendChild(document.createTextNode(t.category));
    tdCat.appendChild(catWrap);
    tr.appendChild(tdCat);

    tr.appendChild(el('td', null, fmtDate(t.date)));

    const tdAmount = document.createElement('td');
    tdAmount.className = 'num';
    const isIncome = t.amount < 0;
    tdAmount.appendChild(el('span', 'amount' + (isIncome ? ' in' : ''), `${isIncome ? '+' : '-'}${fmtMoney(Math.abs(t.amount))}`));
    tr.appendChild(tdAmount);

    tbody.appendChild(tr);
  }
}

function renderBankChips(banks) {
  const container = document.getElementById('bank-chips');
  container.textContent = '';
  for (const b of banks) {
    const chip = el('span', 'bank-chip');
    chip.appendChild(el('span', 'dot'));
    chip.appendChild(document.createTextNode(b.bank_name));
    container.appendChild(chip);
  }
}

function renderTrendChart(series) {
  const svg = document.getElementById('trend-svg');
  const tooltip = document.getElementById('trend-tooltip');
  const wrap = document.getElementById('trend-wrap');
  const sub = document.getElementById('trend-sub');
  svg.textContent = '';
  tooltip.hidden = true;

  const W = 600, H = 220;

  if (series.length === 0) {
    sub.textContent = 'No spending yet';
    const msg = svgEl('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', fill: cssVar('--ink-muted'), 'font-size': 13 });
    msg.textContent = 'No spending yet';
    svg.appendChild(msg);
    return;
  }

  sub.textContent = series.length === 1 ? series[0].label : `${series[0].label} – ${series[series.length - 1].label}`;

  const padL = 46, padR = 14, padT = 18, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxVal = niceRoundUp(Math.max(...series.map((s) => s.total)));

  const xPos = (i) => (series.length === 1 ? padL + plotW / 2 : padL + (i / (series.length - 1)) * plotW);
  const yPos = (v) => padT + plotH - (v / maxVal) * plotH;

  const gridColor = cssVar('--grid');
  const mutedColor = cssVar('--ink-muted');
  const inkColor = cssVar('--ink');
  const seriesColor = cssVar('--series-1');
  const surfaceColor = cssVar('--surface');

  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const v = (maxVal / steps) * s;
    const gy = yPos(v);
    svg.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: gy, y2: gy, stroke: gridColor, 'stroke-width': 1 }));
    if (s === 0 || s === steps) {
      const label = svgEl('text', { x: padL - 8, y: gy + 4, 'text-anchor': 'end', 'font-size': 11, fill: mutedColor });
      label.textContent = fmtCompact(v);
      svg.appendChild(label);
    }
  }

  series.forEach((pt, i) => {
    const label = svgEl('text', { x: xPos(i), y: H - 6, 'text-anchor': 'middle', 'font-size': 11, fill: mutedColor });
    label.textContent = pt.label;
    svg.appendChild(label);
  });

  let areaD = `M ${xPos(0)} ${yPos(0)} `;
  series.forEach((pt, i) => { areaD += `L ${xPos(i)} ${yPos(pt.total)} `; });
  areaD += `L ${xPos(series.length - 1)} ${yPos(0)} Z`;
  svg.appendChild(svgEl('path', { d: areaD, fill: seriesColor, 'fill-opacity': 0.1, stroke: 'none' }));

  let lineD = '';
  series.forEach((pt, i) => { lineD += (i === 0 ? 'M ' : 'L ') + `${xPos(i)} ${yPos(pt.total)} `; });
  svg.appendChild(svgEl('path', { d: lineD, fill: 'none', stroke: seriesColor, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

  series.forEach((pt, i) => {
    svg.appendChild(svgEl('circle', { cx: xPos(i), cy: yPos(pt.total), r: 4, fill: seriesColor, stroke: surfaceColor, 'stroke-width': 2 }));
  });

  const last = series[series.length - 1];
  const endLabel = svgEl('text', {
    x: xPos(series.length - 1), y: yPos(last.total) - 12,
    'text-anchor': 'end', 'font-size': 12, 'font-weight': 600, fill: inkColor,
  });
  endLabel.textContent = fmtMoney(last.total);
  svg.appendChild(endLabel);

  const crosshair = svgEl('line', { x1: 0, x2: 0, y1: padT, y2: padT + plotH, stroke: gridColor, 'stroke-width': 1, opacity: 0 });
  const highlight = svgEl('circle', { r: 6, fill: seriesColor, stroke: surfaceColor, 'stroke-width': 2, opacity: 0 });
  svg.appendChild(crosshair);
  svg.appendChild(highlight);

  const overlay = svgEl('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: 'transparent' });
  overlay.style.cursor = 'crosshair';
  svg.appendChild(overlay);

  function showAt(i) {
    const pt = series[i];
    const px = xPos(i), py = yPos(pt.total);
    crosshair.setAttribute('x1', px);
    crosshair.setAttribute('x2', px);
    crosshair.setAttribute('opacity', 1);
    highlight.setAttribute('cx', px);
    highlight.setAttribute('cy', py);
    highlight.setAttribute('opacity', 1);

    const wrapRect = wrap.getBoundingClientRect();
    tooltip.style.left = `${(px / W) * wrapRect.width}px`;
    tooltip.style.top = `${(py / H) * wrapRect.height}px`;
    tooltip.textContent = '';
    tooltip.appendChild(el('div', 't-value', fmtMoney(pt.total)));
    tooltip.appendChild(el('div', 't-label', pt.label));
    tooltip.hidden = false;
  }

  function hide() {
    crosshair.setAttribute('opacity', 0);
    highlight.setAttribute('opacity', 0);
    tooltip.hidden = true;
  }

  overlay.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round(((relX - padL) / plotW) * (series.length - 1));
    idx = Math.max(0, Math.min(series.length - 1, idx));
    showAt(idx);
  });
  overlay.addEventListener('pointerleave', hide);
}

/* ---------- data load ---------- */

async function loadDashboard() {
  let transactions = [];
  let banks = [];

  try {
    [transactions, banks] = await Promise.all([
      fetchJSON(`${BASE_URL}/AllTransactions`),
      fetchJSON(`${BASE_URL}/Banks`),
    ]);
  } catch (err) {
    console.error('Failed to load dashboard data', err);
    return;
  }

  const hasData = transactions.length > 0 || banks.length > 0;
  document.getElementById('empty-state').hidden = hasData;
  document.getElementById('dashboard').hidden = !hasData;
  if (!hasData) return;

  renderBankChips(banks);

  const catRows = computeCategoryBreakdown(transactions);
  const catColorMap = new Map(catRows.map((r) => [r.name, r.color]));

  renderKpis(computeKpis(transactions));
  renderTrendChart(computeMonthlySeries(transactions));
  renderCategoryBars(catRows);
  renderTransactions(transactions, catColorMap);
}

/* ---------- connect bank (Plaid Link) ---------- */

async function connectBank() {
  try {
    const { link_token } = await fetchJSON(`${BASE_URL}/create_link_token`, { method: 'POST' });

    const handler = Plaid.create({
      token: link_token,
      onSuccess: async (public_token, metadata) => {
        await fetchJSON(`${BASE_URL}/exchange_public_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token, bank_name: metadata.institution.name }),
        });
        await fetchJSON(`${BASE_URL}/Sync`, { method: 'POST' });
        await loadDashboard();
      },
    });

    handler.open();
  } catch (err) {
    console.error('Could not start Plaid Link', err);
    alert('Could not reach the FinTrack server. Is app.py running on port 5000?');
  }
}

document.getElementById('connect-btn').addEventListener('click', connectBank);
document.getElementById('empty-connect-btn').addEventListener('click', connectBank);

window.addEventListener('DOMContentLoaded', loadDashboard);
