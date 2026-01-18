// ==UserScript==
// @name         Simple Dreddark API v2
// @namespace    http://tampermonkey.net/
// @version      2.1.3
// @description  Developer API for drednot.io
// @author       Pshsayhi
// @match        https://drednot.io/*
// @match        https://test.drednot.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=drednot.io
// @grant        unsafeWindow
// ==/UserScript==

/*
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

* `0` — Guest
* `1` — Crew
* `3` — Captain

---

## Outfit API

Provides controlled outfit updates via WebSocket interception.

### Initialization (MANDATORY)

Must run at **document-start**:

```js
Dreddark.outfit.initWsHook("sdt-sendToWs");
```

* Loads `msgpack` automatically if missing
* No-ops if executed late

### Applying Outfit

```js
Dreddark.outfit.setOutfit(true);  // in-game
Dreddark.outfit.setOutfit(false); // menu / storage
```

Safety:

* Hard-blocked if WS hook failed
* Hard-blocked if msgpack missing

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
*/

const root = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
const version = "2.1.3";
(() => {
  "use strict";
  let defaultCommandPrefix = "?";
  const debug = {
    enabled: true,
    log(...args) {
      if (!this.enabled) return;
      console.log("[Dreddark]", ...args);
    },
  };
  const rankValue = {
    0: "guest",
    1: "crew",
    3: "captain",
  };
  const storage = {
    session: new Map(),
    persist: {
      key: "DreddarkAPI.persist",
      read() {
        try {
          return JSON.parse(localStorage.getItem(this.key)) || {};
        } catch {
          return {};
        }
      },
      write(v) {
        try {
          localStorage.setItem(this.key, JSON.stringify(v));
        } catch {}
      },
      get(ns, k) {
        return this.read()?.[ns]?.[k];
      },
      set(ns, k, v) {
        const d = this.read();
        d[ns] ||= {};
        d[ns][k] = v;
        this.write(d);
      },
      del(ns, k) {
        const d = this.read();
        if (d?.[ns]) delete d[ns][k];
        this.write(d);
      },
    },
  };

  const createEventBus = () => {
    const map = {};
    return {
      on(type, fn) {
        (map[type] ||= []).push(fn);
      },
      emit(type, payload) {
        (map[type] || []).forEach((fn) => {
          try {
            fn(payload);
          } catch {}
        });
      },
    };
  };

  const events = createEventBus();

  const observe = {
    wait(sel, { timeout = 10000 } = {}) {
      return new Promise((resolve, reject) => {
        const found = document.querySelector(sel);
        if (found) return resolve(found);
        const obs = new MutationObserver(() => {
          const el = document.querySelector(sel);
          if (!el) return;
          cleanup();
          resolve(el);
        });
        const cleanup = () => {
          clearTimeout(timer);
          obs.disconnect();
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`observe.wait timeout: ${sel}`));
        }, timeout);
        obs.observe(document, { childList: true, subtree: true });
      });
    },
  };

  const ship = {
    promote(user, rank) {
      if (!(rank in rankValue)) return false;
      const btn = document.getElementById("team_manager_button");
      const menu = document.getElementById("team_menu");
      if (!btn || !menu) return false;
      btn.click();
      menu.classList.add("hidden");
      observe.wait("#team_players_inner").then(() => {
        const codes = document.querySelectorAll(
          "#team_players_inner td > code",
        );
        const code = [...codes].find((e) => e.textContent === user);
        const select = code?.closest("tr")?.querySelector("select");
        if (!select) return;
        select.value = rank;
        select.dispatchEvent(new Event("change"));
        setTimeout(() => {
          menu.classList.remove("hidden");
          btn.click();
        }, 250);
      });
      return true;
    },
  };

  const utils = {
    validateName(name) {
      if (name.length > 20) return "Name too long.";
      if (name.length < 3) return "Name too short.";
      if (name.startsWith(" ")) return "Name can not start with space.";
      if (name.endsWith(" ")) return "Name can not end with space.";
      if (name.includes("  ")) return "Name can not contain double spaces.";
      const m = name.match(/[^a-z0-9 ]/gi);
      if (m) return `Invalid character: '${m[0]}'`;
      return null;
    },
  };

  const commands = (() => {
    const map = {};
    const cdNs = "persistCooldown";
    const now = () => Date.now();
    const error = (m) => Dreddark.chat.send(`error: ${m}`);
    events.on("chat", (e) => {
      for (const name in map) {
        const c = map[name];
        const prefix = c.prefix || defaultCommandPrefix;
        if (!e.message.startsWith(prefix)) continue;
        const body = e.message.slice(prefix.length).trim();
        if (!body) continue;
        const parts = body.split(/\s+/);
        if (parts[0] !== name) continue;
        const args = parts.slice(1);
        if (c.rankRequire != null) {
          if ((rankValue[e.role] ?? 0) < c.rankRequire) {
            error("insufficient rank");
            return;
          }
        }
        const userKey = `cmd:${name}:user:${e.user}`;
        const globalKey = `cmd:${name}:global`;
        if (c.sessionCooldown) {
          const until = storage.session.get(cdNs, userKey) || 0;
          if (until > now()) {
            error(`cooldown ${((until - now()) / 1000) | 0}s`);
            return;
          }
        }
        if (c.persistCooldown) {
          const until = storage.persist.get(cdNs, userKey);
          if (until > now()) {
            error(`cooldown ${((until - now()) / 1000) | 0}s`);
            return;
          }
        }
        if (c.globalCooldown) {
          const until = storage.persist.get(cdNs, globalKey);
          if (until > now()) {
            error(`global cooldown ${((until - now()) / 1000) | 0}s`);
            return;
          }
        }
        if (c.args) {
          for (let i = 0; i < c.args.length; i++) {
            const s = c.args[i];
            const v = args[i];
            if (s.required && v == null) {
              error(`missing <${s.name}>`);
              return;
            }
            if (v != null && s.validate) {
              const err = s.validate(v, args);
              if (err) {
                error(err);
                return;
              }
            }
          }
        }
        c.run(e, args);
        if (c.sessionCooldown)
          storage.session.set(cdNs, userKey, now() + c.sessionCooldown);
        if (c.persistCooldown)
          storage.persist.set(cdNs, userKey, now() + c.persistCooldown);
        if (c.globalCooldown)
          storage.persist.set(cdNs, globalKey, now() + c.globalCooldown);
        return;
      }
    });
    return {
      register(name, handler) {
        map[name] = handler;
      },
      setDefaultPrefix(p) {
        if (typeof p === "string" && p.length) defaultCommandPrefix = p;
      },
    };
  })();
  const chat = (() => {
    const queue = [];
    let busy = false;
    const limit = 1000;
    let chatObserver = null;
    let started = false;
    const sendNext = () => {
      if (busy || !queue.length) return;
      const input = document.getElementById("chat-input");
      const btn = document.getElementById("chat-send");
      if (!input || !btn) return;
      busy = true;
      let msg = queue.shift();
      if (msg.length > 250) msg = msg.slice(0, 247) + "...";
      input.value = msg;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      btn.click();
      setTimeout(() => {
        busy = false;
        sendNext();
      }, limit);
    };
    const init = async () => {
      if (started) return false;
      started = true;
      const target = await observe.wait("#chat-content");
      chatObserver = new MutationObserver((muts) => {
        for (const m of muts) {
          const nodes = [];
          if (m.target instanceof HTMLElement) nodes.push(m.target);
          for (const n of m.addedNodes)
            if (n instanceof HTMLElement) nodes.push(n);
          for (const n of nodes) {
            const b = n.querySelector?.("b");
            if (!b) {
              debug.log("skip: no <b>", n);
              continue;
            }
            const badgeEls = b.querySelectorAll(".user-badge-small");
            const spans = b.querySelectorAll("span");
            const bdis = b.querySelectorAll("bdi");
            const text = b.textContent.trim();
            const isWarning =
              b.classList.contains("warning") || text.startsWith("WARNING:");
            const hasColon = text.includes(":");
            const hasUser = !!b.querySelector("bdi");
            const isUser = !isWarning && hasColon && hasUser;
            const isSystem = !isUser;
            const base = {
              trusted: false,
              timestamp: Date.now(),
              raw: text,
              isUser,
              isSystem,
            };
            debug.log("parsed", { text, isUser, isSystem });
            if (isWarning) {
              debug.log("emit warning", base);
              events.emit("warning", base);
              continue;
            }
            if (
              isSystem &&
              spans[0]?.textContent === "SYSTEM" &&
              text.includes("New mission:")
            ) {
              const isOpen = text.includes("NOW");
              const name =
                text.split("New mission:")[1]?.split(".")[0]?.trim() || "";
              const location = text.match(/in (.*?) (NOW|in)/)?.[1] || "";
              debug.log("emit mission", { name, location, isOpen });
              events.emit("mission", { ...base, name, location, isOpen });
              continue;
            }
            if (
              isSystem &&
              (text.includes("was promoted to") ||
                text.includes("was demoted to"))
            ) {
              if (bdis.length >= 2 && spans.length >= 2) {
                debug.log("emit roleChange", {
                  targetUser: bdis[0].textContent,
                  byUser: bdis[1].textContent,
                });
                events.emit("roleChange", {
                  ...base,
                  targetUser: bdis[0].textContent,
                  byUser: bdis[1].textContent,
                  newRole: spans[0].textContent,
                  oldRole: spans[1].textContent,
                });
              }
              continue;
            }
            if (isUser) {
              const user = bdis[0]?.textContent || "unknown";
              const role = spans[0]?.textContent || "Guest";
              const badges = badgeEls.length
                ? [...badgeEls].map((b) => ({
                    img: b.querySelector("img")?.getAttribute("src") || null,
                    text:
                      b.querySelector(".tooltip")?.textContent.trim() || null,
                  }))
                : [];
              const message = text
                .split(":")
                .slice(1)
                .join(":")
                .trim()
                .toLowerCase();
              if (!message) {
                debug.log("skip empty message", text);
                continue;
              }
              debug.log("emit chat", { user, role, message });
              events.emit("chat", { ...base, user, role, message, badges });
              continue;
            }
            if (isSystem && text.includes("joined the ship.")) {
              const user = bdis[0]?.textContent || "unknown";
              debug.log("emit shipJoin", user);
              events.emit("shipJoin", { ...base, user });
              continue;
            }
            if (isSystem && text.includes("left the ship.")) {
              const user = bdis[0]?.textContent || "unknown";
              debug.log("emit shipLeave", user);
              events.emit("shipLeave", { ...base, user });
              continue;
            }
            debug.log("unhandled line", text);
          }
        }
      });
      chatObserver.observe(target, { childList: true, subtree: true });
      return true;
    };
    const destroy = () => {
      if (!started) return false;
      chatObserver?.disconnect();
      chatObserver = null;
      started = false;
      return true;
    };
    return {
      send(msg) {
        if (!msg) return false;
        queue.push(String(msg));
        sendNext();
        return true;
      },
      init,
      destroy,
    };
  })();

  const outfit = (() => {
    let wsReady = false;
    let wsSend = null;
    let wsMessageKey = null;
    let msgpackReady = false;
    let msgpackLoading = false;
    const isDocumentStart = () => document.readyState === "loading";
    const loadMsgpack = () => {
      if (window.msgpack) {
        msgpackReady = true;
        return;
      }
      if (msgpackLoading) return;
      msgpackLoading = true;
      const s = document.createElement("script");
      s.src =
        "https://cdn.jsdelivr.net/npm/@msgpack/msgpack/dist/msgpack.min.js";
      s.onload = () => {
        msgpackReady = true;
      };
      s.onerror = () => {
        msgpackLoading = false;
      };
      document.documentElement.appendChild(s);
    };
    const initWsHook = (messageKey) => {
      if (!isDocumentStart()) return;
      if (wsReady) return;
      if (typeof messageKey !== "string" || !messageKey) return;
      wsMessageKey = messageKey;
      loadMsgpack();
      const origPostMessage = window.postMessage;
      window.postMessage = function (data, origin, ...rest) {
        if (!wsReady && data?.message === wsMessageKey && data?.wsData) {
          wsSend = (d) =>
            origPostMessage.call(
              this,
              { message: wsMessageKey, wsData: d },
              origin,
            );
          wsReady = true;
        }
        return origPostMessage.call(this, data, origin, ...rest);
      };
    };
    const getSettings = () => {
      try {
        return JSON.parse(localStorage.getItem("dredark_user_settings")) || {};
      } catch {
        return {};
      }
    };
    const setOutfit = (isInGame) => {
      if (isInGame) {
        if (!wsReady || !msgpackReady) return;
        wsSend(
          window.msgpack.encode({
            type: 7,
            outfit: getSettings().player_appearance || {},
          }),
        );
        return;
      }
      const settings = getSettings();
      settings.player_appearance ||= {};
      localStorage.setItem("dredark_user_settings", JSON.stringify(settings));
    };
    return {
      initWsHook,
      setOutfit,
    };
  })();

  const Dreddark = {
    version,
    rankValue,
    debug,
    outfit,
    events,
    chat,
    ship,
    commands,
    observe,
    storage,
    utils,
    use(fn) {
      try {
        fn(Dreddark);
      } catch {}
    },
  };

  root.Dreddark = Dreddark;
})();