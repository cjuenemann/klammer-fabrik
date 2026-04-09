// ============================================================
// UI — Render engine for all game panels
// ============================================================
const UI = (() => {

  let _lastFrame = 0;
  let _gAnim = null;

  function build(state) {
    wireStaticEvents();
    renderBuildMenu(state);
  }

  function wireStaticEvents() {
    document.getElementById('btn-save')?.addEventListener('click', () => { saveGame(); showNotif('Gespeichert!'); });
    document.getElementById('btn-cli')?.addEventListener('click', () => {
      if (typeof STATE !== 'undefined') openCLI(STATE);
    });
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `<div style="background:#1a1a2e;padding:24px;border-radius:8px;text-align:center;color:#e0e0e0;min-width:300px;">
        <div style="margin-bottom:16px;font-size:1.1rem;">Spielstand wirklich löschen<br>und neu starten?</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="reset-confirm-yes" style="padding:8px 20px;background:#c0392b;color:white;border:none;border-radius:4px;cursor:pointer;">Ja, neustarten</button>
          <button id="reset-confirm-no" style="padding:8px 20px;background:#555;color:white;border:none;border-radius:4px;cursor:pointer;">Abbrechen</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      document.getElementById('reset-confirm-yes').onclick = () => {
        Save.clear();
        location.reload();
      };
      document.getElementById('reset-confirm-no').onclick = () => {
        document.body.removeChild(overlay);
      };
      overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
      };
    });

    // Warehouse click to open sell modal - DEBUG: NICHT ENTFERNEN
    document.getElementById('warehouse-panel')?.addEventListener('click', (e) => {
      console.log('Warehouse panel clicked');
      if (e.target.closest('button')) return;
      if (typeof STATE !== 'undefined') openSellModal(STATE);
    });
  }

  // ── Quests ────────────────────────────────────────────────
  function renderQuests(state) {
    const el = document.getElementById('quest-list');
    const progressEl = document.getElementById('quest-progress');
    if (!el) return;
    
    // Initialize quests if missing (for old save files)
    if (!state.quests) {
      Quests.init(state);
    }
    
    const active = Quests.getActiveQuests(state);
    const completed = Quests.getCompletedQuests(state);
    const total = Quests.QUESTS.length;
    
    if (progressEl) {
      progressEl.textContent = `${completed.length}/${total}`;
    }
    
    // Show current active quest
    if (active.length === 0 && completed.length >= total) {
      el.innerHTML = `<div style="color:var(--accent-green);font-size:.8rem;text-align:center;padding:8px">
        🎉 Alle Quests abgeschlossen!
      </div>`;
      return;
    }
    
    const nextQuest = Quests.getNextQuest(state);
    if (!nextQuest) {
      el.innerHTML = `<div class="text-muted" style="font-size:.75rem">Alle Quests abgeschlossen!</div>`;
      return;
    }
    
    el.innerHTML = `<div class="quest-item" style="padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="font-weight:600;font-size:.85rem;margin-bottom:2px">${nextQuest.name}</div>
      <div style="font-size:.75rem;color:var(--text-muted)">${nextQuest.desc}</div>
    </div>
    ${completed.length > 0 ? `<div style="margin-top:8px;font-size:.7rem;color:var(--text-muted)">Abgeschlossen: ${completed.length}</div>` : ''}`;
  }

  // ── Render dispatch (~30fps) ─────────────────────────────
  function render(state) {
    const now = performance.now();
    if (now - _lastFrame < 33) return;
    _lastFrame = now;

    renderHeader(state);
    renderWarehouse(state);
    renderMarket(state);
    renderProduction(state);
    renderResearch(state);
    renderLogRoutes(state);
    renderQuests(state);
    renderLog();
    renderPhase(state);

    // Update skilltree if open
    if (!document.getElementById('modal-skilltree')?.classList.contains('hidden')) {
      renderSkillTree(state);
    }
  }

  // ── Header ───────────────────────────────────────────────
  function renderHeader(state) {
    setText('hdr-money',   fmtMoney(state.money));
    setText('hdr-clips',   fmt(state.totalProduced));
    setText('hdr-phase',   `Phase ${state.phase}`);
    setText('hdr-trust',   state.trust || 0);
    // Rev tracker
    if (state.upgrades?.revTracker) {
      const revPerSec = (state.market?.revenue || 0) / Math.max(1, state.elapsed);
      setText('hdr-rev', fmtMoney(revPerSec) + '/s');
      show('hdr-rev-wrap');
    }

    // Power Grid
    const p = state.production?.power || { generated: 0, consumed: 0, factor: 1 };
    setText('hdr-power-gen',  fmt(p.generated, 0) + 'W');
    setText('hdr-power-cons', fmt(p.consumed, 0) + 'W');
    const factorEl = document.getElementById('hdr-power-factor');
    if (factorEl) {
      factorEl.textContent = Math.round(p.factor * 100) + '%';
      factorEl.className = p.factor < 1 ? 'stat-value text-red blink' : 'stat-value text-green';
    }
  }

  // ── Warehouse ────────────────────────────────────────────
  function renderWarehouse(state) {
    const wh  = state.production?.warehouse || {};
    const el  = document.getElementById('warehouse-grid');
    if (!el) return;

    const entries = Object.entries(RESOURCE_META)
      .filter(([id]) => (wh[id] || 0) > 0 || state.upgrades?.[RESOURCE_META[id].unlockResearch] !== undefined)
      .filter(([, meta]) => {
        if (meta.phase && meta.phase > state.phase) return false;
        if (meta.unlockResearch && !state.upgrades?.[meta.unlockResearch]) {
          // Still show if we have some
          return (wh[Object.keys(RESOURCE_META).find(k=>k)] || 0) > 0;
        }
        return true;
      })
      // Always show basics
      .concat(
        Object.entries(RESOURCE_META).filter(([id]) => {
          const m = RESOURCE_META[id];
          return m.market && !m.sell && (!m.phase || m.phase <= state.phase);
        })
      )
      // Deduplicate
      .reduce((acc, item) => { if (!acc.find(a => a[0] === item[0])) acc.push(item); return acc; }, []);

    el.innerHTML = entries.map(([id, meta]) => {
      const qty = wh[id] || 0;
      if (qty < 0.01 && !meta.market && !meta.sell) return '';
      const color = meta.color || '#666';
      const iconEl = meta.icon
        ? `<svg class="res-icon" style="color:${color};width:14px;height:14px;flex-shrink:0" aria-hidden="true"><use href="#${meta.icon}"/></svg>`
        : `<div class="wh-dot" style="background:${color}"></div>`;
      const sellBtn = meta.sell && qty > 0 ? `<span style="font-size:.65rem;color:var(--accent-amber);margin-left:4px">→ Markt</span>` : '';
      return `<div class="wh-item">
        ${iconEl}
        <div class="wh-name">${meta.name}</div>
        <div class="wh-qty">${fmt(qty, qty < 10 ? 1 : 0)} ${meta.unit}</div>
        ${sellBtn}
      </div>`;
    }).join('');
  }

  // ── Market ───────────────────────────────────────────────
  function renderMarket(state) {
    const m = state.market;
    if (!m) return;

    // Buy resources panel
    const buyEl = document.getElementById('buy-resources');
    if (buyEl) {
      const buyable = Market.getBuyableMaterials(state)
        .filter(r => !r.phase || r.phase <= state.phase);

      const htmlBuy = buyable.map(r => {
        const qty  = r.buyQty || 1;
        const cost = r.baseCost * qty;
        const can  = state.money >= cost;
        return `<div class="buy-row" style="display:flex; align-items:center; gap:var(--gap-sm); padding: 8px 0; border-bottom: 1px solid var(--border-light);">
          <span class="form-label" style="flex:1; font-weight:600">${r.name}</span>
          <span class="form-value text-mono" style="width:110px; text-align:right; margin-right:var(--gap-md)">€${r.baseCost.toFixed(2)}/${r.buyUnit}</span>
          <button class="btn btn-sm btn-amber" style="min-width:120px; font-weight:bold" data-action="buy-resource" data-resource="${r.id}" data-qty="${qty}"
            ${can ? '' : 'disabled'}>
            Kaufen ×${qty}<br><small>${fmtMoney(cost)}</small>
          </button>
        </div>`;
      }).join('');
      
      const fpBuy = buyable.map(r => r.id + ':' + (state.money >= r.baseCost * (r.buyQty || 1))).join('|');
      if (buyEl.dataset.layout !== fpBuy) {
        buyEl.innerHTML = htmlBuy;
        buyEl.dataset.layout = fpBuy;
      }
    }

    // Sell panel (products in warehouse)
    const sellEl = document.getElementById('sell-products');
    if (sellEl) {
      const sellable = Object.entries(RESOURCE_META)
        .filter(([, r]) => r.sell)
        .filter(([, r]) => !r.phase || r.phase <= state.phase)
        .filter(([, r]) => !r.unlockResearch || state.upgrades?.[r.unlockResearch]);

      const htmlSell = sellable.map(([id, r]) => {
        const price    = m.prices?.[id] ?? r.basePrice;
        const demand   = Math.round((m.demand?.[id] ?? r.demandBase) * 100);
        const inStock  = state.production?.warehouse?.[id] || 0;
        return `<div class="sell-row" style="padding:10px 0; border-bottom:1px solid var(--border-light)">
          <div class="sell-left" style="flex:1">
            <span class="form-label" style="font-weight:600">${r.name}</span>
            <div class="demand-bar" style="margin-top:4px">
              <div class="demand-viz" style="width:120px; height:6px; background:var(--progress-bg); border-radius:3px; overflow:hidden">
                <div class="demand-viz-fill" style="width:${demand}%; height:100%; background:var(--accent-amber)"></div>
              </div>
              <span style="font-size:.65rem; color:var(--text-muted)">Nachfrage: ${demand}%</span>
            </div>
          </div>
          <div class="sell-right" style="width:140px; text-align:right">
            <div class="text-mono" style="font-size:1.1rem; font-weight:bold">€${price.toFixed(2)}</div>
            <div style="font-size:.65rem; color:var(--text-muted); margin-top:2px">${fmt(inStock)} auf Lager</div>
            <div style="display:flex; gap:2px; justify-content: flex-end; margin-top:5px">
              <button class="btn btn-sm btn-dark" onclick="actionSetPrice('${id}',-0.01); event.stopPropagation();" style="padding:0 8px">−</button>
              <button class="btn btn-sm btn-dark" onclick="actionSetPrice('${id}',+0.01); event.stopPropagation();" style="padding:0 8px">+</button>
            </div>
          </div>
        </div>`;
      }).join('');

      const fpSell = sellable.map(([id, r]) => id + ':' + (m.prices?.[id] ?? r.basePrice) + ':' + Math.round((m.demand?.[id] ?? r.demandBase) * 100) + ':' + (state.production?.warehouse?.[id] || 0)).join('|');
      if (sellEl.dataset.layout !== fpSell) {
        sellEl.innerHTML = htmlSell;
        sellEl.dataset.layout = fpSell;
      }
    }
  }
  // ── Phase Overview ──────────────────────────────────────
  function renderPhaseOverview(state) {
    const el = document.getElementById('phase-overview');
    if (!el) return;
    const machines = state.production?.machines || [];
    if (machines.length === 0) {
      el.innerHTML = '<div class="text-muted">Keine Maschinen vorhanden.</div>';
      return;
    }

    const counts = {};
    machines.forEach(m => {
      const name = RECIPES[m.recipeId]?.name || m.recipeId;
      counts[name] = (counts[name] || 0) + 1;
    });

    el.innerHTML = Object.entries(counts)
      .sort((a,b) => b[1] - a[1])
      .map(([name, count]) => `<div class="form-row">
        <span>${name}</span>
        <span class="form-value">${count}×</span>
      </div>`).join('');
  }

  function renderProduction(state) {
    const el = document.getElementById('production-hall');
    if (!el) return;
    const machines = state.production?.machines || [];

    if (machines.length === 0) {
      el.innerHTML = `<div class="text-muted" style="padding:16px;text-align:center">
        Noch keine Maschinen — kaufe deine erste Maschine im Shops-Panel.
      </div>`;
      return;
    }

    // Group machines by fingerprint
    const groups = [];
    machines.forEach(m => {
      const fingerprint = getMachineFingerprint(state, m);
      let group = groups.find(g => g.fingerprint === fingerprint);
      if (!group) {
        group = { fingerprint, machines: [] };
        groups.push(group);
      }
      group.machines.push(m);
    });

    const layoutId = groups.map(g => g.fingerprint + '-' + g.machines.length).join('|');
    const badge = document.getElementById('machine-count-badge');
    if (badge) {
      const stackedCount = groups.filter(g => g.machines.length > 1).length;
      const singleCount  = groups.filter(g => g.machines.length === 1).length;
      let statusText = `${machines.length} MASCHINEN`;
      const parts = [];
      if (stackedCount > 0) parts.push(`${stackedCount} GRUPPEN`);
      if (singleCount > 0)  parts.push(`${singleCount} EINZELGERÄTE`);
      if (parts.length > 0) statusText += ` (${parts.join(', ')})`;
      badge.textContent = statusText;
    }

    if (el.dataset.layout !== layoutId) {
      el.innerHTML = groups.map(g => renderMachineCard(state, g.machines)).join('');
      el.dataset.layout = layoutId;
      setupMachineDragDrop(el);
    } else {
      const cards = el.querySelectorAll('.machine-card');
      groups.forEach((g, i) => { if (cards[i]) syncMachineCard(cards[i], state, g.machines); });
    }
  }

  function setupMachineDragDrop(container) {
    let dragSrc = null;
    container.querySelectorAll('.machine-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragSrc = card.dataset.recipeId;
        card.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.style.opacity = '';
        container.querySelectorAll('.machine-card').forEach(c => c.classList.remove('drag-over-top','drag-over-bot'));
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = card.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        card.classList.toggle('drag-over-top', before);
        card.classList.toggle('drag-over-bot', !before);
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over-top','drag-over-bot');
      });
      card.addEventListener('drop', e => {
        e.preventDefault();
        const rect = card.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        const tgt = card.dataset.recipeId;
        if (dragSrc && tgt && dragSrc !== tgt) {
          actionReorderMachines(dragSrc, tgt, before);
        }
        card.classList.remove('drag-over-top','drag-over-bot');
        dragSrc = null;
      });
    });
  }

  function syncMachineCard(card, state, group) {
    const mach = group[0];
    const count = group.length;
    const recipe = RECIPES[mach.recipeId];
    if (!recipe) return;

    // Efficiency & Load
    const avgEff = group.reduce((acc, m) => acc + (m.efficiency || 0), 0) / count;
    const effPct = Math.round(avgEff * 100);
    const effVal = card.querySelector('.eff-val');
    if (effVal) effVal.textContent = effPct + '%';
    const effLabel = card.querySelector('.machine-eff');
    if (effLabel) effLabel.style.color = avgEff >= 0.8 ? '#4a7c59' : avgEff >= 0.4 ? '#c47c2a' : '#8b3a3a';

    // Cycle progress
    const cycleBar = card.querySelector('.cycle-bar-fill');
    if (cycleBar) cycleBar.style.width = Math.round((mach.cycleProgress || 0) * 100) + '%';

    // Buffers
    const slots = card.querySelectorAll('.buffer-slot');
    slots.forEach(slot => {
      const res = slot.dataset.res;
      if (!res) return;
      const isInput = !!recipe.inputs[res];
      const cap = (isInput ? (recipe.inputCapacity?.[res]||10) : (recipe.outputCapacity?.[res]||50)) * count;
      const cur = group.reduce((acc, m) => acc + ((isInput ? m.inputBuffer : m.outputBuffer)[res] || 0), 0);
      const wh = isInput ? (state.production?.warehouse?.[res] || 0) : 0;
      const space = cap - cur;
      const canFeed = Math.min(wh, Math.floor(space));
      
      const fill = slot.querySelector('.buffer-fill');
      if (fill) fill.style.width = Math.round(Math.min(1, cur / cap) * 100) + '%';
      const val = slot.querySelector('.cur-val');
      if (val) val.textContent = fmt(cur, 1);
      
      // Update feed button state
      if (isInput) {
        const btn = slot.querySelector('button[data-action="feed"]');
        if (btn) {
          btn.disabled = canFeed <= 0;
          btn.innerHTML = canFeed > 0 ? `&rsaquo; Zuführen (${fmt(canFeed, 0)})` : '&rsaquo; Zuführen';
        }
      }
    });

    // Special case: manual generator output
    if (recipe.id === 'manualGenerator') {
      const curPower = group.reduce((acc, m) => acc + (m.outputBuffer?.powerGrid || 0), 0);
      const capPower = (recipe.outputCapacity?.powerGrid || 150) * count;
      const pRatio = Math.min(1, curPower / capPower);
      // Find the specific buffer-fill in the OUTPUT section (has background #f1c40f)
      const outputSlot = card.querySelector('.buffer-group:last-child .buffer-slot');
      const fill = outputSlot?.querySelector('.buffer-fill');
      if (fill) fill.style.width = Math.round(pRatio * 100) + '%';
      const nums = outputSlot?.querySelector('.buffer-nums');
      if (nums) nums.textContent = `${fmt(curPower,0)}W / ${capPower}W`;
    }

    // Special case: manual wire drawer
    if (recipe.id === 'manualWireDrawer') {
      const curWire = group.reduce((acc, m) => acc + (m.outputBuffer?.manualWire || 0), 0);
      const capWire = ((recipe.outputCapacity?.manualWire || 15)) * count;
      const fill = card.querySelector('.buffer-fill');
      if (fill) fill.style.width = Math.round(Math.min(1, curWire / capWire) * 100) + '%';
      const val = card.querySelector('.buffer-nums');
      if (val) val.textContent = `${fmt(curWire,1)}m / ${capWire}m`;
    }

    // Alerts (bottleneck / brownout)
    const alertClass = state.upgrades?.bottleneckAlerts && avgEff < 0.5 ? 'machine-card-alert' : '';
    const brownout   = !recipe.isGenerator && state.production?.power?.factor < 1;
    card.className = `machine-card ${alertClass} ${brownout ? 'brownout-warn' : ''} ${count > 1 ? 'machine-stack' : ''}`;
  }

  function getMachineFingerprint(state, mach) {
    const recipe = RECIPES[mach.recipeId];
    if (!recipe) return mach.recipeId;
    
    // Automation status for inputs
    const autoIn = Object.keys(recipe.inputs).map(res => 
      (state.logistics?.routes || []).some(r => r.toMachineId === mach.id && r.toResource === res && r.active)
    ).join(',');
    
    // Automation status for outputs
    const autoOut = Object.keys(recipe.outputs).map(res => 
      (state.logistics?.routes || []).some(r => r.fromMachineId === mach.id && r.fromResource === res && r.active)
    ).join(',');
    
    return `${mach.recipeId}|IN:${autoIn}|OUT:${autoOut}`;
  }

  function renderMachineCard(state, group) {
    const mach   = group[0];
    const count  = group.length;
    const recipe = RECIPES[mach.recipeId];
    if (!recipe) return '';
    
    // Aggregate efficiency
    const avgEff = group.reduce((acc, m) => acc + (m.efficiency || 0), 0) / count;
    const effPct = Math.round(avgEff * 100);
    const alertClass = state.upgrades?.bottleneckAlerts && avgEff < 0.5 ? 'machine-card-alert' : '';
    const effColor   = avgEff >= 0.8 ? '#4a7c59' : avgEff >= 0.4 ? '#c47c2a' : '#8b3a3a';
    const isStacked  = count > 1;

    // Input buffers (summed)
    const inputsHtml = Object.entries(recipe.inputs).map(([res, needed]) => {
      const cap   = ((recipe.inputCapacity || {})[res] || 10) * count;
      const cur   = group.reduce((acc, m) => acc + (m.inputBuffer[res] || 0), 0);
      const ratio = Math.min(1, cur / cap);
      const meta  = RESOURCE_META[res] || {};
      const wh    = state.production?.warehouse?.[res] || 0;
      const autoRoute = (state.logistics?.routes || []).some(r =>
        r.toMachineId === mach.id && r.toResource === res && r.active
      );
      const space = cap - cur;  // actual free space in summed buffers
      const canFeed = Math.min(wh, Math.floor(space));
      const icon = meta.icon ? `<svg class="res-icon" style="color:${meta.color||'#666'}" width="13" height="13" aria-hidden="true"><use href="#${meta.icon}"/></svg>` : '';
      return `<div class="buffer-slot" data-res="${res}">
        <div class="buffer-label">${icon}<span>${meta.name || res}</span></div>
        <div class="buffer-bar"><div class="buffer-fill" style="width:${Math.round(ratio*100)}%;background:${meta.color||'#666'}"></div></div>
        <div class="buffer-nums"><span class="cur-val">${fmt(cur,1)}</span> / ${cap} &nbsp;<span style="color:#aaa;font-size:.65rem">(Lager: ${fmt(wh,0)})</span></div>
        ${!autoRoute ? `<button class="btn btn-sm" style="font-size:.62rem;padding:2px 6px" ${canFeed<=0?'disabled':''}
          data-action="feed" data-machine-id="${mach.id}" data-resource="${res}" data-qty="${Math.floor(space)}">
          &rsaquo; Zuführen${canFeed>0?' ('+fmt(canFeed,0)+')':''}
        </button>` : `<span class="badge" style="font-size:.6rem">AUTO</span>`}
      </div>`;
    }).join('');

    function resIcon(res, meta) {
      return meta?.icon ? `<svg class="res-icon" style="color:${meta.color||'#888'}" width="13" height="13" aria-hidden="true"><use href="#${meta.icon}"/></svg>` : '';
    }

    // Output buffers (summed)
    const outputsHtml = Object.entries(recipe.outputs).map(([res, produced]) => {
      const cap   = ((recipe.outputCapacity || {})[res] || 50) * count;
      const cur   = group.reduce((acc, m) => acc + (m.outputBuffer[res] || 0), 0);
      const ratio = Math.min(1, cur / cap);
      const meta  = RESOURCE_META[res] || {};
      const autoRoute = (state.logistics?.routes || []).some(r =>
        r.fromMachineId === mach.id && r.fromResource === res && r.active
      );
      return `<div class="buffer-slot" data-res="${res}">
        <div class="buffer-label">${resIcon(res, meta)}<span>${meta.name || res}</span></div>
        <div class="buffer-bar"><div class="buffer-fill" style="width:${Math.round(ratio*100)}%;background:${meta.color||'#666'}"></div></div>
        <div class="buffer-nums"><span class="cur-val">${fmt(cur,1)}</span> / ${cap}</div>
        ${!autoRoute ? `<button class="btn btn-sm btn-collect"
          data-action="collect" data-machine-id="${mach.id}">
          &lsaquo; Abholen
        </button>` : `<span class="badge" style="font-size:.6rem">AUTO</span>`}
      </div>`;
    }).join('');

    // Cycle progress (of first machine)
    const cycleBarW = Math.round((mach.cycleProgress || 0) * 100);

    // Power info
    const basePower  = recipe.isGenerator ? (recipe.outputs.powerGrid || 0) : (recipe.powerConsumption || 0);
    const totalPower = basePower * count;
    const powerStr   = recipe.isGenerator ? `Gen: ${totalPower}W` : `Cons: ${totalPower}W`;
    const brownout   = !recipe.isGenerator && state.production?.power?.factor < 1;

    const removeLabel = isStacked ? '1 entfernen' : 'X';
    const removeConfirm = isStacked ? 'Eine Einheit dieses Stacks entfernen?' : 'Maschine entfernen?';

    return `<div class="machine-card ${alertClass} ${brownout ? 'brownout-warn' : ''} ${isStacked ? 'machine-stack' : ''}" draggable="true" data-recipe-id="${mach.recipeId}">
      ${isStacked ? `<div class="stack-badge">${count}×</div>` : ''}
      <div class="machine-card-header">
        <span class="drag-handle" title="Ziehen zum Umordnen" style="cursor:grab; padding:0 4px; color:#bbb; user-select:none; font-size:1rem; line-height:1;">&#8942;</span>
        <span class="machine-name" style="${isStacked ? 'padding-left:8px' : ''}">${mach.label}</span>
        <span class="machine-eff" style="color:${effColor}"><span class="eff-val">${effPct}%</span> ${recipe.isGenerator ? 'load' : 'eff.'}</span>
        <button class="btn btn-sm" style="font-size:.6rem;padding:1px 5px;margin-left:auto"
          onclick="if(confirm('${removeConfirm}')){window.actionRemoveMachine(${mach.id})}">${removeLabel}</button>
      </div>
      <!-- ... (remaining same) -->
      <div class="machine-desc text-muted" style="display:flex;justify-content:space-between">
        <span>${recipe.desc}</span>
        <span class="text-mono" style="font-size:.65rem">${powerStr}</span>
      </div>
      <div class="machine-cycle">
        <div class="machine-cycle-fill cycle-bar-fill" style="width:${cycleBarW}%"></div>
      </div>
      <div class="machine-buffers">
        <div class="buffer-group">
          <div class="buffer-group-label">${recipe.isGenerator ? 'INPUT' : 'EINGANG'}</div>
          ${recipe.id === 'manualGenerator' ? 
            `<button class="btn btn-amber" style="width:100%;height:30px;font-weight:bold" data-action="crank-generator" data-machine-id="${mach.id}">${isStacked ? 'ALLE KURBELN' : 'KURBELN'}</button>` : 
            recipe.id === 'manualWireDrawer' ?
            (() => {
              const hasInput = (mach.inputBuffer?.steelCoil || 0) >= 1;
              return `<button class="btn btn-amber" style="width:100%;height:30px;font-weight:bold" data-action="crank-wire-drawer" data-machine-id="${mach.id}" ${!hasInput ? 'disabled title="Kein Stahlcoil vorhanden"' : ''}>
                ${isStacked ? 'ALLE ZIEHEN' : 'ZIEHEN'}${!hasInput ? ' ❌' : ''}
              </button>`;
            })() :
            inputsHtml || '<div class="text-muted" style="font-size:.6rem">Keine Eingänge</div>'
          }
        </div>
        <div class="machine-arrow">→</div>
        <div class="buffer-group">
          <div class="buffer-group-label">${recipe.isGenerator ? 'OUTPUT (GRID)' : 'AUSGANG'}</div>
          ${recipe.id === 'manualGenerator' ? 
            (() => {
              const curPower = group.reduce((acc, m) => acc + (m.outputBuffer?.powerGrid || 0), 0);
              const capPower = (recipe.outputCapacity?.powerGrid || 150) * count;
              const pRatio   = Math.min(1, curPower / capPower);
              return `<div class="buffer-slot">
                <div class="buffer-bar"><div class="buffer-fill" style="width:${Math.round(pRatio*100)}%;background:#f1c40f"></div></div>
                <div class="buffer-nums">${fmt(curPower,0)}W / ${capPower}W</div>
              </div>`;
            })() : 
            outputsHtml
          }
        </div>
      </div>
    </div>`;
  }

  // ── Build menu ───────────────────────────────────────────
  function renderBuildMenu(state) {
    const el = document.getElementById('build-menu');
    if (!el) return;

    const grouped = {};
    for (const [id, recipe] of Object.entries(RECIPES)) {
      if (recipe.phase > state.phase) continue;
      if (recipe.unlockResearch && !state.upgrades?.[recipe.unlockResearch]) continue;
      const key = recipe.category || `Tier ${recipe.tier || 1}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ id, recipe });
    }

    let html = '';
    for (const [cat, items] of Object.entries(grouped).sort()) {
      html += `<div class="section-divider">${cat}</div>`;
      for (const { id, recipe } of items) {
        const can = state.money >= recipe.buildCost;
        const ioStr = Object.entries(recipe.inputs).map(([r,n])=>`${n}× ${RESOURCE_META[r]?.name||r}`).join(', ')
          + ' → '
          + Object.entries(recipe.outputs).map(([r,n])=>`${n}× ${RESOURCE_META[r]?.name||r}`).join(', ');
        const stats = recipe.isMarketplace ? 'Handel' : 
                      recipe.isGenerator ? recipe.outputs.powerGrid+'W Gen' : 
                      (recipe.cyclesPerSec || 0)+'/s';
        html += `<div class="item-card">
          <div class="item-card-header">
            <span class="item-card-name">${recipe.name}</span>
            <button class="btn btn-sm btn-primary" data-action="buy-machine" data-recipe-id="${id}" ${can?'':'disabled'}>
              Bauen
            </button>
          </div>
          <div class="item-card-desc">${recipe.desc}</div>
          ${!recipe.isMarketplace ? `<div class="item-card-desc text-mono" style="margin-top:2px;font-size:.68rem;color:var(--text-muted)">${ioStr}</div>` : ''}
          <div class="item-card-cost ${can?'affordable':''}">
            ${fmtMoney(recipe.buildCost)} · ${stats}
          </div>
        </div>`;
      }
    }
    const htmlObj = html || '<div class="text-muted">Keine weiteren Maschinen verfügbar.</div>';
    
    // Check fingerprint
    const fp = Object.keys(grouped).join('|') + '|' + state.money;
    if (el.dataset.layout !== fp) {
      el.innerHTML = htmlObj;
      el.dataset.layout = fp;
    }
  }

  // ── Research ─────────────────────────────────────────────
  function renderResearch(state) {
    const r = state.research;
    if (!r) return;

    setText('ops-val',    fmt(r.ops, 0));
    setText('ops-max',    fmt(r.maxOps, 0));
    setText('ops-rate',   '+' + fmt(r.opsPerSec, 1) + '/s');
    setText('trust-val',  state.trust || 0);

    if (state.upgrades?.creativity) {
      setText('creat-val',  fmt(r.creat, 1));
      setText('creat-rate', '+' + fmt(r.creatPerSec||0, 2) + '/s');
      show('creat-section');
      show('creat-rate-row');
    }

    // Active
    if (r.active) {
      const proj = Research.getAll().find(p => p.id === r.active.id);
      setText('research-active-name', proj?.name || '');
      setStyle('research-active-bar', 'width', Math.round((r.active.progress||0)*100) + '%');
      show('research-active-panel');
    } else { hide('research-active-panel'); }

    // Available list
    const listEl = document.getElementById('research-list');
    if (!listEl) return;

    // Header buttons
    const headerEl = listEl.previousElementSibling; // The panel-title
    if (headerEl && !headerEl.querySelector('.btn-tree')) {
      headerEl.innerHTML += `<button class="btn btn-sm btn-tree" style="margin-left:auto;font-size:.65rem" onclick="UI.openSkillTree()">[+] Baum-Ansicht</button>`;
    }

    const avail = Research.getAvailable(state);
    const cats  = [...new Set(avail.map(p => p.category))];
    const active = !!r.active;

    const fp = avail.map(p => p.id + ':' + Research.canAfford(state, p)).join('|') + '|' + active;

    if (listEl.dataset.layout !== fp) {
      let html = '';
      for (const cat of cats) {
        const projs = avail.filter(p => p.category === cat);
        html += `<div class="section-divider">${cat}</div>`;
        for (const proj of projs) {
          const affordable = Research.canAfford(state, proj);
          const costParts  = [];
          if (proj.ops)   costParts.push(`${fmt(proj.ops)} Ops`);
          if (proj.creat) costParts.push(`${fmt(proj.creat)} Kreativ`);
          if (proj.trust) costParts.push(`${proj.trust} Trust`);

          html += `<div class="item-card">
            <div class="item-card-header">
              <span class="item-card-name">${proj.name}</span>
              <button class="btn btn-sm btn-primary"
                data-action="start-research" data-research-id="${proj.id}"
                ${affordable && !active ? '' : 'disabled'}>Starten</button>
            </div>
            <div class="item-card-desc">${proj.desc}</div>
            <div class="item-card-cost ${affordable ? 'affordable' : ''}">
              ${costParts.join(' + ')}${proj.duration ? ` · ${proj.duration}s` : ' · sofort'}
            </div>
          </div>`;
        }
      }
      if (!html) html = '<div class="text-muted" style="padding:8px">Keine weiteren Projekte verfügbar.</div>';
      listEl.innerHTML = html;
      listEl.dataset.layout = fp;
    }


    // Completed badge
    setText('completed-count', r.completed.length);
  }

  // ── Logistics routes ─────────────────────────────────────
  function renderLogRoutes(state) {
    const el = document.getElementById('log-routes');
    if (!el) return;
    const u = state.upgrades || {};
    
    if (!u.automationUnlock) {
      el.innerHTML = '<div class="text-muted">Forschung: Förderband erforderlich</div>';
      hide('log-add-form');
      return;
    }
    show('log-add-form');

    // Transport upgrades
    if (u.fastBeltUnlock)  document.getElementById('opt-fastBelt')?.removeAttribute('disabled');
    if (u.truckFleetUnlock) document.getElementById('opt-truck')?.removeAttribute('disabled');
    if (u.pipelineUnlock)  document.getElementById('opt-pipeline')?.removeAttribute('disabled');

    // To/From machine input toggles
    const fType = document.getElementById('rt-from-type')?.value;
    const tType = document.getElementById('rt-to-type')?.value;
    const fmEl  = document.getElementById('rt-from-machine');
    const tmEl  = document.getElementById('rt-to-machine');
    if (fmEl) fmEl.style.display = fType === 'machine' ? '' : 'none';
    if (tmEl) tmEl.style.display = tType === 'machine' ? '' : 'none';

    const routes = state.logistics?.routes || [];
    const tDefs  = Logistics.getTransportTypes();
    
    // Update machine dropdowns while we are at it
    updateLogisticsDropdowns(state);

    if (routes.length === 0) {
      el.innerHTML = '<div class="text-muted">Noch keine Routen eingerichtet.</div>';
      return;
    }
    el.innerHTML = routes.map(rt => {
      const td   = tDefs[rt.transportType] || {};
      const fromMach = rt.fromType === 'machine' ? Production.getMachineById(state, rt.fromMachineId) : null;
      const toMach   = rt.toType   === 'machine' ? Production.getMachineById(state, rt.toMachineId) : null;
      
      const fromName = rt.fromType === 'warehouse' ? 'Lager' : (fromMach?.label || `M#${rt.fromMachineId}`);
      const toName   = rt.toType   === 'warehouse' ? 'Lager' : (toMach?.label || `M#${rt.toMachineId}`);
      
      return `<div class="logistics-route">
        <span>${fromName} [${RESOURCE_META[rt.fromResource]?.name||rt.fromResource}]</span>
        <span class="route-arrow">--&gt;</span>
        <span>${toName} [${RESOURCE_META[rt.toResource]?.name||rt.toResource}]</span>
        <span class="badge">${td.name}</span>
        <span class="route-speed">${td.ratePerSec}/s</span>
        <button class="btn btn-sm" onclick="actionRemoveRoute(${rt.id})" style="margin-left:auto">X</button>
      </div>`;
    }).join('');
  }

  function updateLogisticsDropdowns(state) {
    const fromEl = document.getElementById('rt-from-machine');
    const toEl   = document.getElementById('rt-to-machine');
    if (!fromEl || !toEl) return;

    const machines = state.production?.machines || [];
    const options  = machines.map(m => `<option value="${m.id}">${m.label} (ID:${m.id})</option>`).join('');
    
    const finalOptions = options || '<option value="">Keine Maschinen vorhanden</option>';
    if (fromEl.innerHTML !== finalOptions) fromEl.innerHTML = finalOptions;
    if (toEl.innerHTML   !== finalOptions) toEl.innerHTML   = finalOptions;
  }

  // ── Event log ────────────────────────────────────────────
  function renderLog() {
    const el = document.getElementById('log-body');
    if (!el) return;
    el.innerHTML = eventLog.slice(0,20).map(e =>
      `<div class="log-entry"><span class="log-time">[${e.ts}]</span>${e.msg}</div>`
    ).join('');
  }

  // ── Phase banner ─────────────────────────────────────────
  function renderPhase(state) {
    const labels = { 1:'Phase 1 — Werkstatt', 2:'Phase 2 — Fabrikzeitalter', 3:'Phase 3 — Industrie-Expansion' };
    setText('phase-tag', labels[state.phase] || 'Phase ?');
  }

  // ── Market Modal Logic ──────────────────────────────────
  function openMarket() {
    show('modal-overlay');
    if (typeof STATE !== 'undefined') renderMarket(STATE);
  }
  function closeMarket() {
    hide('modal-overlay');
  }

  // ── Helpers ──────────────────────────────────────────────
  function setText(id, v) {
    const el = document.getElementById(id);
    if (el && el.textContent !== String(v)) el.textContent = v;
  }
  function setStyle(id, prop, val) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = val;
  }
  function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
  function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

  function openSkillTree() {
    const el = document.getElementById('modal-skilltree');
    if (el) {
      el.classList.remove('hidden');
      _gFp = null;  // force re-init
      renderSkillTree(STATE);
    }
  }

  function closeSkillTree() {
    document.getElementById('modal-skilltree')?.classList.add('hidden');
    if (_gAnim) { cancelAnimationFrame(_gAnim); _gAnim = null; }
    _gSticky = null;
  }

  // ═══════════════════════════════════════════════════════════
  // GRAPH VIEWER — Simple, reliable, Obsidian-like
  // ═══════════════════════════════════════════════════════════

  const CAT_COLORS = {
    'Mechanik':'#3d8ecf','Logistik':'#2aa876','Trust':'#7c6daa',
    'Rechnen':'#c75dab','Marketing':'#e8a83a','Maschinen':'#e07640',
    'Produktlinie':'#8e44ad','Optimierung':'#c0392b','Recycling':'#16a085',
    'Phase II':'#d4772c','Phase III':'#2471a3',
  };

  let _gN=[],_gE=[],_gLayers=[],_gV={x:0,y:0,z:1},_gHov=null,_gPn=null;
  let _gC=null,_gFp=null,_gSt=null,_gAn=null;
  let _gHideDone=false,_gHideFuture=false,_gVisible=null;
  let _gSticky=null, _gTooltipHitboxes=[], _gTooltipHovId=null, _gTooltipRect=null;

  function gInit(proj, st) {
    const done=st.research.completed, act=st.research.active?.id;
    const av=Research.getAvailable(st);
    _gN=[];_gE=[];const m={};
    proj.forEach((p,i)=>{
      const c=done.includes(p.id),a=act===p.id;
      const o=!c&&!a&&av.some(x=>x.id===p.id);
      m[p.id]={id:p.id,i,p,x:p.x * 1.35,y:p.y * 1.3,w:260,h:100,
        col:CAT_COLORS[p.category]||'#888',c,a,o,l:!c&&!a&&!o};
      _gN.push(m[p.id]);
    });
    proj.forEach(p=>{p.requires.forEach(r=>{if(m[r]&&m[p.id])_gE.push({s:m[r],t:m[p.id]});});});

    // Determine layers for background column labels from unique X coordinates
    const phaseLayers = [];
    const layerXs = [...new Set(_gN.map(n => n.x))].sort((a,b)=>a-b);
    layerXs.forEach((x, li) => {
      let count = _gN.filter(n => n.x === x).length;
      phaseLayers.push({
        x: x,
        label: li <= 6 ? 'Phase I' : (li <= 9 ? 'Phase II' : 'Phase III'),
        count: count
      });
    });
    _gLayers = phaseLayers;
  }

  function gCenter() {
    const vis=_gN.filter(n=>!_gVisible||_gVisible.has(n.id));
    if(!vis.length)return;
    
    // Focus on active node, or unlocked/open nodes for centering, falling back to all visible
    let focusNodes = vis.filter(n => n.a);
    if (!focusNodes.length) focusNodes = vis.filter(n => n.o);
    if (!focusNodes.length) focusNodes = vis;
    
    let fmX=1e9, fMX=-1e9, fmY=1e9, fMY=-1e9;
    focusNodes.forEach(n=>{
      fmX=Math.min(fmX,n.x-n.w/2);fMX=Math.max(fMX,n.x+n.w/2);
      fmY=Math.min(fmY,n.y-n.h/2);fMY=Math.max(fMY,n.y+n.h/2);
    });
    const cx=(fmX+fMX)/2,cy=(fmY+fMY)/2;

    const cw=_gC?_gC.clientWidth:800,ch=_gC?_gC.clientHeight:600;
    if(cw<10||ch<10)return;
    
    // Dynamischer Startzoom abhängig von der Kartenmenge
    // Deckeln des Startzooms bei max 0.85 (nicht zu riesig!), aber auch nicht mini
    let dynamicZ = Math.max(0.4, 0.85 - (vis.length * 0.015));
    
    _gV={x:-cx,y:-cy,z:dynamicZ};
  }

  // ── Draw ────────────────────────────────────────────────
  function gDraw() {
    if(!_gC)return;
    const ctx=_gC.getContext('2d'),dp=devicePixelRatio||1;
    const W=_gC.clientWidth,H=_gC.clientHeight;
    ctx.setTransform(dp,0,0,dp,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#f0ebe0';ctx.fillRect(0,0,W,H);

    ctx.save();
    ctx.translate(W/2,H/2);
    ctx.scale(_gV.z,_gV.z);
    ctx.translate(_gV.x,_gV.y);

    // Dot grid
    const gs=50;
    ctx.fillStyle='rgba(0,0,0,0.04)';
    const tl=gS2W(0,0),br=gS2W(W,H);
    for(let gx=Math.floor(tl.x/gs)*gs;gx<br.x;gx+=gs)
      for(let gy=Math.floor(tl.y/gs)*gs;gy<br.y;gy+=gs){
        ctx.beginPath();ctx.arc(gx,gy,1/_gV.z,0,Math.PI*2);ctx.fill();
      }

    // ── Nodes FIRST (solid opaque fills) ──
    _gN.forEach(n=>{
      if(_gVisible&&!_gVisible.has(n.id))return;
      const x=n.x-n.w/2,y=n.y-n.h/2,r=8;
      const hov=_gHov&&_gHov.id===n.id;
      const stick=_gSticky&&_gSticky.id===n.id;
      
      const focusNode = _gSticky || _gHov;
      const isReq = focusNode && focusNode.p.requires.includes(n.id);
      const isTgt = focusNode && n.p.requires.includes(focusNode.id);
      const isRel = isReq || isTgt;

      ctx.beginPath();ctx.roundRect(x,y,n.w,n.h,r);
      ctx.fillStyle=n.c?'#f0faf3':n.l?'#e8e4dd':'#fff';
      
      if (isRel) {
        ctx.shadowColor = focusNode.col;
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 150);
        ctx.shadowBlur = 15 * pulse;
      }
      
      ctx.fill();
      ctx.shadowColor='transparent';

      ctx.strokeStyle=n.c?'#3d6b50':n.a?'#2a4a7f':n.o?n.col:'#ccc';
      ctx.lineWidth=n.c||n.a?2.5:1.5;
      if(hov||stick){ctx.strokeStyle=n.col;ctx.lineWidth=3;}
      else if(isRel){ctx.strokeStyle=focusNode.col;ctx.lineWidth=3;}
      ctx.stroke();

      // Name — truncate if too long
      ctx.font='600 13px Inter,sans-serif';ctx.fillStyle=n.l&&!n.c?'#aaa':'#1a1a1a';ctx.textBaseline='top';
      let name=n.p.name;
      const maxNameW=n.w-16;
      while(ctx.measureText(name).width>maxNameW&&name.length>3)name=name.slice(0,-1);
      if(name!==n.p.name)name+='…';
      ctx.fillText(name,x+8,y+8);

      const activeR = _gSt?.research?.active;
      const pp=[];if(n.p.ops)pp.push(fmt(n.p.ops)+' Ops');if(n.p.creat)pp.push(fmt(n.p.creat)+' K');
      if(n.p.trust)pp.push(n.p.trust+' T');
      let costText, costColor;
      if (n.c) { costText = 'OK ERFORSCHT'; costColor = '#3d6b50'; }
      else if (n.a && activeR) {
        const remaining = Math.ceil(activeR.duration - activeR.elapsed);
        costText = remaining + 's verbleibend'; costColor = '#2a4a7f';
      } else { costText = pp.join(' + ') || 'Kostenlos'; costColor = n.o ? n.col : '#999'; }
      ctx.font='bold 9px "Share Tech Mono",monospace';ctx.textBaseline='bottom';
      ctx.fillStyle=costColor;
      ctx.fillText(costText,x+8,y+n.h-5);
      if(n.p.duration&&!n.c){ctx.font='9px "Share Tech Mono",monospace';ctx.fillStyle='#ccc';ctx.textAlign='right';
        ctx.fillText(n.p.duration+'s',x+n.w-8,y+n.h-5);ctx.textAlign='left';}

      // Active research: draw progress bar along bottom of card
      if (n.a && activeR) {
        const progress = activeR.progress || 0;
        const barH = 3;
        ctx.fillStyle = '#ddd';
        ctx.beginPath(); ctx.roundRect(x, y+n.h-barH, n.w, barH, [0,0,r,r]); ctx.fill();
        ctx.fillStyle = '#2a4a7f';
        ctx.beginPath(); ctx.roundRect(x, y+n.h-barH, n.w*progress, barH, [0,0,progress>=1?r:0,r]); ctx.fill();
      }
    });

    // ── Edges ON TOP — Orthogonal routing with rounded corners ──
    // Math config for grid based routing
    const colSpacing = 350 * 1.35; // 472.5
    const rowSpacing = 200 * 1.3;  // 260
    
    function cardEdge(n,nx,ny,margin){
      const hw=n.w/2+margin,hh=n.h/2+margin;
      const t=Math.min(hw/(Math.abs(nx)||0.001),hh/(Math.abs(ny)||0.001));
      return{x:n.x+nx*t,y:n.y+ny*t};
    }

    function drawOrthogonalPath(pts, srcDone, tgtDone, locked, highlight) {
      if(highlight){
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 150);
        ctx.strokeStyle=highlight;ctx.lineWidth=4;ctx.globalAlpha=pulse;
      }
      else if(srcDone&&tgtDone){ctx.strokeStyle='#2a5e3f';ctx.lineWidth=3;ctx.globalAlpha=0.9;}
      else if(srcDone){ctx.strokeStyle='#444';ctx.lineWidth=2.5;ctx.globalAlpha=0.8;}
      else{ctx.strokeStyle='#888';ctx.lineWidth=2;ctx.globalAlpha=0.65;}
      if(locked) ctx.setLineDash([5,4]);
      else ctx.setLineDash([]);
      
      const rad = 25; // Corner radius
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i-1], cur = pts[i];
        if (i === pts.length - 1) {
          ctx.lineTo(cur.x, cur.y);
        } else {
          const next = pts[i+1];
          // We need points to draw arcTo.
          // Arc is drawn from cur towards next
          ctx.arcTo(cur.x, cur.y, next.x, next.y, rad);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawArrowHead(x, y, dx, dy, srcDone, tgtDone, highlight) {
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const nx = dx/len, ny = dy/len;
      const as = 8, perpX = -ny, perpY = nx;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - nx*as + perpX*as*0.45, y - ny*as + perpY*as*0.45);
      ctx.lineTo(x - nx*as - perpX*as*0.45, y - ny*as - perpY*as*0.45);
      ctx.closePath();
      
      if(highlight){
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 150);
        ctx.fillStyle=highlight;ctx.globalAlpha=pulse;
      }
      else if(srcDone&&tgtDone){ctx.fillStyle='#2a5e3f';ctx.globalAlpha=0.9;}
      else if(srcDone){ctx.fillStyle='#444';ctx.globalAlpha=0.8;}
      else{ctx.fillStyle='#888';ctx.globalAlpha=0.65;}
      ctx.fill();
    }

    _gE.forEach(e => {
      if(_gVisible&&!_gVisible.has(e.s.id))return;
      if(_gVisible&&!_gVisible.has(e.t.id))return;
      
      const sNode = e.s, tNode = e.t;
      const sP = cardEdge(sNode, 1, 0, 2); // Exits right
      const tP = cardEdge(tNode, -1, 0, 2); // Enters left
      
      // Determine if this edge should be highlighted (pulsating)
      let highlight = null;
      const focusNode = _gSticky || _gHov;
      if (focusNode && (sNode.id === focusNode.id || tNode.id === focusNode.id)) {
        highlight = focusNode.col;
      } else if (sNode.a || tNode.a) {
        // Also highlight edges for the currently active research project!
        highlight = sNode.a ? sNode.col : tNode.col;
      }
      
      const colsBetween = Math.round((tNode.x - sNode.x) / colSpacing);
      const rowDiff = Math.round((tNode.y - sNode.y) / rowSpacing);
      
      // Deterministic offset to separate overlapping tracks! (-32 to +32 pixels)
      const trackId = ((sNode.i * 7) + (tNode.i * 13)) % 11 - 5;
      const offset = trackId * 6;
      
      let pts = [];
      const vChan1 = sNode.x + colSpacing * 0.38 + offset;
      const vChan2 = tNode.x - colSpacing * 0.38 + offset;

      if (colsBetween === 1 && rowDiff === 0) {
        pts = [ sP, tP ];
      } else if (colsBetween === 1) {
        const midX = (sNode.x + tNode.x) / 2 + offset;
        pts = [ sP, {x: midX, y: sP.y}, {x: midX, y: tP.y}, tP ];
      } else if (colsBetween > 1 && rowDiff === 0 && Array.from(_gN).some(n => n.y === sNode.y && n.x > sNode.x && n.x < tNode.x)) {
        // Same row, but nodes block the way -> loop around
        const hChan = sNode.y - rowSpacing * 0.4 + offset; 
        pts = [
          sP,
          {x: vChan1, y: sP.y},
          {x: vChan1, y: hChan},
          {x: vChan2, y: hChan},
          {x: vChan2, y: tP.y},
          tP
        ];
      } else if (colsBetween > 1 && rowDiff === 0) {
        // Same row, but NO nodes block the way
        pts = [ sP, tP ];
      } else {
        // Skips columns and different rows OR backwards edge OR same col
        const hChan = Math.min(sNode.y, tNode.y) - rowSpacing * 0.4 + offset; 
        pts = [
          sP,
          {x: vChan1, y: sP.y},
          {x: vChan1, y: hChan},
          {x: vChan2, y: hChan},
          {x: vChan2, y: tP.y},
          tP
        ];
      }
      
      drawOrthogonalPath(pts, sNode.c, tNode.c, tNode.l && !tNode.c, highlight);
      drawArrowHead(tP.x, tP.y, 1, 0, sNode.c, tNode.c, highlight);
    });
    ctx.globalAlpha=1;

    ctx.restore();

    // Tooltip (in screen space, not world space)
    const displayNode = _gSticky || _gHov;
    gDrawTooltip(ctx,displayNode);

    // Legend
    const cats=[...new Set(_gN.map(n=>n.p.category))];
    const lx=W-170,ly=H-cats.length*18-20;
    ctx.save();ctx.fillStyle='rgba(240,235,224,0.92)';
    ctx.beginPath();ctx.roundRect(lx-10,ly-14,170,cats.length*18+28,6);ctx.fill();
    ctx.strokeStyle='#d4cdc2';ctx.lineWidth=1;ctx.stroke();
    ctx.font='700 8px "Share Tech Mono",monospace';ctx.fillStyle='#999';ctx.textBaseline='top';
    ctx.fillText('KATEGORIEN',lx,ly-4);
    cats.forEach((cat,i)=>{const cy=ly+10+i*18;ctx.fillStyle=CAT_COLORS[cat]||'#888';
      ctx.beginPath();ctx.arc(lx+5,cy+4,4,0,Math.PI*2);ctx.fill();
      ctx.font='10px Inter,sans-serif';ctx.fillStyle='#555';ctx.fillText(cat,lx+14,cy-1);});
    ctx.restore();
    
    const zl = document.getElementById('st-zoom-level');
    if(zl) zl.textContent = Math.round(_gV.z * 100) + '%';
  }

  function gW2S(x,y){const c=_gC.clientWidth/2,d=_gC.clientHeight/2;
    return{x:(x+_gV.x)*_gV.z+c,y:(y+_gV.y)*_gV.z+d};}
  function gS2W(x,y){const c=_gC.clientWidth/2,d=_gC.clientHeight/2;
    return{x:(x-c)/_gV.z-_gV.x,y:(y-d)/_gV.z-_gV.y};}
  function gHit(sx,sy){const w=gS2W(sx,sy);
    for(let i=_gN.length-1;i>=0;i--){const n=_gN[i];
      if(_gVisible&&!_gVisible.has(n.id))continue;
      if(w.x>=n.x-n.w/2&&w.x<=n.x+n.w/2&&w.y>=n.y-n.h/2&&w.y<=n.y+n.h/2)return n;}return null;}

  function gRsz(){if(!_gC)return;const p=_gC.parentElement,dp=devicePixelRatio||1;
    _gC.width=p.clientWidth*dp;_gC.height=p.clientHeight*dp;
    _gC.style.width=p.clientWidth+'px';_gC.style.height=p.clientHeight+'px';}

  // ── Tooltip ─────────────────────────────────────────────
  function gDrawTooltip(ctx,node){
    if(!node)return;
    const n=node;
    const pad=12, lineH=18, gap=8;

    // Measure all content to calculate tooltip size
    const W=_gC.clientWidth, H=_gC.clientHeight;
    const maxW=320;

    // Build lines
    const lines=[];

    // Line 1: Name (bold)
    lines.push({text:n.p.name, bold:true, size:14, color:'#1a1a1a'});

    // Line 2: Category badge (separate)
    lines.push({text:n.p.category, badge:true, color:n.col});

    // Line 3: Description (wrap to multiple lines)
    ctx.font='11px Inter,sans-serif';
    const words=n.p.desc.split(' ');
    let currentLine='';
    words.forEach(word=>{
      const test=currentLine?currentLine+' '+word:word;
      if(ctx.measureText(test).width>maxW-pad*2&&currentLine){
        lines.push({text:currentLine, size:11, color:'#666'});
        currentLine=word;
      } else {
        currentLine=test;
      }
    });
    if(currentLine)lines.push({text:currentLine, size:11, color:'#666'});

    // Separator
    lines.push({sep:true});

    // Requirements header
    lines.push({text:'VORAUSSETZUNGEN', bold:true, size:9, color:'#888', mono:true});

    if(n.p.requires.length===0){
      lines.push({text:'Keine (Basis-Forschung)', size:11, color:'#444'});
    } else {
      n.p.requires.forEach(rid=>{
        const req=_gN.find(r=>r.id===rid);
        const label=req?req.p.name:rid;
        const done=n.c||_gSt?.research?.completed?.includes(rid);
        lines.push({text:(done?'✓ ':'— ')+label, size:11, color:done?'#2a5e3f':'#c0392b', rid: rid});
      });
    }

    // Separator
    lines.push({sep:true});

    // Cost
    lines.push({text:'KOSTEN', bold:true, size:9, color:'#888', mono:true});
    if (!n.p.ops && !n.p.creat && !n.p.trust) {
      lines.push({text:'Kostenlos', size:11, color:'#2a5e3f', mono:true});
    } else {
      const r = _gSt && _gSt.research;
      if (n.p.ops) {
        const have = r ? Math.floor(r.ops) : 0;
        const ok = r ? (r.ops + 0.001) >= n.p.ops : true;
        lines.push({text: have + ' / ' + n.p.ops + ' Ops', size:11, color: ok ? '#2a5e3f' : '#c0392b', mono:true});
      }
      if (n.p.creat) {
        const have = r ? Math.floor(r.creat) : 0;
        const ok = r ? (r.creat + 0.001) >= n.p.creat : true;
        lines.push({text: have + ' / ' + n.p.creat + ' Kreativität', size:11, color: ok ? '#2a5e3f' : '#c0392b', mono:true});
      }
      if (n.p.trust) {
        const have = _gSt ? (_gSt.trust || 0) : 0;
        const ok = !_gSt || have >= n.p.trust;
        lines.push({text: have + ' / ' + n.p.trust + ' Trust', size:11, color: ok ? '#2a5e3f' : '#c0392b', mono:true});
      }
    }

    // Duration
    if(n.p.duration){
      lines.push({text:'Dauer: '+n.p.duration+'s', size:11, color:'#888', mono:true});
    }

    // Action Button
    if (n.o && !n.a) {
      lines.push({sep:true});
      const affordable = _gSt && typeof Research !== 'undefined' ? Research.canAfford(_gSt, n.p) : true;
      lines.push({text: affordable ? 'FORSCHEN STARTEN' : 'NICHT LEISTBAR', size:11, bold:true, color:'#fff', bg: affordable ? '#2a4a7f' : '#9babbf', isButton: true, bId: affordable ? 'BTN_'+n.id : null});
    } else if (n.a) {
      lines.push({sep:true});
      lines.push({text:'WIRD ERFORSCHT...', size:11, bold:true, color:'#fff', isButton: true, bg:'#6c8abf'});
    } else if (n.c) {
      lines.push({sep:true});
      lines.push({text:'ERFORSCHT', size:11, bold:true, color:'#fff', isButton: true, bg:'#9babbf'});
    }

    // Calculate height
    let th=0;
    lines.forEach(l=>{
      if(l.sep){th+=gap;}
      else if(l.isButton){th+=28;}
      else{th+=lineH;}
    });
    th+=pad*2;

    // Calculate width (find longest line)
    let tw=0;
    lines.forEach(l=>{
      if(l.text && !l.isButton){
        ctx.font=(l.bold?'bold ':'')+(l.size||11)+'px '+(l.mono?'"Share Tech Mono"':'Inter')+',sans-serif';
        const w=ctx.measureText(l.text).width;
        if(w>tw)tw=w;
      }
    });
    tw+=pad*2+10; // extra for badge
    tw=Math.min(tw,maxW);
    tw=Math.max(tw,200);

    // Position: centered below the node, or above if near bottom edge
    const sp=gW2S(n.x,n.y);
    let tx = sp.x - tw/2;
    if(tx < 10) tx = 10;
    if(tx + tw > W - 10) tx = W - tw - 10;
    
    let ty = sp.y + n.h*_gV.z/2 + 15; // Below
    if(ty + th > H - 10) {
      ty = sp.y - n.h*_gV.z/2 - th - 15; // Above
    }
    if(ty < 10) ty = 10;
    
    _gTooltipRect = {x: tx, y: ty, w: tw, h: th}; // Save full tooltip bounds!

    // Draw tooltip
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.15)';ctx.shadowBlur=12;
    ctx.fillStyle='rgba(255,255,255,0.97)';
    ctx.beginPath();ctx.roundRect(tx,ty,tw,th,8);ctx.fill();
    ctx.shadowColor='transparent';
    ctx.strokeStyle=n.col;ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(tx,ty,tw,th,8);ctx.stroke();

    // Draw lines
    let cy=ty+pad;
    lines.forEach(l=>{
      if(l.sep){cy+=gap;return;}
      if(l.badge){
        // Badge on the left, below title
        const bw=ctx.measureText(l.text).width+16;
        ctx.fillStyle=l.color;
        ctx.beginPath();ctx.roundRect(tx+pad,cy-2,bw,16,4);ctx.fill();
        ctx.font='bold 10px Inter,sans-serif';ctx.fillStyle='#fff';ctx.textBaseline='top';
        ctx.fillText(l.text,tx+pad+8,cy);
        cy+=lineH;
      } else {
        ctx.font=(l.bold?'bold ':'')+(l.size||11)+'px '+(l.mono?'"Share Tech Mono"':'Inter')+',sans-serif';
        
        if (l.isButton) {
          const bw = tw - pad*2;
          const bh = 24;
          if (l.bg !== 'transparent') {
            ctx.fillStyle = l.bg;
            ctx.beginPath(); ctx.roundRect(tx+pad, cy, bw, bh, 4); ctx.fill();
            if (_gTooltipHovId === l.bId) {
              ctx.fillStyle = 'rgba(255,255,255,0.2)';
              ctx.beginPath(); ctx.roundRect(tx+pad, cy, bw, bh, 4); ctx.fill();
            }
          }
          ctx.fillStyle = l.color;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(l.text, tx + tw/2, cy + bh/2);
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          
          if (l.bId && l.bg !== 'transparent') {
            _gTooltipHitboxes.push({x: tx+pad, y: cy, w: bw, h: bh, id: l.bId});
          }
          cy += bh;
        } else {
          ctx.fillStyle=l.color;ctx.textBaseline='top';
          ctx.fillText(l.text,tx+pad,cy);
          
          if (l.rid) {
            const w = ctx.measureText(l.text).width;
            // Capture hitbox for tooltip interaction
            _gTooltipHitboxes.push({x: tx+pad, y: cy, w: w, h: lineH, id: l.rid});
            
            if (_gTooltipHovId === l.rid) {
              ctx.beginPath();
              ctx.moveTo(tx+pad, cy+13);
              ctx.lineTo(tx+pad+w, cy+13);
              ctx.strokeStyle = l.color;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
          cy+=lineH;
        }
      }
    });

    ctx.restore();
  }

  // ── Events ──────────────────────────────────────────────
  let _gMouseDownPos = null;
  let _gMouseDownHit = null;
  let _gMouseDownInTip = false;
  
  function gBind(c){
    c.addEventListener('mousedown',e=>{
      const r=c.getBoundingClientRect();
      const mx = e.clientX-r.left, my = e.clientY-r.top;
      _gMouseDownPos = {x: mx, y: my};
      _gMouseDownHit = null;
      _gMouseDownInTip = false;
      
      let clickedTip = false;
      if (_gSticky && _gTooltipHitboxes.length) {
        _gTooltipHitboxes.forEach(hb => {
          if (mx >= hb.x && mx <= hb.x+hb.w && my >= hb.y && my <= hb.y+hb.h) {
            if (hb.id && hb.id.startsWith('BTN_')) {
              actionStartResearch(hb.id.substring(4)); // do NOT reset _gFp here
            } else {
              const tgt = _gN.find(n => n.id === hb.id);
              if (tgt) { _gSticky = tgt; _gV.x = -tgt.x; _gV.y = -tgt.y; }
            }
            clickedTip = true;
          }
        });
      }
      if (clickedTip) { _gTooltipRect = null; _gMouseDownInTip = true; return; }
      
      // Protect tooltip body from starting a pan or closing the tooltip
      if (_gSticky && _gTooltipRect) {
        if (mx >= _gTooltipRect.x && mx <= _gTooltipRect.x+_gTooltipRect.w && my >= _gTooltipRect.y && my <= _gTooltipRect.y+_gTooltipRect.h) {
          _gMouseDownInTip = true;
          return; // Ignore general clicks on the tooltip so users can select text
        }
      }

      const hit=gHit(mx, my);
      _gMouseDownHit = hit;
      
      if(hit){
        _gSticky = hit;
      }
      // Start Pan
      if(!hit) {
        _gPn={sx:e.clientX,sy:e.clientY,vx:_gV.x,vy:_gV.y};
      }
    });
    c.addEventListener('mousemove',e=>{
      const r=c.getBoundingClientRect();
      const mx = e.clientX-r.left, my = e.clientY-r.top;
      
      if(_gPn){
        _gV.x=_gPn.vx+(e.clientX-_gPn.sx)/_gV.z;
        _gV.y=_gPn.vy+(e.clientY-_gPn.sy)/_gV.z;
        c.style.cursor='grabbing';
      } else {
        _gTooltipHovId = null;
        if (_gSticky && _gTooltipHitboxes.length) {
          _gTooltipHitboxes.forEach(hb => {
            if (mx >= hb.x && mx <= hb.x+hb.w && my >= hb.y && my <= hb.y+hb.h) {
              _gTooltipHovId = hb.id;
            }
          });
        }
        _gHov=gHit(mx, my);
        c.style.cursor=(_gHov || _gTooltipHovId)?'pointer':'grab';
      }
    });

    c.addEventListener('mouseup',e=>{
      _gPn=null;
      if(c.style.cursor==='grabbing') c.style.cursor='grab';
      
      if (_gMouseDownPos) {
        // Fallback to simple calculation because getBoundingClientRect may be 0,0 if canvas is detached
        const r=c.getBoundingClientRect(); 
        const mx = e.clientX-r.left, my = e.clientY-r.top;
        const dist = Math.hypot(mx - _gMouseDownPos.x, my - _gMouseDownPos.y);
        
        // If distance is short, it was a click (not a drag)
        if (dist < 5) {
          // If clicked on empty space (no card, no tooltip), close sticky!
          if (!_gMouseDownHit && !_gMouseDownInTip) {
            _gSticky = null;
          }
        }
      }
      _gMouseDownPos = null;
      _gMouseDownHit = null;
      _gMouseDownInTip = false;
    });
    c.addEventListener('mouseleave',()=>{_gHov=null;_gPn=null;_gTooltipHovId=null;});
    c.addEventListener('wheel',e=>{e.preventDefault();
      _gV.z=Math.max(0.15,Math.min(3,_gV.z*(e.deltaY>0?0.9:1.1)));},{passive:false});
    // Touch: pan + tap
    let td=0;
    c.addEventListener('touchstart',e=>{
      if(e.touches.length===1){
        const t=e.touches[0],r=c.getBoundingClientRect();
        const hit=gHit(t.clientX-r.left,t.clientY-r.top);
        if(hit&&hit.o&&!hit.a){actionStartResearch(hit.id);_gFp=null;}
        else _gPn={sx:t.clientX,sy:t.clientY,vx:_gV.x,vy:_gV.y};
      }
      else if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;td=Math.sqrt(dx*dx+dy*dy);}
    },{passive:true});
    c.addEventListener('touchmove',e=>{e.preventDefault();
      if(e.touches.length===1){const t=e.touches[0];
        if(_gPn){_gV.x=_gPn.vx+(t.clientX-_gPn.sx)/_gV.z;_gV.y=_gPn.vy+(t.clientY-_gPn.sy)/_gV.z;}}
      else if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
        const d=Math.sqrt(dx*dx+dy*dy);if(td>0)_gV.z=Math.max(0.15,Math.min(3,_gV.z*(d/td)));td=d;}},{passive:false});
    c.addEventListener('touchend',()=>{_gPn=null;td=0;});
  }

  // ── Visibility filter ──────────────────────────────────
  function computeVisible() {
    if (!_gHideDone && !_gHideFuture) { _gVisible = null; _updateFilterCount(); return; }
    _gVisible = new Set();
    const children = {}, parents = {};
    _gN.forEach(n => { children[n.id] = []; parents[n.id] = []; });
    _gE.forEach(e => { children[e.s.id].push(e.t.id); parents[e.t.id].push(e.s.id); });
    
    // BFS distances
    const frontier = _gN.filter(n => n.a || n.o).map(n => n.id);
    const futureDist = {}; frontier.forEach(id => futureDist[id] = 0);
    let queue = [...frontier];
    while (queue.length) { const cur = queue.shift(); const d = futureDist[cur]; children[cur].forEach(child => { if (futureDist[child] === undefined) { futureDist[child] = d + 1; queue.push(child); } }); }
    
    const pastDist = {}; frontier.forEach(id => pastDist[id] = 0);
    queue = [...frontier];
    while (queue.length) { const cur = queue.shift(); const d = pastDist[cur]; parents[cur].forEach(par => { if (pastDist[par] === undefined) { pastDist[par] = d + 1; queue.push(par); } }); }
    
    _gN.forEach(n => {
      let show = true;
      if (_gHideDone && n.c) { const pd = pastDist[n.id]; if (pd === undefined || pd > 1) show = false; }
      if (_gHideFuture && n.l) { const fd = futureDist[n.id]; if (fd === undefined || fd > 1) show = false; }
      if (show) _gVisible.add(n.id);
    });
    
    // Structural Support Loop: Wenn eine "Zukunfts"-Karte (die noch locked ist) sichtbar ist, 
    // dann MÜSSEN auch all ihre "Zukunfts"-Elternknoten sichtbar sein, damit sie nicht ohne Linie herumfliegt!
    let changed = true;
    while(changed) {
      changed = false;
      _gN.forEach(n => {
        if (_gVisible.has(n.id) && !n.c) {
          parents[n.id].forEach(pid => {
            const pNode = _gN.find(x => x.id === pid);
            if (pNode && !pNode.c && !_gVisible.has(pid)) {
              _gVisible.add(pid);
              changed = true; // Loop until all paths back to the frontier are established
            }
          });
        }
      });
    }

    _updateFilterCount();
  }

  function _updateFilterCount() {
    const cnt = document.getElementById('st-filter-count');
    if (cnt) cnt.textContent = _gVisible ? _gVisible.size + '/' + _gN.length + ' sichtbar' : '';
  }

  function updateGraphFilter() {
    const hd = document.getElementById('st-hide-done');
    const hf = document.getElementById('st-hide-future');
    _gHideDone = hd ? hd.checked : false;
    _gHideFuture = hf ? hf.checked : false;
    computeVisible();
    gCenter();
  }

  // ── Entry ──────────────────────────────────────────────
  function renderSkillTree(state) {
    const canvas=document.getElementById('skilltree-canvas');if(!canvas)return;
    _gSt=state;const all=Research.getAll(),done=state.research.completed;
    const act=state.research.active?.id,av=Research.getAvailable(state);
    const fp=done.sort().join(',')+'|'+act+'|'+av.map(a=>a.id).sort().join(',');
    if(_gFp===fp&&_gC){_gN.forEach(n=>{n.c=done.includes(n.id);n.a=act===n.id;
      n.o=!n.c&&!n.a&&av.some(x=>x.id===n.id);n.l=!n.c&&!n.a&&!n.o;});computeVisible();return;}
    _gFp=fp;
    const nd=document.getElementById('skilltree-nodes'),sv=document.getElementById('skilltree-svg');
    if(nd)nd.style.display='none';if(sv)sv.style.display='none';
    gInit(all,state);
    // Re-sync sticky to new node reference after re-init
    if (_gSticky) {
      const refreshed = _gN.find(n => n.id === _gSticky.id);
      if (refreshed) _gSticky = refreshed;
    }
    
    // Sync initial filter state
    const hd = document.getElementById('st-hide-done');
    const hf = document.getElementById('st-hide-future');
    _gHideDone = hd ? hd.checked : false;
    _gHideFuture = hf ? hf.checked : false;
    computeVisible();
    
    _gHov=null;_gDr=null;_gPn=null;

    const nc=canvas.cloneNode(false);canvas.parentNode.replaceChild(nc,canvas);
    _gC=nc;nc.style.display='block';nc.style.width='100%';nc.style.height='100%';gRsz();gBind(nc);

    if (!window._stKeyBound) {
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && _gSticky) {
          _gSticky = null;
        }
      });
      window._stKeyBound = true;
    }

    // Center immediately
    gCenter();

    // Start animation loop
    if(_gAn)cancelAnimationFrame(_gAn);
    (function loop(){gDraw();_gAn=requestAnimationFrame(loop);})();
    new ResizeObserver(()=>{gRsz();gCenter();}).observe(nc.parentElement);
  }

  function zoomGraph(factor) {
    if(!_gC) return;
    _gV.z = Math.max(0.15, Math.min(3, _gV.z * factor));
  }

  // ── CLI Modal ─────────────────────────────────────────────
  function openCLI(state) {
    const el = document.getElementById('cli-commands');
    if (!el) return;
    
    const commands = [
      { name: 'Lager anzeigen', cmd: 'console.log(JSON.stringify(STATE.production.warehouse, null, 2))', desc: 'Zeigt Lagerinhalt' },
      { name: 'Maschinen', cmd: 'console.log(JSON.stringify(STATE.production.machines.map(m => ({id: m.id, type: m.recipeId, buffers: m.inputBuffer})), null, 2))', desc: 'Zeigt Maschinen-Status' },
      { name: 'Spielstand', cmd: 'console.log("Geld:", STATE.money, "Ops:", STATE.research.ops, "Trust:", STATE.trust)', desc: 'Zeigt wichtige Stats' },
      { name: 'Verkaufen (Alle Klammern)', cmd: 'cliSellAll("clip")', desc: 'Verkauft alle Klammern' },
    ];
    
    el.innerHTML = `
      <div style="margin-bottom:12px;padding:8px;background:var(--bg-panel);border-radius:4px;border-left:3px solid var(--accent-amber)">
        <div style="font-weight:600;margin-bottom:4px">💡 So nutzt du die CLI:</div>
        <div style="font-size:.75rem;color:var(--text-muted)">1. Klicke auf einen Befehl zum Kopieren<br>2. Öffne Console (F12)<br>3. Füge ein (Strg+V) und Enter</div>
      </div>
      ${commands.map(c => `
        <div style="margin-bottom:8px;padding:8px;background:var(--bg-panel);border-radius:4px">
          <div style="font-weight:600;margin-bottom:2px">${c.name}</div>
          <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:4px">${c.desc}</div>
          <code style="display:block;padding:6px;background:var(--bg-base);border-radius:3px;font-size:.75rem;cursor:pointer" onclick="copyToClipboard(this.textContent.trim())">${c.cmd}</code>
        </div>
      `).join('')}
    `;
    
    document.getElementById('modal-cli')?.classList.remove('hidden');
  }

  function closeCLI() {
    document.getElementById('modal-cli')?.classList.add('hidden');
  }

  // ── Sell Modal ────────────────────────────────────────────
  function openSellModal(state) {
    const el = document.getElementById('sell-items');
    if (!el) return;
    
    const wh = state.production?.warehouse || {};
    // Show ALL items in warehouse that have quantity > 0
    const items = Object.entries(wh).filter(([id, qty]) => qty > 0);
    
    if (items.length === 0) {
      el.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px">Lager ist leer</div>';
    } else {
      el.innerHTML = items.map(([id, qty]) => {
        const meta = RESOURCE_META[id] || { name: id, basePrice: 0.1 };
        const price = state.market?.prices[id] || meta.basePrice || 0.1;
        const maxQty = Math.floor(qty);
        const halfQty = Math.max(1, Math.floor(qty / 2));
        return `
          <div style="display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid var(--border);flex-wrap:wrap">
            <span style="flex:1;min-width:90px">${meta.name}</span>
            <span style="font-size:.7rem;color:var(--text-muted);min-width:70px">${fmt(qty,0)} ${meta.unit || 'Stk'}</span>
            <button class="btn btn-sm" style="padding:2px 6px;min-width:28px" onclick="adjustSellQty('${id}', -5)">-5</button>
            <button class="btn btn-sm" style="padding:2px 6px;min-width:24px" onclick="adjustSellQty('${id}', -1)">-1</button>
            <input type="number" id="sell-qty-${id}" min="1" max="${maxQty}" value="${halfQty}" style="width:55px;padding:2px 4px;font-size:.75rem;text-align:center">
            <button class="btn btn-sm" style="padding:2px 6px;min-width:24px" onclick="adjustSellQty('${id}', 1)">+1</button>
            <button class="btn btn-sm" style="padding:2px 6px;min-width:28px" onclick="adjustSellQty('${id}', 5)">+5</button>
            <span style="font-size:.65rem;color:var(--accent-green)">${fmtMoney(halfQty * price)}</span>
            <button class="btn btn-sm btn-amber" data-action="cli-sell-custom" data-resource="${id}">Verkauf</button>
          </div>
        `;
      }).join('');
    }
    
    document.getElementById('modal-sell')?.classList.remove('hidden');
  }

  // Helper for +/- buttons
  function adjustSellQty(id, delta) {
    const input = document.getElementById(`sell-qty-${id}`);
    if (!input) return;
    const max = parseInt(input.max) || 999999;
    let val = parseInt(input.value) || 0;
    val = Math.max(1, Math.min(max, val + delta));
    input.value = val;
    // Trigger price recalc
    const row = input.closest('div');
    const priceSpan = row?.querySelector('span:last-of-type');
    if (priceSpan) {
      const qty = parseInt(input.value) || 0;
      const resourceId = id;
      const price = STATE.market?.prices[resourceId] || RESOURCE_META[resourceId]?.basePrice || 0.1;
      priceSpan.textContent = fmtMoney(qty * price);
    }
  }

  function closeSell() {
    document.getElementById('modal-sell')?.classList.add('hidden');
  }

  function cliSellAll(resourceId) {
    const qty = Math.floor(STATE.production?.warehouse?.[resourceId] || 0);
    if (qty <= 0) { showNotif('Nichts zum Verkaufen', 'warn'); return; }
    const result = Market.sellProduct(STATE, resourceId, qty);
    if (result.ok) {
      showNotif(`${result.sold}× verkauft für ${fmtMoney(result.earned)}`);
      renderWarehouse(STATE);
      openSellModal(STATE);
      saveGame();
    }
  }

  function cliSellHalf(resourceId) {
    const qty = Math.floor((STATE.production?.warehouse?.[resourceId] || 0) / 2);
    if (qty <= 0) { showNotif('Nichts zum Verkaufen', 'warn'); return; }
    const result = Market.sellProduct(STATE, resourceId, qty);
    if (result.ok) {
      showNotif(`${result.sold}× verkauft für ${fmtMoney(result.earned)}`);
      renderWarehouse(STATE);
      openSellModal(STATE);
      saveGame();
    }
  }

  function cliSellCustom(resourceId) {
    const inputEl = document.getElementById(`sell-qty-${resourceId}`);
    const qty = parseInt(inputEl?.value) || 0;
    if (qty <= 0) { showNotif('Ungültige Menge', 'warn'); return; }
    const maxQty = Math.floor(STATE.production?.warehouse?.[resourceId] || 0);
    if (qty > maxQty) qty = maxQty;
    const result = Market.sellProduct(STATE, resourceId, qty);
    if (result.ok) {
      showNotif(`${result.sold}× verkauft für ${fmtMoney(result.earned)}`);
      renderWarehouse(STATE);
      openSellModal(STATE);
      saveGame();
    } else {
      showNotif(result.reason || 'Verkauf fehlgeschlagen', 'error');
    }
  }

  return { 
    build, render, 
    renderProduction, renderBuildMenu, renderWarehouse, renderResearch, renderQuests, renderPhaseOverview, 
    getMachineFingerprint, openMarket, closeMarket,
    openSkillTree, closeSkillTree, renderSkillTree, updateGraphFilter,
    openCLI, closeCLI, openSellModal, closeSell, cliSellAll, cliSellHalf, cliSellCustom, adjustSellQty,
    zoomGraph, centerGraph: gCenter
  };
})();
