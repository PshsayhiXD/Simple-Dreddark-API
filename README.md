# Simple Dreddark API v2

## Overview
Simple Dreddark API is a **client-side developer API** for **drednot.io**.
It provides structured access to **chat parsing, ship events, command handling, storage, and utilities**.
**Important**: All data is inferred from the DOM and UI behavior. Nothing is server-trusted.

---

## Initialization & Lifecycle

The API is **opt-in**. Nothing runs automatically.
```js
Dreddark.init();
```

Optional cleanup:
```js
Dreddark.destroy();
```

Destroy disconnects observers and stops all parsing.

---

## Global Access

```js
window.Dreddark
```

---

## API Surface

```js
Dreddark.version              // API version string
Dreddark.init()               // Start all observers
Dreddark.destroy()            // Stop all observers

Dreddark.outfit               // In-game outfits
Dreddark.events               // Event bus
Dreddark.chat                 // Chat send + observers
Dreddark.commands             // Command router
Dreddark.ship                 // Ship / role helpers
Dreddark.utils                // Utility helpers
Dreddark.storage              // Session & persistent storage
Dreddark.debug                // Debug logging control
Dreddark.use(fn)              // Plugin hook
```

---

## Events

### Registering Listeners

```js
Dreddark.events.on("chat", handler);
```

### Supported Event Types

| Event        | Description          |
| ------------ | -------------------- |
| `chat`       | Player chat message  |
| `shipJoin`   | Player joined ship   |
| `shipLeave`  | Player left ship     |
| `roleChange` | Promotion / demotion |
| `mission`    | Mission announcement |
| `warning`    | System warning       |

### Base Event Fields

Every event contains:

```js
{
  raw: "Original chat line",
  timestamp: Number,
  trusted: false,
  isUser: Boolean,
  isSystem: Boolean
}
```

### Chat Event Payload

```js
{
  user: "Player",
  role: "Crew",
  message: "hello",
  badges: [{ img, text }],
  isUser: true,
  isSystem: false
}
```

---

## Chat API

### Sending Messages

```js
Dreddark.chat.send("Hello world");
```

Features:

* Message queue
* Rate limiting
* Automatic truncation (>250 chars)

### Chat Lifecycle

Chat observation is controlled by:

```js
await Dreddark.chat.init();
Dreddark.chat.destroy();
```

---

## Command System

Commands are **client-side only** and parsed from chat messages.

### Registering Commands

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

### Command Options

| Option            | Description                                 |
| ----------------- | ------------------------------------------- |
| `prefix`          | Command prefix (per-command)                |
| `rankRequire`     | Minimum role rank                           |
| `sessionCooldown` | Cooldown per user per session               |
| `persistCooldown` | Cooldown per user persisted in localStorage |
| `globalCooldown`  | Global cooldown shared by all users         |

---

## Storage

Structured storage is provided under `Dreddark.storage`.

### Session Storage

```js
Dreddark.storage.session
```

* In-memory only
* Cleared on reload

### Persistent Storage

```js
Dreddark.storage.persist
```

* Backed by `localStorage`
* Namespaced under `DreddarkAPI.persist`
* Used for cooldowns and long-lived data

---

## Ship / Role Helpers

Promote or demote users via UI interaction:

```js
Dreddark.ship.promote("username", 1);
```

Rank values:

* `0` - Guest
* `1` - Crew
* `3` - Captain

---

## Outfit API

Provides controlled outfit updates via WebSocket interception.

### Initialization (MANDATORY)

Must run at **document-start**:

```js
Dreddark.outfit.initWsHook("dreddarkAPI", outfit_object_goes_here);
```

* Loads `msgpack` automatically if missing
* No-ops if executed late

### Applying Outfit

```js
Dreddark.outfit.setOutfit(true, outfit_object_goes_here);  // in-game
Dreddark.outfit.setOutfit(false, outfit_object_goes_here); // menu
```

---

## Utils

### Validate Player Names

```js
const err = Dreddark.utils.validateName("My Name");
if (err) Dreddark.chat.send(err);
```

---

## Debugging

Debug logging is centralized:

```js
Dreddark.debug.enabled = true;
```

All internal parsing and event emission logs route through this flag.

---

## Plugins
Extend the API without forking:
```js
Dreddark.use(api => {
  api.events.on("mission", e => {
    api.chat.send("New mission detected");
  });
});
```

Plugins receive the live API instance and may:
* Register events
* Register commands
* Use storage