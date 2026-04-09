// ============================================================
// MARKET SYSTEM — Multi-product buying/selling
// ============================================================
const Market = (() => {

  // Sellable products with separate price/demand curves
  const SELLABLE = {
    clip:        { basePrice: 0.25, demandBase: 0.6, name: 'Büroklammer' },
    premiumClip: { basePrice: 1.50, demandBase: 0.3, name: 'Premium-Klammer' },
    hybridClip:  { basePrice: 8.00, demandBase: 0.15, name: 'High-Tech Klammer' },
  };

  function init(state) {
    state.market = state.market || {
      prices: {
        clip:        0.25,
        premiumClip: 1.50,
        hybridClip:  8.00,
      },
      demand: {
        clip:        0.6,
        premiumClip: 0.3,
        hybridClip:  0.15,
      },
      revenue:       0,
      totalSold:     {},
      autoBuyEnabled: false,
      autoBuyOrders: {},   // resource → { qty, threshold }
      wireOrders:    0,    // legacy
    };
  }

  function tick(state, dt) {
    const m   = state.market;
    const wh  = state.production.warehouse;
    const mkt = state.upgrades?.marketingMult || 1;

    // Only update demand curve (no auto-sell)
    for (const [productId, def] of Object.entries(SELLABLE)) {
      const price  = m.prices[productId] || def.basePrice;
      const naturalDemand = Math.max(0, Math.min(1,
        def.demandBase * mkt * (1 - (price - def.basePrice) / (def.basePrice * 4))
        + (Math.random() - 0.5) * 0.03
      ));
      m.demand[productId] = naturalDemand;
    }

    // Auto-buy raw materials
    if (state.upgrades?.autoBuyer) {
      autoBuyTick(state, dt);
    }
  }

  // Manual sell function
  function sellProduct(state, productId, qty) {
    const m  = state.market;
    const wh = state.production.warehouse;
    const available = wh[productId] || 0;
    const toSell = Math.min(qty, available);
    if (toSell <= 0) return { ok: false, reason: 'Nicht genug im Lager' };

    const price = m.prices[productId] || SELLABLE[productId]?.basePrice || 0;
    wh[productId] = available - toSell;
    const earned = toSell * price;
    state.money += earned;
    m.revenue += earned;
    m.totalSold[productId] = (m.totalSold[productId] || 0) + toSell;
    state.totalClipsSold = (state.totalClipsSold || 0) + toSell;
    return { ok: true, sold: toSell, earned };
  }

  function autoBuyTick(state, dt) {
    const orders = state.market.autoBuyOrders || {};
    const wh     = state.production.warehouse;
    for (const [res, order] of Object.entries(orders)) {
      if (!order.enabled) continue;
      const current = wh[res] || 0;
      if (current < order.threshold) {
        buyResource(state, res, order.qty);
      }
    }
  }

  function buyResource(state, resource, qty) {
    const meta = RESOURCE_META[resource];
    if (!meta || !meta.market) return { ok: false, reason: 'Nicht kaufbar' };
    const cost = meta.baseCost * qty;
    if (state.money < cost) return { ok: false, reason: 'Nicht genug Geld' };
    state.money -= cost;
    Production.addToWarehouse(state, resource, qty);
    return { ok: true };
  }

  function setPrice(state, productId, delta) {
    const m = state.market;
    m.prices[productId] = Math.max(0.01, Math.round(((m.prices[productId] || 0) + delta) * 100) / 100);
  }

  function setAutoBuyOrder(state, resource, enabled, threshold, qty) {
    if (!state.market.autoBuyOrders) state.market.autoBuyOrders = {};
    state.market.autoBuyOrders[resource] = { enabled, threshold, qty };
  }

  function getBuyableMaterials(state) {
    return Object.entries(RESOURCE_META)
      .filter(([, m]) => m.market && !m.sell)
      .map(([id, m]) => ({ id, ...m }));
  }

  return { init, tick, buyResource, sellProduct, setPrice, setAutoBuyOrder, getBuyableMaterials };
})();
