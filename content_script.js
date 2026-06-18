console.log("Kukoro Dungeon Tracker: Content Script carregado.");

const KUKORO_REGEX_ALT = /\[KUKORO\]\s+(?<name>[\w\-]+)\s*\((?:Lv|Nv)\.?\s*(?<lv>\d+),\s*(?:Df|Def)\.?\s*(?<def>[\d%]+),\s*(?:Crit|Crít)\.?\s*(?<crit>[\d%]+),\s*Agi\.?\s*(?<agi>[\d%]+)\)\s*>\s*(?<skills>.*)/i;
const KUKORO_REGEX_CLASSIC = /@?(?<name>[\w\-]+)\s*\[(?:Lv|Nv)\.?\s*(?<lv>\d+)\]\s*HP:\s*(?<hp>\d+)\s*\|\s*ATK:\s*(?<atk>\d+)\s*\|\s*(?:Df|Def|DEF)\.?\s*(?<def>[\d%]+)\s*\|\s*AGI:\s*(?<agi>\d+)\s*\|\s*(?:Crit|Crít|CRIT)\.?\s*(?<crit>[\d%]+)\s*\|\s*(?:Habilidades|Skills|Abilities):\s*(?<skills>.*)/i;

const ENEMY_KEYWORDS = ["Morcego", "Bat", "Murciélago", "Murcielago", "Ciclope", "Cyclops", "Dragão", "Dragon", "Dragón", "Wyvern", "Gárgula", "Gargoyle", "Gárgola", "Gargola", "Goblin", "Humano", "Human", "Diabrete", "Imp", "Diablillo", "Lagarto", "Lizard", "Lizardo", "Minotauro", "Minotaur", "Naga", "Oni", "Orc", "Orco", "Sombra", "Shadow", "Esqueleto", "Skeleton", "Gosma", "Slime", "Limo", "Muco", "Aranha", "Spider", "Araña", "Arana", "Troll", "Lobo", "Wolf", "Lobisomem", "Zumbi", "Zombie", "Zombi", "Momba"];

function getTargets(skills) {
  if (!skills) return "";
  const lower = skills.toLowerCase();
  return ENEMY_KEYWORDS.filter(k => new RegExp(`(^|[^\\p{L}])${k.toLowerCase()}([^\\p{L}]|$)`, 'iu').test(lower)).sort().join(',');
}

function getFirstWordAfterBracket(skills) {
  if (!skills) return "";
  const match = skills.match(/\[(.*?)\]/);
  if (match) {
    const words = match[1].replace(/[^\p{L}\s]/giu, '').trim().split(/\s+/);
    return words[0] || "";
  }
  return "";
}

function isNewMatchSkill(oldSkills, newSkills) {
  if (!oldSkills || !newSkills) return false;
  const oldTargets = getTargets(oldSkills);
  const newTargets = getTargets(newSkills);
  const oldFirstWord = getFirstWordAfterBracket(oldSkills);
  const newFirstWord = getFirstWordAfterBracket(newSkills);
  // Se mudou a primeira palavra (classe/efeito) E os alvos, é uma nova partida.
  return oldFirstWord !== newFirstWord && oldTargets !== newTargets;
}

function getChannelName() {
  const path = window.location.pathname.split('/');
  return path[1] ? path[1].toLowerCase() : 'unknown';
}

function processarMensagem(node) {
  if (!node || node.nodeType !== 1) return;

  chrome.storage.local.get(['extension_enabled'], (result) => {
    if (result.extension_enabled === false) return;

    const authorEl = node.querySelector('.chat-author__display-name') || node.querySelector('[data-a-target="chat-message-username"]');
    const author = authorEl ? authorEl.textContent.trim().toLowerCase() : null;

    const bodyElement = node.querySelector('.chat-line__message-body') || 
                        node.querySelector('[data-a-target="chat-line-message-body"]');
    
    if (!bodyElement) return;
    const content = bodyElement.textContent.replace(/\s+/g, ' ').trim();
    
    console.log("Kukoro Dungeon Tracker: Processando mensagem:", content); // Adicionado para depuração
    
    if (content.toLowerCase().startsWith('!kukoro') && author) {
      registrarPendencia(author);
      return;
    }

    let match = content.match(KUKORO_REGEX_ALT);
    if (!match) match = content.match(KUKORO_REGEX_CLASSIC);

    if (match) {
      const data = match.groups;
      salvarDados(data);
    }
  });
}

