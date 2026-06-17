// Função para criar e injetar a interface flutuante
function injectKukoroOverlay() {
  if (document.getElementById('kukoro-overlay')) return;

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
    background: #18181b;
    border: 2px solid #9147ff;
    border-radius: 8px;
    color: white;
    z-index: 999999;
    display: flex;
    flex-direction: column;
    font-family: sans-serif;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    overflow: hidden;
    resize: both;
  `;

  overlay.innerHTML = `
    <div id="kukoro-header" style="padding: 10px; background: #9147ff; cursor: move; display: flex; justify-content: space-between; align-items: center; user-select: none;">
      <span id="kukoro-title" style="font-weight: bold; font-size: 0.9em;">Kukoro Tracker</span>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="ov-power-toggle" title="Ligar/Desligar Extensão" style="background: none; border: none; cursor: pointer; font-size: 1.1em; padding: 0;">🟢</button>
        <button id="kukoro-minimize" title="Minimizar" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2em; padding: 0 5px;">−</button>
      </div>
    </div>
    <div id="kukoro-body" style="padding: 10px; overflow-y: auto; flex: 1;">
      <div id="ov-disabled-overlay" style="display: none; text-align: center; padding: 20px; background: #3a1a1a; border-radius: 8px; margin-bottom: 10px; border: 1px solid #ff4b4b;">
        <div style="font-size: 1.5em; margin-bottom: 10px;">⚠️</div>
        <div style="font-weight: bold; color: #ff4b4b;">Extensão Desativada</div>
      </div>
      <div id="kukoro-content-root"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Lógica de Arrastar (Draggable)
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  const header = document.getElementById('kukoro-header');

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target.tagName.toLowerCase() === 'button') return;
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, overlay);
    }
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  // Lógica de Minimizar e Ligar/Desligar
  const body = document.getElementById('kukoro-body');
  const minBtn = document.getElementById('kukoro-minimize');
  const powerBtn = document.getElementById('ov-power-toggle');
  let isMinimized = false;
  let lastHeight = overlay.style.height;

  minBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    body.style.display = isMinimized ? 'none' : 'block';
    minBtn.textContent = isMinimized ? '+' : '−';
    
    if (isMinimized) {
      lastHeight = overlay.style.height;
      overlay.style.height = 'auto';
      overlay.style.resize = 'none';
    } else {
      overlay.style.height = lastHeight || '450px';
      overlay.style.resize = 'both';
    }
  });

  powerBtn.addEventListener('click', () => {
    chrome.storage.local.get(['extension_enabled'], (res) => {
      const isEnabled = res.extension_enabled !== false;
      chrome.storage.local.set({ extension_enabled: !isEnabled });
    });
  });

  initOverlayLogic();
}

