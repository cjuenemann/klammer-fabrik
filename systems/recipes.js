// ============================================================
// RECIPES — All machine types with input/output definitions
// Phase 1 alone targets 8-12h gameplay via many interlocking chains
// ============================================================
const RECIPES = {

  // ════════════════════════════════════════════════════════
  // PHASE 1 — WERKSTATT
  // Chain: Stahlcoil → Draht → Rohling → Klammer
  //        with multiple parallel quality/efficiency upgrades
  // ════════════════════════════════════════════════════════

  // ── Handkurbel-Maschinen (Mechanik) ──────────────────────
  manualWireDrawer: {
    id: 'manualWireDrawer', name: 'Hand-Ziehbank', tier: 1,
    desc: 'Zieht Stahlcoils zu Draht per Handkurbel — langsam aber kostenlos!',
    phase: 1, unlockResearch: 'manualWireDraw', buildCost: 80,
    inputs: { steelCoil: 1 }, outputs: { manualWire: 2 },
    cyclesPerSec: 0.2,
    powerConsumption: 0,
    inputCapacity: { steelCoil: 5 }, outputCapacity: { manualWire: 15 },
    isManualMachine: true,
    manualAction: 'Ziehen',
  },

  // ── Primäre Kette ────────────────────────────────────────
  wireDrawer: {
    id: 'wireDrawer', name: 'Draht-Ziehmaschine', tier: 1,
    desc: 'Zieht Stahlcoils zu Drahtspulen (Basis)',
    phase: 1, unlockResearch: null, buildCost: 150,
    inputs: { steelCoil: 1 }, outputs: { wire: 3 },
    cyclesPerSec: 0.5,
    powerConsumption: 20, // Watts
    inputCapacity: { steelCoil: 10 }, outputCapacity: { wire: 30 },
  },
  stampingPress: {
    id: 'stampingPress', name: 'Stanzpresse', tier: 1,
    desc: 'Stanzt Draht zu Rohlingen',
    phase: 1, unlockResearch: null, buildCost: 350,
    inputs: { wire: 2 }, outputs: { blank: 5 },
    cyclesPerSec: 0.4,
    powerConsumption: 40,
    inputCapacity: { wire: 20 }, outputCapacity: { blank: 25 },
  },
  qcStation: {
    id: 'qcStation', name: 'Qualitätstisch', tier: 1,
    desc: 'Kontrolliert Rohlinge → fertige Klammern',
    phase: 1, unlockResearch: null, buildCost: 250,
    inputs: { blank: 3 }, outputs: { clip: 10 },
    cyclesPerSec: 0.3,
    powerConsumption: 15,
    inputCapacity: { blank: 15 }, outputCapacity: { clip: 50 },
  },

  // ── Tier-2 Maschinen (Phase 1 Forschung) ────────────────
  wireDrawerMk2: {
    id: 'wireDrawerMk2', name: 'Draht-Ziehm. Mk.II', tier: 2,
    desc: '+100% Durchsatz, größere Buffer, weniger Ausschuss',
    phase: 1, unlockResearch: 'wireDrawMk2', buildCost: 2000,
    requiresManualWire: true,
    inputs: { steelCoil: 1 }, outputs: { wire: 4 },
    cyclesPerSec: 1.0,
    powerConsumption: 50,
    inputCapacity: { steelCoil: 25 }, outputCapacity: { wire: 80 },
  },
  stampingPressMk2: {
    id: 'stampingPressMk2', name: 'Schnellstanzpresse', tier: 2,
    desc: '3× Durchsatz, Doppelausgang',
    phase: 1, unlockResearch: 'stampingMk2', buildCost: 4000,
    inputs: { wire: 2 }, outputs: { blank: 10 },
    cyclesPerSec: 1.2,
    powerConsumption: 120,
    inputCapacity: { wire: 50 }, outputCapacity: { blank: 60 },
  },
  qcStationMk2: {
    id: 'qcStationMk2', name: 'Automatik-Prüfstand', tier: 2,
    desc: 'Vollautomatische Qualitätsprüfung — kein Bediener nötig',
    phase: 1, unlockResearch: 'qcAutomation', buildCost: 3500,
    inputs: { blank: 3 }, outputs: { clip: 12 },
    cyclesPerSec: 0.8,
    powerConsumption: 35,
    inputCapacity: { blank: 30 }, outputCapacity: { clip: 100 },
  },

  // ── Tier-3 Maschinen (tiefere Phase-1-Forschung) ─────────
  wireDrawerMk3: {
    id: 'wireDrawerMk3', name: 'Präzisions-Ziehlinie', tier: 3,
    desc: 'Industrie-Anlage: 4× Coil-Ausbeute, minimal Abfall',
    phase: 1, unlockResearch: 'wireDrawMk3', buildCost: 18000,
    inputs: { steelCoil: 1 }, outputs: { wire: 6, scrapWire: 1 },
    cyclesPerSec: 1.8,
    powerConsumption: 250,
    inputCapacity: { steelCoil: 50 }, outputCapacity: { wire: 200, scrapWire: 50 },
  },
  rollFormer: {
    id: 'rollFormer', name: 'Rollform-Anlage', tier: 3,
    desc: 'Formt Draht direkt zu Rohlingform — überspringt Stanzpresse',
    phase: 1, unlockResearch: 'rollFormerUnlock', buildCost: 25000,
    inputs: { wire: 3 }, outputs: { blank: 20 },
    cyclesPerSec: 1.5,
    powerConsumption: 300,
    inputCapacity: { wire: 80 }, outputCapacity: { blank: 120 },
  },
  inlineQC: {
    id: 'inlineQC', name: 'Inline-Prüfsystem', tier: 3,
    desc: 'Prüfung direkt in der Linie — kombinierbar mit Rollformer für max. Effizienz',
    phase: 1, unlockResearch: 'inlineQCUnlock', buildCost: 30000,
    inputs: { blank: 5 }, outputs: { clip: 20, scrapMetal: 1 },
    cyclesPerSec: 1.0,
    powerConsumption: 180,
    inputCapacity: { blank: 50 }, outputCapacity: { clip: 200, scrapMetal: 30 },
  },

  // ── Neue Produktlinie: Heftklammern ──────────────────────
  stapleBender: {
    id: 'stapleBender', name: 'Heftkl.-Biegepresse', tier: 1,
    desc: 'Biegt Draht zu U-förmigen Heftklammern',
    phase: 1, unlockResearch: 'stapleTech', buildCost: 800,
    inputs: { wire: 2 }, outputs: { staple: 8 },
    cyclesPerSec: 0.6,
    powerConsumption: 30,
    inputCapacity: { wire: 20 }, outputCapacity: { staple: 60 },
  },

  // ── Sekundäre Kette: Schmiermittel ──────────────────────
  lubricantMixer: {
    id: 'lubricantMixer', name: 'Schmierstoff-Mischanlage', tier: 1,
    desc: 'Mischt synthet. Schmiermittel für Maschinenoptimierung',
    phase: 1, unlockResearch: 'lubricationLine', buildCost: 1200,
    inputs: { chemBase: 1, water: 2 }, outputs: { lubricant: 4 },
    cyclesPerSec: 0.6,
    powerConsumption: 30,
    inputCapacity: { chemBase: 15, water: 30 }, outputCapacity: { lubricant: 40 },
  },
  lubricationStation: {
    id: 'lubricationStation', name: 'Schmier-Automat', tier: 1,
    desc: 'Schmiert Maschinen automatisch → +20% Geschwindigkeit lokal',
    phase: 1, unlockResearch: 'lubricationLine', buildCost: 800,
    inputs: { lubricant: 1 }, outputs: { machineBoost: 1 },
    cyclesPerSec: 0.2,
    powerConsumption: 10,
    inputCapacity: { lubricant: 20 }, outputCapacity: { machineBoost: 5 },
  },

  // ── Sekundäre Kette: Schutzkappe ────────────────────────
  plasticMolder: {
    id: 'plasticMolder', name: 'Kunststoff-Formmaschine', tier: 1,
    desc: 'Formt Kunststoffgranulat zu Klammer-Schutzkappen',
    phase: 1, unlockResearch: 'plasticComponents', buildCost: 2500,
    inputs: { plasticGranule: 2 }, outputs: { endCap: 10 },
    cyclesPerSec: 0.7,
    powerConsumption: 60,
    inputCapacity: { plasticGranule: 20 }, outputCapacity: { endCap: 80 },
  },
  capApplicator: {
    id: 'capApplicator', name: 'Kappe-Applikator', tier: 1,
    desc: 'Fügt Schutzkappen an Standard-Klammern an → Kauf-Plus',
    phase: 1, unlockResearch: 'plasticComponents', buildCost: 1800,
    inputs: { clip: 5, endCap: 1 }, outputs: { deluxeClip: 4 },
    cyclesPerSec: 0.5,
    powerConsumption: 25,
    inputCapacity: { clip: 50, endCap: 10 }, outputCapacity: { deluxeClip: 30 },
  },

  // ── Sekundäre Kette: Beschichtung ───────────────────────
  chemBath: {
    id: 'chemBath', name: 'Galvanik-Bad', tier: 2,
    desc: 'Beschichtet Klammern mit Korrosionsschutz → premiumClip',
    phase: 1, unlockResearch: 'galvanicCoating', buildCost: 8000,
    inputs: { clip: 10, chemReagent: 1 }, outputs: { premiumClip: 8 },
    cyclesPerSec: 0.25,
    powerConsumption: 120,
    inputCapacity: { clip: 80, chemReagent: 15 }, outputCapacity: { premiumClip: 50 },
  },

  // ── Recycling-Kette (Phase 1) ────────────────────────────
  scrapSorter: {
    id: 'scrapSorter', name: 'Schrott-Sortierer', tier: 2,
    desc: 'Sortiert und komprimiert Metallabfälle',
    phase: 1, unlockResearch: 'scrapHandling', buildCost: 3000,
    inputs: { scrapMetal: 5, scrapWire: 3 }, outputs: { sortedScrap: 4 },
    cyclesPerSec: 0.6,
    powerConsumption: 40,
    inputCapacity: { scrapMetal: 50, scrapWire: 50 }, outputCapacity: { sortedScrap: 40 },
  },
  microRemelter: {
    id: 'microRemelter', name: 'Micro-Einschmelzer', tier: 2,
    desc: 'Schmilzt Sortier-Schrott wieder ein → Coil-Rohmaterial',
    phase: 1, unlockResearch: 'scrapHandling', buildCost: 5000,
    inputs: { sortedScrap: 3 }, outputs: { steelCoil: 1 },
    cyclesPerSec: 0.3,
    powerConsumption: 150,
    inputCapacity: { sortedScrap: 30 }, outputCapacity: { steelCoil: 10 },
  },

  // ── Qualitätssicherung ────────────────────────────────────
  reagentMixer: {
    id: 'reagentMixer', name: 'Reagenz-Mischstation', tier: 1,
    desc: 'Stellt Prüfreagenzien für Galvanik her',
    phase: 1, unlockResearch: 'galvanicCoating', buildCost: 1500,
    inputs: { chemBase: 2, distilledWater: 1 }, outputs: { chemReagent: 3 },
    cyclesPerSec: 0.4,
    powerConsumption: 20,
    inputCapacity: { chemBase: 20, distilledWater: 10 }, outputCapacity: { chemReagent: 30 },
  },
  waterDistiller: {
    id: 'waterDistiller', name: 'Destillierapparat', tier: 1,
    desc: 'Destilliert Leitungswasser für Prozessketten',
    phase: 1, unlockResearch: 'galvanicCoating', buildCost: 1000,
    inputs: { water: 3 }, outputs: { distilledWater: 2 },
    cyclesPerSec: 0.5,
    powerConsumption: 45,
    inputCapacity: { water: 30 }, outputCapacity: { distilledWater: 20 },
  },

  // ── ENERGY GENERATION ──────────────────────────────────
  manualGenerator: {
    id: 'manualGenerator', name: 'Handkurbel-Generator', tier: 1,
    desc: 'Erzeugt Strom durch manuelle Arbeit (Klicken)',
    phase: 1, unlockResearch: null, buildCost: 20,
    inputs: {}, outputs: { powerGrid: 50 }, // 50W output
    outputCapacity: { powerGrid: 150 },
    isGenerator: true,
    manualAction: 'Kurbeln',
  },
  solarPanel: {
    id: 'solarPanel', name: 'Solarpanel', tier: 1,
    desc: 'Passives Einkommen: Erzeugt 20W Strom bei Tageslicht',
    phase: 1, unlockResearch: 'powerGridUnlock', buildCost: 800,
    inputs: {}, outputs: { powerGrid: 20 },
    outputCapacity: { powerGrid: 20 },
    isGenerator: true,
  },
  coalGenerator: {
    id: 'coalGenerator', name: 'Kohlekraftwerk', tier: 1,
    desc: 'Erzeugt massiv Strom (200W) aus Kohle',
    phase: 1, unlockResearch: 'thermalPower', buildCost: 3500,
    inputs: { coal: 1 }, outputs: { powerGrid: 200 },
    cyclesPerSec: 0.1, // Consumes 1 coal every 10s
    inputCapacity: { coal: 50 },
    outputCapacity: { powerGrid: 200 },
    isGenerator: true,
  },

  // ── HANDEL ──────────────────────────────────────────────
  marketplace: {
    id: 'marketplace', name: 'Marktplatz', tier: 1,
    desc: 'Händler kaufen und verkaufen Waren automatisch. Zuführen zum Verkaufen, Abholen für Käufe.',
    phase: 1, unlockResearch: 'marketplace', buildCost: 500,
    category: 'Handel', // Shop-Kategorie
    inputs: {}, outputs: {},
    inputCapacity: 1000,
    outputCapacity: 1000,
    powerConsumption: 10,
    isMarketplace: true,
  },

  // ── MINING & EXTRACTION ──────────────────────────────────
  miningSpotSteel: {
    id: 'miningSpotSteel', name: 'Stahl-Schurfstelle', tier: 1,
    desc: 'Gewinnt Stahlcoils aus Erzvorkommen',
    phase: 1, unlockResearch: null, buildCost: 200,
    inputs: {}, outputs: { steelCoil: 1 },
    cyclesPerSec: 0.1, // 1 per 10s
    outputCapacity: { steelCoil: 20 },
    powerConsumption: 10,
  },
  miningSpotCoal: {
    id: 'miningSpotCoal', name: 'Kohle-Tagebau', tier: 1,
    desc: 'Fördert Kohle für deine Kraftwerke',
    phase: 1, unlockResearch: null, buildCost: 150,
    inputs: {}, outputs: { coal: 5 },
    cyclesPerSec: 0.1, // 5 per 10s
    outputCapacity: { coal: 100 },
    powerConsumption: 15,
  },
  miningSpotWater: {
    id: 'miningSpotWater', name: 'Grundwasserpumpe', tier: 1,
    desc: 'Pump wasser für chemische Prozesse',
    phase: 1, unlockResearch: null, buildCost: 100,
    inputs: {}, outputs: { water: 10 },
    cyclesPerSec: 0.2, // 10 per 5s
    outputCapacity: { water: 200 },
    powerConsumption: 5,
  },

  // ════════════════════════════════════════════════════════
  // PHASE 2 — FABRIK
  // ════════════════════════════════════════════════════════
  rollingMill: {
    id: 'rollingMill', name: 'Walzwerk', tier: 1,
    desc: 'Walzt Stahlbarren zu Coils — günstiger als Einkauf',
    phase: 2, unlockResearch: 'rollingMillUnlock', buildCost: 25000,
    inputs: { steelIngot: 3 }, outputs: { steelCoil: 5 },
    cyclesPerSec: 0.8,
    powerConsumption: 500,
    inputCapacity: { steelIngot: 30 }, outputCapacity: { steelCoil: 50 },
  },
  smelter: {
    id: 'smelter', name: 'Lichtbogenofen', tier: 1,
    desc: 'Schmilzt Schrott zu Stahlbarren (günstig)',
    phase: 2, unlockResearch: 'smelterUnlock', buildCost: 35000,
    inputs: { scrap: 8 }, outputs: { steelIngot: 2 },
    cyclesPerSec: 0.3,
    powerConsumption: 1500,
    inputCapacity: { scrap: 80 }, outputCapacity: { steelIngot: 20 },
  },
  autoBender: {
    id: 'autoBender', name: 'Roboter-Biegearm', tier: 2,
    desc: 'Vollautomatisch, 5× Kapazität der Stanzpresse',
    phase: 2, unlockResearch: 'autoBenderUnlock', buildCost: 40000,
    inputs: { wire: 3 }, outputs: { blank: 12, scrapWire: 1 },
    cyclesPerSec: 2.0,
    powerConsumption: 800,
    inputCapacity: { wire: 80 }, outputCapacity: { blank: 100, scrapWire: 20 },
  },
  alloySmelter: {
    id: 'alloySmelter', name: 'Legierungs-Ofen', tier: 2,
    desc: 'Legiert Stahl mit Chromzusatz → Edelstahl-Coils',
    phase: 2, unlockResearch: 'stainlessSteelUnlock', buildCost: 80000,
    inputs: { steelIngot: 2, chromiumPowder: 1 }, outputs: { stainlessSteelCoil: 4 },
    cyclesPerSec: 0.5,
    powerConsumption: 2000,
    inputCapacity: { steelIngot: 20, chromiumPowder: 10 }, outputCapacity: { stainlessSteelCoil: 40 },
  },
  precisionPress: {
    id: 'precisionPress', name: 'Präzisions-Stanzwerk', tier: 3,
    desc: 'Edelstahl-Coils → Hochpräzisions-Rohlinge',
    phase: 2, unlockResearch: 'stainlessSteelUnlock', buildCost: 120000,
    inputs: { stainlessSteelCoil: 1 }, outputs: { precisionBlank: 8 },
    cyclesPerSec: 1.2,
    powerConsumption: 1500,
    inputCapacity: { stainlessSteelCoil: 20 }, outputCapacity: { precisionBlank: 80 },
  },
  assemblyRobot: {
    id: 'assemblyRobot', name: 'Montage-Roboter', tier: 3,
    desc: 'Vollautomatische Endmontage',
    phase: 2, unlockResearch: 'roboticsUnlock', buildCost: 200000,
    inputs: { precisionBlank: 5 }, outputs: { proClip: 20 },
    cyclesPerSec: 1.5,
    powerConsumption: 2500,
    inputCapacity: { precisionBlank: 50 }, outputCapacity: { proClip: 150 },
  },
  electroPlatingLine: {
    id: 'electroPlatingLine', name: 'Elektro-Galvanik-Linie', tier: 2,
    desc: 'Industrielle Galvanik: 10× Volumen vs. Einzelbad',
    phase: 2, unlockResearch: 'industrialGalvanicUnlock', buildCost: 150000,
    inputs: { clip: 20, chemReagent: 2 }, outputs: { premiumClip: 18 },
    cyclesPerSec: 0.8,
    powerConsumption: 1800,
    inputCapacity: { clip: 200, chemReagent: 40 }, outputCapacity: { premiumClip: 180 },
  },
  heatTreatmentOven: {
    id: 'heatTreatmentOven', name: 'Wärmebehandlungsofen', tier: 2,
    desc: 'Vergütet Klammern für höhere Federkraft',
    phase: 2, unlockResearch: 'heatTreatmentUnlock', buildCost: 90000,
    inputs: { blank: 10, naturalGas: 1 }, outputs: { hardenedBlank: 12 },
    cyclesPerSec: 0.6,
    powerConsumption: 1200,
    inputCapacity: { blank: 100, naturalGas: 20 }, outputCapacity: { hardenedBlank: 80 },
  },
  hardened_qc: {
    id: 'hardened_qc', name: 'Festigkeitsprüfstand', tier: 2,
    desc: 'Verarbeitet vergütete Rohlinge zu Premium-Klammern',
    phase: 2, unlockResearch: 'heatTreatmentUnlock', buildCost: 70000,
    inputs: { hardenedBlank: 3 }, outputs: { proClip: 12 },
    cyclesPerSec: 0.8,
    powerConsumption: 400,
    inputCapacity: { hardenedBlank: 30 }, outputCapacity: { proClip: 100 },
  },

  // ════════════════════════════════════════════════════════
  // PHASE 3 — EXPANSION
  // ════════════════════════════════════════════════════════

  copperWireDrawer: {
    id: 'copperWireDrawer', name: 'Kupfer-Ziehanlage', tier: 1,
    desc: 'Kupferdraht für leitfähige Klammern',
    phase: 3, unlockResearch: 'copperLineUnlock', buildCost: 200000,
    inputs: { copperIngot: 1 }, outputs: { copperWire: 4 },
    cyclesPerSec: 0.6,
    powerConsumption: 5000,
    inputCapacity: { copperIngot: 20 }, outputCapacity: { copperWire: 80 },
  },
  hybridAssembly: {
    id: 'hybridAssembly', name: 'Hybrid-Montage', tier: 2,
    desc: 'Stahl + Kupfer → High-Tech Klammer für Elektronik',
    phase: 3, unlockResearch: 'hybridClipUnlock', buildCost: 350000,
    inputs: { wire: 2, copperWire: 1 }, outputs: { hybridClip: 5 },
    cyclesPerSec: 0.5,
    powerConsumption: 8000,
    inputCapacity: { wire: 40, copperWire: 20 }, outputCapacity: { hybridClip: 25 },
  },
  titaniumSmelter: {
    id: 'titaniumSmelter', name: 'Titan-Schmelze', tier: 2,
    desc: 'Titan-Legierung für Aerospace-Klammern',
    phase: 3, unlockResearch: 'titaniumUnlock', buildCost: 600000,
    inputs: { titaniumOre: 3, steelIngot: 1 }, outputs: { titaniumCoil: 2 },
    cyclesPerSec: 0.3,
    powerConsumption: 15000,
    inputCapacity: { titaniumOre: 30, steelIngot: 20 }, outputCapacity: { titaniumCoil: 20 },
  },
  aerospaceAssembly: {
    id: 'aerospaceAssembly', name: 'Aerospace-Montage', tier: 3,
    desc: 'Titan-Klammern für Luft- und Raumfahrt — extremer Preis',
    phase: 3, unlockResearch: 'titaniumUnlock', buildCost: 1000000,
    inputs: { titaniumCoil: 1, copperWire: 2 }, outputs: { aerospaceClip: 3 },
    cyclesPerSec: 0.2,
    powerConsumption: 25000,
    inputCapacity: { titaniumCoil: 10, copperWire: 20 }, outputCapacity: { aerospaceClip: 15 },
  },
};

