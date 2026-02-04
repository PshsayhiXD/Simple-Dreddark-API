// ==UserScript==
// @name         Simple Dreddark API v2
// @namespace    http://tampermonkey.net/
// @version      2.1.6
// @description  Developer API for drednot.io
// @author       Pshsayhi
// @match        https://drednot.io/*
// @match        https://test.drednot.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=drednot.io
// @grant        unsafeWindow
// ==/UserScript==

const root = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
const version = "2.1.6";
const deprecate=(r)=>{console.warn("%cDEPRECATED%c "+r,"background:#ff3b3b;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px","color:inherit")};
(() => {
  "use strict";
  // ====>====>====>====>====> CONFIG <====<====<====<====<====
  let defaultCommandPrefix = "?";

  const debug = {
    enabled: false,
    log(...args) {
      if (!this.enabled) return;
      console.log("[Dreddark]", ...args);
    },
  };
  const rankValue = {
    0: "guest",
    1: "crew",
    3: "captain",
    guest: 0,
    crew: 1,
    captain: 3,
  };

  const storageOption = {
    defaultDatabase: "localstorage",
    namespace: "DreddarkAPI",
    readonly: false,
    onError(e) {},
    localstorage: {
      key: "persist",
    },
    sessionstorage: {
      key: "session",
    },
    memory: {},
    cookie: {
      key: "cookie",
      path: "/",
      maxAge: 31536000,
      sameSite: "Lax",
      secure: false,
    },
    url: {
      key: null,
      action: "query",
      replaceState: true,
    },
    indexeddb: {
      name: "DreddarkAPI",
      store: "kv",
    },
    broadcast: {
      channel: "DreddarkAPI",
    },
  };

  const createStorage = (opt) => {
    if (!opt) opt = storageOption;
    if (typeof opt !== "object") return;
    const ns = opt.namespace || storageOption.namespace;
    const getPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
    const setPath = (o, p, v) => {
      const k = p.split(".");
      let c = o;
      for (let i = 0; i < k.length - 1; i++) c = c[k[i]] ||= {};
      c[k.at(-1)] = v;
    };
    const delPath = (o, p) => {
      const k = p.split(".");
      let c = o;
      for (let i = 0; i < k.length - 1; i++) {
        if (!c[k[i]]) return;
        c = c[k[i]];
      }
      delete c[k.at(-1)];
    };
    const wrapTree = (s) => ({
      get(p) {
        const d = s.get("__root__") || {};
        const base = ns ? d[ns] || {} : d;
        return getPath(base, p);
      },
      set(p, v) {
        const d = s.get("__root__") || {};
        const base = ns ? (d[ns] ||= {}) : d;
        setPath(base, p, v);
        s.set("__root__", d);
      },
      del(p) {
        const d = s.get("__root__") || {};
        const base = ns ? d[ns] || {} : d;
        delPath(base, p);
        s.set("__root__", d);
      },
    });
    if (
      opt.defaultDatabase === "localstorage" ||
      opt.defaultDatabase === "sessionstorage"
    ) {
      const isSession = opt.defaultDatabase === "sessionstorage";
      const store = isSession ? sessionStorage : localStorage;
      const key = opt[opt.defaultDatabase].key;
      return wrapTree({
        get(k) {
          try {
            return JSON.parse(store.getItem(key))?.[k];
          } catch {
            return undefined;
          }
        },
        set(k, v) {
          try {
            const d = JSON.parse(store.getItem(key)) || {};
            d[k] = v;
            store.setItem(key, JSON.stringify(d));
          } catch {}
        },
        del(k) {
          try {
            const d = JSON.parse(store.getItem(key)) || {};
            delete d[k];
            store.setItem(key, JSON.stringify(d));
          } catch {}
        },
      });
    }
    if (opt.defaultDatabase === "memory") {
      const mem = {};
      return wrapTree({
        get(k) {
          return mem[k];
        },
        set(k, v) {
          mem[k] = v;
        },
        del(k) {
          delete mem[k];
        },
      });
    }
    if (opt.defaultDatabase === "cookie") {
      const o = opt.cookie;
      return wrapTree({
        get(k) {
          return document.cookie
            .split("; ")
            .find((v) => v.startsWith(`${k}=`))
            ?.split("=")[1];
        },
        set(k, v) {
          document.cookie = `${k}=${v}; path=${o.path}; max-age=${o.maxAge}`;
        },
        del(k) {
          document.cookie = `${k}=; path=${o.path}; max-age=0`;
        },
      });
    }
    if (opt.defaultDatabase === "url") {
      const o = opt.url;
      return wrapTree({
        get(k) {
          const u = new URL(location.href);
          const kk = k ?? o.key;
          if (o.action === "query") return u.searchParams.get(kk);
          if (o.action === "hash")
            return new URLSearchParams(u.hash.slice(1)).get(kk);
          if (o.action === "path") return u.pathname.split("/").pop();
        },
        set(k, v) {
          const u = new URL(location.href);
          const kk = k ?? o.key;
          if (o.action === "query") u.searchParams.set(kk, v);
          if (o.action === "hash") {
            const p = new URLSearchParams(u.hash.slice(1));
            p.set(kk, v);
            u.hash = p.toString();
          }
          if (o.action === "path")
            u.pathname = `${u.pathname.replace(/\/[^/]*$/, "")}/${v}`;
          history.replaceState(null, "", u.toString());
        },
        del(k) {
          const u = new URL(location.href);
          const kk = k ?? o.key;
          if (o.action === "query") u.searchParams.delete(kk);
          if (o.action === "hash") {
            const p = new URLSearchParams(u.hash.slice(1));
            p.delete(kk);
            u.hash = p.toString();
          }
          if (o.action === "path")
            u.pathname = u.pathname.replace(/\/[^/]*$/, "");
          history.replaceState(null, "", u.toString());
        },
      });
    }
    if (opt.defaultDatabase === "indexeddb") {
      const o = opt.indexeddb;
      let dbp;
      const open = () =>
        (dbp ||= new Promise((r, j) => {
          const q = indexedDB.open(o.name, 1);
          q.onupgradeneeded = () => q.result.createObjectStore(o.store);
          q.onsuccess = () => r(q.result);
          q.onerror = () => j(q.error);
        }));
      const tx = async (m, k, v) => {
        const db = await open();
        return new Promise((r, j) => {
          const t = db.transaction(o.store, m).objectStore(o.store)[m](v, k);
          t.onsuccess = () => r(t.result);
          t.onerror = () => j(t.error);
        });
      };
      return wrapTree({
        async get(k) {
          return tx("get", k);
        },
        async set(k, v) {
          await tx("put", k, v);
        },
        async del(k) {
          await tx("delete", k);
        },
      });
    }
    if (opt.defaultDatabase === "broadcast") {
      const c = new BroadcastChannel(opt.broadcast.channel);
      const mem = {};
      c.onmessage = (e) => Object.assign(mem, e.data);
      return wrapTree({
        get(k) {
          return mem[k];
        },
        set(k, v) {
          mem[k] = v;
          c.postMessage({ [k]: v });
        },
        del(k) {
          delete mem[k];
          c.postMessage({ [k]: undefined });
        },
      });
    }
    throw new Error("Invalid defaultDatabase");
  };

  const storage = createStorage({
    ...storageOption,
  });

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
    promote(user, targetRank) {
      if (!(targetRank in rankValue)) return false;
      const ctx = ship.getUserContext(user);
      if (!ctx) return false;
      if (ctx.currentRank >= targetRank) return false;
      ship.applyRank(ctx.select, targetRank);
      return true;
    },

    demote(user, targetRank) {
      if (!(targetRank in rankValue)) return false;
      const ctx = ship.getUserContext(user);
      if (!ctx) return false;
      if (ctx.currentRank <= targetRank) return false;
      ship.applyRank(ctx.select, targetRank);
      return true;
    },

    getUserContext(user) {
      const btn = document.getElementById("team_manager_button");
      const menu = document.getElementById("team_menu");
      if (!btn || !menu) return null;
      btn.click();
      menu.classList.add("hidden");
      return observe.wait("#team_players_inner").then(() => {
        const codes = document.querySelectorAll(
          "#team_players_inner td > code",
        );
        const code = [...codes].find((e) => e.textContent === user);
        const select = code?.closest("tr")?.querySelector("select");
        if (!select) return null;
        return {
          select,
          currentRank: Number(select.value),
        };
      });
    },

    applyRank(select, rank) {
      select.value = rank;
      select.dispatchEvent(new Event("change"));
      setTimeout(() => {
        const btn = document.getElementById("team_manager_button");
        const menu = document.getElementById("team_menu");
        if (!btn || !menu) return;
        menu.classList.remove("hidden");
        btn.click();
      }, 250);
    },

    join(id) {
      const items = document.querySelectorAll(".shipyard-item .sy-id");
      const node = [...items].find((e) => e.textContent === `{${id}}`);
      const shipNode = node?.closest(".shipyard-item");
      if (!shipNode) return false;
      shipNode.click();
      return true;
    },

    async getShipFromLink(link) {
      try {
        const res = await fetch(link, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Cookie: `anon_key=fZEBE7fIFigqHKHPHiAzp0SW`,
            // dont log in or you'll get account theft ban
            // you have been warn
          },
        });
        if (!res.ok) return {};
        const html = await res.text();
        const ogTitleMatch = html.match(
          /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
        );
        const ogImageMatch = html.match(
          /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
        );
        const ogTitle = ogTitleMatch ? ogTitleMatch[1] : "";
        const ogImage = ogImageMatch ? ogImageMatch[1] : null;
        const shipName = ogTitle
          .replace(/^(Invite:|Ship:)\s*/i, "")
          .replace(/\s*[-|]\s*drednot\.io$/i, "")
          .trim();
        if (!shipName || shipName === "Deep Space Airships") return {};
        return {
          valid: true,
          shipName,
          shipImage: ogImage,
        };
      } catch {
        return {};
      }
    },

    getCurrentJoinedShip() {
      return storage.session.get("ship.current") || null;
    },
    initSaveJoinedShip() {
      const shipyard = document.querySelector(".shipyard-bin");
      if (!shipyard) return false;
      shipyard.addEventListener("click", (e) => {
        const shipNode = e.target.closest(".shipyard-item");
        if (!shipNode) return;
        const idNode = shipNode.querySelector(".sy-id");
        if (!idNode) return;
        const id = idNode.textContent.replace(/[{}]/g, "");
        const title = shipNode.querySelector(".sy-title h3")?.textContent || "";
        const crew =
          Number(
            shipNode.querySelector(".sy-crew")?.textContent.replace(/\D+/g, ""),
          ) || 0;
        const style = getComputedStyle(shipNode);
        storage.session.set("ship.current", {
          id,
          title,
          crew,
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          joinedAt: Date.now(),
          node: shipNode,
        });
      });
      return true;
    },
    clearCurrentShip() {
      storage.session.delete("ship.current");
    },
  };

  const utils = {
    validateName(name) {
      if (name.length > 20) return "NAME_TOO_LONG";
      if (name.length < 3) return "NAME_TOO_SHORT";
      if (name.startsWith(" ")) return "STARTS_WITH_SPACE";
      if (name.endsWith(" ")) return "ENDS_WITH_SPACE";
      if (name.includes("  ")) return "DOUBLE_SPACE";
      if (/[^a-z0-9 ]/i.test(name)) return "INVALID_CHARACTER";
      return null;
    },
  };

  const client = {
    async accountInfo() {
      let info = null;
      try {
        const res = await fetch("https://drednot.io/account/status");
        const json = await res.json();
        if (json?.account) {
          info = {
            name: json.account.name ?? null,
            isRegistered: json.account.is_registered === true,
          };
        } else {
          info = {
            name: null,
            isRegistered: false,
          };
        }
      } catch {}
      return info;
    },
    async getAccount(key) {
      try {
        const info = await this.accountInfo();
        return info?.[key] ?? null;
      } catch {
        return null;
      }
    },
    async getClientUsername() {
      return await this.getAccount("name");
    },
    async isClientRegistered() {
      return (await this.getAccount("isRegistered")) === true;
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
        c.run(e, args, user);
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
        return true;
      },
      setDefaultPrefix(p) {
        if (typeof p === "string" && p.length) defaultCommandPrefix = p;
        return p;
      },
    };
  })();
  const chat = (() => {
    // for chat
    const queue = [];
    let busy = false;
    const delay = 1000;
    // for observer
    let chatObserver = null;
    let started = false;
    const openChat = () => {
      const chatBox = document.getElementById("chat");
      const sendBtn = document.getElementById("chat-send");
      if (chatBox?.classList.contains("closed")) sendBtn?.click();
    };
    const sendNext = () => {
      if (busy || !queue.length) return;
      openChat();
      requestAnimationFrame(() => {
        const input = document.getElementById("chat-input");
        const btn = document.getElementById("chat-send");
        if (!input || !btn) return;
        busy = true;
        const max = input.maxLength > 0 ? input.maxLength - 3 : 247;
        let msg = String(queue.shift());
        if (msg.length > max) msg = msg.slice(0, max) + "...";
        input.focus();
        input.value = msg;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        btn.click();
        setTimeout(() => {
          busy = false;
          sendNext();
        }, delay);
      });
    };
    const init = async () => {
      const clientName = await client.getClientUsername();
      if (started) return false;
      started = true;
      const target = await observe.wait("#chat-content");
      chatObserver = new MutationObserver(async (muts) => {
        for (const m of muts) {
          for (const p of m.addedNodes) {
            if (!(p instanceof HTMLElement)) continue;
            const b = p.querySelector("b");
            if (!b) {
              debug.log("skip: no <b>", p);
              continue;
            }
            const badgeEls = b.querySelectorAll(".user-badge-small");
            const bdis = b.querySelectorAll("bdi");
            const roleSpan = b.querySelector("span");
            const rawText = b.textContent.replace(/\s+/g, " ").trim();
            const userMessage = [...p.childNodes]
              .filter((n) => n.nodeType === Node.TEXT_NODE)
              .map((n) => n.textContent)
              .join("")
              .trim();
            const isWarning =
              b.classList.contains("warning") || rawText.startsWith("WARNING:");
            const hasUser = !!bdis[0];
            const hasColon = rawText.includes(":");
            const isUser = hasUser && hasColon && !isWarning;
            const isSystem = !isUser && !isWarning;
            const user = isUser ? bdis[0]?.textContent || "unknown" : null;
            const role = isUser ? roleSpan?.textContent || "Guest" : null;
            const base = {
              trusted: false,
              timestamp: Date.now(),
              raw: rawText,
              isUser,
              isSystem,
            };
            debug.log("parsed", { userMessage, rawText, isUser, isSystem });
            if (isWarning) {
              debug.log("emit warning", base);
              events.emit("warning", base);
              continue;
            }
            if (
              isSystem &&
              roleSpan?.textContent === "SYSTEM" &&
              rawText.includes("New mission:")
            ) {
              const isOpen = rawText.includes("NOW");
              const name =
                rawText.split("New mission:")[1]?.split(".")[0]?.trim() || "";
              const location = rawText.match(/in (.*?) (NOW|in)/)?.[1] || "";
              debug.log("emit mission", { name, location, isOpen });
              events.emit("mission", { ...base, name, location, isOpen });
              continue;
            }
            if (
              isSystem &&
              (rawText.includes("was promoted to") ||
                rawText.includes("was demoted to"))
            ) {
              if (bdis.length >= 2) {
                debug.log("emit roleChange", {
                  targetUser: bdis[0].textContent,
                  byUser: bdis[1].textContent,
                });
                events.emit("roleChange", {
                  ...base,
                  targetUser: bdis[0].textContent,
                  byUser: bdis[1].textContent,
                  newRole: roleSpan?.textContent || null,
                });
              }
              continue;
            }
            if (isUser) {
              if (user === clientName)
                await new Promise((r) => setTimeout(r, 1000));
              const badges = badgeEls.length
                ? [...badgeEls].map((b) => ({
                    img: b.querySelector("img")?.getAttribute("src") || null,
                    text:
                      b.querySelector(".tooltip")?.textContent.trim() || null,
                  }))
                : [];
              const message = userMessage;
              if (!message) {
                debug.log("skip empty message", rawText);
                continue;
              }
              debug.log("emit chat", { user, role, message });
              events.emit("chat", { ...base, user, role, message, badges });
              continue;
            }
            if (isSystem && rawText.includes("joined the ship.")) {
              const user = bdis[0]?.textContent || "unknown";
              debug.log("emit shipJoin", user);
              events.emit("shipJoin", { ...base, user });
              continue;
            }
            if (isSystem && rawText.includes("left the ship.")) {
              const user = bdis[0]?.textContent || "unknown";
              debug.log("emit shipLeave", user);
              events.emit("shipLeave", { ...base, user });
              continue;
            }
            debug.log("unhandled line", rawText);
          }
        }
      });
      chatObserver.observe(target, { childList: true });
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
    deprecate("Outfit API is no longer work. please stop using it");
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
      deprecate("Outfit API is no longer work. please stop using it");
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
      console.log(true);
    };
    const getSettings = () => {
      try {
        return JSON.parse(localStorage.getItem("dredark_user_settings")) || {};
      } catch {
        return {};
      }
    };
    const setOutfit = (isInGame, outfit) => {
      deprecate("Outfit API is no longer work. please stop using it");
      if (!outfit || typeof outfit !== "object") return;
      if (isInGame) {
        if (!wsReady || !msgpackReady) return;
        wsSend(
          window.msgpack.encode({
            type: 7,
            outfit,
          }),
        );
        return true;
      }
      const settings = getSettings();
      settings.player_appearance = outfit;
      localStorage.setItem("dredark_user_settings", JSON.stringify(settings));
      return true;
    };
    return {
      initWsHook,
      setOutfit,
    };
  })();

  const Dreddark = {
    defaultCommandPrefix,
    version,
    rankValue,
    debug,
    outfit,
    events,
    chat,
    ship,
    commands,
    observe,
    createStorage,
    defaultStorageOption: storageOption,
    storage,
    utils,
    use(fn) {
      try {
        fn(Dreddark);
      } catch {}
    },
    client,
  };

  root.Dreddark = Dreddark;
})();