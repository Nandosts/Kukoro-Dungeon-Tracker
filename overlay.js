// Função para criar e injetar a interface flutuante
function injectKukoroOverlay() {
  if (document.getElementById('kukoro-overlay')) return;

  function t(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions);
  }

  const overlay = document.createElement('div');
  overlay.id = 'kukoro-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 50px;
    right: 20px;
    width: 320px;
    height: 450px;
    min-width: 280px;
    min-height: 150px;
    background: #121212;
    border: 2px solid #d4af37;
    border-radius: 8px;
    color: #e0e0e0;
    z-index: 999999;
    display: flex;
    flex-direction: column;
    font-family: sans-serif;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    overflow: hidden;
    resize: both;
  `;

  overlay.innerHTML = `
    <div id="kukoro-header" style="padding: 10px; background: #d4af37; color: #121212; cursor: move; display: flex; justify-content: space-between; align-items: center; user-select: none;">
      <span id="kukoro-title" style="font-weight: bold; font-size: 0.9em;">Kukoro Tracker</span>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="ov-quick-clear" title="Limpar Canal Rapidamente" style="background: none; border: none; cursor: pointer; font-size: 1.1em; padding: 0;">🗑️</button>
        <button id="ov-power-toggle" title="Ligar/Desligar Extensão" style="background: none; border: none; cursor: pointer; font-size: 1.1em; padding: 0;">🟢</button>
        <button id="kukoro-minimize" title="Minimizar" style="background: none; border: none; color: #121212; cursor: pointer; font-size: 1.2em; padding: 0 5px; font-weight: bold;">−</button>
      </div>
    </div>
    <div id="kukoro-body" style="padding: 10px; overflow-y: auto; flex: 1;">
      <div id="ov-disabled-overlay" style="display: none; text-align: center; padding: 20px; background: #1a1a1e; border-radius: 8px; margin-bottom: 10px; border: 1px solid #ff5252;">
        <div style="font-size: 1.5em; margin-bottom: 10px;">⚠️</div>
        <div id="ov-disabled-text" style="font-weight: bold; color: #ff5252;">${t('overlayDisabled')}</div>
      </div>
      <div id="kukoro-content-root"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Lógica de Arrastar (Draggable)
  let isDragging = false;
  let currentX; let currentY; let initialX; let initialY;
  let xOffset = 0; let yOffset = 0;

  const header = document.getElementById('kukoro-header');
  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target.tagName.toLowerCase() === 'button') return;
    initialX = e.clientX - xOffset; initialY = e.clientY - yOffset;
    if (e.target === header || header.contains(e.target)) isDragging = true;
  }
  function drag(e) {
    if (isDragging) {
      e.preventDefault(); currentX = e.clientX - initialX; currentY = e.clientY - initialY;
      xOffset = currentX; yOffset = currentY; setTranslate(currentX, currentY, overlay);
    }
  }
  function setTranslate(xPos, yPos, el) { el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`; }
  function dragEnd() { initialX = currentX; initialY = currentY; isDragging = false; }

  const body = document.getElementById('kukoro-body');
  const minBtn = document.getElementById('kukoro-minimize');
  const powerBtn = document.getElementById('ov-power-toggle');
  const quickClearBtn = document.getElementById('ov-quick-clear');
  let isMinimized = false; let lastHeight = overlay.style.height;

  minBtn.addEventListener('click', () => {
    isMinimized = !isMinimized; body.style.display = isMinimized ? 'none' : 'block'; minBtn.textContent = isMinimized ? '+' : '−';
    if (isMinimized) { lastHeight = overlay.style.height; overlay.style.height = 'auto'; overlay.style.resize = 'none'; }
    else { overlay.style.height = lastHeight || '450px'; overlay.style.resize = 'both'; }
  });

  powerBtn.addEventListener('click', () => {
    chrome.storage.local.get(['extension_enabled'], res => {
      chrome.storage.local.set({ extension_enabled: res.extension_enabled === false });
    });
  });

  quickClearBtn.addEventListener('click', () => {
    // Limpeza rápida sem confirmação para agilizar
    const channel = window.location.pathname.split('/')[1]?.toLowerCase();
    if (channel) {
      chrome.storage.local.get(['kukoro_data'], f => {
        let d = f.kukoro_data || {};
        delete d[channel];
        chrome.storage.local.set({ kukoro_data: d });
      });
    }
  });

  initOverlayLogic();
}

function initOverlayLogic() {
  function t(key, substitutions) { return chrome.i18n.getMessage(key, substitutions); }
  const root = document.getElementById('kukoro-content-root');
  
  root.innerHTML = `
    <div style="display: flex; gap: 5px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">
      <button class="ov-tab-btn active" data-tab="players" style="flex: 1; padding: 5px; background: none; border: none; color: white; cursor: pointer; font-size: 0.8em; font-weight: bold;">${t('tabHabilidades')}</button>
      <button class="ov-tab-btn" data-tab="nicks" style="flex: 1; padding: 5px; background: none; border: none; color: #adadb8; cursor: pointer; font-size: 0.8em;">${t('tabJogadores')}</button>
    </div>
    <div id="ov-tab-players">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.75em; background: #26262c; padding: 5px; border-radius: 4px;">
        <div>${t('labelTotal')}: <span id="ov-total-count">0</span>/16</div>
        <div id="ov-filtered-container" style="display: none;">${t('labelFiltrados')}: <span id="ov-filtered-count">0</span></div>
      </div>
      <div style="display: flex; gap: 5px; margin-bottom: 10px;">
        <input type="text" id="ov-search-input" placeholder="${t('placeholderSearch')}" style="flex: 1; padding: 5px; border-radius: 4px; border: 1px solid #333; background: #26262c; color: white; font-size: 0.8em; min-width: 0;">
        <select id="ov-sort-select" style="padding: 5px; background: #26262c; color: white; border: 1px solid #333; border-radius: 4px; font-size: 0.75em; outline: none; cursor: pointer; max-width: 90px;">
          <option value="recent">${t('labelRecentes')}</option>
          <option value="lv_desc">${t('labelMaiorNivel')}</option>
          <option value="lv_asc">${t('labelMenorNivel')}</option>
          <option value="name_asc">${t('labelAZ')}</option>
        </select>
        <button id="ov-reset-filters" style="padding: 0 8px; background: #333; color: #adadb8; border: 1px solid #444; border-radius: 4px; cursor: pointer;">✕</button>
      </div>
      <div style="display: flex; gap: 4px; margin-bottom: 8px;">
        <button class="ov-filter-btn active" data-filter="all" style="flex: 1; padding: 3px; font-size: 0.7em; cursor: pointer; background: #333; color: white; border: none; border-radius: 4px;">${t('labelTodos')}</button>
        <button class="ov-filter-btn" data-filter="alive" style="flex: 1; padding: 3px; font-size: 0.7em; cursor: pointer; background: #333; color: white; border: none; border-radius: 4px;">${t('labelVivos')}</button>
        <button class="ov-filter-btn" data-filter="dead" style="flex: 1; padding: 3px; font-size: 0.7em; cursor: pointer; background: #333; color: white; border: none; border-radius: 4px;">${t('labelMortos')}</button>
      </div>
      <div id="ov-enemy-filters" style="display: flex; gap: 4px; margin-bottom: 10px; flex-wrap: wrap;"></div>
      <div id="ov-player-list"></div>
      <div id="ov-no-data" style="text-align: center; color: #adadb8; font-size: 0.8em; margin: 10px 0;">${t('msgNoData')}</div>
      <button id="ov-clear-btn" style="width: 100%; padding: 5px; background: #eb0400; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75em; font-weight: bold; margin-top: 10px;">${t('btnLimparCanal')}</button>
    </div>
    <div id="ov-tab-nicks" style="display: none;">
      <div id="ov-nick-list" style="background: #1f1f23; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.8em; line-height: 1.4; max-height: 200px; overflow-y: auto;"></div>
      <button id="ov-copy-nicks" style="width: 100%; margin-top: 10px; padding: 5px; background: #9147ff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em;">${t('btnCopiarTodos')}</button>
    </div>
  `;

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

  function idVantagens(skills) {
    if (!skills) return { classes: [], subs: [] };
    const skL = skills.toLowerCase();
    let cls = []; let sbs = new Set();
    for (const [c, i] of Object.entries(ENEMY_MAPPING)) {
      if (i.keywords.some(k => new RegExp(`(^|[^\\p{L}])${k.toLowerCase()}([^\\p{L}]|$)`, 'iu').test(skL))) {
        cls.push(c); if (i.sub !== "Unknown") sbs.add(t(`label${i.sub}`));
      }
    }
    if (/(^|[^\p{L}])(humanóide|humanoide|humanoid)(-[^\p{L}]|$)/iu.test(skL)) sbs.add(t('labelHumanoide'));
    if (/(^|[^\p{L}])(besta|beast|bestia)(-[^\p{L}]|$)/iu.test(skL)) sbs.add(t('labelBesta'));
    if (/(^|[^\p{L}])(maldito|cursed)(-[^\p{L}]|$)/iu.test(skL)) sbs.add(t('labelMaldito'));
    return { classes: cls, subs: Array.from(sbs) };
  }

  let curFilter = 'all'; let curEnemyFilter = 'all'; let autoClearT = null;

  function update() {
    const channel = window.location.pathname.split('/')[1]?.toLowerCase() || 'unknown';
    chrome.storage.local.get(['kukoro_data', 'extension_enabled', 'overlay_enabled'], (res) => {
      const extE = res.extension_enabled !== false; const ovE = res.overlay_enabled === true;
      const overlayEl = document.getElementById('kukoro-overlay');
      const players = (res.kukoro_data || {})[channel] || {};
      const allIds = Object.keys(players);

      if (!ovE) { 
        overlayEl.style.display = 'none'; 
        return; 
      }
      else overlayEl.style.display = 'flex';

      document.getElementById('ov-power-toggle').textContent = extE ? '🟢' : '🔴';
      document.getElementById('ov-disabled-overlay').style.display = extE ? 'none' : 'block';
      document.getElementById('kukoro-content-root').style.display = extE ? 'block' : 'none';
      if (!extE) return;

      document.getElementById('kukoro-title').textContent = t('overlayTitle', channel);
      const search = document.getElementById('ov-search-input').value.toLowerCase();
      const sortType = document.getElementById('ov-sort-select').value;
      
      let detEnemies = new Set();
      allIds.forEach(id => { if (!players[id].isPending) idVantagens(players[id].skills).classes.forEach(c => detEnemies.add(c)); });
      renderEnFilters(Array.from(detEnemies).sort());

      const anyAlive = allIds.some(id => !players[id].isDead);
      if (allIds.length > 0 && !anyAlive) {
        if (!autoClearT) autoClearT = setTimeout(() => {
          chrome.storage.local.get(['kukoro_data'], f => {
            const p = (f.kukoro_data || {})[channel] || {};
            if (Object.keys(p).length > 0 && !Object.values(p).some(x => !x.isDead)) {
              let d = f.kukoro_data; delete d[channel]; chrome.storage.local.set({ kukoro_data: d });
            }
            autoClearT = null;
          });
        }, 5000);
      } else if (autoClearT) { clearTimeout(autoClearT); autoClearT = null; }

      document.getElementById('ov-total-count').textContent = allIds.length;
      const filteredIds = allIds.filter(id => {
        const p = players[id]; const v = idVantagens(p.skills || "");
        let mS = search.startsWith('@') ? p.name.toLowerCase().includes(search.slice(1)) : (p.name.toLowerCase().includes(search) || (p.skills || "").toLowerCase().includes(search));
        let mSt = curFilter === 'all' || (curFilter === 'alive' ? !p.isDead : !!p.isDead);
        let mE = curEnemyFilter === 'all';
        if (!mE) {
          const info = ENEMY_MAPPING[curEnemyFilter]; const sub = info?.sub;
          const temExata = v.classes.includes(curEnemyFilter);
          const sL = (p.skills || "").toLowerCase();
          const temGen = sub && (sL.includes(sub.toLowerCase()) || (sub === "Humanóide" && (sL.includes("humanoide") || sL.includes("humanóide"))));
          mE = temExata || temGen;
        }
        return mS && mSt && mE;
      });

      const hasF = search !== '' || curFilter !== 'all' || curEnemyFilter !== 'all';
      document.getElementById('ov-filtered-container').style.display = hasF ? 'block' : 'none';
      document.getElementById('ov-filtered-count').textContent = filteredIds.length;

      filteredIds.sort((a, b) => {
        const pa = players[a], pb = players[b];
        if (sortType === 'lv_desc') return (parseInt(pb.lv) || 0) - (parseInt(pa.lv) || 0);
        if (sortType === 'lv_asc') return (parseInt(pa.lv) || 0) - (parseInt(pb.lv) || 0);
        if (sortType === 'name_asc') return pa.name.localeCompare(pb.name);
        return new Date(pb.lastUpdate) - new Date(pa.lastUpdate);
      });

      const nList = document.getElementById('ov-nick-list'); nList.innerHTML = '';
      allIds.sort().forEach(id => {
        const p = players[id]; const div = document.createElement('div');
        div.style.cssText = 'display:flex; justify-content:space-between; padding:1px 0; border-bottom:1px solid #222;';
        const v = idVantagens(p.skills || "");
        const labels = [...v.classes, ...v.subs].filter(l => !v.classes.some(c => t(`label${ENEMY_MAPPING[c].sub}`) === l));
        div.innerHTML = `<span style="${p.isDead ? 'color:#666' : ''}">${p.isPending ? '⚠️ ' : ''}${p.name}</span><span style="font-size:0.8em; color:#00ffcc">${labels.join(', ')}</span>`;
        nList.appendChild(div);
      });

      const pList = document.getElementById('ov-player-list'); pList.innerHTML = '';
      document.getElementById('ov-no-data').textContent = hasF ? t('msgNoResults') : t('msgNoData');
      document.getElementById('ov-no-data').style.display = filteredIds.length ? 'none' : 'block';

      filteredIds.forEach(id => {
        const p = players[id]; const v = idVantagens(p.skills || "");
        const card = document.createElement('div');
        card.style.cssText = `border: 1px ${p.isPending ? 'dashed' : 'solid'} #9147ff; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: ${p.isDead ? '#1a1a1e' : '#1f1f23'}; opacity: ${p.isDead ? '0.6' : '1'};`;
        
        if (p.isPending) {
          card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div style="font-weight:bold; color:#ffcc00">@${p.name} [${t('statusAguardando')}]</div><div style="font-size:0.65em; color:#adadb8; background:#333; padding:2px 5px; border-radius:4px;">${t('statusPendente')}</div></div><div style="font-size:0.7em; color:#adadb8; margin-top:5px;">${t('msgPendingInfo')}</div><div style="display:flex; justify-content:flex-end; margin-top:5px;"><button class="ov-st-btn" style="padding:2px 6px; font-size:0.7em; background:#444; color:white; border:none; border-radius:3px; cursor:pointer;">${t('btnMorto')}</button></div>`;
        } else {
          const labels = [...new Set([...v.classes, ...v.subs])].filter(l => {
            const subRaw = ["Humanóide", "Besta", "Maldito"].find(s => t(`label${s}`) === l);
            return subRaw ? !v.classes.some(c => ENEMY_MAPPING[c].sub === subRaw) : true;
          });
          card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div style="font-weight:bold; color:#bf94ff; font-size:0.9em;">@${p.name} <span style="font-size:0.8em; color:#adadb8;">[Lv.${p.lv}]</span></div><div style="display:flex; gap:3px; flex-wrap:wrap; justify-content:flex-end; max-width:50%;">${labels.map(l => {
            let c = '#00ffcc'; if (l === t('labelHumanoide')) c = '#ffcc00'; if (l === t('labelMaldito')) c = '#ff4b4b';
            return `<div style="font-size:0.55em; color:${c}; border:1px solid currentColor; padding:1px 4px; border-radius:8px; font-weight:bold; text-transform:uppercase; white-space:nowrap;">${l}</div>`;
          }).join('')}</div></div><div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:3px; font-size:0.75em; margin:5px 0; color:#adadb8;"><div>DEF: <span style="color:white">${p.def}</span></div><div>AGI: <span style="color:white">${p.agi}</span></div><div>CRIT: <span style="color:white">${p.crit}</span></div></div><div style="font-size:0.75em; font-style:italic; color:#00ffcc; border-top:1px solid #333; padding-top:4px;">${p.skills}</div><div style="display:flex; justify-content:flex-end; margin-top:5px;"><button class="ov-st-btn" style="padding:2px 6px; font-size:0.7em; background:${p.isDead?'#444':'#9147ff'}; color:white; border:none; border-radius:3px; cursor:pointer;">${p.isDead?t('btnReviver'):t('btnMorto')}</button></div>`;
        }
        card.querySelector('.ov-st-btn').onclick = () => {
          chrome.storage.local.get(['kukoro_data'], f => {
            let d = f.kukoro_data; d[channel][id].isDead = !d[channel][id].isDead; chrome.storage.local.set({ kukoro_data: d });
          });
        };
        pList.appendChild(card);
      });
    });
  }

  function renderEnFilters(enemies) {
    const container = document.getElementById('ov-enemy-filters');
    const current = Array.from(container.querySelectorAll('.ov-sub-btn:not([data-sub="all"])')).map(b => b.dataset.sub);
    if (JSON.stringify(current) === JSON.stringify(enemies)) return;
    container.innerHTML = '';
    const addBtn = (label, sub) => {
      const btn = document.createElement('button'); btn.className = `ov-sub-btn ${curEnemyFilter === sub ? 'active' : ''}`;
      btn.dataset.sub = sub; btn.textContent = label;
      btn.style.cssText = `padding:2px 6px; font-size:0.65em; cursor:pointer; background:${curEnemyFilter===sub?'#9147ff':'#1a1a1e'}; color:white; border:1px solid #444; border-radius:3px;`;
      btn.onclick = () => { curEnemyFilter = (curEnemyFilter === sub && sub !== 'all') ? 'all' : sub; update(); };
      container.appendChild(btn);
    };
    addBtn(t('labelTodos'), 'all');
    enemies.forEach(e => addBtn(e, e));
  }

  document.getElementById('ov-search-input').oninput = update;
  document.getElementById('ov-sort-select').onchange = update;
  document.getElementById('ov-reset-filters').onclick = () => {
    document.getElementById('ov-search-input').value = ''; document.getElementById('ov-sort-select').value = 'recent';
    curFilter = 'all'; curEnemyFilter = 'all'; update();
  };
  document.querySelectorAll('.ov-filter-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.ov-filter-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); curFilter = b.dataset.filter; update();
  });
  document.querySelectorAll('.ov-tab-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.ov-tab-btn').forEach(x => { x.classList.toggle('active', x===b); x.style.color = x===b?'white':'#adadb8'; });
    document.getElementById('ov-tab-players').style.display = b.dataset.tab==='players'?'block':'none';
    document.getElementById('ov-tab-nicks').style.display = b.dataset.tab==='nicks'?'block':'none';
  });
  document.getElementById('ov-clear-btn').onclick = () => {
    if(confirm(t('confirmLimpar', window.location.pathname.split('/')[1]?.toLowerCase()))) {
      const channel = window.location.pathname.split('/')[1]?.toLowerCase();
      chrome.storage.local.get(['kukoro_data'], f => {
        let d = f.kukoro_data; delete d[channel]; chrome.storage.local.set({ kukoro_data: d });
      });
    }
  };
  document.getElementById('ov-copy-nicks').onclick = () => {
    navigator.clipboard.writeText(document.getElementById('ov-nick-list').innerText).then(() => {
      const b = document.getElementById('ov-copy-nicks'); const old = b.textContent;
      b.textContent = t('copied'); setTimeout(() => b.textContent = old, 2000);
    });
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.extension_enabled || changes.overlay_enabled || changes.kukoro_data)) update();
  });

  update();
}

if (document.readyState === 'complete') injectKukoroOverlay();
else window.addEventListener('load', injectKukoroOverlay);
