# Simple Dreddark API v2

## Overview

Simple Dreddark API is a **client-side developer API** for **drednot.io**, delivered as a Tampermonkey userscript.
It exposes structured access to **chat parsing, events, commands, ship helpers, storage, outfit control, and utilities**.

**Important**:

* Everything is inferred from the DOM, UI behavior, and client WebSocket messages
* Nothing is server-trusted
* All logic runs entirely on the client

---

## Installation

Install as a **Tampermonkey userscript**:

* Script name: `Simple Dreddark API v2`
* Matches:

  * `https://drednot.io/*`
  * `https://test.drednot.io/*`

Once installed, the API is exposed globally.

## Using in DevTools (No Tampermonkey)

If you are developing or testing locally, you can load the API directly from GitHub using DevTools.

### One-time Manual Load

Paste this into the browser console:

```js
fetch("https://raw.githubusercontent.com/PshsayhiXD/Simple-Dreddark-API/master/main.js
")
  .then(r => r.text())
  .then(code => {
    const s = document.createElement("script");
    s.textContent = code;
    document.documentElement.appendChild(s);
  });
```

### Auto-load via DevTools Snippet

For convenience, save the above as a **DevTools Snippet** and run it after each refresh.

---

## Global Access

```js
window.Dreddark
```

---

## Version

```js
Dreddark.version // "2.1.4"
```

---

## Initialization & Lifecycle

The API does **not** auto-start observers.

### Start chat & parsing

```js
await Dreddark.chat.init();
```

### Stop chat parsing

```js
Dreddark.chat.destroy();
```

Other subsystems are always available unless explicitly initialized (see Outfit API).

---

## API Surface

```js
Dreddark.version
Dreddark.rankValue
Dreddark.debug
Dreddark.events
Dreddark.chat
Dreddark.commands
Dreddark.ship
Dreddark.observe
Dreddark.storage
Dreddark.utils
Dreddark.outfit
Dreddark.use(fn)
```

---

## Events System

### Register Listener

```js
Dreddark.events.on("chat", e => {});
```

### Supported Events

| Event        | Description                |
| ------------ | -------------------------- |
| `chat`       | Player chat message        |
| `warning`    | System warning line        |
| `mission`    | Mission announcement       |
| `roleChange` | Promotion / demotion event |
| `shipJoin`   | Player joined ship         |
| `shipLeave`  | Player left ship           |

---

## Base Event Payload

All events include:

```js
{
  raw: String,
  timestamp: Number,
  trusted: false,
  isUser: Boolean,
  isSystem: Boolean
}
```

---

## Chat Event Payload

```js
{
  user: String,
  role: String,
  message: String,
  badges: [{ img, text }],
  isUser: true,
  isSystem: false
}
```

---

## Chat API

### Initialize Chat Observer

```js
await Dreddark.chat.init();
```

### Destroy Observer

```js
Dreddark.chat.destroy();
```

### Send Message

```js
Dreddark.chat.send("Hello world");
```

---

## Command System

Commands are parsed **client-side** from chat messages.

### Register Command

```js
Dreddark.commands.register("ping", {
  prefix: "?",
  rankRequire: 1,
  sessionCooldown: 5000,
  persistCooldown: 60000,
  globalCooldown: 1000,
  run(e, args) {
    Dreddark.chat.send("pong");
  }
});
```

### Options

| Option            | Description                              |
| ----------------- | ---------------------------------------- |
| `prefix`          | Per-command prefix (default `?`)         |
| `rankRequire`     | Minimum numeric rank required            |
| `sessionCooldown` | Per-user session cooldown (ms)           |
| `persistCooldown` | Per-user persistent cooldown (ms)        |
| `globalCooldown`  | Global cooldown shared by all users (ms) |
| `args`            | Argument validation descriptors          |

### Default Prefix

```js
Dreddark.commands.setDefaultPrefix("!");
```

---

## Rank Values

```js
Dreddark.rankValue
```

| Value | Role    |
| ----: | ------- |
|   `0` | Guest   |
|   `1` | Crew    |
|   `3` | Captain |

---

## Ship API

### Promote / Demote

```js
await Dreddark.ship.promote("username", 1);
await Dreddark.ship.demote("username", 0);
```

### Join Ship

```js
Dreddark.ship.join("ABC123");
```

### Track Joined Ship

```js
Dreddark.ship.initSaveJoinedShip();
```

Retrieve:

```js
Dreddark.ship.getCurrentJoinedShip();
```

Clear:

```js
Dreddark.ship.clearCurrentShip();
```

---

## Storage

### Session Storage

```js
Dreddark.storage.session
```

* In-memory `Map`
* Cleared on reload

### Persistent Storage

```js
Dreddark.storage.persist
```

* Backed by `localStorage`
* Namespace key: `DreddarkAPI.persist`

Methods:

```js
get(ns, key)
set(ns, key, value)
del(ns, key)
```

---

## Utils

### Validate Player Name

```js
const err = Dreddark.utils.validateName("My Name");
```

Possible errors:

* `NAME_TOO_LONG`
* `NAME_TOO_SHORT`
* `STARTS_WITH_SPACE`
* `ENDS_WITH_SPACE`
* `DOUBLE_SPACE`
* `INVALID_CHARACTER`

Returns `null` if valid.

---

## Outfit API (Advanced)

Allows outfit manipulation via WebSocket interception.

### Initialization (REQUIRED)

Must run at **document-start**:

```js
Dreddark.outfit.initWsHook("dreddarkAPI");
```

No-ops if executed too late

### Apply Outfit

```js
Dreddark.outfit.setOutfit(true);  // in-game
Dreddark.outfit.setOutfit(false); // not in-game
```

Uses current `player_appearance` from localStorage.

---

## Plugins

Extend without forking:

```js
Dreddark.use(api => {
  api.events.on("mission", e => {
    api.chat.send("New mission detected");
  });
});
```

Plugins may:

* Register events
* Register commands
* Use storage
* Call any exposed API