// ── Resource metadata ─────────────────────────────────────────
// market: true = can be bought; sell: true = auto-sells to market
const RESOURCE_META = {
  // Buyable raw materials
  steelCoil:       { name: 'Stahlcoil',          unit: 'Stk', color: '#5a6070', market: true,  baseCost: 10,    buyUnit: 'Stk',  icon: 'icon-coil' },
  coal:            { name: 'Kohle',              unit: 'kg',  color: '#333333', market: true,  baseCost: 2,     buyUnit: '10kg', buyQty: 10, icon: 'icon-coal' },
  plasticGranule:  { name: 'Kunststoff-Granulat', unit: 'kg', color: '#7a5a8a', market: true,  baseCost: 8,     buyUnit: 'kg',   icon: 'icon-granule' },
  chemBase:        { name: 'Chemikalienbasis',    unit: 'L',  color: '#5a8a7a', market: true,  baseCost: 25,    buyUnit: 'L',    icon: 'icon-flask' },
  water:           { name: 'Wasser',              unit: 'L',  color: '#3a6a9a', market: true,  baseCost: 1,     buyUnit: '10L',  buyQty: 10, icon: 'icon-drop' },
  steelIngot:      { name: 'Stahlbarren',         unit: 'Stk', color: '#6a7a8a', market: true, baseCost: 40,    buyUnit: 'Stk',  phase: 2, icon: 'icon-ingot' },
  scrap:           { name: 'Stahlschrott',        unit: 'kg',  color: '#6a6060', market: true, baseCost: 5,     buyUnit: 'kg',   phase: 2, icon: 'icon-scrap' },
  chromiumPowder:  { name: 'Chrom-Pulver',        unit: 'g',  color: '#8a9a6a', market: true,  baseCost: 120,   buyUnit: 'g',    phase: 2, icon: 'icon-powder' },
  naturalGas:      { name: 'Erdgas',              unit: 'm³', color: '#8a8a5a', market: true,  baseCost: 30,    buyUnit: 'm³',   phase: 2, icon: 'icon-gas' },
  copperIngot:     { name: 'Kupferbarren',        unit: 'Stk', color: '#b06020', market: true, baseCost: 60,    buyUnit: 'Stk',  phase: 3, icon: 'icon-ingot-cu' },
  titaniumOre:     { name: 'Titan-Erz',           unit: 'kg', color: '#7a8aaa', market: true,  baseCost: 200,   buyUnit: 'kg',   phase: 3, icon: 'icon-ore' },

  // Intermediates (now sellable at low export prices)
  manualWire:       { name: 'Handgezogener Draht',  unit: 'm',  color: '#9a8050', sell: true, basePrice: 0.02, demandBase: 0.50, icon: 'icon-wire' },
  wire:            { name: 'Drahtspule',          unit: 'm',  color: '#8a7f60', sell: true, basePrice: 0.04, demandBase: 0.60, icon: 'icon-wire' },
  blank:           { name: 'Rohling',             unit: 'Stk', color: '#9a8a70', sell: true, basePrice: 0.06, demandBase: 0.50, icon: 'icon-blank' },
  scrapMetal:      { name: 'Metallabfall',        unit: 'g',  color: '#6a6060', sell: true, basePrice: 0.01, demandBase: 0.90, icon: 'icon-scrap' },
  scrapWire:       { name: 'Drahtabfall',         unit: 'm',  color: '#7a7060', sell: true, basePrice: 0.01, demandBase: 0.85, icon: 'icon-wire' },
  sortedScrap:     { name: 'Sortierter Schrott',  unit: 'kg', color: '#7a7070', sell: true, basePrice: 0.15, demandBase: 0.40, icon: 'icon-scrap' },
  endCap:          { name: 'Schutzkappe',         unit: 'Stk', color: '#9a6a8a', sell: true, basePrice: 0.12, icon: 'icon-cap' },
  lubricant:       { name: 'Schmiermittel',       unit: 'L',  color: '#8a9a5a', sell: true, basePrice: 0.50,  icon: 'icon-oil' },
  machineBoost:    { name: 'Maschinenölung',      unit: 'AP', color: '#6a8a5a', icon: 'icon-oil' },
  chemReagent:     { name: 'Prüfreagenz',         unit: 'L',  color: '#5a7a8a', icon: 'icon-flask' },
  distilledWater:  { name: 'Destillat',           unit: 'L',  color: '#4a7aaa', icon: 'icon-drop' },
  stainlessSteelCoil: { name: 'Edelstahl-Coil',  unit: 'Stk', color: '#8a9aaa', phase: 2, sell: true, basePrice: 20.0,  icon: 'icon-coil' },
  precisionBlank:  { name: 'Präzisions-Rohling',  unit: 'Stk', color: '#7a8a9a', phase: 2, sell: true, basePrice: 1.50, icon: 'icon-blank' },
  hardenedBlank:   { name: 'Vergüteter Rohling',  unit: 'Stk', color: '#8a7a6a', phase: 2, sell: true, basePrice: 2.20, icon: 'icon-blank' },
  copperWire:      { name: 'Kupferdraht',         unit: 'm',  color: '#c07030', phase: 3, sell: true, basePrice: 1.20, icon: 'icon-wire' },
  titaniumCoil:    { name: 'Titan-Coil',          unit: 'Stk', color: '#8a9abb', phase: 3, sell: true, basePrice: 250.0, icon: 'icon-coil' },

  // Sellable finished goods
  clip:        { name: 'Büroklammer',      unit: 'Stk', color: '#4a7c59', sell: true, basePrice: 0.25, demandBase: 0.65, icon: 'icon-clip' },
  staple:      { name: 'Heftklammer',      unit: 'Stk', color: '#7a8a9a', sell: true, basePrice: 0.18, demandBase: 0.75, unlockResearch: 'stapleTech', icon: 'icon-staple' },
  deluxeClip:  { name: 'Deluxe-Klammer',  unit: 'Stk', color: '#6a5c9a', sell: true, basePrice: 0.80, demandBase: 0.40, unlockResearch: 'plasticComponents', icon: 'icon-clip' },
  premiumClip: { name: 'Premium-Klammer', unit: 'Stk', color: '#3a5caa', sell: true, basePrice: 2.50, demandBase: 0.25, unlockResearch: 'galvanicCoating', icon: 'icon-clip' },
  proClip:     { name: 'Profi-Klammer',   unit: 'Stk', color: '#2a4a7a', sell: true, basePrice: 6.00, demandBase: 0.15, unlockResearch: 'roboticsUnlock', phase: 2, icon: 'icon-clip' },
  hybridClip:  { name: 'High-Tech Klammer',unit: 'Stk', color: '#2a6a9a', sell: true, basePrice: 15.0, demandBase: 0.08, unlockResearch: 'hybridClipUnlock', phase: 3, icon: 'icon-clip' },
  aerospaceClip:{ name: 'Aerospace-Klammer',unit:'Stk', color: '#2a5a8a', sell: true, basePrice: 80.0, demandBase: 0.03, unlockResearch: 'titaniumUnlock', phase: 3, icon: 'icon-clip' },
};

