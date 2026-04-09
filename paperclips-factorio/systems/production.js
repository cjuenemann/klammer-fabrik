// ============================================================
// PRODUCTION SYSTEM — Machine instances with input/output buffers
// Each machine ticks independently, consuming inputs → outputs
// ============================================================
const Production = (() => {

  let _nextMachineId = 1;

  function init(state) {
    state.production = state.production || {
      machines: [],
      warehouse: {},  // global storage pool
      power: { generated: 0, consumed: 0, gridUnlocked: false },
    };
    state.production.warehouse = state.production.warehouse || {};
    if (!Array.isArray(state.production.machines)) state.production.machines = [];
    if (!_nextMachineId || _nextMachineId <= 1) {
      // Restore id counter from saved machines
      const maxId = state.production.machines.reduce((m, mach) => Math.max(m, mach.id || 0), 0);
      _nextMachineId = maxId + 1;
    }
  }

  // ── Machine factory ────────────────────────────────────────
  function createMachine(recipeId) {
    const recipe = RECIPES[recipeId];
    if (!recipe) return null;
    const inputBuffer  = {};
    const outputBuffer = {};
    for (const k of Object.keys(recipe.inputs))  inputBuffer[k]  = 0;
    for (const k of Object.keys(recipe.outputs)) outputBuffer[k] = 0;
    return {
      id:           _nextMachineId++,
      recipeId,
      label:        recipe.name,
      inputBuffer,
      outputBuffer,
      efficiency:   0,      // 0..1
      cycleProgress: 0,     // 0..1
      active:       true,
      totalProduced: 0,
    };
  }

  function buildMachine(state, recipeId) {
    const recipe = RECIPES[recipeId];
    if (!recipe) return { ok: false, reason: 'Unbekanntes Rezept' };
    if (recipe.phase > state.phase) return { ok: false, reason: `Nicht verfügbar in Phase ${state.phase}` };
    if (recipe.unlockResearch && !state.upgrades?.[recipe.unlockResearch]) {
      return { ok: false, reason: 'Forschung erforderlich' };
    }
    if (state.money < recipe.buildCost) return { ok: false, reason: 'Nicht genug Geld' };
    state.money -= recipe.buildCost;
    const machine = createMachine(recipeId);
    state.production.machines.push(machine);
    return { ok: true, machine };
  }

  function removeMachine(state, machineId) {
    const idx = state.production.machines.findIndex(m => m.id === machineId);
    if (idx < 0) return false;
    // Dump buffers back to warehouse
    const mach = state.production.machines[idx];
    for (const [res, qty] of Object.entries(mach.inputBuffer))  addToWarehouse(state, res, qty);
    for (const [res, qty] of Object.entries(mach.outputBuffer)) addToWarehouse(state, res, qty);
    state.production.machines.splice(idx, 1);
    return true;
  }

  // ── Warehouse helpers ──────────────────────────────────────
  function addToWarehouse(state, resource, qty) {
    state.production.warehouse[resource] = (state.production.warehouse[resource] || 0) + qty;
  }

  function takeFromWarehouse(state, resource, qty) {
    const avail = state.production.warehouse[resource] || 0;
    const taken = Math.min(avail, qty);
    state.production.warehouse[resource] = avail - taken;
    return taken;
  }

  // Manual: push resources from warehouse into machine input buffer
  function manualFeed(state, machineId, resource, qty) {
    const mach = state.production.machines.find(m => m.id === machineId);
    if (!mach) return 0;
    const recipe = RECIPES[mach.recipeId];
    const capacity = recipe.inputCapacity[resource] || 0;
    const current  = mach.inputBuffer[resource] || 0;
    const space    = capacity - current;
    const toMove   = Math.min(qty, space, state.production.warehouse[resource] || 0);
    if (toMove <= 0) return 0;
    mach.inputBuffer[resource] = current + toMove;
    state.production.warehouse[resource] = (state.production.warehouse[resource] || 0) - toMove;
    return toMove;
  }

  // Manual: pull resources from machine output buffer to warehouse
  function manualCollect(state, machineId) {
    const mach = state.production.machines.find(m => m.id === machineId);
    if (!mach) return {};
    const collected = {};
    for (const [res, qty] of Object.entries(mach.outputBuffer)) {
      if (qty > 0) {
        addToWarehouse(state, res, qty);
        collected[res] = qty;
        mach.outputBuffer[res] = 0;
      }
    }
    return collected;
  }

  // ── Per-machine tick ───────────────────────────────────────
  function tickMachine(state, mach, dt, powerFactor) {
    if (!mach.active) { mach.efficiency = 0; return; }
    const recipe = RECIPES[mach.recipeId];
    if (!recipe) return;

    // Is it a generator?
    if (recipe.isGenerator) {
      tickGenerator(state, mach, dt);
      return;
    }

    // Check input availability
    let inputRatio = 1;
    for (const [res, needed] of Object.entries(recipe.inputs)) {
      const has = mach.inputBuffer[res] || 0;
      inputRatio = Math.min(inputRatio, has >= needed ? 1 : (has / needed));
    }

    // Check output space
    let outputRatio = 1;
    for (const [res, produced] of Object.entries(recipe.outputs)) {
      const capacity = recipe.outputCapacity[res] || 100;
      const current  = mach.outputBuffer[res] || 0;
      const space    = capacity - current;
      outputRatio = Math.min(outputRatio, space >= produced ? 1 : (space / produced));
    }

    // Efficiency is limited by inputs, output space, AND power
    mach.efficiency = inputRatio * outputRatio * powerFactor;

    // Advance cycle
    const speedMult   = state.upgrades?.machineSpeed  || 1;
    const rate        = recipe.cyclesPerSec * speedMult;
    mach.cycleProgress += rate * mach.efficiency * dt;

    // Complete cycles
    while (mach.cycleProgress >= 1) {
      mach.cycleProgress -= 1;

      // Consume inputs
      for (const [res, needed] of Object.entries(recipe.inputs)) {
        mach.inputBuffer[res] = Math.max(0, (mach.inputBuffer[res] || 0) - needed);
      }

      // Produce outputs (capped by capacity)
      for (const [res, produced] of Object.entries(recipe.outputs)) {
        const capacity = recipe.outputCapacity[res] || 100;
        const current  = mach.outputBuffer[res] || 0;
        mach.outputBuffer[res] = Math.min(capacity, current + produced);
        mach.totalProduced += produced;
        state.totalProduced = (state.totalProduced || 0) + produced;
      }
    }
  }

  function tickGenerator(state, mach, dt) {
    const recipe = RECIPES[mach.recipeId];
    if (!recipe) return;

    // Manual generator doesn't consume fuels or run by itself
    if (recipe.id === 'manualGenerator') {
      // Decay manual power over time
      mach.outputBuffer.powerGrid = Math.max(0, (mach.outputBuffer.powerGrid || 0) - 10 * dt);
      mach.efficiency = (mach.outputBuffer.powerGrid || 0) > 0 ? 1 : 0;
      return;
    }

    // Thermal generators (Coal)
    if (recipe.inputs.coal) {
      const hasFuel = (mach.inputBuffer.coal || 0) >= recipe.inputs.coal;
      mach.efficiency = hasFuel ? 1 : 0;
      if (hasFuel) {
        mach.cycleProgress += recipe.cyclesPerSec * dt;
        if (mach.cycleProgress >= 1) {
          mach.cycleProgress -= 1;
          mach.inputBuffer.coal -= recipe.inputs.coal;
        }
      }
    } else {
      // Passive (Solar)
      mach.efficiency = 1; // Always on for now (no night cycle yet)
    }
  }

  function tick(state, dt) {
    const p = state.production;
    
    // 1. Calculate total potential power consumption and generation
    let totalGen  = 0;
    let totalCons = 0;

    for (const mach of p.machines) {
      const recipe = RECIPES[mach.recipeId];
      if (!recipe || !mach.active) continue;

      if (recipe.isGenerator) {
        if (recipe.id === 'manualGenerator') {
          totalGen += mach.outputBuffer.powerGrid || 0;
        } else if (recipe.inputs.coal) {
          if ((mach.inputBuffer.coal || 0) >= recipe.inputs.coal) totalGen += recipe.outputs.powerGrid;
        } else {
          totalGen += recipe.outputs.powerGrid; // passive
        }
      } else {
        // Only machines that COULD work (have inputs) consume full power
        // Idle machines consume 10% standby power
        let hasInputs = true;
        for (const [res, needed] of Object.entries(recipe.inputs)) {
          if ((mach.inputBuffer[res] || 0) < needed) hasInputs = false;
        }
        const consumption = recipe.powerConsumption || 0;
        totalCons += hasInputs ? consumption : (consumption * 0.1);
      }
    }

    p.power.generated = totalGen;
    p.power.consumed  = totalCons;

    // 2. Power factor (0..1)
    const powerFactor = totalCons > 0 ? Math.min(1, totalGen / totalCons) : 1;
    p.power.factor = powerFactor;

    // 3. Tick machines with power factor
    for (const mach of p.machines) {
      tickMachine(state, mach, dt, powerFactor);
    }
    
    checkTrustMilestones(state);
  }

  // Action for Handkurbel-Generator
  function crankGenerator(state, machineId) {
    const mach = getMachineById(state, machineId);
    if (!mach || mach.recipeId !== 'manualGenerator') return;
    const recipe = RECIPES.manualGenerator;
    mach.outputBuffer.powerGrid = Math.min(150, (mach.outputBuffer.powerGrid || 0) + 25);
    mach.efficiency = 1;
  }

  // Action for Hand-Ziehbank
  function crankWireDrawer(state, machineId) {
    const mach = getMachineById(state, machineId);
    if (!mach || mach.recipeId !== 'manualWireDrawer') return;
    const recipe = RECIPES.manualWireDrawer;
    
    const hasInput = (mach.inputBuffer.steelCoil || 0) >= (recipe.inputs.steelCoil || 1);
    if (!hasInput) return;
    
    const outputCap = (recipe.outputCapacity?.manualWire || 15);
    const currentOut = (mach.outputBuffer.manualWire || 0);
    if (currentOut >= outputCap) return;
    
    mach.inputBuffer.steelCoil = Math.max(0, (mach.inputBuffer.steelCoil || 0) - (recipe.inputs.steelCoil || 1));
    mach.outputBuffer.manualWire = Math.min(outputCap, currentOut + (recipe.outputs.manualWire || 2));
    mach.cycleProgress = Math.max(0, mach.cycleProgress - 0.3);
    mach.efficiency = 1;
  }

  const TRUST_MILESTONES = [50, 200, 500, 2000, 10000, 50000, 200000, 1e6, 10e6];
  function checkTrustMilestones(state) {
    if (!state._trustMilestonesHit) state._trustMilestonesHit = [];
    for (const t of TRUST_MILESTONES) {
      if ((state.totalProduced || 0) >= t && !state._trustMilestonesHit.includes(t)) {
        state._trustMilestonesHit.push(t);
        state.trust = (state.trust || 0) + 1;
        if (state.research) state.research.maxOps = Math.min(state.research.maxOps + 250, 1000000);
      }
    }
  }

  function getMachineById(state, id) {
    return state.production.machines.find(m => m.id === id);
  }

  // How much of a resource is being produced per second across all machines
  function getProductionRate(state, resource) {
    let rate = 0;
    for (const mach of state.production.machines) {
      const recipe = RECIPES[mach.recipeId];
      if (!recipe) continue;
      const out = recipe.outputs[resource];
      if (out) rate += out * recipe.cyclesPerSec * mach.efficiency;
    }
    return rate;
  }

  return {
    init, tick,
    buildMachine, removeMachine,
    manualFeed, manualCollect,
    addToWarehouse, takeFromWarehouse,
    getMachineById, getProductionRate,
    createMachine, crankGenerator, crankWireDrawer,
  };
})();
