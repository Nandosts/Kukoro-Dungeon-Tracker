document.addEventListener('DOMContentLoaded', () => {
  const playerList = document.getElementById('player-list');
  const nickList = document.getElementById('nick-list');
  const noData = document.getElementById('no-data');
  const searchInput = document.getElementById('search-input');
  const channelTitle = document.getElementById('channel-title');
  const totalCountEl = document.getElementById('total-count');
  const filteredCountEl = document.getElementById('filtered-count');
  const filteredContainer = document.getElementById('filtered-container');
  const enemyFiltersContainer = document.getElementById('enemy-filters');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const powerSwitch = document.getElementById('power-switch');
  const disabledOverlay = document.getElementById('disabled-overlay');
  const tabPlayers = document.getElementById('tab-players');
  const tabNicks = document.getElementById('tab-nicks');
  const resetFiltersBtn = document.getElementById('reset-filters');
  const copyNicksBtn = document.getElementById('copy-nicks');
  const sortSelect = document.getElementById('sort-select');
  const overlaySwitch = document.getElementById('overlay-switch');

  let currentChannel = 'unknown';
  let currentFilter = 'all'; // all, alive, dead
  let currentEnemyFilter = 'all'; 
  let autoClearTimeout = null;

  // MAPEAMENTO DE INIMIGOS E SUBCLASSES
  const ENEMY_MAPPING = {
    "Aranha": { sub: "Besta", keywords: ["Aranha", "Viúva Roxa"] },
    "Ciclope": { sub: "Humanóide", keywords: ["Ciclope"] },
    "Diabrete": { sub: "Maldito", keywords: ["Diabrete", "Diabretezinho", "Diabrete Alado"] },
    "Dragão": { sub: "Besta", keywords: ["Dragão", "Wyvern"] },
    "Esqueleto": { sub: "Maldito", keywords: ["Esqueleto", "Lanceiro Esqueleto", "Guerreiro Esqueleto"] },
    "Gárgula": { sub: "Maldito", keywords: ["Gárgula"] },
    "Goblin": { sub: "Humanóide", keywords: ["Goblin", "Batedor Goblin", "Lanceiro Goblin", "Goblin Montado"] },
    "Gosma": { sub: "Besta", keywords: ["Gosma", "Muco"] },
    "Lagarto": { sub: "Besta", keywords: ["Lagarto", "Lanceiro Lagarto", "Guarda Lagarto"] },
    "Lobo": { sub: "Besta", keywords: ["Lobo", "Lobisomem"] },
    "Minotauro": { sub: "Besta", keywords: ["Minotauro", "Cavaleiro Minotauro", "Fera Minotauro"] },
    "Morcego": { sub: "Besta", keywords: ["Morcego"] },
    "Naga": { sub: "Humanóide", keywords: ["Naga"] },
    "Oni": { sub: "Maldito", keywords: ["Oni"] },
    "Orc": { sub: "Humanóide", keywords: ["Orc", "Feiticeiro Orc", "Orc Montado"] },
    "Sombra": { sub: "Maldito", keywords: ["Sombra", "Espírito das Sombras", "Sombra Macabra"] },
    "Troll": { sub: "Humanóide", keywords: ["Troll"] },
    "Zumbi": { sub: "Maldito", keywords: ["Zumbi", "Sem Cérebro"] },
    "Momba": { sub: "Desconhecido", keywords: ["Momba"] }
  };

  function identificarVantagens(skills) {
    if (!skills) return { classes: [], subs: [] };
    const skillsLower = skills.toLowerCase();
    let classes = [];
    let subs = new Set();
    
    // Identifica classes específicas usando REGEX para palavra inteira (\b)
    // Isso evita que "morcego" contenha "orc" ou "porco" contenha "orc"
    for (const [classe, info] of Object.entries(ENEMY_MAPPING)) {
      const match = info.keywords.some(k => {
        const regex = new RegExp(`\\b${k.toLowerCase()}\\b`, 'i');
        return regex.test(skillsLower);
      });
      
      if (match) {
        classes.push(classe);
        if (info.sub !== "Desconhecido") subs.add(info.sub);
      }
    }

    // Identifica se tem vantagem genérica contra a subclasse inteira
    if (/\bhumanóide\b/i.test(skillsLower) || /\bhumanoide\b/i.test(skillsLower)) subs.add("Humanóide");
    if (/\bbesta\b/i.test(skillsLower)) subs.add("Besta");
    if (/\bmaldito\b/i.test(skillsLower)) subs.add("Maldito");

    return { classes, subs: Array.from(subs) };
  }

  // Carrega o estado da extensão e overlay
  chrome.storage.local.get(['extension_enabled', 'overlay_enabled'], (result) => {
    const enabled = result.extension_enabled !== false; // Padrão true
    const overlayEnabled = result.overlay_enabled === true; // Padrão false
    powerSwitch.checked = enabled;
    overlaySwitch.checked = overlayEnabled;
    updateUIState(enabled);
  });

  powerSwitch.addEventListener('change', () => {
    const enabled = powerSwitch.checked;
    chrome.storage.local.set({ extension_enabled: enabled }, () => {
      updateUIState(enabled);
    });
  });

  overlaySwitch.addEventListener('change', () => {
    chrome.storage.local.set({ overlay_enabled: overlaySwitch.checked });
  });

  function updateUIState(enabled) {
    if (enabled) {
      tabPlayers.style.display = 'block';
      disabledOverlay.style.display = 'none';
    } else {
      tabPlayers.style.display = 'none';
      tabNicks.style.display = 'none';
      disabledOverlay.style.display = 'block';
    }
  }

  // Descobre o canal da aba ativa
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      const url = new URL(tabs[0].url);
      if (url.hostname.includes('twitch.tv')) {
        const path = url.pathname.split('/');
        currentChannel = path[1] ? path[1].toLowerCase() : 'unknown';
        if (currentChannel !== 'unknown' && currentChannel !== 'directory') {
          channelTitle.textContent = `Dungeon: ${currentChannel}`;
          verificarELimparInativos();
        }
      }
    } catch (e) { console.error(e); }
    updateList();
  });

  function verificarELimparInativos() {
    chrome.storage.local.get(['kukoro_data', 'channel_activity'], (result) => {
      let allData = result.kukoro_data || {};
      let activity = result.channel_activity || {};
      const umaHoraEmMs = 60 * 60 * 1000;
      const agora = Date.now();
      let mudou = false;

      for (const ch in activity) {
        if (agora - activity[ch] > umaHoraEmMs) {
          delete allData[ch];
          delete activity[ch];
          mudou = true;
        }
      }

      if (currentChannel !== 'unknown') {
        activity[currentChannel] = agora;
        mudou = true;
      }

      if (mudou) {
        chrome.storage.local.set({ kukoro_data: allData, channel_activity: activity }, () => {
          updateList();
        });
      }
    });
  }

  function updateList() {
    chrome.storage.local.get(['kukoro_data'], (result) => {
      const allData = result.kukoro_data || {};
      const players = allData[currentChannel] || {};
      const searchTerm = searchInput.value.toLowerCase();
      
      const allIds = Object.keys(players);
      
      // Identifica quais classes de inimigos estão presentes na partida (via skills dos players)
      let detectedEnemies = new Set();
      allIds.forEach(id => {
        const p = players[id];
        if (!p.isPending) {
          const v = identificarVantagens(p.skills);
          v.classes.forEach(c => detectedEnemies.add(c));
        }
      });
      renderEnemyFilters(Array.from(detectedEnemies).sort());

      // Lógica de Limpeza Automática
      const anyAlive = allIds.some(id => !players[id].isDead);
      if (allIds.length > 0 && !anyAlive) {
        if (!autoClearTimeout) {
          autoClearTimeout = setTimeout(() => {
            chrome.storage.local.get(['kukoro_data'], (finalResult) => {
              const finalData = finalResult.kukoro_data || {};
              const finalPlayers = finalData[currentChannel] || {};
              const finalIds = Object.keys(finalPlayers);
              if (finalIds.length > 0 && !finalIds.some(id => !finalPlayers[id].isDead)) {
                clearChannelData();
              }
              autoClearTimeout = null;
            });
          }, 5000);
        }
      } else if (autoClearTimeout) {
        clearTimeout(autoClearTimeout);
        autoClearTimeout = null;
      }

      totalCountEl.textContent = allIds.length;
      if (allIds.length > 16) totalCountEl.parentElement.classList.add('warning-blink');
      else totalCountEl.parentElement.classList.remove('warning-blink');

      // Filtragem
      const filteredIds = allIds.filter(id => {
        const p = players[id];
        const v = identificarVantagens(p.skills || "");
        
        let matchesSearch = false;
        if (searchTerm.startsWith('@')) {
          matchesSearch = p.name.toLowerCase().includes(searchTerm.slice(1));
        } else {
          matchesSearch = p.name.toLowerCase().includes(searchTerm) || (p.skills || "").toLowerCase().includes(searchTerm);
        }
        
        let matchesStatus = true;
        if (currentFilter === 'alive') matchesStatus = !p.isDead;
        if (currentFilter === 'dead') matchesStatus = !!p.isDead;

        // Lógica de Vantagem Corrigida:
        // Se filtrei por "Diabrete", mostro quem tem vantagem contra "Diabrete" 
        // OU quem tem vantagem genérica contra "Maldito" (se Diabrete for Maldito).
        // NÃO deve mostrar quem tem vantagem apenas contra "Esqueleto".
        let matchesEnemy = currentEnemyFilter === 'all';
        if (!matchesEnemy) {
          const infoDoFiltro = ENEMY_MAPPING[currentEnemyFilter];
          const subDoFiltro = infoDoFiltro?.sub;
          
          // Verifica se o player tem a classe exata filtrada
          const temClasseExata = v.classes.includes(currentEnemyFilter);
          
          // Verifica se o player tem vantagem genérica contra a SUBCLASSE do filtro
          // IMPORTANTE: Só consideramos vantagem genérica se a palavra da subclasse estiver na habilidade,
          // não se ele tem vantagem contra OUTRA classe da mesma subclasse.
          const skillsLower = (p.skills || "").toLowerCase();
          const temVantagemGenericaSub = subDoFiltro && (skillsLower.includes(subDoFiltro.toLowerCase()) || (subDoFiltro === "Humanóide" && skillsLower.includes("humanoide")));

          matchesEnemy = temClasseExata || temVantagemGenericaSub;
        }

        return matchesSearch && matchesStatus && matchesEnemy;
      });

      // Contador de Filtrados
      const hasFilter = searchTerm !== '' || currentFilter !== 'all' || currentEnemyFilter !== 'all';
      if (hasFilter) {
        filteredContainer.style.display = 'block';
        filteredCountEl.textContent = filteredIds.length;
      } else {
        filteredContainer.style.display = 'none';
      }

      // Renderiza Lista de Nicks (Aba Jogadores)
      nickList.innerHTML = '';
      allIds.sort().forEach(id => {
        const p = players[id];
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.padding = '2px 0';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = p.name;
        if (p.isDead) nameSpan.style.color = '#666';
        item.appendChild(nameSpan);

        if (p.isPending) {
          const warnSpan = document.createElement('span');
          warnSpan.textContent = '⚠️';
          item.appendChild(warnSpan);
        } else {
          const v = identificarVantagens(p.skills || "");
          const todasVantagens = [...v.classes, ...v.subs];
          const labelsParaMostrar = [...new Set(todasVantagens)].filter(label => {
            const subclasseConhecida = ["Humanóide", "Besta", "Maldito"];
            if (subclasseConhecida.includes(label)) {
              const temClasseEspecificaDessaSub = v.classes.some(classe => ENEMY_MAPPING[classe].sub === label);
              return !temClasseEspecificaDessaSub;
            }
            return true;
          });

          if (labelsParaMostrar.length > 0) {
            const vSpan = document.createElement('span');
            vSpan.style.fontSize = '0.7em';
            vSpan.style.color = '#00ffcc';
            vSpan.textContent = labelsParaMostrar.join(', ');
            item.appendChild(vSpan);
          }
        }
        nickList.appendChild(item);
      });

      if (filteredIds.length === 0) {
        noData.style.display = 'block';
        playerList.innerHTML = '';
        return;
      }

      noData.style.display = 'none';
      playerList.innerHTML = '';

      const sortType = sortSelect.value;
      const sortedIds = filteredIds.sort((a, b) => {
        const pa = players[a];
        const pb = players[b];
        if (sortType === 'lv_desc') return (parseInt(pb.lv) || 0) - (parseInt(pa.lv) || 0);
        if (sortType === 'lv_asc') return (parseInt(pa.lv) || 0) - (parseInt(pb.lv) || 0);
        if (sortType === 'name_asc') return pa.name.localeCompare(pb.name);
        // Default: recent
        return new Date(pb.lastUpdate) - new Date(pa.lastUpdate);
      });

      sortedIds.forEach(id => {
        const p = players[id];
        const v = identificarVantagens(p.skills || "");
        const card = document.createElement('div');
        card.className = `player-card ${p.isDead ? 'dead' : ''}`;
        
        if (p.isPending) {
          card.style.borderStyle = 'dashed';
          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="player-name">@${p.name} <span style="font-size: 0.8em; color: #ffcc00;">[Aguardando Dados]</span></div>
            </div>
            <div style="margin-top: 10px; font-size: 0.85em; color: #adadb8; font-style: italic;">
              Aguardando !getinfo...
            </div>
            <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
              <button class="status-btn" style="padding: 4px 8px; font-size: 0.75em; cursor: pointer; background: #444; color: white; border: none; border-radius: 4px;">Morto</button>
            </div>
          `;
        } else {
          // Lógica de labels otimizada: esconde a subclasse se uma classe específica dela já existir
          const todasVantagens = [...v.classes, ...v.subs];
          const labelsParaMostrar = [...new Set(todasVantagens)].filter(label => {
            // Se for uma subclasse (Humanóide, Besta, Maldito)
            const subclasseConhecida = ["Humanóide", "Besta", "Maldito"];
            if (subclasseConhecida.includes(label)) {
              // Só mostra se NÃO houver nenhuma classe específica dessa mesma subclasse na lista
              const temClasseEspecificaDessaSub = v.classes.some(classe => ENEMY_MAPPING[classe].sub === label);
              return !temClasseEspecificaDessaSub;
            }
            return true; // Classes específicas sempre mostram
          });

          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="player-name">@${p.name} <span style="font-size: 0.8em; color: #adadb8;">[Lv. ${p.lv}]</span></div>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; max-width: 50%;">
                ${labelsParaMostrar.map(label => {
                  let color = '#00ffcc';
                  if (label === 'Humanóide') color = '#ffcc00';
                  if (label === 'Maldito') color = '#ff4b4b';
                  return `<div style="font-size: 0.6em; color: ${color}; border: 1px solid ${color}; padding: 1px 5px; border-radius: 10px; font-weight: bold; text-transform: uppercase; white-space: nowrap;">${label}</div>`;
                }).join('')}
              </div>
            </div>
            <div class="stats">
              <div><span class="stat-label">DEF:</span> ${p.def}</div>
              <div><span class="stat-label">AGI:</span> ${p.agi}</div>
              <div><span class="stat-label">CRIT:</span> ${p.crit}</div>
            </div>
            <div class="skills">${p.skills}</div>
            <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
              <button class="status-btn" style="padding: 4px 8px; font-size: 0.75em; cursor: pointer; background: ${p.isDead ? '#444' : '#9147ff'}; color: white; border: none; border-radius: 4px;">
                ${p.isDead ? 'Reviver' : 'Morto'}
              </button>
            </div>
          `;
        }
        card.querySelector('.status-btn').addEventListener('click', () => togglePlayerStatus(id));
        playerList.appendChild(card);
      });
    });
  }

  function renderEnemyFilters(enemies) {
    // Só renderiza se os inimigos detectados mudarem ou se for a primeira vez
    const currentBtns = Array.from(enemyFiltersContainer.querySelectorAll('.sub-filter-btn:not([data-sub="all"])')).map(b => b.dataset.sub);
    if (JSON.stringify(currentBtns) === JSON.stringify(enemies)) return;

    enemyFiltersContainer.innerHTML = '';
    
    // Botão "Todos" simplificado
    const allBtn = document.createElement('button');
    allBtn.className = `sub-filter-btn ${currentEnemyFilter === 'all' ? 'active' : ''}`;
    allBtn.dataset.sub = 'all';
    allBtn.textContent = 'Todos';
    styleSubBtn(allBtn);
    allBtn.addEventListener('click', () => selectEnemyFilter('all', allBtn));
    enemyFiltersContainer.appendChild(allBtn);

    enemies.forEach(enemy => {
      const btn = document.createElement('button');
      btn.className = `sub-filter-btn ${currentEnemyFilter === enemy ? 'active' : ''}`;
      btn.dataset.sub = enemy;
      btn.textContent = enemy;
      styleSubBtn(btn);
      btn.addEventListener('click', () => selectEnemyFilter(enemy, btn));
      enemyFiltersContainer.appendChild(btn);
    });
  }

  function styleSubBtn(btn) {
    btn.style.padding = '3px 8px';
    btn.style.fontSize = '0.7em';
    btn.style.cursor = 'pointer';
    btn.style.background = '#1a1a1e';
    btn.style.color = '#adadb8';
    btn.style.border = '1px solid #444';
    btn.style.borderRadius = '4px';
  }

  function selectEnemyFilter(enemy, btn) {
    const isAlreadyActive = btn.classList.contains('active');
    document.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
    
    if (isAlreadyActive && enemy !== 'all') {
      currentEnemyFilter = 'all';
      document.querySelector('.sub-filter-btn[data-sub="all"]').classList.add('active');
    } else {
      btn.classList.add('active');
      currentEnemyFilter = enemy;
    }
    updateList();
  }

  function togglePlayerStatus(playerId) {
    chrome.storage.local.get(['kukoro_data'], (result) => {
      let allData = result.kukoro_data || {};
      if (allData[currentChannel] && allData[currentChannel][playerId]) {
        allData[currentChannel][playerId].isDead = !allData[currentChannel][playerId].isDead;
        chrome.storage.local.set({ kukoro_data: allData }, () => updateList());
      }
    });
  }

  function clearChannelData() {
    chrome.storage.local.get(['kukoro_data'], (result) => {
      let allData = result.kukoro_data || {};
      delete allData[currentChannel];
      chrome.storage.local.set({ kukoro_data: allData }, () => updateList());
    });
  }

  // Event Listeners
  searchInput.addEventListener('input', updateList);
  sortSelect.addEventListener('change', updateList);
  
  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentFilter = 'all';
    currentEnemyFilter = 'all';
    filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    updateList();
  });

  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    updateList();
  }));

  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    tabBtns.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.style.color = (b === btn) ? 'white' : '#adadb8';
    });
    const tab = btn.dataset.tab;
    tabPlayers.style.display = (tab === 'players') ? 'block' : 'none';
    tabNicks.style.display = (tab === 'nicks') ? 'block' : 'none';
    updateList();
  }));

  copyNicksBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(nickList.textContent).then(() => {
      const originalText = copyNicksBtn.textContent;
      copyNicksBtn.textContent = 'Copiado!';
      setTimeout(() => copyNicksBtn.textContent = originalText, 2000);
    });
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm(`Limpar dados de ${currentChannel}?`)) clearChannelData();
  });

  setInterval(updateList, 10000);
});
