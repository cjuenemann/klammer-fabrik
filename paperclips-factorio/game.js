// ============================================================
// KLAMMER FABRIK — Main Game Engine
// ============================================================

function createInitialState() {
  return {
    money:          100,    // enough for first generator and machine
    totalProduced:  0,
    totalClipsSold: 0,
    phase:          1,
    trust:          0,
    upgrades:       {},
    market:         null,
    production:     null,
    research:       null,
    logistics:      null,
    _trustMilestonesHit: [],
    elapsed:        0,
    tick:           0,
    lastSave:       Date.now(),
    startTime:      Date.now(),
  };
}

let STATE        = createInitialState();
let lastTime     = null;
let running      = false;
let eventLog     = [];
let autoSaveTimer = 0;

// ── Notifications ────────────────────────────────────────────
function logEvent(msg, type = 'info') {
  eventLog.unshift({ msg, type, ts: formatTime(STATE.elapsed) });
  if (eventLog.length > 60) eventLog.pop();
  showNotif(msg, type);
}

function showNotif(msg, type = 'info') {
  const c = document.getElementById('notif-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `notif${type === 'warn' ? ' amber' : type === 'error' ? ' red' : ''}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── Formatting ───────────────────────────────────────────────
function fmt(n, d = 0) {
  if (n === undefined || n === null) return '0';
  if (n >= 1e12) return (n/1e12).toFixed(2) + ' Bio.';
  if (n >= 1e9)  return (n/1e9).toFixed(2)  + ' Mrd.';
  if (n >= 1e6)  return (n/1e6).toFixed(2)  + ' Mio.';
  if (n >= 1e4)  return (n/1e3).toFixed(1)  + 'k';
  return n.toFixed(d);
}
function fmtMoney(n) { return '€' + fmt(n, 2); }
function formatTime(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  return h > 0 ? `${h}h${m}m` : `${m}m${sec}s`;
}
function fmtPct(ratio) { return Math.round(ratio * 100) + '%'; }

// ── Phase transitions ────────────────────────────────────────
function checkPhase(state) {
  if (state.phase === 1 && state.upgrades?.rollingMillUnlock) {
    state.phase = 2;
    logEvent('PHASE 2 -- Fabrikzeitalter beginnt!', 'warn');
  }
  if (state.phase === 2 && state.upgrades?.copperLineUnlock) {
    state.phase = 3;
    logEvent('🌍 PHASE 3 — Industrie-Expansion!', 'warn');
  }
}

// ── Main loop ────────────────────────────────────────────────
function gameTick(timestamp) {
  if (!running) return;
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.5);
  lastTime = timestamp;
  STATE.elapsed += dt;
  STATE.tick++;

  Market.tick(STATE, dt);
  Production.tick(STATE, dt);
  Logistics.tick(STATE, dt);
  const researchResult = Research.tick(STATE, dt);
  if (researchResult?.completed) {
    logEvent(`✅ Forschung: ${researchResult.completed.name}`, 'info');
  }
  checkPhase(STATE);

  autoSaveTimer += dt;
  if (autoSaveTimer >= 30) { autoSaveTimer = 0; saveGame(); }

  UI.render(STATE);
  UI.renderPhaseOverview(STATE);
  requestAnimationFrame(gameTick);
}

// ── Player Actions ───────────────────────────────────────────
function actionBuyMachine(recipeId) {
  const result = Production.buildMachine(STATE, recipeId);
  if (result.ok) {
    logEvent(`${RECIPES[recipeId].name} gebaut`);
    UI.renderProduction(STATE);
  } else {
    showNotif(result.reason, 'error');
  }
  UI.renderBuildMenu(STATE);
}

function actionRemoveMachine(machineId) {
  Production.removeMachine(STATE, machineId);
  logEvent('🗑️ Maschine entfernt');
  UI.renderProduction(STATE);
}

function actionManualFeed(machineId, resource, qty) {
  const stack = getMachineStack(machineId);
  let totalMoved = 0;
  let remaining = qty;
  for (const m of stack) {
    if (remaining <= 0) break;
    const moved = Production.manualFeed(STATE, m.id, resource, remaining);
    totalMoved += moved;
    remaining -= moved;
  }
  if (totalMoved <= 0) showNotif('Lager leer oder Buffer voll', 'warn');
}

function actionManualCollect(machineId) {
  const stack = getMachineStack(machineId);
  let anyCollected = false;
  for (const m of stack) {
    const collected = Production.manualCollect(STATE, m.id);
    if (Object.keys(collected).length > 0) anyCollected = true;
  }
  if (!anyCollected) showNotif('Output-Buffer ist leer', 'warn');
}

function actionBuyResource(resource, qty) {
  const result = Market.buyResource(STATE, resource, qty);
  if (result.ok) {
    const meta = RESOURCE_META[resource];
    showNotif(`${qty}${meta.unit} ${meta.name} gekauft`);
  } else {
    showNotif(result.reason, 'error');
  }
}

function actionCrankGenerator(machineId) {
  const stack = getMachineStack(machineId);
  stack.forEach(m => Production.crankGenerator(STATE, m.id));
}

function actionCrankWireDrawer(machineId) {
  const stack = getMachineStack(machineId);
  stack.forEach(m => Production.crankWireDrawer(STATE, m.id));
}

function getMachineStack(machineId) {
  const mach = Production.getMachineById(STATE, machineId);
  if (!mach) return [];
  const fingerprint = UI.getMachineFingerprint(STATE, mach);
  return STATE.production.machines.filter(m => UI.getMachineFingerprint(STATE, m) === fingerprint);
}

function actionSetPrice(productId, delta) {
  Market.setPrice(STATE, productId, delta);
}

function actionStartResearch(id) {
  const proj = Research.getAll().find(p => p.id === id);
  if (!proj) return;
  const result = Research.startProject(STATE, id);
  if (result.ok) {
    if (result.instant) logEvent(`✅ ${proj.name} sofort abgeschlossen`);
    else logEvent(`Forschung gestartet: ${proj.name}`);
  } else {
    showNotif(result.reason, 'warn');
  }
}

function actionReorderMachines(draggedRecipeId, targetRecipeId, insertBefore) {
  if (draggedRecipeId === targetRecipeId) return;
  const machines = STATE.production?.machines;
  if (!machines) return;

  const dragged = machines.filter(m => m.recipeId === draggedRecipeId);
  const rest    = machines.filter(m => m.recipeId !== draggedRecipeId);

  const targetIdx = rest.findIndex(m => m.recipeId === targetRecipeId);
  if (targetIdx < 0) return;

  const insertAt = insertBefore ? targetIdx : targetIdx + rest.filter(m => m.recipeId === targetRecipeId).length;
  rest.splice(insertAt, 0, ...dragged);
  STATE.production.machines = rest;
  saveGame();
}


function actionAddRoute(fromType, fromMachineId, fromResource, toType, toMachineId, toResource, transportType) {
  const result = Logistics.addRoute(STATE, { fromType, fromMachineId, fromResource, toType, toMachineId, toResource, transportType });
  if (result.ok) logEvent(`Route: ${fromResource} -> ${toResource} [${transportType}]`);
  else showNotif(result.reason, 'error');
}

function actionRemoveRoute(routeId) {
  Logistics.removeRoute(STATE, routeId);
  logEvent('Route entfernt');
}

// ── Save / Load ──────────────────────────────────────────────
function saveGame() {
  Save.save(STATE);
}

function actionManualThink() {
  if (!STATE.research) return;
  STATE.research.ops = Math.min(STATE.research.ops + 10, STATE.research.maxOps || 300);
  UI.renderResearch(STATE);
}

function loadGame() {
  const saved = Save.load();
  if (saved) {
    STATE = saved;
    Market.init(STATE);
    Production.init(STATE);
    Research.init(STATE);
    Logistics.init(STATE);
    logEvent('Spielstand geladen');
    return true;
  }
  return false;
}

function resetGame() {
  if (!confirm('Spielstand wirklich löschen und neu starten?')) return;
  Save.clear();
  STATE = createInitialState();
  Market.init(STATE);
  Production.init(STATE);
  Research.init(STATE);
  Logistics.init(STATE);
  logEvent('🔄 Neues Spiel gestartet');
}

// ── Boot ─────────────────────────────────────────────────────
function bootGame() {
  Market.init(STATE);
  Production.init(STATE);
  Research.init(STATE);
  Logistics.init(STATE);
  loadGame();
  UI.build(STATE);
  running = true;
  requestAnimationFrame(gameTick);
  logEvent('📎 Willkommen bei KLAMMER FABRIK');
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') UI.closeMarket();
});

window.addEventListener('DOMContentLoaded', bootGame);
