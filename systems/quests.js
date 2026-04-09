// ============================================================
// QUEST SYSTEM — Tutorial and achievement tracking
// ============================================================
const Quests = (() => {

  const QUESTS = [
    {
      id: 'q_strom',
      name: '⚡ Bau den Generator',
      desc: 'Baue einen Handkurbel-Generator, um Strom zu erzeugen.',
      check: (state) => state.production?.machines?.some(m => m.recipeId === 'manualGenerator'),
      reward: null,
    },
    {
      id: 'q_kurbeln',
      name: '💪 Kurbel!',
      desc: 'Kurble den Generator, um Strom zu erzeugen.',
      check: (state) => (state.production?.machines?.find(m => m.recipeId === 'manualGenerator')?.outputBuffer?.powerGrid || 0) >= 50,
      reward: null,
    },
    {
      id: 'q_coil_kauf',
      name: '📦 Stahlcoils kaufen',
      desc: 'Kaufe 5 Stahlcoils aus dem Markt.',
      check: (state) => (state.production?.warehouse?.steelCoil || 0) >= 5,
      reward: null,
    },
    {
      id: 'q_ziehbank',
      name: '🔧 Baue die Draht-Ziehmaschine',
      desc: 'Baue eine Draht-Ziehmaschine (benötigt Strom).',
      check: (state) => state.production?.machines?.some(m => m.recipeId === 'wireDrawer'),
      reward: null,
    },
    {
      id: 'q_stanzen',
      name: '🔨 Baue die Stanzpresse',
      desc: 'Baue eine Stanzpresse, um Draht zu Rohlingen zu verarbeiten.',
      check: (state) => state.production?.machines?.some(m => m.recipeId === 'stampingPress'),
      reward: null,
    },
    {
      id: 'q_pruefstand',
      name: '🔬 Baue den Qualitätstisch',
      desc: 'Baue einen Qualitätstisch, um Rohlinge zu Klammern zu verarbeiten.',
      check: (state) => state.production?.machines?.some(m => m.recipeId === 'qcStation'),
      reward: null,
    },
    {
      id: 'q_logistik',
      name: '🔗 Baue eine Logistik-Route',
      desc: 'Verbinde Maschinen mit einem Förderband (Forschung nötig).',
      check: (state) => (state.logistics?.routes?.length || 0) >= 1,
      reward: null,
    },
    {
      id: 'q_verkauf',
      name: '💰 Verkaufe Klammern',
      desc: 'Verkaufe mindestens 10 Klammern auf dem Markt.',
      check: (state) => (state.totalClipsSold || 0) >= 10,
      reward: null,
    },
    {
      id: 'q_erforschen',
      name: '🔬 Erforsche etwas',
      desc: 'Schließe deine erste Forschung ab.',
      check: (state) => (state.research?.completed?.length || 0) >= 1,
      reward: null,
    },
    {
      id: 'q_profit',
      name: '📈 Werde profitabel',
      desc: 'Erreiche einen Kontostand von €100.',
      check: (state) => state.money >= 100,
      reward: null,
    },
  ];

  const TUTORIAL_MILESTONE = 10;

  function init(state) {
    state.quests = state.quests || {
      completed: [],
      active: [],
      tutorialComplete: false,
    };
    
    // Activate first quest for new players
    if (state.quests.completed.length === 0 && state.quests.active.length === 0) {
      state.quests.active = [QUESTS[0].id];
    }
  }

  function tick(state) {
    const q = state.quests;
    if (!q) return;
    
    let anyCompleted = false;
    
    for (const questId of q.active) {
      const quest = QUESTS.find(q => q.id === questId);
      if (!quest) continue;
      
      if (quest.check(state) && !q.completed.includes(questId)) {
        q.completed.push(questId);
        q.active = q.active.filter(id => id !== questId);
        anyCompleted = true;
        
        // Activate next quest
        const currentIndex = QUESTS.findIndex(q => q.id === questId);
        if (currentIndex < QUESTS.length - 1) {
          const nextQuest = QUESTS[currentIndex + 1];
          if (!q.active.includes(nextQuest.id) && !q.completed.includes(nextQuest.id)) {
            q.active.push(nextQuest.id);
          }
        }
        
        showNotif(`Quest abgeschlossen: ${quest.name}`, 'info');
        logEvent(`✅ ${quest.name}`);
      }
    }
    
    // Check if tutorial is complete
    if (q.completed.length >= TUTORIAL_MILESTONE && !q.tutorialComplete) {
      q.tutorialComplete = true;
      showNotif('🎉 Tutorial abgeschlossen! Du beherrscht die Grundlagen!', 'info');
    }
    
    return anyCompleted;
  }

  function getActiveQuests(state) {
    if (!state.quests) return [];
    return state.quests.active.map(id => QUESTS.find(q => q.id === id)).filter(Boolean);
  }

  function getCompletedQuests(state) {
    if (!state.quests) return [];
    return state.quests.completed.map(id => QUESTS.find(q => q.id === id)).filter(Boolean);
  }

  function getNextQuest(state) {
    const q = state.quests;
    if (!q) return QUESTS[0];
    const lastCompleted = q.completed[q.completed.length - 1];
    const lastIndex = lastCompleted ? QUESTS.findIndex(q => q.id === lastCompleted) : -1;
    return QUESTS[lastIndex + 1] || null;
  }

  return {
    init, tick,
    getActiveQuests, getCompletedQuests, getNextQuest,
    QUESTS,
  };
})();
