// ============================================================
// LOGISTICS SYSTEM — Buffer-to-Buffer routing
// Routes move resources automatically from machine output buffers
// to machine input buffers (or warehouse → machine, machine → warehouse)
// ============================================================
const Logistics = (() => {

  let _nextRouteId = 1;

  const TRANSPORT_TYPES = {
    manual:   { name: 'Manuell',     ratePerSec: 0,    cost: 0,     phase: 1, unlock: null },
    belt:     { name: 'Förderband',  ratePerSec: 5,    cost: 500,   phase: 1, unlock: 'automationUnlock' },
    fastBelt: { name: 'Schnellband', ratePerSec: 20,   cost: 5000,  phase: 2, unlock: 'fastBeltUnlock' },
    truck:    { name: 'LKW',         ratePerSec: 100,  cost: 25000, phase: 2, unlock: 'truckFleetUnlock' },
    pipeline: { name: 'Pipeline',    ratePerSec: 500,  phase: 3, cost: 200000, unlock: 'pipelineUnlock' },
  };

  // Endpoint types: 'warehouse', 'machine'
  // machineId only relevant if type == 'machine'

  function init(state) {
    state.logistics = state.logistics || {
      routes: [],
      nextId: 1,
    };
    if (state.logistics.nextId > _nextRouteId) _nextRouteId = state.logistics.nextId;
  }

  function addRoute(state, { fromType, fromMachineId, fromResource,
                             toType,   toMachineId,   toResource,
                             transportType }) {
    const tdef = TRANSPORT_TYPES[transportType || 'belt'];
    if (!tdef) return { ok: false, reason: 'Unbekannter Transporttyp' };
    if (tdef.unlock && !state.upgrades?.[tdef.unlock]) {
      return { ok: false, reason: 'Forschung erforderlich' };
    }
    if (tdef.cost > 0 && state.money < tdef.cost) {
      return { ok: false, reason: 'Nicht genug Geld' };
    }
    if (tdef.cost > 0) state.money -= tdef.cost;

    const route = {
      id:            _nextRouteId++,
      fromType,      fromMachineId: fromMachineId || null, fromResource,
      toType,        toMachineId:   toMachineId   || null, toResource,
      transportType: transportType || 'belt',
      active: true,
    };
    state.logistics.routes.push(route);
    state.logistics.nextId = _nextRouteId;
    return { ok: true, route };
  }

  function removeRoute(state, routeId) {
    state.logistics.routes = state.logistics.routes.filter(r => r.id !== routeId);
  }

  function tick(state, dt) {
    for (const route of state.logistics.routes) {
      if (!route.active) continue;
      const tdef = TRANSPORT_TYPES[route.transportType];
      if (!tdef || tdef.ratePerSec === 0) continue;

      const moveAmount = tdef.ratePerSec * dt;

      // Determine source quantity
      let available = 0;
      if (route.fromType === 'warehouse') {
        available = state.production.warehouse[route.fromResource] || 0;
      } else if (route.fromType === 'machine') {
        const src = Production.getMachineById(state, route.fromMachineId);
        available = src?.outputBuffer?.[route.fromResource] || 0;
      }

      if (available <= 0) continue;

      // Determine sink capacity
      let space = Infinity;
      if (route.toType === 'warehouse') {
        space = Infinity; // warehouse unlimited
      } else if (route.toType === 'machine') {
        const dst = Production.getMachineById(state, route.toMachineId);
        if (!dst) continue;
        const recipe = RECIPES[dst.recipeId];
        const cap    = recipe.inputCapacity[route.toResource] || 50;
        const cur    = dst.inputBuffer[route.toResource] || 0;
        space = cap - cur;
      }

      const transfer = Math.min(moveAmount, available, space);
      if (transfer <= 0) continue;

      // Remove from source
      if (route.fromType === 'warehouse') {
        state.production.warehouse[route.fromResource] = (state.production.warehouse[route.fromResource] || 0) - transfer;
      } else {
        const src = Production.getMachineById(state, route.fromMachineId);
        if (src) src.outputBuffer[route.fromResource] = Math.max(0, (src.outputBuffer[route.fromResource] || 0) - transfer);
      }

      // Add to sink
      if (route.toType === 'warehouse') {
        Production.addToWarehouse(state, route.toResource, transfer);
      } else {
        const dst = Production.getMachineById(state, route.toMachineId);
        if (dst) dst.inputBuffer[route.toResource] = (dst.inputBuffer[route.toResource] || 0) + transfer;
      }
    }
  }

  function getTransportTypes() { return TRANSPORT_TYPES; }

  return { init, tick, addRoute, removeRoute, getTransportTypes };
})();
