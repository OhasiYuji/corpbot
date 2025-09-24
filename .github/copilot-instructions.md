# Copilot Instructions for `corpbot`

## Project Overview
- **Purpose:** Discord bot for user registration and time tracking ("bate-ponto") for a specific community, with Google Sheets integration for persistent storage.
- **Main Components:**
  - `index.js`: Entry point, sets up Discord client, event handlers, and bot login.
  - `commands/`: Contains command handlers for registration (`registro.js`) and time tracking (`batePonto.js`).
  - `utils/`: Utility modules for formatting (`format.js`) and Google Sheets operations (`sheets.js`).
  - `data/`: (Purpose not defined in code; check for future data storage.)

## Key Patterns & Workflows
- **Discord.js v14** is used. All command/event logic is modularized in `commands/`.
- **Registration Workflow:**
  - `registroHandler` sends a registration panel, handles modal input, updates user nickname, logs info to a channel, and appends to Google Sheets.
- **Time Tracking Workflow:**
  - `batePontoHandler` manages a "bate-ponto" panel, tracks entry/exit via button, logs to a channel, and appends to Google Sheets.
  - `voiceStateHandler` auto-closes time tracking if a user leaves the relevant voice category.
- **Google Sheets Integration:**
  - Credentials and spreadsheet IDs are loaded from environment variables (`.env` file expected).
  - All data writes use the `addUsuario` and `addHoras` functions in `utils/sheets.js`.
- **Environment Variables:**
  - `TOKEN`, `SPREADSHEET_ID`, `GOOGLE_CREDENTIALS_PATH` must be set in `.env`.
- **Bot Startup:**
  - Use `npm start` or `node index.js` (see `package.json`).

## Project-Specific Conventions
- **Channel IDs and Category IDs** are hardcoded in command files. Update these if deploying to a different server.
- **Ephemeral Replies:** All user interactions are replied to with ephemeral messages for privacy.
- **User Nicknames:** Registration sets Discord nicknames to a specific format: `DPF » {nome} ({idJogo})`.
- **Emoji Usage:** Uses a custom emoji for logs and messages, defined in `utils/format.js`.
- **No Test Suite:** No automated tests are defined; manual testing is expected.
- **No TypeScript or transpilation.**

## Examples
- To add a new command, create a new file in `commands/` and import/register it in `index.js`.
- To change Google Sheets structure, update the range and columns in `utils/sheets.js`.

## External Dependencies
- `discord.js`, `dotenv`, `googleapis`, `google-spreadsheet`, `luxon`, `node-cron` (see `package.json`).

---

**If you update channel IDs, spreadsheet structure, or add new commands, document the changes here for future agents.**
