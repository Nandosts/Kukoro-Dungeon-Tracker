console.log("Kukoro Dungeon Tracker: Content Script carregado.");

const KUKORO_REGEX_ALT = /\[KUKORO\]\s+(?<name>[\w_]+)\s+\(Lv\.\s+(?<lv>\d+),\s+Df\.\s+(?<def>[\d%]+),\s+Crit\.\s+(?<crit>[\d%]+),\s+Agi\.\s+(?<agi>[\d%]+)\)\s+>\s+(?<skills>.*)/i;
const KUKORO_REGEX_CLASSIC = /@?(?<name>[\w_]+)\s+\[Lv\.\s+(?<lv>\d+)\]\s+HP:\s+(?<hp>\d+)\s+\|\s+ATK:\s+(?<atk>\d+)\s+\|\s+DEF:\s+(?<def>[\d%]+)\s+\|\s+AGI:\s+(?<agi>\d+)\s+\|\s+CRIT:\s+(?<crit>[\d%]+)\s+\|\s+Habilidades:\s+(?<skills>.*)/i;

function getChannelName() {
  const path = window.location.pathname.split('/');
  return path[1] ? path[1].toLowerCase() : 'unknown';
}

function processarMensagem(node) {
  if (!node || node.nodeType !== 1) return;

  chrome.storage.local.get(['extension_enabled'], (result) => {
    if (result.extension_enabled === false) return;

    // Pega o autor da mensagem
    const authorEl = node.querySelector('.chat-author__display-name') || node.querySelector('[data-a-target="chat-message-username"]');
    const author = authorEl ? authorEl.textContent.trim().toLowerCase() : null;

    const bodyElement = node.querySelector('.chat-line__message-body') || 
                        node.querySelector('[data-a-target="chat-line-message-body"]');
    
    if (!bodyElement) return;

    const content = bodyElement.textContent.replace(/\s+/g, ' ').trim();
    
    // Verifica se é um comando !kukoro
    if (content.toLowerCase().startsWith('!kukoro') && author) {
      registrarPendencia(author);
      return;
    }

    // Verifica se é resposta do bot com dados
    let match = content.match(KUKORO_REGEX_ALT);
    if (!match) {
      match = content.match(KUKORO_REGEX_CLASSIC);
    }

    if (match) {
      const data = match.groups;
      console.log("Kukoro Dungeon Tracker: Dados detectados:", data);
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
    
    // Só registra como pendente se o jogador NÃO existir ainda com dados completos
    if (!allData[channel][lowerName] || allData[channel][lowerName].isPending) {
      allData[channel][lowerName] = {
        name: name,
        isPending: true,
        lastUpdate: new Date().toISOString()
      };

      chrome.storage.local.set({ kukoro_data: allData }, () => {
        atualizarAtividadeCanal(channel);
      });
    }
  });
}

function salvarDados(playerData) {
  const channel = getChannelName();
  if (channel === 'unknown' || channel === 'directory' || channel === 'videos') return;

  chrome.storage.local.get(['kukoro_data'], (result) => {
    let allData = result.kukoro_data || {};
    if (!allData[channel]) allData[channel] = {};

    const lowerName = playerData.name.toLowerCase();
    
    allData[channel][lowerName] = {
      ...playerData,
      isPending: false, // Marcar como NÃO pendente agora que temos dados
      isDead: false, 
      lastUpdate: new Date().toISOString()
    };

    chrome.storage.local.set({ kukoro_data: allData }, () => {
      console.log(`Kukoro Dungeon Tracker: @${playerData.name} atualizado no canal ${channel}.`);
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
  chrome.storage.local.get(['kukoro_data', 'channel_activity'], (result) => {
    let allData = result.kukoro_data || {};
    let activity = result.channel_activity || {};
    const umaHoraEmMs = 60 * 60 * 1000;
    const agora = Date.now();
    let mudou = false;

    for (const channel in activity) {
      if (agora - activity[channel] > umaHoraEmMs) {
        delete allData[channel];
        delete activity[channel];
        mudou = true;
      }
    }

    if (mudou) {
      chrome.storage.local.set({ kukoro_data: allData, channel_activity: activity });
    }
  });
}

limparCanaisInativos();
setInterval(limparCanaisInativos, 5 * 60 * 1000);

let chatObserver = null;

function iniciarObservador() {
  const chatContainer = document.querySelector('.chat-scrollable-area__message-container') || 
                        document.querySelector('[data-test-selector="chat-scrollable-area__message-container"]') ||
                        document.querySelector('.chat-list--default .scrollable-area');

  if (chatContainer) {
    if (chatObserver) chatObserver.disconnect();
    chatObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          processarMensagem(node);
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
