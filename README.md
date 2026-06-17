# Kukoro Dungeon Tracker 🛡️

A powerful and lightweight Chrome Extension designed for **Kukoro: Stream Chat Games** players. It monitors Twitch chat in real-time to capture, organize, and display player statistics for the **Dungeon Raid** mode.

![Dungeon Dark Theme](https://img.shields.io/badge/Theme-Dungeon_Dark-amber)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Languages](https://img.shields.io/badge/Languages-PT--BR%20%7C%20EN%20%7C%20ES-green)

## 📸 Screenshots

<table style="width: 100%; text-align: center;">
  <tr>
    <td style="width: 33%;"><b>Extension (ES)</b></td>
    <td style="width: 33%;"><b>Extension (PT-BR)</b></td>
    <td style="width: 33%;"><b>Overlay (PT-BR)</b></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/72411a32-a710-4d12-9ca4-94e2fee3cdec" alt="Kukoro Tracker Popup ES" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/5e1745d7-d828-4a0d-9d75-5f439857424a" alt="Kukoro Tracker Popup PT-BR" width="200"></td>
    <td><img src="https://github.com/user-attachments/assets/30fe6d15-78a0-4838-8a64-eb27be3df063" alt="Kukoro Tracker Overlay PT-BR" width="200"></td>
  </tr>
</table>

## ✨ Features

- **Draggable Overlay**: A fully resizable and movable window that stays on top of the Twitch stream.
- **Smart Auto-Capture**: Automatically parses bot responses to `!getinfo` and tracks entries via `!kukoro`.
- **Tactical Advantage Engine**: Identifies player bonuses against specific enemy classes (Spider, Skeleton, Dragon, etc.) and allows dynamic filtering.
- **Survivor Management**: Easily mark players as "Dead" to keep your focus on the active party.
- **Automatic Cleanup**: Data is automatically cleared after 1 hour of inactivity or when all players are eliminated.
- **Privacy Focused**: No external servers. All data is stored locally in your browser (`chrome.storage.local`).

## 🚀 Installation (Developer Mode)

Since this extension is in active development, you can load it manually:

1. **Download** this repository as a ZIP and extract it.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer Mode** (top right corner).
4. Click **Load unpacked** and select the project folder.
5. Refresh your Twitch tab!

## 🛠️ Tech Stack

- **Javascript**: Core logic and DOM manipulation.
- **HTML/CSS**: Custom "Dungeon Dark" UI with zero dependencies.
- **Chrome API**: Manifest V3, Storage, Tabs, and i18n.

## 🌍 Internationalization (i18n)

The extension automatically detects your browser language and supports:
- 🇧🇷 Portuguese (Brasil)
- 🇺🇸 English
- 🇪🇸 Spanish

## 🤝 Support & Contact

Found a bug or have a suggestion?
- **Twitch**: Whisper **nando_sts** at [twitch.tv/nando_sts](https://www.twitch.tv/nando_sts)
- **Issues**: Feel free to open an issue on this repository.

---
Developed with ❤️ for the Kukoro community.
