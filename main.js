// ==UserScript==
// @name         Simple Dreddark API v2
// @namespace    http://tampermonkey.net/
// @version      2.0.1
// @description  Developer API for drednot.io
// @author       Pshsayhi
// @match        https://drednot.io/*
// @match        https://test.drednot.io/*
// @grant        unsafeWindow
// ==/UserScript==

/*
README — Simple Dreddark API v2

Overview
--------
This script exposes a small, client-side developer API for drednot.io.
It does NOT add gameplay features by itself.

All events are inferred from DOM/chat parsing and are NOT server-trusted.

You must explicitly initialize the API.

Initialization
--------------
Dreddark.init();

Optional cleanup:
Dreddark.destroy();

Global
------
window.Dreddark

API Surface
-----------
Dreddark.version        -> API version string
Dreddark.init()         -> Start observers and event parsing
Dreddark.destroy()      -> Stop observers
Dreddark.events         -> Event
Dreddark.chat           -> Chat helpers
Dreddark.ship           -> Ship / role helpers
Dreddark.commands       -> Command router
Dreddark.utils          -> Utility functions
Dreddark.use(fn)        -> Plugin hook

Events
------
Register listeners:

Dreddark.events.on("chat", handler);

Supported event types:
- "chat"
- "shipJoin"
- "shipLeave"
- "roleChange"
- "mission"
- "warning"

Chat Event Payload Example:
{
  user: "Player",
  role: "Crew",
  message: "hello",
  trusted: false,
  timestamp: 1710000000000,
  raw: "Crew Player: hello"
}

Example:
Dreddark.events.on("chat", e => {
  if (e.message === "hi")
    Dreddark.chat.send("hello");
});

Commands
--------
Register chat commands:

Dreddark.commands.register("?ping", {
  run(e, args) {
    Dreddark.chat.send("pong");
  }
});

Chat
----
Send chat messages:

Dreddark.chat.send("Hello world");


Ship / Roles
------------
Promote or demote users via UI interaction:

Dreddark.ship.promote("username", 1);

Example:
Dreddark.commands.register("?crew", {
  run(e, args) {
    Dreddark.ship.promote(e.user, 1);
  }
});


Utils
-----
Validate player names:
const err = Dreddark.utils.validateName("My Name");
if (err) Dreddark.chat.send(err);


Plugins
-------
Extend the API without forking:

Dreddark.use(api => {
  api.events.on("mission", e => {
    api.chat.send("New mission detected");
  });
});
*/

const root = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

(() => {
  "use strict";

  const version = "2.0.0";
  let started = false;
  let chatObserver = null;

  const rankValue = {
    0: "guest",
    1: "crew",
    3: "captain"
  };
  const createEventBus = () => {
    const map = {};
    return {
      on(type, fn) {
        (map[type] ||= []).push(fn);
      },
      emit(type, payload) {
        (map[type] || []).forEach(fn => {
          try { fn(payload); } catch {}
        });
      }
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
    }
  };

  const chat = (() => {
    const queue = [];
    let busy = false;
    const limit = 1000;
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
    return {
      send(msg) {
        if (!msg) return false;
        queue.push(String(msg));
        sendNext();
        return true;
      }
    };
  })();
  const ship = {
    promote(user, rank) {
      if (!(rank in rankValue)) return false;
      const btn = document.getElementById("team_manager_button");
      const menu = document.getElementById("team_menu");
      if (!btn || !menu) return false;
      btn.click();
      menu.classList.add("hidden");
      observe.wait("#team_players_inner").then(() => {
        const codes = document.querySelectorAll("#team_players_inner td > code");
        const code = [...codes].find(e => e.textContent === user);
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
    }
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
    }
  };

  const commands = (() => {
    const map = {};
    events.on("chat", e => {
      if (!e.message.startsWith("?")) return;
      const [cmd, ...args] = e.message.split(/\s+/);
      const h = map[cmd];
      if (!h) return;
      h.run(e, args);
    });
    return {
      register(cmd, handler) {
        map[cmd] = handler;
      }
    };
  })();

  const createChatObserver = target =>
    new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        const b = n.querySelector("b");
        if (!b) continue;
        const badgeEls = b.querySelectorAll(".user-badge-small");
        const text = b.textContent.trim();
        const spans = b.querySelectorAll("span");
        const bdis = b.querySelectorAll("bdi");

        const base = {
          trusted: false,
          timestamp: Date.now(),
          raw: text
        };

        if (b.classList.contains("warning")) {
          events.emit("warning", base);
          continue;
        }

        if (spans[0]?.textContent === "SYSTEM" && text.includes("New mission:")) {
          const isOpen = text.includes("NOW");
          const name = text.split("New mission:")[1]?.split(".")[0]?.trim() || "";
          const location = text.match(/in (.*?) (NOW|in)/)?.[1] || "";
          events.emit("mission", { ...base, name, location, isOpen });
          continue;
        }

        if (text.includes("was promoted to") || text.includes("was demoted to")) {
          if (bdis.length >= 2 && spans.length >= 2) {
            events.emit("roleChange", {
              ...base,
              targetUser: bdis[0].textContent,
              byUser: bdis[1].textContent,
              newRole: spans[0].textContent,
              oldRole: spans[1].textContent
            });
          }
          continue;
        }

        if (text.includes(":")) {
          const user = bdis[0]?.textContent || "unknown";
          const role = spans[0]?.textContent || "Guest";
          const badges = badgeEls.length ? [...badgeEls].map(b => ({
            img: b.querySelector("img")?.getAttribute("src") || null,
            text: b.querySelector(".tooltip")?.textContent.trim() || null
          })) : [];
          const msg = text.split(":").slice(1).join(":").trim().toLowerCase();
          if (!msg) continue;
          events.emit("chat", { ...base, user, role, message: msg, badges });
        }
        else {
            if (text.endsWith("joined the ship.")) {
            events.emit("shipJoin", base);
            continue;
          }
          if (text.endsWith("left the ship.")) {
            events.emit("shipLeave", base);
            continue;
          }
        }
      }
    });

  const init = async () => {
    if (started) return false;
    started = true;
    const target = await observe.wait("#chat-content");
    chatObserver = createChatObserver(target);
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

  const Dreddark = {
    version,
    init,
    destroy,
    events,
    chat,
    ship,
    commands,
    observe,
    utils,
    use(fn) {
      try { fn(Dreddark); } catch {}
    }
  };

  root.Dreddark = Dreddark;
})();