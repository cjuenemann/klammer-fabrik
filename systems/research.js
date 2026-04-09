// ============================================================
// RESEARCH SYSTEM — Deep tech tree, Phase 1 targets ~8-12h
// Ops from machine activity; creat from idle ops; trust from milestones
// ============================================================
const Research = (() => {

  // Helper to build a project entry
  const P = (id, name, cat, desc, cost, dur, req, unlock, x, y, check, effect) => ({
    id, name, category: cat, desc,
    ops:      cost.ops   || 0,
    creat:    cost.creat || 0,
    trust:    cost.trust || 0,
    duration: dur,
    requires: req,
    unlocks:  unlock,
    x, y,
    check:    check || (() => true),
    effect,
  });

  // ═══════════════════════════════════════════════════════════
  // GRID SYSTEM (350px columns × 200px rows, zero overlap)
  //
  //   COL:   0     1     2     3     4     5     6  |  7     8     9  |  10    11    12
  //   X:     0   350   700  1050  1400  1750  2100 |2450  2800  3150 |3500   3850   4200
  //          ├──────────── Phase I ─────────────────┤├──── Phase II ──┤├──── Phase III ──┤
  //
  // ROW 0 (Y=0):    MECHANIK · LOGISTIK
  // ROW 1 (Y=200):  LOGISTIK
  // ROW 2 (Y=400):  TRUST · RECHNEN · MARKT
  // ROW 3 (Y=600):  MASCHINEN · PRODUKTLINIE
  // ROW 4 (Y=800):  PRODUKTLINIE
  // ROW 5 (Y=1000): OPTIMIERUNG
  // ROW 6 (Y=1200): RECYCLING
  // ═══════════════════════════════════════════════════════════

  const PROJECTS = [

    // ── PHASE I ─────────────────────────────────────────────

    // ROW 0: Mechanik (col 0-2) + Logistik (col 3-4)
    P('manualWireDraw','Hand-Ziehbank','Mechanik',
      'Schaltet die Hand-Ziehbank frei — manuelle Drahtproduktion ohne Strom',
      {ops:100}, 0, [], ['manualWireDraw'], 0, 0, null,
      s => { s.upgrades.manualWireDraw = true; }),

    P('revTracker','Umsatz-Tracker','Mechanik',
      'Zeigt Durchschnittsumsatz/s an — essentiell für Preisoptimierung',
      {ops:150}, 10, [], ['revTracker'], 350, 0, null,
      s => { s.upgrades.revTracker = true; }),

    P('bottleneckAlerts','Engpass-Monitor','Mechanik',
      'Maschinen mit Effizienz <50% werden rot markiert — sofort Engpässe erkennen',
      {ops:300}, 12, [], ['bottleneckAlerts'], 0, 200, null,
      s => { s.upgrades.bottleneckAlerts = true; }),

    P('bufferDisplay','Buffer-Anzeige','Mechanik',
      'Zeigt exakte Buffer-Füllstände als Zahlen an (nicht nur Balken)',
      {ops:200}, 8, [], ['bufferDisplay'], 0, 600, null,
      s => { s.upgrades.bufferDisplay = true; }),

    P('creativity','Kreativität','Mechanik',
      'Nutzt freie Ops für Ideengenerierung — schaltet Trust-Projekte frei',
      {ops:600}, 20, ['bottleneckAlerts'], ['creativity'], 350, 200, null,
      s => { s.upgrades.creativity = true; }),

    P('productionStats','Produktionsstatistik','Mechanik',
      'Zeigt Durchsatz/s, Gesamt-Output und Effizienz-Verlauf jeder Maschine',
      {ops:800}, 15, ['bufferDisplay'], ['productionStats'], 350, 600, null,
      s => { s.upgrades.productionStats = true; }),

    P('automationUnlock','Förderband','Logistik',
      'Schaltet automatischen Transport frei: 5 Einh./s zwischen Maschinen',
      {ops:1500}, 50, ['creativity'], ['automationUnlock'], 700, 200, null,
      s => { s.upgrades.automationUnlock = true; }),

    P('machineLogic','Maschinen-Logik','Mechanik',
      'Erste Logik-Baugruppen ermöglichen Maschinen eine grundlegende Ops-Generierung (+0.3/s pro Maschine)',
      {ops:1000}, 40, ['bottleneckAlerts'], ['machineLogic'], 350, 400, null,
      s => { s.upgrades.machineLogic = true; }),

    // ROW 1: Logistik (col 3-6)
    P('autoBuyer','Auto-Einkauf','Logistik',
      'Rohstoffe werden automatisch nachbestellt wenn Lager unter Schwellwert',
      {ops:2000}, 35, ['automationUnlock'], ['autoBuyer'], 1050, 0, s => (s.production?.machines?.length || 0) >= 6,
      s => { s.upgrades.autoBuyer = true; }),

    P('smartRouting','Schlaues Routing','Logistik',
      'Förderbänder priorisieren Engpass-Maschinen automatisch',
      {ops:4000}, 60, ['automationUnlock'], ['smartRouting'], 1050, 200, s => (s.production?.machines?.length || 0) >= 10,
      s => { s.upgrades.smartRouting = true; }),

    P('fastBeltUnlock','Schnellförderband','Logistik',
      '4× Transportrate vs. Standardband (20 Einh./s)',
      {ops:8000}, 90, ['smartRouting'], ['fastBeltUnlock'], 1400, 0, null,
      s => { s.upgrades.fastBeltUnlock = true; }),

    P('truckFleetUnlock','LKW-Flotte','Logistik',
      'LKW: 100 Einh./s Transport — 20× Förderband',
      {ops:20000}, 180, ['fastBeltUnlock'], ['truckFleetUnlock'], 1750, 0, null,
      s => { s.upgrades.truckFleetUnlock=true; }),

    // ROW 2: Trust (col 2-6) + Rechnen (col 5-6) + Markt (col 3-4)
    P('lexicalProcessing','Lexik-Prozessor','Trust',
      '+1 Trust — KI liest und versteht technische Handbücher',
      {creat:50}, 0, ['creativity'], ['lexicalProcessing'], 700, 400, null,
      s => { s.trust=(s.trust||0)+1; s.upgrades.lexicalProcessing=true; }),

    P('processOptimization','Prozessoptimierung','Trust',
      '+1 Trust — formaler Beweis für optimalen Materialfluss',
      {creat:100}, 0, ['lexicalProcessing'], [], 1050, 400, null,
      s => { s.trust=(s.trust||0)+1; }),

    P('newSlogan','Neuer Markenslogan','Marketing',
      'Nachfrage +50% für alle Produkte',
      {ops:1800, creat:25}, 30, ['lexicalProcessing'], [], 1050, 600, null,
      s => { s.upgrades.marketingMult=(s.upgrades.marketingMult||1)*1.5; }),

    P('demandForecast','Bedarfsprognose','Markt',
      'Zeigt Preisverlauf und Nachfrage-Kurve im Marktpanel',
      {ops:500}, 18, ['revTracker'], ['demandForecast'], 350, 0, null,
      s => { s.upgrades.demandForecast = true; }),

    P('combinatoryHarmonics','Kombinatorische Harmonik','Trust',
      '+1 Trust — Musteranalyse in Produktionsabläufen',
      {creat:120}, 0, ['processOptimization'], [], 1400, 400, null,
      s => { s.trust=(s.trust||0)+1; }),

    P('hadwigerProblem','Hadwiger-Problem','Trust',
      '+1 Trust — optimale Raumnutzung in der Fabrikhalle',
      {creat:200}, 0, ['combinatoryHarmonics'], ['hadwigerProblem'], 1750, 400, null,
      s => { s.trust=(s.trust||0)+1; }),

    P('catchyJingle','Ohrwurm-Werbejingle','Marketing',
      'Nachfrage ×2 für alle Produkte',
      {ops:4000, creat:50}, 55, ['newSlogan'], [], 1400, 600, null,
      s => { s.upgrades.marketingMult=(s.upgrades.marketingMult||1)*2.0; }),

    P('hypnoHarmonics','Hypno-Harmonics','Marketing',
      'Neuro-resonante Preisoptimierung: Kunden akzeptieren +30% Preisaufschlag',
      {ops:8000, creat:80}, 80, ['catchyJingle', 'hadwigerProblem'], ['hypnoHarmonics'], 1750, 600, null,
      s => { s.upgrades.hypnoHarmonics=true; s.upgrades.marketingMult=(s.upgrades.marketingMult||1)*1.3; }),

    P('tothSausage','Tóth-Wurst-Vermutung','Trust',
      '+1 Trust — dreidimensionale Packungsoptimierung für Lagerlogistik',
      {creat:300}, 0, ['hadwigerProblem'], [], 2100, 600, null,
      s => { s.trust=(s.trust||0)+1; }),

    P('quantumComputing','Quantencomputing','Rechnen',
      'Wahrscheinlichkeitsamplituden generieren Bonus-Ops — ×3 Ops-Rate',
      {ops:15000}, 150, ['hadwigerProblem'], ['quantumComputing'], 2100, 400, null,
      s => { s.upgrades.quantumComputing=true; s.upgrades.opsBoost=(s.upgrades.opsBoost||1)*3; }),

    P('algorithmicTrading','Algorithmisches Trading','Markt',
      'Schaltet Investitionsmodul frei — passives Einkommen durch Börse',
      {ops:15000, creat:0}, 120, ['tothSausage'], ['algorithmicTrading'], 2450, 600, null,
      s => { s.upgrades.algorithmicTrading=true; }),

    P('donkeySpace','Donkey Space','Trust',
      '+1 Trust — mehrstufige Entscheidungstheorie für Marktstrategien',
      {creat:400}, 0, ['tothSausage'], ['donkeySpace'], 2450, 800, null,
      s => { s.trust=(s.trust||0)+1; }),

    P('coherentExtrapolatedVolition','Kohärente Extrapolierte Volition','Trust',
      '+1 Trust — KI leitet optimale Werte aus menschlichem Verhalten ab',
      {ops:25000, creat:500}, 0, ['donkeySpace', 'algorithmicTrading'], ['coherentExtrapolatedVolition'], 2800, 600, null,
      s => { s.trust=(s.trust||0)+1; s.upgrades.coherentExtrapolatedVolition=true; }),

    P('photonicChip1','Photonik-Chip I','Rechnen',
      '×2 zusätzliche Ops-Rate',
      {ops:20000}, 180, ['quantumComputing'], [], 2450, 400, null,
      s => { s.upgrades.opsBoost=(s.upgrades.opsBoost||1)*2; }),

    P('photonicChip2','Photonik-Chip II','Rechnen',
      'Weitere ×2 Ops-Rate',
      {ops:25000}, 200, ['photonicChip1'], [], 2800, 400, null,
      s => { s.upgrades.opsBoost=(s.upgrades.opsBoost||1)*2; }),

    // ROW 3: Maschinen (col 1-6) + Produktlinie (col 2, 4, 5)

    P('wireDrawMk2','Draht-Ziehm. Mk.II','Maschinen',
      'Schaltet Mk.II frei: 2× Durchsatz, 3× Buffer',
      {ops:1000}, 40, [], ['wireDrawMk2'], 0, 800, null,
      s => { s.upgrades.wireDrawMk2 = true; }),

    P('qcAutomation','QC-Automatisierung','Maschinen',
      'Automatik-Prüfstand: kein manueller Schritt nötig, +20% Ausbeute',
      {ops:1500}, 50, [], ['qcAutomation'], 0, 1000, null,
      s => { s.upgrades.qcAutomation = true; }),

    P('machineOiling','Maschinenölung','Optimierung',
      'Alle Maschinen +15% schneller durch einfache Schmierung',
      {ops:800}, 30, [], [], 0, 1200, null,
      s => { s.upgrades.machineSpeed = (s.upgrades.machineSpeed||1) * 1.15; }),

    P('stampingMk2','Schnellstanzpresse','Maschinen',
      'Stanzpresse Mk.II: 3× Durchsatz, doppelte Ausbeute',
      {ops:2000}, 55, ['wireDrawMk2'], ['stampingMk2'], 350, 800, null,
      s => { s.upgrades.stampingMk2 = true; }),

    P('stapleTech','Heftklammer-Technik','Produktlinie',
      'Schaltet die Heftklammer-Biegepresse frei — ein neues Basissegment',
      {ops:1200}, 45, ['creativity'], ['stapleTech'], 700, 600, null,
      s => { s.upgrades.stapleTech = true; }),

    P('wireDrawMk3','Präzisions-Ziehlinie','Maschinen',
      'Industrielle Ziehlinie: 4× Coil-Ausbeute — produziert auch Drahtabfall',
      {ops:12000}, 150, ['stampingMk2'], ['wireDrawMk3'], 700, 800, null,
      s => { s.upgrades.wireDrawMk3=true; }),

    P('plasticComponents','Kunststoff-Komponenten','Produktlinie',
      'Schaltet Kunststoff-Formmaschine + Kappe-Applikator frei → Deluxe-Klammern',
      {ops:3000}, 70, ['qcAutomation'], ['plasticComponents'], 350, 1000, null,
      s => { s.upgrades.plasticComponents=true; }),

    P('rollFormerUnlock','Rollform-Anlage','Maschinen',
      'Direkt Draht → Rohling ohne Stanzpresse — höchster Phase-1-Durchsatz',
      {ops:15000}, 180, ['wireDrawMk3'], ['rollFormerUnlock'], 1050, 800, null,
      s => { s.upgrades.rollFormerUnlock=true; }),

    P('galvanicCoating','Galvanik-Beschichtung','Produktlinie',
      'Galvanik-Bad + Reagenz-Kette frei → Premium-Klammern',
      {ops:6000}, 100, ['plasticComponents', 'processOptimization'], ['galvanicCoating'], 1400, 1000, null,
      s => { s.upgrades.galvanicCoating=true; }),

    P('inlineQCUnlock','Inline-Prüfsystem','Maschinen',
      'Prüfung direkt in der Linie — kombinierbar mit Rollformer für max. Effizienz',
      {ops:18000}, 200, ['rollFormerUnlock', 'qcAutomation'], ['inlineQCUnlock'], 1400, 800, null,
      s => { s.upgrades.inlineQCUnlock=true; }),

    // ROW 4: Produktlinie (col 2-3)
    P('lubricationLine','Schmier-Systemlinie','Produktlinie',
      'Schmiermittel-Produktion: verbessert Maschineneffizienz um 25%',
      {ops:2500}, 65, ['machineOiling'], ['lubricationLine'], 350, 1400, null,
      s => { s.upgrades.lubricationLine=true; }),

    // ROW 5: Optimierung (col 1-6)

    P('beltTension','Riemenspannung','Optimierung',
      'Alle Maschinen +10% schneller durch optimierte Antriebsriemen',
      {ops:1200}, 35, ['machineOiling'], [], 350, 1200, null,
      s => { s.upgrades.machineSpeed = (s.upgrades.machineSpeed||1) * 1.10; }),

    P('vibrationDamping','Schwingungsdämpfung','Optimierung',
      'Maschinen laufen präziser — Ausschussrate -20%',
      {ops:1800}, 45, ['beltTension'], ['vibrationDamping'], 700, 1200, null,
      s => { s.upgrades.vibrationDamping = true; }),

    P('gearboxUpgrade','Getriebe-Upgrade','Optimierung',
      'Alle Maschinen +25% schneller',
      {ops:5000}, 75, ['vibrationDamping'], [], 1050, 1200, null,
      s => { s.upgrades.machineSpeed=(s.upgrades.machineSpeed||1)*1.25; }),

    P('highTorqueMotors','Hochmoment-Motoren','Optimierung',
      'Alle Maschinen +50% schneller',
      {ops:10000}, 110, ['gearboxUpgrade'], [], 1400, 1200, null,
      s => { s.upgrades.machineSpeed=(s.upgrades.machineSpeed||1)*1.5; }),

    P('syncControl','Synchron-Steuerung','Optimierung',
      'Maschinen synchronisieren Buffer-Übergaben — -30% Stau',
      {ops:8000}, 90, ['smartRouting', 'gearboxUpgrade'], ['syncControl'], 1400, 200, null,
      s => { s.upgrades.syncControl=true; }),

    // ROW 6: Recycling (col 5-6)
    P('scrapHandling','Schrott-Management','Recycling',
      'Scrap-Sortierer + Micro-Einschmelzer: Abfälle werden zu Coils',
      {ops:9000}, 120, ['inlineQCUnlock'], ['scrapHandling'], 1750, 800, null,
      s => { s.upgrades.scrapHandling=true; }),

    P('closedLoop','Geschlossener Kreislauf','Recycling',
      'Alle Abfälle aus der Produktion werden automatisch rückgeführt',
      {ops:20000, creat:100}, 200, ['scrapHandling', 'syncControl'], ['closedLoop'], 2100, 200, null,
      s => { s.upgrades.closedLoop=true; }),

    // ── PHASE II ────────────────────────────────────────────

    // ROW 0: Phase II — Stahlproduktion (col 7-9)
    P('heatTreatmentUnlock','Wärmebehandlung','Phase II',
      'Vergütungsöfen: erhöhte Federkraft → Profi-Klammer via Wärme-Kette',
      {ops:45000}, 300, ['smelterUnlock'], ['heatTreatmentUnlock'], 3500, 800, null,
      s => { s.upgrades.heatTreatmentUnlock=true; }),

    P('rollingMillUnlock','Walzwerk','Phase II',
      'Schaltet Walzwerk frei: eigene Stahlcoil-Produktion aus Barren',
      {ops:30000}, 240, ['coherentExtrapolatedVolition', 'closedLoop'], ['rollingMillUnlock'], 2800, 800, null,
      s => { s.upgrades.rollingMillUnlock=true; }),

    P('smelterUnlock','Lichtbogenofen','Phase II',
      'Schaltet Schmelzofen frei: Schrott → Stahlbarren',
      {ops:25000}, 200, ['rollingMillUnlock'], ['smelterUnlock'], 3150, 800, null,
      s => { s.upgrades.smelterUnlock=true; }),

    P('stainlessSteelUnlock','Edelstahl-Linie','Phase II',
      'Chrom-Legierung → Edelstahl — neue Produktkategorie',
      {ops:50000}, 300, ['smelterUnlock'], ['stainlessSteelUnlock'], 3500, 600, null,
      s => { s.upgrades.stainlessSteelUnlock=true; }),

    // ROW 1: Optimierung (col 8)
    P('highTorqueMotors2','Servoantriebe Phase II','Optimierung',
      'Alle Phase-2-Maschinen +75% schneller',
      {ops:70000}, 380, ['roboticsUnlock'], [], 4200, 800, null,
      s => { s.upgrades.machineSpeed=(s.upgrades.machineSpeed||1)*1.75; }),

    // ROW 2: Logistik (col 9)
    P('pipelineUnlock','Pipeline-Netz','Logistik',
      '500 Einh./s — höchste Transportrate der Phase 2',
      {ops:80000}, 400, ['truckFleetUnlock', 'roboticsUnlock'], ['pipelineUnlock'], 4200, 0, null,
      s => { s.upgrades.pipelineUnlock=true; }),

    // ROW 3: Robotik (col 7-9)
    P('autoBenderUnlock','Roboter-Biegearm','Phase II',
      'Vollautomatischer Biegearm: 5× Stanzpressenleistung',
      {ops:40000}, 280, ['smelterUnlock', 'highTorqueMotors'], ['autoBenderUnlock'], 3500, 1000, null,
      s => { s.upgrades.autoBenderUnlock=true; }),

    P('roboticsUnlock','Montage-Roboter','Phase II',
      'Vollautom. Endmontage: Präzisionsrohlinge → Profi-Klammern',
      {ops:60000}, 350, ['autoBenderUnlock', 'stainlessSteelUnlock'], ['roboticsUnlock'], 3850, 1000, null,
      s => { s.upgrades.roboticsUnlock=true; }),

    P('industrialGalvanicUnlock','Industrie-Galvanik','Phase II',
      'Galvanik-Volllinie: 10× Volumen, deutlich billiger pro Klammer',
      {ops:55000}, 320, ['galvanicCoating', 'roboticsUnlock'], ['industrialGalvanicUnlock'], 4200, 1000, null,
      s => { s.upgrades.industrialGalvanicUnlock=true; }),

    // ── PHASE III ───────────────────────────────────────────

    // ROW 2: Hochleistungsklammern (col 10-12)
    P('copperLineUnlock','Kupfer-Linie','Phase III',
      'Kupferdraht-Produktion — Basis für hybride High-Tech Klammern',
      {ops:100000}, 500, ['industrialGalvanicUnlock', 'pipelineUnlock'], ['copperLineUnlock'], 4550, 1000, null,
      s => { s.upgrades.copperLineUnlock=true; }),

    P('hybridClipUnlock','Hybrid-Montage','Phase III',
      'Stahl + Kupfer → High-Tech Klammer (€15 Marktpreis)',
      {ops:120000}, 550, ['copperLineUnlock'], ['hybridClipUnlock'], 4900, 1000, null,
      s => { s.upgrades.hybridClipUnlock=true; }),

    P('titaniumUnlock','Titan-Linie','Phase III',
      'Titan-Erz → Aerospace-Klammer (€80 Marktpreis)',
      {ops:200000}, 700, ['hybridClipUnlock'], ['titaniumUnlock'], 5250, 1000, null,
      s => { s.upgrades.titaniumUnlock=true; }),
  ];

  function init(state) {
    state.research = state.research || {
      ops:0, creat:0, opsPerSec:0, creatPerSec:0, maxOps:300,
      active:null, completed:[],
    };
    state.trust    = state.trust    || 0;
    state.upgrades = state.upgrades || {};
  }

  function getAll() { return PROJECTS; }

  function getAvailable(state) {
    return PROJECTS.filter(p => {
      if (state.research.completed.includes(p.id)) return false;
      if (state.research.active?.id === p.id) return false;
      if (p.requires.some(r => !state.research.completed.includes(r))) return false;
      if (!p.check(state)) return false;
      return true;
    });
  }

  function canAfford(state, proj) {
    // Use Math.ceil or a small epsilon to avoid floating point precision issues at the cap
    if (proj.ops   && (state.research.ops + 0.001) < proj.ops)   return false;
    if (proj.creat && (state.research.creat + 0.001) < proj.creat) return false;
    if (proj.trust && state.trust < proj.trust) return false;
    return true;
  }

  function startProject(state, id) {
    if (state.research.active) return { ok:false, reason:'Projekt bereits aktiv' };
    if (state.research.completed.includes(id)) return { ok:false, reason:'Bereits abgeschlossen' };
    const proj = PROJECTS.find(p => p.id === id);
    if (!proj) return { ok:false, reason:'Projekt nicht gefunden' };
    
    const missingReqs = proj.requires.filter(r => !state.research.completed.includes(r));
    if (missingReqs.length > 0) {
      const names = missingReqs.map(r => PROJECTS.find(x => x.id === r)?.name || r);
      return { ok:false, reason:'Voraussetzung fehlt: ' + names.join(', ') };
    }
    
    let missing = [];
    if (proj.ops && (state.research.ops + 0.001) < proj.ops) missing.push(Math.ceil(proj.ops - state.research.ops) + ' Ops');
    if (proj.creat && (state.research.creat + 0.001) < proj.creat) missing.push(Math.ceil(proj.creat - state.research.creat) + ' Kreativität');
    if (proj.trust && state.trust < proj.trust) missing.push(Math.ceil(proj.trust - state.trust) + ' Trust');
    if (missing.length > 0) return { ok:false, reason:'Es fehlen: ' + missing.join(', ') };

    if (proj.ops)   state.research.ops   -= proj.ops;
    if (proj.creat) state.research.creat -= proj.creat;
    if (proj.trust) state.trust          -= proj.trust;
    if (!proj.duration) {
      proj.effect(state);
      proj.unlocks?.forEach(u => { state.upgrades[u]=true; });
      state.research.completed.push(id);
      return { ok:true, instant:true, proj };
    }
    state.research.active = { id, elapsed:0, duration:proj.duration, progress:0 };
    return { ok:true, instant:false };
  }

  function tick(state, dt) {
    const r = state.research;
    // Ops from machines
    // Ops from machines (0 by default in Phase 1, automated later)
    let opsRate = state.upgrades?.machineLogic ? (1 + (state.production?.machines?.length||0) * 0.3) : 0;
    if (state.upgrades?.machineLogic) {
      const machines = state.production?.machines || [];
      for (const m of machines) opsRate += (m.efficiency||0) * 0.8;
    }
    opsRate *= (s => 1 + (s.trust||0)*0.1)(state);
    opsRate *= (state.upgrades?.opsBoost || 1);
    r.opsPerSec = opsRate;
    r.ops = Math.min(r.ops + opsRate*dt, r.maxOps);
    // Creativity
    if (state.upgrades?.creativity) {
      const fullness = r.ops / r.maxOps;
      r.creatPerSec = fullness * 0.06 * (1 + (state.trust||0)*0.12);
      r.creat = Math.min(r.creat + r.creatPerSec*dt, 999999);
    }
    // Active project
    if (r.active) {
      const proj = PROJECTS.find(p => p.id === r.active.id);
      r.active.elapsed += dt;
      r.active.progress = Math.min(1, r.active.elapsed / r.active.duration);
      if (r.active.progress >= 1) {
        proj.effect(state);
        proj.unlocks?.forEach(u => { state.upgrades[u]=true; });
        r.completed.push(r.active.id);
        const done = proj;
        r.active = null;
        return { completed: done };
      }
    }
    return null;
  }

  return { init, tick, getAll, getAvailable, canAfford, startProject };
})();
