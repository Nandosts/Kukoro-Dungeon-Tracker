# Kukoro Dungeon Tracker - Twitch Extension

Esta extensão monitora o chat da Twitch para capturar informações de jogadores no modo Dungeon do Kukoro.

## Funcionalidades
- Captura automática dos dados enviados pelo bot do Kukoro após o comando `!getinfo`.
- Armazenamento local dos dados para consulta rápida no popup da extensão.
- Ordenação por atualização mais recente.
- Botão para limpar o histórico.

## Como Instalar
1. Baixe os arquivos desta pasta.
2. Abra o Chrome (ou navegador baseado em Chromium como Edge/Brave).
3. Vá para `chrome://extensions/`.
4. Ative o **Modo do Desenvolvedor** (Developer Mode) no canto superior direito.
5. Clique em **Carregar sem compactação** (Load unpacked).
6. Selecione a pasta onde os arquivos estão localizados.

## Como Usar
1. Entre em qualquer live da Twitch que esteja jogando Kukoro Dungeon.
2. Quando alguém (ou você) digitar `!getinfo` ou `!getinfo nick`, a extensão capturará a resposta do bot.
3. Clique no ícone da extensão para ver as estatísticas dos jogadores capturados.

## Nota
A extensão funciona observando o DOM do chat da Twitch. Se a Twitch mudar significativamente a estrutura do chat, pode ser necessário atualizar os seletores no arquivo `content_script.js`.