function initOverlayLogic() {
  const root = document.getElementById('kukoro-content-root');
  
  root.innerHTML = `
    <div style="display: flex; gap: 5px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">
      <button class="ov-tab-btn active" data-tab="players" style="flex: 1; padding: 5px; background: none; border: none; color: white; cursor: pointer; font-size: 0.8em; font-weight: bold;">Habilidades</button>
      <button class="ov-tab-btn" data-tab="nicks" style="flex: 1; padding: 5px; background: none; border: none; color: #adadb8; cursor: pointer; font-size: 0.8em;">Jogadores</button>
    </div>

    <div id="ov-tab-players">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.75em; background: #26262c; padding: 5px; border-radius: 4px;">
        <div>Total: <span id="ov-total-count">0</span>/16</div>
        <div id="ov-filtered-container" style="display: none;">Filtrados: <span id="ov-filtered-count">0</span></div>
      </div>

      <div style="display: flex; gap: 5px; margin-bottom: 10px;">
        <input type="text" id="ov-search-input" placeholder="Pesquisar..." style="flex: 1; padding: 5px; border-radius: 4px; border: 1px solid #333; background: #26262c; color: white; font-size: 0.8em; min-width: 0;">
        <select id="ov-sort-select" style="padding: 5px; background: #26262c; color: white; border: 1px solid #333; border-radius: 4px; font-size: 0.75em; outline: none; cursor: pointer; max-width: 90px;">
          <option value="recent">Recente</option>
          <option value="lv_desc">+ Nível</option>
          <option value="lv_asc">- Nível</option>
          <option value="name_asc">A-Z</option>
        </select>
        <button id="ov-reset-filters" style="padding: 0 8px; background: #333; color: #adadb8; border: 1px solid #444; border-radius: 4px; cursor: pointer;">✕</button>
      </div>
      
      <div style="display: flex; gap: 4px; margin-bottom: 8px;">
        <button class="ov-filter-btn active" data-filter="all" style="flex: 1; padding: 3px; font-size: 0.7em; cursor: pointer; background: #333; color: white; border: none; border-radius: 4px;">Todos</button>
        <button class="ov-filter-btn" data-filter="alive" style="flex: 1; padding: 3px; font-size: 0.7em; cursor: pointer; background: #333; color: white; border: none; border-radius: 4px;">Vivos</button>
        <button class="ov-filter-btn" data-filter="dead" style="flex: 1; padding: 3px; font-size: 0.7em; cursor: pointer; background: #333; color: white; border: none; border-radius: 4px;">Mortos</button>
      </div>

      <div id="ov-enemy-filters" style="display: flex; gap: 4px; margin-bottom: 10px; flex-wrap: wrap;"></div>
      <div id="ov-player-list"></div>
      <div id="ov-no-data" style="text-align: center; color: #adadb8; font-size: 0.8em; margin: 10px 0;">Nenhum dado capturado.</div>
      <button id="ov-clear-btn" style="width: 100%; padding: 5px; background: #eb0400; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75em; font-weight: bold; margin-top: 10px;">Limpar Canal</button>
    </div>

    <div id="ov-tab-nicks" style="display: none;">
      <div id="ov-nick-list" style="background: #1f1f23; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.8em; line-height: 1.4; max-height: 200px; overflow-y: auto;"></div>
      <button id="ov-copy-nicks" style="width: 100%; margin-top: 10px; padding: 5px; background: #9147ff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Copiar Todos</button>
    </div>
  `;

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

  function idVantagens(skills) {
    if (!skills) return { classes: [], subs: [] };
    const skL = skills.toLowerCase();
    let cls = []; let sbs = new Set();
    for (const [c, i] of Object.entries(ENEMY_MAPPING)) {
      if (i.keywords.some(k => new RegExp(`\\b${k.toLowerCase()}\\b`, 'i').test(skL))) {
        cls.push(c); if (i.sub !== "Desconhecido") sbs.add(i.sub);
      }
    }
    if (/\bhumanóide\b/i.test(skL) || /\bhumanoide\b/i.test(skL)) sbs.add("Humanóide");
    if (/\bbesta\b/i.test(skL)) sbs.add("Besta");
    if (/\bmaldito\b/i.test(skL)) sbs.add("Maldito");
    return { classes: cls, subs: Array.from(sbs) };
  }

  let curFilter = 'all';
  let curEnemyFilter = 'all';
  let autoClearT = null;

  function update() {
    const channel = window.location.pathname.split('/')[1]?.toLowerCase() || 'unknown';
    chrome.storage.local.get(['kukoro_data', 'extension_enabled', 'overlay_enabled'], (res) => {
      const extEnabled = res.extension_enabled !== false; // Padrão true
      const ovEnabled = res.overlay_enabled === true; // Padrão false
      
      const players = (res.kukoro_data || {})[channel] || {};
      const allIds = Object.keys(players);
      
      const overlayEl = document.getElementById('kukoro-overlay');
      
      // Oculta o overlay se estiver desativado nas opções ou se não houver NENHUM dado armazenado
      if (!ovEnabled || allIds.length === 0) {
        overlayEl.style.display = 'none';
        if (allIds.length === 0) return; // Se não tem dados, interrompe o processamento da UI
      } else {
        overlayEl.style.display = 'flex';
      }

      const powerBtn = document.getElementById('ov-power-toggle');
      powerBtn.textContent = extEnabled ? '🟢' : '🔴';
      
      const disOverlay = document.getElementById('ov-disabled-overlay');
      const rootContent = document.getElementById('kukoro-content-root');
      
      if (!extEnabled) {
        disOverlay.style.display = 'block';
        rootContent.style.display = 'none';
        return; // Não atualiza lista se desativado
      } else {
        disOverlay.style.display = 'none';
        rootContent.style.display = 'block';
      }

      document.getElementById('kukoro-title').textContent = `Dungeon: ${channel}`;

      const search = document.getElementById('ov-search-input').value.toLowerCase();
      const sortType = document.getElementById('ov-sort-select').value;

      let detEnemies = new Set();
      allIds.forEach(id => {
        if (!players[id].isPending) idVantagens(players[id].skills).classes.forEach(c => detEnemies.add(c));
      });
      renderEnFilters(Array.from(detEnemies).sort());

      const anyAlive = allIds.some(id => !players[id].isDead);
      if (allIds.length > 0 && !anyAlive) {
        if (!autoClearT) autoClearT = setTimeout(() => {
          chrome.storage.local.get(['kukoro_data'], (f) => {
            const p = (f.kukoro_data || {})[channel] || {};
            if (Object.keys(p).length > 0 && !Object.values(p).some(x => !x.isDead)) {
              let d = f.kukoro_data; delete d[channel];
              chrome.storage.local.set({ kukoro_data: d }, update);
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
          const sub = ENEMY_MAPPING[curEnemyFilter]?.sub;
          mE = v.classes.includes(curEnemyFilter) || (sub && (p.skills || "").toLowerCase().includes(sub.toLowerCase()));
        }
        return mS && mSt && mE;
      });

      const hasF = search !== '' || curFilter !== 'all' || curEnemyFilter !== 'all';
      document.getElementById('ov-filtered-container').style.display = hasF ? 'block' : 'none';
      document.getElementById('ov-filtered-count').textContent = filteredIds.length;

      // Ordenação
      filteredIds.sort((a, b) => {
        const pa = players[a], pb = players[b];
        if (sortType === 'lv_desc') return (parseInt(pb.lv) || 0) - (parseInt(pa.lv) || 0);
        if (sortType === 'lv_asc') return (parseInt(pa.lv) || 0) - (parseInt(pb.lv) || 0);
        if (sortType === 'name_asc') return pa.name.localeCompare(pb.name);
        return new Date(pb.lastUpdate) - new Date(pa.lastUpdate);
      });

      const nList = document.getElementById('ov-nick-list');
      nList.innerHTML = '';
      allIds.sort().forEach(id => {
        const p = players[id];
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; justify-content:space-between; padding:1px 0; border-bottom:1px solid #222;';
        const v = idVantagens(p.skills || "");
        const labels = [...new Set([...v.classes, ...v.subs])].filter(l => !v.classes.some(c => ENEMY_MAPPING[c].sub === l));
        div.innerHTML = `<span style="${p.isDead ? 'color:#666' : ''}">${p.isPending ? '⚠️ ' : ''}${p.name}</span><span style="font-size:0.8em; color:#00ffcc">${labels.join(', ')}</span>`;
        nList.appendChild(div);
      });

      const pList = document.getElementById('ov-player-list');
      pList.innerHTML = '';
      document.getElementById('ov-no-data').style.display = filteredIds.length ? 'none' : 'block';

      filteredIds.forEach(id => {
        const p = players[id]; const v = idVantagens(p.skills || "");
        const card = document.createElement('div');
        card.style.cssText = `border: 1px ${p.isPending ? 'dashed' : 'solid'} #9147ff; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: ${p.isDead ? '#1a1a1e' : '#1f1f23'}; opacity: ${p.isDead ? '0.6' : '1'};`;
        
        const labels = [...new Set([...v.classes, ...v.subs])].filter(l => {
          if (["Humanóide", "Besta", "Maldito"].includes(l)) return !v.classes.some(c => ENEMY_MAPPING[c].sub === l);
          return true;
        });

        if (p.isPending) {
          card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div style="font-weight:bold; color:#ffcc00">@${p.name} [Aguardando]</div></div><div style="font-size:0.7em; color:#adadb8; margin-top:5px;">Aguardando !getinfo...</div><div style="display:flex; justify-content:flex-end; margin-top:5px;"><button class="ov-st-btn" style="padding:2px 6px; font-size:0.7em; background:#444; color:white; border:none; border-radius:3px; cursor:pointer;">Morto</button></div>`;
        } else {
          card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:bold; color:#bf94ff; font-size:0.9em;">@${p.name} <span style="font-size:0.8em; color:#adadb8;">[Lv.${p.lv}]</span></div>
              <div style="display:flex; gap:3px; flex-wrap:wrap; justify-content:flex-end; max-width:50%;">
                ${labels.map(l => `<div style="font-size:0.55em; color:${l==='Humanóide'?'#ffcc00':l==='Maldito'?'#ff4b4b':'#00ffcc'}; border:1px solid currentColor; padding:1px 4px; border-radius:8px; font-weight:bold; text-transform:uppercase; white-space:nowrap;">${l}</div>`).join('')}
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:3px; font-size:0.75em; margin:5px 0; color:#adadb8;">
              <div>DEF: <span style="color:white">${p.def}</span></div><div>AGI: <span style="color:white">${p.agi}</span></div><div>CRIT: <span style="color:white">${p.crit}</span></div>
            </div>
            <div style="font-size:0.75em; font-style:italic; color:#00ffcc; border-top:1px solid #333; padding-top:4px;">${p.skills}</div>
            <div style="display:flex; justify-content:flex-end; margin-top:5px;">
              <button class="ov-st-btn" style="padding:2px 6px; font-size:0.7em; background:${p.isDead?'#444':'#9147ff'}; color:white; border:none; border-radius:3px; cursor:pointer;">${p.isDead?'Reviver':'Morto'}</button>
            </div>`;
        }
        card.querySelector('.ov-st-btn').onclick = () => {
          chrome.storage.local.get(['kukoro_data'], f => {
            let d = f.kukoro_data; d[channel][id].isDead = !d[channel][id].isDead;
            chrome.storage.local.set({ kukoro_data: d }); // Removido update() daqui para depender do listener global
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
      const btn = document.createElement('button');
      btn.className = `ov-sub-btn ${curEnemyFilter === sub ? 'active' : ''}`;
      btn.dataset.sub = sub; btn.textContent = label;
      btn.style.cssText = `padding:2px 6px; font-size:0.65em; cursor:pointer; background:${curEnemyFilter===sub?'#9147ff':'#1a1a1e'}; color:white; border:1px solid #444; border-radius:3px;`;
      btn.onclick = () => {
        curEnemyFilter = (curEnemyFilter === sub && sub !== 'all') ? 'all' : sub;
        update();
      };
      container.appendChild(btn);
    };
    addBtn('Todos', 'all');
    enemies.forEach(e => addBtn(e, e));
  }

  // Bindings
  document.getElementById('ov-search-input').oninput = update;
  document.getElementById('ov-sort-select').onchange = update;
  document.getElementById('ov-reset-filters').onclick = () => {
    document.getElementById('ov-search-input').value = ''; 
    document.getElementById('ov-sort-select').value = 'recent';
    curFilter = 'all'; curEnemyFilter = 'all';
    document.querySelectorAll('.ov-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    update();
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
    if(confirm('Limpar canal?')) {
      const channel = window.location.pathname.split('/')[1]?.toLowerCase();
      chrome.storage.local.get(['kukoro_data'], f => {
        let d = f.kukoro_data; delete d[channel];
        chrome.storage.local.set({ kukoro_data: d });
      });
    }
  };
  document.getElementById('ov-copy-nicks').onclick = () => {
    navigator.clipboard.writeText(document.getElementById('ov-nick-list').innerText).then(() => {
      const b = document.getElementById('ov-copy-nicks'); const t = b.textContent;
      b.textContent = 'Copiado!'; setTimeout(() => b.textContent = t, 2000);
    });
  };

  // Reage instantaneamente a mudanças no storage (ex: cliques no popup ou outras abas)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.extension_enabled || changes.overlay_enabled || changes.kukoro_data)) {
      update();
    }
  });

  update();
}

// Inicia o Overlay
if (document.readyState === 'complete') injectKukoroOverlay();
else window.addEventListener('load', injectKukoroOverlay);