function registrarPendencia(name) {
  const channel = getChannelName();
  if (channel === 'unknown' || channel === 'directory') return;

  chrome.storage.local.get(['kukoro_data'], (result) => {
    let allData = result.kukoro_data || {};
    if (!allData[channel]) allData[channel] = {};
    const lowerName = name.toLowerCase();
    if (!allData[channel][lowerName] || allData[channel][lowerName].isPending) {
      allData[channel][lowerName] = { name: name, isPending: true, lastUpdate: new Date().toISOString() };
      chrome.storage.local.set({ kukoro_data: allData }, () => atualizarAtividadeCanal(channel));
    }
  });
}

function salvarDados(playerData) {
  const channel = getChannelName();
  if (channel === 'unknown' || channel === 'directory' || channel === 'videos') return;

  chrome.storage.local.get(['kukoro_data', 'channel_state'], (result) => {
    let allData = result.kukoro_data || {};
    let state = result.channel_state || {};
    if (!allData[channel]) allData[channel] = {};
    if (!state[channel]) state[channel] = { isReady: false };

    const lowerName = playerData.name.toLowerCase();
    let isReset = false;

    // Lógica de AUTO-RESET se a partida já estava marcada como iniciada
    if (state[channel].isReady) {
      const oldPlayer = allData[channel][lowerName];
      // Reseta a sala se:
      // 1. For um jogador que nem estava na lista (nem como pendente)
      // 2. For um jogador com dados antigos que mudou drasticamente de habilidades
      if (!oldPlayer || (!oldPlayer.isPending && isNewMatchSkill(oldPlayer.skills, playerData.skills))) {
        isReset = true;
      }
    }

    if (isReset) {
      console.log(`Kukoro Dungeon Tracker: Nova partida detectada! Resetando lista.`);
      allData[channel] = {};
      state[channel].isReady = false;
    }

    allData[channel][lowerName] = {
      ...playerData,
      isPending: false,
      isDead: false, 
      lastUpdate: new Date().toISOString()
    };

    // Auto-marcar como pronto ao chegar em 16 players com dados completos
    const validPlayersCount = Object.values(allData[channel]).filter(p => !p.isPending).length;
    if (validPlayersCount >= 16 && !state[channel].isReady) {
      state[channel].isReady = true;
    }

    chrome.storage.local.set({ kukoro_data: allData, channel_state: state }, () => {
      console.log(`Kukoro Dungeon Tracker: @${playerData.name} salvo no canal ${channel}.`);
      atualizarAtividadeCanal(channel);
    });
  });
}

function atualizarAtividadeCanal(channel) {
  chrome.storage.local.get(['channel_activity'], (result) => {
    let activity = result.channel_activity || {};
    activity[channel] = Date.now();
    chrome.storage.local.set({ channel_activity: activity });
  });
}

function limparCanaisInativos() {
  chrome.storage.local.get(['kukoro_data', 'channel_activity', 'channel_state'], (result) => {
    let allData = result.kukoro_data || {};
    let activity = result.channel_activity || {};
    let state = result.channel_state || {};
    const umaHoraEmMs = 60 * 60 * 1000;
    const agora = Date.now();
    let mudou = false;

    for (const channel in activity) {
      if (agora - activity[channel] > umaHoraEmMs) {
        delete allData[channel];
        delete activity[channel];
        delete state[channel];
        mudou = true;
      }
    }
    if (mudou) chrome.storage.local.set({ kukoro_data: allData, channel_activity: activity, channel_state: state });
  });
}

limparCanaisInativos();
setInterval(limparCanaisInativos, 5 * 60 * 1000);

let chatObserver = null;

function iniciarObservador() {
  const chatContainer = document.querySelector('[data-test-selector="chat-scrollable-area__message-container"]') ||
                        document.querySelector('.chat-scrollable-area__message-container') ||
                        document.querySelector('.scrollable-area[data-a-target="chat-scroller"] > div') ||
                        document.querySelector('.chat-list--default .scrollable-area');

  if (chatContainer) {
    if (chatObserver) chatObserver.disconnect();
    console.log("Kukoro Dungeon Tracker: Iniciando observação.");
    chatObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            if (node.classList && node.classList.contains('chat-line__message')) {
              processarMensagem(node);
            } else {
              const messages = node.querySelectorAll('.chat-line__message');
              messages.forEach(msgNode => processarMensagem(msgNode));
            }
          }
        }
      }
    });
    chatObserver.observe(chatContainer, { childList: true, subtree: true });
  } else {
    setTimeout(iniciarObservador, 2000);
  }
}

let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    iniciarObservador();
  }
}, 3000);

iniciarObservador();
