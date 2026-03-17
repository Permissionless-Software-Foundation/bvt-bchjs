## High-Level Walkthrough

`bvt-bchjs` is an **automation runner** for Build Verification Tests (BVT) around BCH infrastructure and related services.  
At a high level, it:

1. prepares local folders/logs,
2. authenticates to get an API token,
3. runs liveness checks against live endpoints,
4. clones + tests `bch-js`,
5. clones + tests `bch-api`,
6. runs BCHN log analytics,
7. posts key updates to Telegram,
8. repeats on a schedule.

## Main Control Flow

- **Entrypoint:** `bvt-bchjs/bvt.js`
- On startup it immediately calls `runTests()`, then schedules:
  - full BVT run every 2 hours (`PERIOD`)
  - log garbage cleanup every 24 hours (`GARBAGE_PERIOD`)
- `runTests()` orchestrates the whole pipeline in this order:
  - `utils.clearUutDir()` and `utils.clearLogs()`
  - `liveness.runTests()`
  - `bchjs.runTests()`
  - `bchapi.runTests()`
  - `bchnLogAnalysis.runTests()`
  - final status + next-run notification

## What Each Module Does

- **`lib/util.js`**
  - File/log housekeeping (`clearUutDir`, `clearLogs`, `collectGarbage`)
  - Writes to `html/logs/bvt.txt`
  - `logAll()` logs locally and sends same message to Telegram via `lib/telegram.js`

- **`lib/telegram.js`**
  - Wraps `node-telegram-bot-api`
  - Sends timestamped notifications to configured chat/channel

- **`lib/liveness.js`**
  - Runtime health checks against BCHN endpoint(s)
  - Verifies:
    - full node RPC availability
    - Electrumx/Fulcrum
    - PSF SLP indexer
    - `free-bch` wallet path via `minimal-slp-wallet`
  - Logs pass/fail and escalates via Telegram on failures

- **`lib/bch-js.js`**
  - Clones upstream `bch-js` repo into `uut/bch-js`
  - Runs `npm install`
  - Runs unit and BCHN integration tests
  - Stores command output under `html/logs/bch-js/*`

- **`lib/bch-api.js`**
  - Clones upstream `bch-api` repo into `uut/bch-api`
  - Runs `npm install`
  - Runs unit and BCHN integration tests (ABC path present but currently disabled)
  - Stores output under `html/logs/bch-api/*`

- **`lib/bchn-log-analysis.js`**
  - Switches into sibling `bchn-logs` repo
  - Executes analytics commands (`usage`, `endpoint`, `error`, `response`, `jwt`, `rate-limit`)
  - Writes combined report to `html/logs/fullstack-analytics/bchn-analytics.txt`
  - Pushes summary content to Telegram

- **Config (`config/index.js`, `config/env/common.js`)**
  - Centralizes non-secret defaults and env-driven values:
    - metrics URL
    - Telegram token/chat
    - REST URL
    - API token placeholder

## Operational Model

- It is a **long-running scheduled job**, not a web server.
- It depends heavily on:
  - shell commands (`shelljs`)
  - external network services (auth, BCH endpoints, Telegram)
  - sibling directories (`uut`, `bchn-logs`, `html/logs`, `bkup`)
- Observability is file-first (log files) plus Telegram notifications.

## Current Project State

- It is now configured as **ESM** (`"type": "module"` in `package.json`).
- Core deps include `@psf/bch-js`, `minimal-slp-wallet`, `jwt-bch-lib`, `shelljs`, and `node-telegram-bot-api`.
- `npm start` runs `node bvt.js`, which starts the immediate + periodic workflow above.