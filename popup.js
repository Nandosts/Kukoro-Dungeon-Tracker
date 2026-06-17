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

  function t(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions);
  }

  function applyTranslations() {
    document.getElementById('tab-habilidades').textContent = t('tabHabilidades');
    document.getElementById('tab-jogadores').textContent = t('tabJogadores');
    document.getElementById('text-total').textContent = t('labelTotal');
    document.getElementById('text-filtrados').textContent = t('labelFiltrados');
    document.getElementById('search-input').placeholder = t('placeholderSearch');
    document.getElementById('opt-recent').textContent = t('labelRecentes');
    document.getElementById('opt-lv-desc').textContent = t('labelMaiorNivel');
    document.getElementById('opt-lv-asc').textContent = t('labelMenorNivel');
    document.getElementById('opt-name-asc').textContent = t('labelAZ');
    document.getElementById('filter-all').textContent = t('labelTodos');
    document.getElementById('filter-alive').textContent = t('labelVivos');
    document.getElementById('filter-dead').textContent = t('labelMortos');
    document.getElementById('text-vantagem').textContent = t('labelVantagem');
    document.getElementById('clear-btn').textContent = t('btnLimparCanal');
    document.getElementById('text-show-overlay').textContent = t('showOverlayLabel');
    document.getElementById('copy-nicks').textContent = t('btnCopiarTodos');
    document.getElementById('text-support-dev').textContent = t('textSupportDev');
    document.getElementById('text-tip-btn').textContent = t('btnTip');
    document.querySelector('#disabled-overlay div:nth-child(2)').textContent = t('overlayDisabled');
    document.querySelector('#disabled-overlay div:nth-child(3)').textContent = t('overlayEnableMsg');
  }

  // Evento para copiar a chave Pix
  document.getElementById('btn-copy-pix').addEventListener('click', () => {
    const chavePix = '3e4c4338-be76-47d2-831f-04e41aaa9466';
    navigator.clipboard.writeText(chavePix).then(() => {
      const btn = document.getElementById('text-pix-btn');
      const oldText = btn.textContent;
      btn.textContent = t('copied');
      setTimeout(() => btn.textContent = oldText, 2000);
    });
  });

  // MAPEAMENTO DE INIMIGOS E SUBCLASSES (INTERNACIONALIZADO)
  // Usamos chaves de tradução como identificadores internos para os botões
  const ENEMY_MAPPING = {
    "Bat": { sub: "Beast", keywords: ["Morcego", "Bat", "Murciélago", "Murcielago"] },
    "Cyclops": { sub: "Humanoid", keywords: ["Ciclope", "Cyclops"] },
    "Dragon": { sub: "Beast", keywords: ["Dragão", "Dragon", "Dragón", "Wyvern"] },
    "Gargoyle": { sub: "Cursed", keywords: ["Gárgula", "Gargoyle", "Gárgola", "Gargola"] },
    "Goblin": { sub: "Humanoid", keywords: ["Goblin", "Batedor Goblin", "Lanceiro Goblin", "Goblin Montado"] },
    "Human": { sub: "Humanoid", keywords: ["Humano", "Human", "Jogador", "Player"] },
    "Imp": { sub: "Cursed", keywords: ["Diabrete", "Imp", "Diablillo", "Diabretezinho", "Diabrete Alado"] },
    "Lizard": { sub: "Beast", keywords: ["Lagarto", "Lizard", "Lizardo", "Lanceiro Lagarto", "Guarda Lagarto"] },
    "Minotaur": { sub: "Beast", keywords: ["Minotauro", "Minotaur", "Cavaleiro Minotauro", "Fera Minotauro"] },
    "Naga": { sub: "Humanoid", keywords: ["Naga"] },
    "Oni": { sub: "Cursed", keywords: ["Oni", "Oni Vermelho"] },
    "Orc": { sub: "Humanoid", keywords: ["Orc", "Feiticeiro Orc", "Orc Montado", "Orco"] },
    "Shadow": { sub: "Cursed", keywords: ["Sombra", "Shadow", "Espírito das Sombras", "Sombra Macabra"] },
    "Skeleton": { sub: "Cursed", keywords: ["Esqueleto", "Skeleton", "Lanceiro Esqueleto", "Guerreiro Esqueleto"] },
    "Slime": { sub: "Beast", keywords: ["Gosma", "Slime", "Limo", "Muco", "Gosma Verde"] },
    "Spider": { sub: "Beast", keywords: ["Aranha", "Spider", "Araña", "Arana", "Viúva Roxa"] },
    "Troll": { sub: "Humanoid", keywords: ["Troll"] },
    "Wolf": { sub: "Beast", keywords: ["Lobo", "Wolf", "Lobisomem", "Lobo Selvagem"] },
    "Zombie": { sub: "Cursed", keywords: ["Zumbi", "Zombie", "Zombi", "Sem Cérebro"] },
    "Momba": { sub: "Unknown", keywords: ["Momba"] }
  };

  function identificarVantagens(skills) {
    if (!skills) return { classes: [], subs: [] };
    const skillsLower = skills.toLowerCase();
    let classes = [];
    let subs = new Set();
    
    for (const [id, info] of Object.entries(ENEMY_MAPPING)) {
      const match = info.keywords.some(k => {
        // Usa Unicode property escapes (\p{L}) para suportar bordas de palavras com acentos (ex: Dragão, Araña)
        const regex = new RegExp(`(^|[^\\p{L}])${k.toLowerCase()}([^\\p{L}]|$)`, 'iu');
        return regex.test(skillsLower);
      });
      
      if (match) {
        classes.push(id);
        if (info.sub !== "Unknown") subs.add(info.sub);
      }
    }

    // Vantagens genéricas (suporta PT, EN e ES)
    if (/(^|[^\p{L}])(humanóide|humanoide|humanoid)(-[^\p{L}]|$)/iu.test(skillsLower)) subs.add("Humanoid");
    if (/(^|[^\p{L}])(besta|beast|bestia)(-[^\p{L}]|$)/iu.test(skillsLower)) subs.add("Beast");
    if (/(^|[^\p{L}])(maldito|cursed)(-[^\p{L}]|$)/iu.test(skillsLower)) subs.add("Cursed");

    return { classes, subs: Array.from(subs) };
  }

  chrome.storage.local.get(['extension_enabled', 'overlay_enabled'], (result) => {
    const enabled = result.extension_enabled !== false;
    const overlayEnabled = result.overlay_enabled === true;
    powerSwitch.checked = enabled;
    overlaySwitch.checked = overlayEnabled;
    updateUIState(enabled);
  });

  powerSwitch.addEventListener('change', () => {
    const enabled = powerSwitch.checked;
    chrome.storage.local.set({ extension_enabled: enabled }, () => updateUIState(enabled));
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

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      const url = new URL(tabs[0].url);
      if (url.hostname.includes('twitch.tv')) {
        const path = url.pathname.split('/');
        currentChannel = path[1] ? path[1].toLowerCase() : 'unknown';
        if (currentChannel !== 'unknown' && currentChannel !== 'directory') {
          channelTitle.textContent = t('overlayTitle', currentChannel);
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
          delete allData[ch]; delete activity[ch]; mudou = true;
        }
      }
      if (currentChannel !== 'unknown') { activity[currentChannel] = agora; mudou = true; }
      if (mudou) chrome.storage.local.set({ kukoro_data: allData, channel_activity: activity }, () => updateList());
    });
  }

  function updateList() {
    chrome.storage.local.get(['kukoro_data'], (result) => {
      const allData = result.kukoro_data || {};
      const players = allData[currentChannel] || {};
      const searchTerm = searchInput.value.toLowerCase();
      const allIds = Object.keys(players);
      
      let detectedEnemies = new Set();
      allIds.forEach(id => {
        if (!players[id].isPending) identificarVantagens(players[id].skills).classes.forEach(c => detectedEnemies.add(c));
      });
      renderEnemyFilters(Array.from(detectedEnemies).sort());

      const anyAlive = allIds.some(id => !players[id].isDead);
      if (allIds.length > 0 && !anyAlive) {
        if (!autoClearTimeout) {
          autoClearTimeout = setTimeout(() => {
            chrome.storage.local.get(['kukoro_data'], (finalResult) => {
              const finalData = finalResult.kukoro_data || {};
              const finalPlayers = finalData[currentChannel] || {};
              const finalIds = Object.keys(finalPlayers);
              if (finalIds.length > 0 && !finalIds.some(id => !finalPlayers[id].isDead)) clearChannelData();
              autoClearTimeout = null;
            });
          }, 5000);
        }
      } else if (autoClearTimeout) { clearTimeout(autoClearTimeout); autoClearTimeout = null; }

      totalCountEl.textContent = allIds.length;
      if (allIds.length > 16) totalCountEl.parentElement.classList.add('warning-blink');
      else totalCountEl.parentElement.classList.remove('warning-blink');

      const filteredIds = allIds.filter(id => {
        const p = players[id]; const v = identificarVantagens(p.skills || "");
        let mS = searchTerm.startsWith('@') ? p.name.toLowerCase().includes(searchTerm.slice(1)) : (p.name.toLowerCase().includes(searchTerm) || (p.skills || "").toLowerCase().includes(searchTerm));
        let mSt = currentFilter === 'all' || (currentFilter === 'alive' ? !p.isDead : !!p.isDead);
        let mE = currentEnemyFilter === 'all';
        if (!mE) {
          const info = ENEMY_MAPPING[currentEnemyFilter];
          const sub = info?.sub;
          const temClasseExata = v.classes.includes(currentEnemyFilter);
          const sL = (p.skills || "").toLowerCase();
          
          // Lógica de herança de subclasse corrigida para novos IDs
          const subKey = sub ? `sub${sub}` : null;
          const subName = subKey ? t(subKey).toLowerCase() : "";
          const temVantagemGenericaSub = sub && (sL.includes(subName) || (sub === "Humanoid" && sL.includes("humanoide")));
          
          mE = temClasseExata || temVantagemGenericaSub;
        }
        return mS && mSt && mE;
      });

      const hasF = searchTerm !== '' || currentFilter !== 'all' || currentEnemyFilter !== 'all';
      filteredContainer.style.display = hasF ? 'block' : 'none';
      filteredCountEl.textContent = filteredIds.length;

      nickList.innerHTML = '';
      allIds.sort().forEach(id => {
        const p = players[id]; const item = document.createElement('div');
        item.style.cssText = 'display:flex; justify-content:space-between; padding:2px 0;';
        const nameSpan = document.createElement('span'); nameSpan.textContent = p.name;
        if (p.isDead) nameSpan.style.color = '#666';
        item.appendChild(nameSpan);
        if (p.isPending) {
          const w = document.createElement('span'); w.textContent = '⚠️'; w.title = t('statusAguardando'); item.appendChild(w);
        } else {
          const v = identificarVantagens(p.skills || "");
          const labels = [...v.classes.map(c => t(`class${c}`)), ...v.subs.map(s => t(`sub${s}`))];
          // Otimização de labels na lista de nicks
          const finalLabels = labels.filter(l => {
             const foundClassId = Object.keys(ENEMY_MAPPING).find(cid => t(`class${cid}`) === l);
             if (foundClassId) return true;
             // Se for label de sub, checa se alguma classe dela já está presente por tradução
             const subId = ["Humanoid", "Beast", "Cursed"].find(sid => t(`sub${sid}`) === l);
             if (subId) return !v.classes.some(cid => ENEMY_MAPPING[cid].sub === subId);
             return true;
          });
          if (finalLabels.length > 0) {
            const vs = document.createElement('span'); vs.style.cssText = 'font-size:0.7em; color:#00ffcc;'; vs.textContent = finalLabels.join(', '); item.appendChild(vs);
          }
        }
        nickList.appendChild(item);
      });

      if (filteredIds.length === 0) {
        noData.textContent = (searchTerm || currentFilter !== 'all' || currentEnemyFilter !== 'all') ? t('msgNoResults') : (currentChannel === 'unknown' ? t('msgOpenLive') : t('msgNoData'));
        noData.style.display = 'block'; playerList.innerHTML = ''; return;
      }

      noData.style.display = 'none'; playerList.innerHTML = '';
      const sortType = sortSelect.value;
      filteredIds.sort((a, b) => {
        const pa = players[a], pb = players[b];
        if (sortType === 'lv_desc') return (parseInt(pb.lv) || 0) - (parseInt(pa.lv) || 0);
        if (sortType === 'lv_asc') return (parseInt(pa.lv) || 0) - (parseInt(pb.lv) || 0);
        if (sortType === 'name_asc') return pa.name.localeCompare(pb.name);
        return new Date(pb.lastUpdate) - new Date(pa.lastUpdate);
      }).forEach(id => {
        const p = players[id]; const v = identificarVantagens(p.skills || "");
        const card = document.createElement('div'); card.className = `player-card ${p.isDead ? 'dead' : ''}`;
        if (p.isPending) {
          card.style.borderStyle = 'dashed';
          card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div class="player-name">@${p.name} <span style="font-size:0.8em; color:#ffcc00;">[${t('statusAguardando')}]</span></div><div style="font-size:0.65em; color:#adadb8; background:#333; padding:2px 5px; border-radius:4px;">${t('statusPendente')}</div></div><div style="margin-top:10px; font-size:0.85em; color:#adadb8; font-style:italic;">${t('msgPendingInfo')}</div><div style="margin-top:8px; display:flex; justify-content:flex-end;"><button class="status-btn" style="padding:4px 8px; font-size:0.75em; cursor:pointer; background:#444; color:white; border:none; border-radius:4px;">${t('btnMorto')}</button></div>`;
        } else {
          const labels = [...new Set([...v.classes.map(c => ({id: c, type:'class'})), ...v.subs.map(s => ({id: s, type:'sub'}))])].filter(item => {
            if (item.type === 'sub') return !v.classes.some(cid => ENEMY_MAPPING[cid].sub === item.id);
            return true;
          });
          card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div class="player-name">@${p.name} <span style="font-size:0.8em; color:#9e9e9e;">[Lv. ${p.lv}]</span></div><div style="display:flex; gap:4px; flex-wrap:wrap; justify-content:flex-end; max-width:50%;">${labels.map(item => {
            let c = '#4db8ff'; if (item.id === 'Humanoid') c = '#d4af37'; if (item.id === 'Cursed') c = '#ff5252';
            return `<div style="font-size:0.6em; color:${c}; border:1px solid ${c}; padding:1px 5px; border-radius:10px; font-weight:bold; text-transform:uppercase; white-space:nowrap;">${t(item.type === 'class' ? `class${item.id}` : `sub${item.id}`)}</div>`;
          }).join('')}</div></div><div class="stats"><div><span class="stat-label">DEF:</span> ${p.def}</div><div><span class="stat-label">AGI:</span> ${p.agi}</div><div><span class="stat-label">CRIT:</span> ${p.crit}</div></div><div class="skills">${p.skills}</div><div style="margin-top:8px; display:flex; justify-content:flex-end;"><button class="status-btn" style="padding:4px 8px; font-size:0.75em; cursor:pointer; background:${p.isDead ? '#333' : '#d4af37'}; color:${p.isDead ? 'white' : '#121212'}; border:none; border-radius:4px; font-weight:bold;">${p.isDead ? t('btnReviver') : t('btnMorto')}</button></div>`;
        }
        card.querySelector('.status-btn').addEventListener('click', () => togglePlayerStatus(id));
        playerList.appendChild(card);
      });
    });
  }

  function renderEnemyFilters(enemies) {
    const current = Array.from(enemyFiltersContainer.querySelectorAll('.sub-filter-btn:not([data-sub="all"])')).map(b => b.dataset.sub);
    if (JSON.stringify(current) === JSON.stringify(enemies)) return;
    enemyFiltersContainer.innerHTML = '';
    const addBtn = (id, sub) => {
      const btn = document.createElement('button'); btn.className = `sub-filter-btn ${currentEnemyFilter === sub ? 'active' : ''}`;
      btn.dataset.sub = sub; btn.textContent = sub === 'all' ? t('labelTodos') : t(`class${id}`);
      btn.style.cssText = 'padding:3px 8px; font-size:0.7em; cursor:pointer; background:#1a1a1e; color:#adadb8; border:1px solid #444; border-radius:4px;';
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
        if (currentEnemyFilter === sub && sub !== 'all') { currentEnemyFilter = 'all'; document.querySelector('.sub-filter-btn[data-sub="all"]').classList.add('active'); }
        else { btn.classList.add('active'); currentEnemyFilter = sub; }
        updateList();
      });
      enemyFiltersContainer.appendChild(btn);
    };
    addBtn(null, 'all');
    enemies.forEach(e => addBtn(e, e));
  }

  function togglePlayerStatus(id) {
    chrome.storage.local.get(['kukoro_data'], res => {
      let d = res.kukoro_data || {}; if (d[currentChannel] && d[currentChannel][id]) {
        d[currentChannel][id].isDead = !d[currentChannel][id].isDead; chrome.storage.local.set({ kukoro_data: d }, updateList);
      }
    });
  }

  function clearChannelData() {
    chrome.storage.local.get(['kukoro_data'], res => {
      let d = res.kukoro_data || {}; delete d[currentChannel]; chrome.storage.local.set({ kukoro_data: d }, updateList);
    });
  }

  searchInput.addEventListener('input', updateList);
  sortSelect.addEventListener('change', updateList);
  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = ''; currentFilter = 'all'; currentEnemyFilter = 'all';
    filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all')); updateList();
  });

  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentFilter = btn.dataset.filter; updateList();
  }));

  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    tabBtns.forEach(b => { b.classList.toggle('active', b === btn); b.style.color = (b === btn) ? 'white' : '#adadb8'; });
    const tab = btn.dataset.tab; tabPlayers.style.display = (tab === 'players') ? 'block' : 'none'; tabNicks.style.display = (tab === 'nicks') ? 'block' : 'none'; updateList();
  }));

  copyNicksBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(nickList.innerText).then(() => {
      const old = copyNicksBtn.textContent; copyNicksBtn.textContent = t('copied'); setTimeout(() => copyNicksBtn.textContent = old, 2000);
    });
  });

  // Mantém os toggles sincronizados se mudarem via Overlay ou outras abas
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.extension_enabled) {
        powerSwitch.checked = changes.extension_enabled.newValue !== false;
        updateUIState(powerSwitch.checked);
      }
      if (changes.overlay_enabled) {
        overlaySwitch.checked = changes.overlay_enabled.newValue === true;
      }
    }
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm(t('confirmLimpar', currentChannel))) clearChannelData();
  });

  applyTranslations();
  setInterval(updateList, 10000);
});
