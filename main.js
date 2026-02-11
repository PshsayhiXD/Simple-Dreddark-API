// ==UserScript==
// @name         Simple Dreddark API v2
// @namespace    Simple-Dreddark-API
// @homepageURL  https://github.com/PshsayhiXD/Simple-Dreddark-API
// @downloadURL  https://raw.githubusercontent.com/PshsayhiXD/Simple-Dreddark-API/main/stable.min.user.js
// @updateURL    https://raw.githubusercontent.com/PshsayhiXD/Simple-Dreddark-API/main/stable.min.user.js
// @version      2.1.9
// @description  Developer API for drednot.io
// @author       Pshsayhi
// @match        https://drednot.io/*
// @match        https://test.drednot.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=drednot.io
// @grant        unsafeWindow
// ==/UserScript==

const root = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
const version = "2.1.9";
const deprecate = (r) => {
  console.warn(
    "%cDEPRECATED%c " + r,
    "background:#ff3b3b;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px",
    "color:inherit",
  );
};
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

  const createEventBus = () => {
    const map = {};
    return Object.freeze({
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
    });
  };
  const events = createEventBus();
  const observe = (() => {
    const wait = (sel, { timeout = 10000 } = {}) => {
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
    };

    return Object.freeze({
      wait,
    });
  })();
  const utils = (() => {
    const validateName = (name) => {
      if (name.length > 20) return "NAME_TOO_LONG";
      if (name.length < 3) return "NAME_TOO_SHORT";
      if (name.startsWith(" ")) return "STARTS_WITH_SPACE";
      if (name.endsWith(" ")) return "ENDS_WITH_SPACE";
      if (name.includes("  ")) return "DOUBLE_SPACE";
      if (/[^a-z0-9 ]/i.test(name)) return "INVALID_CHARACTER";
      return null;
    };

    const state = (initial = {}) => {
      const data = { ...initial };
      const watchers = new Map();
      const get = (key) => {
        return data[key];
      };
      const set = (key, value) => {
        const prev = data[key];
        if (Object.is(prev, value)) return;
        data[key] = value;
        const list = watchers.get(key);
        if (list) for (const fn of list) fn(value, prev);
      };
      const watch = (key, fn) => {
        if (!watchers.has(key)) watchers.set(key, new Set());
        watchers.get(key).add(fn);
        return () => watchers.get(key)?.delete(fn);
      };
      const snapshot = () => {
        return { ...data };
      };
      return Object.freeze({
        get,
        set,
        watch,
        snapshot,
      });
    };
    return Object.freeze({
      validateName,
      state,
    });
  })();
  const client = (() => {
    const accountInfo = async () => {
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
    };

    const getAccount = async (key) => {
      try {
        const info = await accountInfo();
        return info?.[key] ?? null;
      } catch {
        return null;
      }
    };

    const getClientUsername = async () => {
      return await getAccount("name");
    };

    const isClientRegistered = async () => {
      return (await getAccount("isRegistered")) === true;
    };

    return Object.freeze({
      accountInfo,
      getAccount,
      getClientUsername,
      isClientRegistered,
    });
  })();
  const ship = (() => {
    const teamManagerBtn = document.getElementById("team_manager_button");
    const teamMenu = document.getElementById("team_menu");
    const shipyard = document.querySelector(".shipyard-bin");
    const manager = document.getElementById("manager");
    const chatBox = document.getElementById("chat-box");
    const chatBtn = document.getElementById("chat-btn");
    const chatInp = document.getElementById("chat-input");
    const motdEditText = () => document.getElementById("motd-edit-text");
    const motdEditButton = () => document.getElementById("motd-edit-button");
    const promote = async (user, targetRank) => {
      if (!(targetRank in rankValue)) return false;
      const ctx = await getUserContext(user);
      if (!ctx) return false;
      if (ctx.currentRank >= targetRank) return false;
      applyRank(ctx.select, targetRank);
      return true;
    };

    const demote = async (user, targetRank) => {
      if (!(targetRank in rankValue)) return false;
      const ctx = await getUserContext(user);
      if (!ctx) return false;
      if (ctx.currentRank <= targetRank) return false;
      applyRank(ctx.select, targetRank);
      return true;
    };

    const isClientCap = () => manager?.getAttribute("style") == "";

    const getAllShipPlayer = () => {
      if (chatBox.classList.contains("closed")) chatBtn.click();
      chatInp.value = "/kick ";
      chatInp.dispatchEvent(new Event("input"));
      const players = [
        ...document.querySelectorAll("#chat-autocomplete p"),
      ].map((p) => p.textContent.replace(/\s+/g, ""));
      document.querySelector("#chat-close").click();
      const cl = client ? client.replace(/\s+/g, "") : "Unknown_Player";
      return players.length > 0 ? [...players, cl] : [cl];
    };

    const getUserContext = async (user) => {
      if (!teamManagerBtn || !teamMenu) return null;
      teamManagerBtn.click();
      teamMenu.classList.add("hidden");
      await observe.wait("#team_players_inner");
      const codes = document.querySelectorAll("#team_players_inner td > code");
      const code = [...codes].find((e) => e.textContent === user);
      const select = code?.closest("tr")?.querySelector("select");
      if (!select) return null;
      return {
        select,
        currentRank: Number(select.value),
      };
    };

    const applyRank = (select, rank) => {
      select.value = rank;
      select.dispatchEvent(new Event("change"));
      setTimeout(() => {
        if (!teamManagerBtn || !teamMenu) return;
        teamMenu.classList.remove("hidden");
        teamManagerBtn.click();
      }, 250);
    };

    const join = (id) => {
      const items = document.querySelectorAll(".shipyard-item .sy-id");
      const node = [...items].find((e) => e.textContent === `{${id}}`);
      const shipNode = node?.closest(".shipyard-item");
      if (!shipNode) return false;
      shipNode.click();
      return true;
    };

    const getShipFromLink = async (link) => {
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
    };

    const fetchShipList = async () => {
      try {
        const res = await fetch("https://drednot.io/shiplist?server=0", {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Cookie: `anon_key=fZEBE7fIFigqHKHPHiAzp0SW`,
            // dont log in or you'll get account theft ban
            // you have been warn
          },
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (!json.ships) return null;
        return json;
      } catch {
        return null;
      }
    };

    const parseShipData = (data) => {
      try {
        if (!data.ships) return [];
        return Object.entries(data.ships)
          .map(([, ship]) => ({
            id: ship.hex_code || "00000",
            title: ship.team_name || "Unknown",
            color: ship.color || "N/A",
            time: ship.time || 0,
            icon: ship.icon_path || "",
            player_count: ship.player_count || 0,
          }))
          .sort((a, b) => b.player_count - a.player_count);
      } catch (error) {
        console.error("Error processing ship data:", error.messasge);
        return [];
      }
    };

    const motdEdit = (newContent) => {
      motdEditButton().click();
      motdEditText().value = newContent;
      saveMotd(true); // saveMotd() is a vaild function in drednot.io
      return true;
    };

    const getCurrentJoinedShip = () =>
      storage.session.get("ship.current") || null;

    const initSaveJoinedShip = () => {
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
    };

    const clearCurrentShip = () => {
      storage.session.delete("ship.current");
    };

    return Object.freeze({
      promote,
      demote,
      isClientCap,
      getAllShipPlayer,
      getUserContext,
      applyRank,
      join,
      getShipFromLink,
      fetchShipList,
      parseShipData,
      motdEdit,
      getCurrentJoinedShip,
      initSaveJoinedShip,
      clearCurrentShip,
    });
  })();
  const storage = (() => {
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
    const defaultStorage = createStorage({
      ...storageOption,
    });
    return Object.freeze({
      storageOption,
      createStorage,
      defaultStorage,
    });
  })();
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
    return Object.freeze({
      register(name, handler) {
        map[name] = handler;
        return true;
      },
      setDefaultPrefix(p) {
        if (typeof p === "string" && p.length) defaultCommandPrefix = p;
        return p;
      },
      getDefaultPrefix() {
        return defaultCommandPrefix;
      },
    });
  })();
  const mission = (() => {
    const missionStartTs = 1756201238;
    const openDuration = 15 * 60;
    const closeDuration = 30 * 60;
    const cycle = openDuration + closeDuration;
    const state = {
      source: "timer",
      isOpen: false,
      name: null,
      location: null,
      openAt: null,
      closeAt: null,
      lastChatTs: 0,
    };
    const nowSec = () => Math.floor(Date.now() / 1000);
    const getTimerState = () => {
      const now = nowSec();
      if (now < missionStartTs) {
        return {
          isOpen: false,
          openAt: missionStartTs,
          closeAt: missionStartTs + openDuration,
        };
      }
      const elapsed = Math.max(0, (now - missionStartTs) % cycle);
      if (elapsed < openDuration) {
        return {
          isOpen: true,
          openAt: now - elapsed,
          closeAt: now + (openDuration - elapsed),
        };
      }
      const nextOpen = now + (cycle - elapsed);
      return {
        isOpen: false,
        openAt: nextOpen,
        closeAt: nextOpen + openDuration,
      };
    };
    const getFutureMissions = (showFuture) => {
      const now = nowSec();
      const cyclesPassed = Math.floor(
        Math.max(0, (now - missionStartTs) / cycle),
      );
      let t = missionStartTs + cyclesPassed * cycle;
      if (t <= now) t += cycle;
      const list = [];
      for (let i = 0; i < showFuture; i++) {
        const openAt = t + i * cycle;
        list.push(
          Object.freeze({
            openAt,
            closeAt: openAt + openDuration,
          }),
        );
      }
      return Object.freeze(list);
    };
    const getMissionState = () => {
      if (state.source === "chat") return Object.freeze({ ...state });
      const t = getTimerState();
      return Object.freeze({
        source: "timer",
        isOpen: t.isOpen,
        openAt: t.openAt,
        closeAt: t.closeAt,
        name: null,
        location: null,
      });
    };
    events.on("mission", (e) => {
      state.name = e.name || null;
      state.location = e.location || null;
      state.lastChatTs = Math.floor(e.timestamp / 1000);
    });
    return Object.freeze({
      getFutureMissions,
      getMissionState,
    });
  })();
  const pvpEvent = (() => {
    let schedule = "";
    const fetchSchedule = async () => {
      try {
        const response = await fetch("https://drednot.io/pvp-events", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok)
          throw new Error(
            "An network error occur while fetching pvpEvent Schedule.",
          );
        const body = await response.text();
        const scriptTag = body
          .match(/<script[^>]*>(.*?)<\/script>/g)
          .find((script) => script.includes("SCHEDULE="));
        schedule = JSON.parse(
          scriptTag
            .replace(/<script[^>]*>|<\/script>/g, "")
            .trim()
            .replace("SCHEDULE=", ""),
        );
      } catch {
        schedule = "";
      }
    };
    const pvpEvent = async (type) => {
      await fetchSchedule();
      if (typeof type === "object") type = JSON.stringify(type);
      else if (Array.isArray(type)) type = type.join(" ");
      if (typeof type === "string") type = type.toLowerCase();
      const now = new Date();
      const Week = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      if (type === "all") return schedule.map(({ date }) => ({ date }));
      if (type === "today") {
        const today = new Date().setHours(0, 0, 0, 0);
        const todayEvents = schedule.filter(({ date }) => {
          const eventDate = new Date(date).setHours(0, 0, 0, 0);
          return eventDate === today;
        });
        return todayEvents.length
          ? todayEvents.map(({ date }) => date)
          : Error("No events for today.");
      }
      if (["next", "second", "third", "four"].includes(type)) {
        const upcoming = schedule
          .filter(({ date }) => new Date(date) > now)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        const index =
          type === "next"
            ? 0
            : type === "second"
              ? 1
              : type === "third"
                ? 2
                : 3;
        return upcoming[index]
          ? upcoming[index].date
          : Error("No upcoming events.");
      }
      if (Week.includes(type)) {
        const dayEvents = schedule.filter(
          ({ date }) => new Date(date).getDay() === Week.indexOf(type),
        );
        return dayEvents.length
          ? dayEvents.map(({ date }) => date)
          : Error(`No events found for ${type}`);
      }
      const dayEvents = schedule.filter(({ date }) => date === type);
      dayEvents.length
        ? dayEvents.map(({ date }) => date)
        : Error(`No events found for ${type}`);
    };
    return Object.freeze({
      fetchSchedule,
      pvpEvent,
    });
  })();
  const chat = (() => {
    // for chat
    const queue = [];
    let busy = false;
    const delay = 1000;
    // for observer
    let chatObserver = null;
    let started = false;
    const chatBox = document.getElementById("chat");
    const chatSendBtn = document.getElementById("chat-send");
    const chatInput = document.getElementById("chat-input");

    const openChat = () => {
      if (chatBox?.classList.contains("closed")) chatSendBtn?.click();
    };
    const sendNext = () => {
      if (busy || !queue.length) return;
      openChat();
      requestAnimationFrame(() => {
        if (!chatInput || !chatSendBtn) return;
        busy = true;
        const max = chatInput.maxLength > 0 ? chatInput.maxLength - 3 : 247;
        let msg = String(queue.shift());
        if (msg.length > max) msg = msg.slice(0, max) + "...";
        chatInput.focus();
        chatInput.value = msg;
        chatInput.dispatchEvent(new Event("input", { bubbles: true }));
        chatSendBtn.click();
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
            const badges = badgeEls.length
              ? [...badgeEls].map((b) => ({
                  img: b.querySelector("img")?.getAttribute("src") || null,
                  text: b.querySelector(".tooltip")?.textContent.trim() || null,
                }))
              : [];
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
              events.emit("shipJoin", { ...base, user, role, badges });
              continue;
            }
            if (isSystem && rawText.includes("left the ship.")) {
              const user = bdis[0]?.textContent || "unknown";
              debug.log("emit shipLeave", user);
              events.emit("shipLeave", { ...base, user, role, badges });
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
    const waitForChat = (user, text, opts = {}) => {
      if (typeof opts.onMatch !== "function")
        throw new Error("waitForChat: onMatch callback is required");
      const recallable = !!opts.recallable;
      const timeoutSec = opts.timeout ?? 15;
      const onMatch = opts.onMatch;
      const onFallback =
        typeof opts.onFallback === "function" ? opts.onFallback : null;
      const isWildcardUser = user === "*";
      const isWildcardText = text === "*";
      const isFn = typeof text === "function";
      let done = false;
      let matchedOnce = false;
      let timer = null;
      let resolveFn;
      let rejectFn;
      const match = async (p) => {
        if (!isWildcardUser && p.user !== user) return false;
        if (isWildcardText) return true;
        if (isFn) return !!(await text(p.message, p));
        return p.message === text;
      };
      const handler = async (p) => {
        if (done) return;
        if (!(await match(p))) return;
        matchedOnce = true;
        onMatch(p);
        if (!recallable) {
          done = true;
          cleanup();
          resolveFn?.(p);
        }
      };
      const cleanup = () => {
        events.off("chat", handler);
        if (timer) clearTimeout(timer);
      };
      if (timeoutSec !== Infinity)
        timer = setTimeout(() => {
          done = true;
          cleanup();
          if (!matchedOnce) onFallback?.();
          rejectFn?.(new Error("waitForChat timeout"));
        }, timeoutSec * 1000);
      if (recallable) {
        events.on("chat", handler);
        return cleanup;
      }
      return new Promise((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
        events.on("chat", handler);
      });
    };
    return Object.freeze({
      send(msg) {
        if (!msg) return false;
        queue.push(String(msg));
        sendNext();
        return true;
      },
      waitForChat,
      init,
      destroy,
    });
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
    return Object.freeze({
      initWsHook,
      setOutfit,
    });
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
    mission,
    pvpEvent,
    observe,
    defaultStorageOption: storage.storageOption,
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