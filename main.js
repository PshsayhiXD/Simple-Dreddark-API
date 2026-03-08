// ==UserScript==
// @name         Simple Dreddark API v2
// @namespace    Simple-Dreddark-API
// @homepageURL  https://github.com/PshsayhiXD/Simple-Dreddark-API
// @version      2.1.9
// @description  Developer API for drednot.io
// @author       Pshsayhi
// @match        https://drednot.io/*
// @match        https://test.drednot.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=drednot.io
// @grant        unsafeWindow
// ==/UserScript==

const root = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
const version = "2.2.0";
(() => {
  "use strict";
  // ====>====>====>====>====> CONFIG <====<====<====<====<====
  let defaultCommandPrefix = "?";

  const debug = {
    enabled: true,
    showMeta: false,
    useGroups: true,
    _badgeStyle() {
      return [
        "background:#1a73e8",
        "color:#fff",
        "font-weight:700",
        "padding:2px 10px",
        "border-radius:999px",
        "font-size:11px",
        "font-family:Roboto,Arial,sans-serif",
        "letter-spacing:.4px",
        "display:inline-block"
      ].join(";");
    },
    _moduleStyle(level) {
      const bg = level === "LOG" ? "#e8f0fe" : level === "WARN" ? "#fef7e0" : "#fce8e6";
      const fg = level === "LOG" ? "#1967d2" : level === "WARN" ? "#b06000" : "#c5221f";
      return [
        "background:" + bg,
        "color:" + fg,
        "padding:2px 9px",
        "border-radius:999px",
        "font-size:11px",
        "font-family:Roboto,Arial,sans-serif",
        "font-weight:600",
        "letter-spacing:.2px",
        "margin-left:4px",
        "display:inline-block"
      ].join(";");
    },
    _metaStyle() {
      return [
        "background:#f1f3f4",
        "color:#5f6368",
        "padding:2px 8px",
        "border-radius:999px",
        "font-size:10px",
        "font-family:Roboto Mono,monospace",
        "margin-left:6px",
        "display:inline-block"
      ].join(";");
    },
    _getSourceFromStack() {
      const err = new Error();
      const stack = err.stack || "";
      const lines = stack.split("\n").map(l => l.trim());
      for (const l of lines) {
        if (l.includes("debug.") || l.includes("_getSourceFromStack")) continue;
        const m = l.match(/(?:https?:\/\/.*?\/)?([^\/\s]+?\.\w+):(\d+):\d+/);
        if (m) return `${m[1]}:${m[2]}`;
        const m2 = l.match(/at\s+(\/.*?\.\w+):(\d+):\d+/);
        if (m2) return `${m2[1].split("/").pop()}:${m2[2]}`;
      }
      return null;
    },
    _print(level, moduleName, args, forcedSource = null) {
      if (!this.enabled) return;
      const name = moduleName ? moduleName.trim() : null;
      const badgeCss = this._badgeStyle();
      const moduleCss = name ? this._moduleStyle(level) : null;
      const metaCss = this._metaStyle();
      const source = forcedSource || this._getSourceFromStack() || "console";
      const time = new Date().toISOString();
      const parts = ["%c DREDDARK"];
      const styles = [badgeCss];
      if (name) { parts.push("%c " + name); styles.push(moduleCss); }
      if (this.showMeta) { parts.push("%c " + source); parts.push("%c " + time); styles.push(metaCss, metaCss); }
      const fmt = parts.join(" ");
      const fn = level === "WARN" ? root.console.warn : level === "ERR" ? root.console.error : root.console.log;
      fn(fmt, ...styles, ...args);
    },
    group(moduleName, label) {
      if (!this.enabled) return;
      const name = typeof moduleName === "string" ? moduleName.trim() : null;
      const text = name ? label : moduleName;
      const badgeCss = this._badgeStyle();
      const fmt = name
        ? "%c DREDDARK %c " + name + " %c " + text
        : "%c DREDDARK %c " + text;
      const styles = name
        ? [badgeCss, this._moduleStyle("LOG"), this._metaStyle()]
        : [badgeCss, this._metaStyle()];
      this.useGroups ? root.console.group(fmt, ...styles) : root.console.log(fmt, ...styles);
    },
    groupCollapsed(moduleName, label) {
      if (!this.enabled) return;
      const name = typeof moduleName === "string" ? moduleName.trim() : null;
      const text = name ? label : moduleName;
      const badgeCss = this._badgeStyle();
      const fmt = name
        ? "%c DREDDARK %c " + name + " %c " + text
        : "%c DREDDARK %c " + text;
      const styles = name
        ? [badgeCss, this._moduleStyle("LOG"), this._metaStyle()]
        : [badgeCss, this._metaStyle()];
      this.useGroups ? root.console.groupCollapsed(fmt, ...styles) : root.console.log(fmt, ...styles);
    },
    groupEnd() { if (!this.enabled) return; if (this.useGroups) root.console.groupEnd(); },
    log(moduleName, ...rest)   { if (typeof moduleName !== "string") return this._print("LOG",  null, [moduleName, ...rest]); this._print("LOG",  moduleName.trim(), rest); },
    warn(moduleName, ...rest)  { if (typeof moduleName !== "string") return this._print("WARN", null, [moduleName, ...rest]); this._print("WARN", moduleName.trim(), rest); },
    error(moduleName, ...rest) { if (typeof moduleName !== "string") return this._print("ERR",  null, [moduleName, ...rest]); this._print("ERR",  moduleName.trim(), rest); },
    force(level, moduleName, ...rest) {
      const prev = this.enabled; this.enabled = true;
      this._print(
        level,
        typeof moduleName === "string" ? moduleName.trim() : null,
        typeof moduleName === "string" ? rest : [moduleName, ...rest]
        );
      this.enabled = prev;
    },
    forceLog(moduleName, ...rest)   { this.force("LOG",  moduleName, ...rest); },
    forceWarn(moduleName, ...rest)  { this.force("WARN", moduleName, ...rest); },
    forceError(moduleName, ...rest) { this.force("ERR",  moduleName, ...rest); },
    forceGroup(moduleName, label) {
      const prev = this.enabled; this.enabled = true;
      try { this.group(moduleName, label); } finally { this.enabled = prev; }
    },
    forceGroupCollapsed(moduleName, label) {
      const prev = this.enabled; this.enabled = true;
      try { this.groupCollapsed(moduleName, label); } finally { this.enabled = prev; }
    },
    forceGroupEnd() {
      const prev = this.enabled; this.enabled = true;
      try { this.groupEnd(); } finally { this.enabled = prev; }
    },
    module(name) {
      const n = name.trim();
      return {
        log:   (...a) => this.log(n, ...a),
        warn:  (...a) => this.warn(n, ...a),
        error: (...a) => this.error(n, ...a)
      };
    },
    banner(title = "DREDDARK INITIALIZED") {
      if (!this.enabled) return;
      root.console.log("%c " + title + " ", this._badgeStyle());
    }
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
          } catch (e) { debug.error("event", "event handler error", e); }
        });
      },
    });
  };
  const events = createEventBus();
  const dom = (() => {
    const wait = (sel, {
      timeout = 10000
    } = {}) => {
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
          reject(new Error(`wait timeout: ${sel}`));
        }, timeout);
        obs.observe(document, {
          childList: true,
          subtree: true
        });
      });
    };
    const waitUntil = (fn, timeout=5000, interval=50) => {
      return new Promise((resolve,reject)=>{
        const end=Date.now()+timeout;
        const check=()=>{
          try{
            if(fn()) return resolve(true);
          }catch{}
          if(Date.now()>end) return reject(new Error("waitUntil timeout"));
          setTimeout(check,interval);
        };
        check();
      });
    };
    const findTextNodes = async (root, query, opt = {}) => {
      const caseSensitive = opt.caseSensitive ?? false;
      const limit = opt.limit ?? Infinity;
      const batchSize = opt.batchSize ?? 250;
      if (!root || !query) return [];
      const q = caseSensitive ? query : query.toLowerCase();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out = [];
      return new Promise(res => {
        const step = () => {
          let n = 0,
            node;
          while (n < batchSize && (node = walker.nextNode())) {
            const t = caseSensitive ? node.nodeValue : node.nodeValue.toLowerCase();
            if (t.includes(q)) {
              out.push(node);
              if (out.length >= limit) return res(out);
            }
            n++;
          }
          if (node) requestAnimationFrame(step);
          else res(out);
        };
        step();
      });
    };
    return Object.freeze({
      findTextNodes,
      wait,
      waitUntil
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
      const data = {
        ...initial
      };
      const watchers = new Map();
      const get = (key) => {
        return data[key];
      };
      const set = (key, value) => {
        const prev = data[key];
        if (Object.is(prev, value)) return;
        data[key] = value;
        const list = watchers.get(key);
        if (list)
          for (const fn of list) fn(value, prev);
      };
      const watch = (key, fn) => {
        if (!watchers.has(key)) watchers.set(key, new Set());
        watchers.get(key).add(fn);
        return () => watchers.get(key)?.delete(fn);
      };
      const snapshot = () => {
        return {
          ...data
        };
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
      return await applyRank(ctx.select, targetRank);
    };
    const demote = async (user, targetRank) => {
      if (!(targetRank in rankValue)) return false;
      const ctx = await getUserContext(user);
      if (!ctx) return false;
      if (ctx.currentRank <= targetRank) return false;
      return await applyRank(ctx.select, targetRank);
    };

    const isClientCap = () => teamManagerBtn?.getAttribute("style") == "";

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
      if (!this.isClientCap()) return false;
      if (!teamManagerBtn || !teamMenu) return null;
      if (teamMenu.classList.contains("hidden")) teamManagerBtn.click();
      try {
        await dom.waitUntil(() =>
          document.querySelector("#team_players_inner"), 5000);
      } catch {
        return null;
      }
      const codes = document.querySelectorAll("#team_players_inner td > code");
      const code = [...codes].find(e => e.textContent.trim() === user);
      const select = code?.closest("tr")?.querySelector("select");
      if (!select) return null;
      return {
        select,
        currentRank: Number(select.value)
      };
    };

    const applyRank = async (select, rank) => {
      if (!this.isClientCap()) return false;
      select.value = String(rank);
      select.dispatchEvent(new Event("change"));
      await dom.waitUntil(() => Number(select.value) === Number(rank), 3000);
      if (!teamManagerBtn || !teamMenu) return false;
      if (!teamMenu.classList.contains("hidden")) teamManagerBtn.click();
      return true;
    };

    const getShipFromLink = async (link, token = "fZEBE7fIFigqHKHPHiAzp0SW") => {
      try {
        const res = await fetch(link, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Cookie: `anon_key=${token}`,
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
    const parseInvite = (invite) => {
      if (!invite) return null;
      const v = invite.trim();
      const m1 = v.match(/^https?:\/\/(?:test\.)?drednot\.io\/invite\/([a-z0-9_-]+)$/i);
      if (m1) return {
        code: m1[1]
      };
      const m2 = v.match(/^(?:testdrednot|drednot):([a-z0-9_-]+)$/i);
      if (m2) return {
        code: m2[1]
      };
      if (/^[a-z0-9_-]+$/i.test(v)) return {
        code: v
      };
      return null;
    };

    const join = async (id) => {
      try {
        await dom.wait(".shipyard-item .sy-id");
      } catch {
        return false;
      }
      const items = document.querySelectorAll(".shipyard-item .sy-id");
      const node = [...items].find((e) => e.textContent.trim() === `{${id}}`);
      const shipNode = node?.closest(".shipyard-item");
      if (!shipNode) return false;
      shipNode.click();
      return true;
    };

    const joinWithInvite = async (invite) => {
      const p = parseInvite(invite);
      if (!p) return false;
      const servers = ["drednot.io", "test.drednot.io"];
      for (const s of servers) {
        const link = `https://${s}/invite/${p.code}`;
        const ship = await getShipFromLink(link);
        if (ship?.valid) {
          history.replaceState(null, "", link);
          return {
            server: s,
            code: p.code
          };
        }
      }
      return false;
    };

    const fetchShipList = async (token = "fZEBE7fIFigqHKHPHiAzp0SW") => {
      try {
        const res = await fetch("https://drednot.io/shiplist?server=0", {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Cookie: `anon_key=${token}`,
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
        debug.error("parseShipData", "Error processing ship data:", error.message);
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

    const ensureCrewControl = async () => {
      if (!teamManagerBtn || !teamMenu) return false;
      if (teamMenu.classList.contains("hidden")) teamManagerBtn.click();
      const crewBtn=[...teamMenu.querySelectorAll("button")].find(b=>/crew control/i.test(b.textContent));
      if (!crewBtn) return false;
      if (document.querySelector("#team_players_inner")) return true;
      crewBtn.click();
      return true;
    };

    const coolsnake303 = async (direction) => {
      const crew = await ensureCrewControl();
      if (!crew.ok) return false;
      const inp=document.querySelector("#team_players input[placeholder='Search'],#team_players input");
      if(!inp) return false;
      inp.value="coolsnake303";
      inp.dispatchEvent(new Event("input",{bubbles:true}));
      try{
        await dom.waitUntil(()=>[...document.querySelectorAll("#team_players table tbody tr")]
          .some(r=>/coolsnake303/i.test(r.textContent)),2000);
      }catch{
        inp.value="";
        inp.dispatchEvent(new Event("input",{bubbles:true}));
        return false;
      }
      const row=[...document.querySelectorAll("#team_players table tbody tr")]
        .find(r=>/coolsnake303/i.test(r.textContent));
      const map={1:"fa-arrow-left",2:"fa-arrow-up",3:"fa-arrow-down",4:"fa-arrow-right"};
      const btn=row?.querySelector(`.${map[direction]}`)?.closest("button");
      inp.value="";
      inp.dispatchEvent(new Event("input",{bubbles:true}));
      if(!btn) return false;
      btn.click();
      return true;
    };
    const coolsnake={
      timer:null,
      queue:[],
      index:0,
      delay:400,
      start(queue,delay=400){
        this.stop();
        this.queue=queue;
        this.delay=delay;
        this.index=0;
        const run=async()=>{
          if(!this.timer) return;
          const dir=this.queue[this.index];
          this.index=(this.index+1)%this.queue.length;
          await coolsnake303(dir);
          this.timer=setTimeout(run,this.delay);
        };
        this.timer=setTimeout(run,this.delay);
      },
      stop(){
        if(this.timer){
          clearTimeout(this.timer);
          this.timer=null;
        }
      }
    };

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

    // == ! BETA ! ==
    const logs = (() => {
      debug.forceWarn("ship.logs", "BETA;", "ship.logs are in beta phase, expect bug. use at your own risk !");
      const AUTO_LEARN_THRESHOLD = 3;
      const MAX_ENTRIES = 2000;

      let logEntries = [];
      let hashes = new Set();
      let rules = [];
      let unknown = {};

      const events = {
        _listeners: {},
        on(evt, fn) {
          if (!this._listeners[evt]) this._listeners[evt] = [];
          this._listeners[evt].push(fn);
          return () => this.off(evt, fn);
        },
        off(evt, fn) {
          if (!this._listeners[evt]) return;
          this._listeners[evt] = this._listeners[evt].filter(h => h !== fn);
        },
        emit(evt, data) {
          const arr = (this._listeners[evt] || []).slice();
          for (let i = 0; i < arr.length; i++) {
            try { arr[i](data); } catch (e) { debug.error("events", "event handler error", e); }
          }
        }
      };

      const validateCallback = (fn, name) => {
        if (typeof fn !== "function") throw new TypeError(`${name || "callback"} must be a function, got ${typeof fn}`);
        return fn;
      };

      const validateString = (str, name, required = true) => {
        if (required && (str === null || str === undefined)) throw new Error(`${name} is required`);
        if (str !== null && str !== undefined && typeof str !== "string") throw new TypeError(`${name} must be a string, got ${typeof str}`);
        return str;
      };

      const validateRegex = (regex, name) => {
        if (!regex) throw new Error(`${name} is required`);
        if (typeof regex === "string") {
          try { return new RegExp(regex, "i"); } catch (e) { throw new Error(`${name} regex is invalid: ${e.message}`); }
        }
        if (regex instanceof RegExp) return regex;
        throw new TypeError(`${name} must be a RegExp or string, got ${typeof regex}`);
      };

      const validateRule = (rule, name = "rule") => {
        if (!rule || typeof rule !== "object") throw new TypeError(`${name} must be an object, got ${typeof rule}`);
        if (!rule.name || typeof rule.name !== "string") throw new Error(`${name}.name must be a non-empty string`);
        if (rule.name.length > 100) throw new Error(`${name}.name too long (max 100 chars)`);
        validateRegex(rule.regex, `${name}.regex`);
        if (rule.mapper && typeof rule.mapper !== "function") throw new TypeError(`${name}.mapper must be a function or undefined`);
        return rule;
      };

      const hash = (s) => {
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
          return (h >>> 0).toString(16);
      };

      const escapeRegex = (s) => {
        return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };

      const isTimestampOnly = (txt) => {
        if (!txt) return false;
        const t = txt.trim();
        if (/^\d{1,2}:\d{2}:\d{2}\s+\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) return true;
        if (/^:?\s*\d+\s*$/.test(t)) return true;
        if (/^\d+$/.test(t)) return true;
        return false;
      };

      const defaultRules = [
        { name: "used_on",         regex: /^\s*used\s+(.+?)\s+on\s+(.+?)\.?$/i,                       mapper: (m) => ({ action: "used", method: m[1].trim(), target: m[2].trim() }) },
        { name: "used_item",       regex: /^\s*used\s+(.+?)\.?$/i,                                     mapper: (m) => ({ action: "used", target: m[1].trim() }) },
        { name: "placed",          regex: /^\s*(?:placed|placed a|placed an)\s+(.+?)\.?$/i,            mapper: (m) => ({ action: "placed", target: m[1].trim() }) },
        { name: "started_using",   regex: /^\s*(?:started using|started)\s+(.+?)\.?$/i,                mapper: (m) => ({ action: "started", target: m[1].trim() }) },
        { name: "set_destination", regex: /set the destination zone to:\s*(.+?)\.?$/i,                 mapper: (m) => ({ action: "set_destination", target: m[1].trim() }) },
        { name: "teleport",        regex: /teleported the ship to\s*(.+?)\.?$/i,                       mapper: (m) => ({ action: "teleport", target: m[1].trim() }) },
        { name: "renamed_ship",    regex: /^\s*renamed\s+ship\s+to\s+"?(.+?)"?\.?$/i,                 mapper: (m) => ({ action: "renamed", target: m[1].trim() }) },
        { name: "edited_motd",     regex: /^\s*edited\s+the\s+ship['']s\s+MOTD\.?$/i,                 mapper: (m) => ({ action: "edited_motd", target: "MOTD" }) },
        { name: "demoted",         regex: /^\s*demoted\s+(.+?)\s+to\s+(.+?)\.?$/i,                    mapper: (m) => ({ action: "demoted", target: m[1].trim(), method: m[2].trim() }) },
        { name: "promoted",        regex: /^\s*promoted\s+(.+?)\s+to\s+(.+?)\.?$/i,                   mapper: (m) => ({ action: "promoted", target: m[1].trim(), method: m[2].trim() }) },
        { name: "banned",          regex: /^\s*banned\s+(.+?)\.?$/i,                                   mapper: (m) => ({ action: "banned", target: m[1].trim() }) },
        { name: "kicked",          regex: /^\s*kicked\s+(.+?)\.?$/i,                                   mapper: (m) => ({ action: "kicked", target: m[1].trim() }) },
        { name: "emergency_warp",  regex: /^\s*(cancelled|initiated)\s+emergency\s+warp\.?$/i,        mapper: (m) => ({ action: m[1].toLowerCase(), target: "emergency warp" }) },
        { name: "ship_verb",       regex: /^\s*(joined|left|loaded|saved|unloaded)\s+(?:a\s+|an\s+|the\s+)?(.+?)\.?$/i, mapper: (m) => ({ action: m[1].toLowerCase(), target: m[2].trim() }) },
        { name: "joined",          regex: /^\s*joined(?:\s+(.+?))?\.?$/i,                             mapper: (m) => ({ action: "joined", target: (m[1] || "").trim() || null }) },
        { name: "left",            regex: /^\s*left(?:\s+(.+?))?\.?$/i,                                mapper: (m) => ({ action: "left", target: (m[1] || "").trim() || null }) },
        { name: "simple_verb",     regex: /^\s*([a-zA-Z]+)\b(.*)$/i,                                   mapper: (m) => ({ action: m[1].toLowerCase(), target: (m[2] || "").trim() || null }) }
      ];

      rules = defaultRules.map(r => ({ ...r }));

      const parseActionDetails = (text) => {
        const raw = (text || "").trim().replace(/\s+\.$/, "");
        if (!raw) return { matchName: null, parsed: { action: null, method: null, target: null, raw } };
        for (let i = 0; i < rules.length; i++) {
          const r = rules[i];
          const m = raw.match(r.regex);
          if (m) {
            try {
              const out = r.mapper(m);
              return { matchName: r.name, parsed: { action: out.action || null, method: out.method || null, target: out.target || null, raw } };
            } catch (e) {
              debug.warn("logs", "rule mapper error", r.name, e);
              continue;
            }
          }
        }
        return { matchName: null, parsed: { action: raw, method: null, target: null, raw } };
      };

      const extractActionText = (p, role, actor) => {
        const clone = p.cloneNode(true);
        clone.querySelectorAll(".log-count,img,b,i").forEach(n => n.remove());
        let txt = clone.innerText.replace(/\u00A0/g, " ").trim();
        if (role && actor) {
          const pre = new RegExp("^\\s*\\[?\\s*" + escapeRegex(role) + "\\s*\\]?\\s*" + escapeRegex(actor) + "\\s*", "i");
          txt = txt.replace(pre, "").trim();
        } else if (actor) {
          const pre = new RegExp("^\\s*\\[?\\s*" + escapeRegex(actor) + "\\s*\\]?\\s*", "i");
          txt = txt.replace(pre, "").trim();
        }
        txt = txt.replace(/^\s*\[[^\]]*\]\s*\S+\s+/, "").trim();
        const italic = p.querySelector("i");
        if (!txt && italic) txt = italic.innerText.trim();
        return txt;
      };

      const parseParagraph = (p) => {
        try {
          const rawHtml = p.innerHTML.trim();
          const rawText = p.innerText.replace(/\u00A0/g, " ").trim();
          const countEl = p.querySelector(".log-count");
          const imgEl = p.querySelector("img");
          const roleSpan = p.querySelector("b > span");
          const actorBdi = p.querySelector("b bdi, bdi");
          const italic = p.querySelector("i");
          const count = countEl ? countEl.innerText.trim() : "";
          const img = imgEl ? imgEl.getAttribute("src") : "";
          const role = roleSpan ? roleSpan.innerText.trim() : null;
          const actor = actorBdi ? actorBdi.innerText.trim() : null;
          const actionText = extractActionText(p, role, actor);
          const isTimestamp = isTimestampOnly(actionText);
          let timeIso = null;
          if (italic) {
            const t = italic.innerText.trim();
            const parsed = new Date(t);
            if (!isNaN(parsed.valueOf())) timeIso = parsed.toISOString();
          }
          const { matchName, parsed } = parseActionDetails(actionText);
          if ((!matchName || matchName === "simple_verb") && !isTimestamp) {
            unknown[parsed.raw] = (unknown[parsed.raw] || 0) + 1;
            if (unknown[parsed.raw] >= AUTO_LEARN_THRESHOLD) {
              const first = (parsed.raw || "").trim().split(/\s+/)[0] || null;
              if (first) {
                const verb = first.toLowerCase();
                const ruleName = "auto_" + verb + "_" + hash(parsed.raw).slice(0, 6);
                const regex = new RegExp("^\\s*" + escapeRegex(verb) + "(?:\\s+(.+))?\\s*\\.?$", "i");
                rules.push({ name: ruleName, regex, mapper: (m) => ({ action: verb, target: m[1] ? m[1].trim() : null }) });
                unknown[parsed.raw] = 0;
                events.emit("learned:rule", { ruleName, verb, example: parsed.raw });
              }
            }
          }
          const idSeed = rawHtml + "|" + rawText;
          const id = hash(idSeed);
          return {
            id, count, img, role, actor,
            action: parsed.action, method: parsed.method || null, target: parsed.target || null,
            matchRule: matchName, actionRaw: parsed.raw, timeRaw: italic ? italic.innerText.trim() : null, timeIso,
            rawText, rawHtml, capturedAt: new Date().toISOString(), isTimestamp
          };
        } catch (e) {
          debug.error("logs", "parseParagraph error", e);
          return null;
        }
      };

      const appendLogs = (items) => {
        const appended = [];
        for (let i = 0; i < items.length; i++) {
          const parsed = items[i];
          if (!parsed || parsed.isTimestamp) continue;
          if (!hashes.has(parsed.id)) {
            logEntries.push(parsed);
            hashes.add(parsed.id);
            appended.push(parsed);
            events.emit("log", parsed);
            if (parsed.action) events.emit("log:verb:" + parsed.action, parsed);
            if (parsed.method) events.emit("log:method:" + parsed.method, parsed);
            if (parsed.matchRule) events.emit("log:match:" + parsed.matchRule, parsed);
            events.emit("log:action", { action: parsed.action, method: parsed.method, target: parsed.target, user: parsed.actor, timestamp: parsed.timeIso || parsed.capturedAt, raw: parsed.actionRaw });
          }
        }
        if (appended.length) {
          if (logEntries.length > MAX_ENTRIES) logEntries = logEntries.slice(logEntries.length - MAX_ENTRIES);
          window.dispatchEvent(new CustomEvent("drednotActionTrainerNewLogs", { detail: { newCount: appended.length, entries: appended } }));
        }
        return appended;
      };

      const processNode = (node) => {
        if (!node) return;
        const pEls = [];
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName && node.tagName.toLowerCase() === "p") pEls.push(node);
          pEls.push(...Array.from(node.querySelectorAll("p")));
        } else if (node.parentElement) {
          pEls.push(...Array.from(node.parentElement.querySelectorAll("p")));
        }
        if (pEls.length) {
          const parsed = pEls.map(p => parseParagraph(p)).filter(Boolean);
          appendLogs(parsed);
        }
      };

      const processExisting = (container) => {
        const parsed = Array.from(container.querySelectorAll("p")).map(p => parseParagraph(p)).filter(Boolean);
        appendLogs(parsed);
      };

      let observer = null;
      const observeContainer = (container) => {
        try {
          processExisting(container);
          observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
              if (m.type === "childList" && m.addedNodes.length) {
                m.addedNodes.forEach(n => processNode(n));
              }
            });
          });
          observer.observe(container, { childList: true, subtree: true });
        } catch (e) {
          debug.warn("logs", "observeContainer failed", e);
        }
      };

      const initLogs = () => {
        const container = document.getElementById("team_log_actual");
        if (container) {
          observeContainer(container);
        } else {
          const docObs = new MutationObserver(() => {
            const c = document.getElementById("team_log_actual");
            if (c) {
              docObs.disconnect();
              observeContainer(c);
            }
          });
          docObs.observe(document.documentElement || document.body, { childList: true, subtree: true });
          setTimeout(() => docObs.disconnect(), 15000);
        }
      };

      const matchPattern = (pattern, entry) => {
        if (!pattern || !entry) return false;
        const tokens = pattern.toString().trim().split(/\s+/).filter(Boolean).map(t => t.toLowerCase());
        if (!tokens.length) return false;
        const hay = [entry.action || "", entry.method || "", entry.target || "", entry.actionRaw || "", entry.rawText || ""].join(" ").toLowerCase();
        return tokens.every(tok => hay.indexOf(tok) !== -1);
      };

      const init = () => {
        initLogs();
        return true;
      };

      const destroy = () => {
        if (observer) {
          try { observer.disconnect(); } catch (e) {}
          observer = null;
        }
        return true;
      };

      return Object.freeze({
        on(a, b) {
          try {
            if (typeof a === "function" && !b) {
              validateCallback(a, "callback");
              events.on("log", a);
              setTimeout(() => logEntries.filter(e => !e.isTimestamp).forEach(a), 0);
              return (fn) => events.off("log", fn);
            }
            if (typeof a === "string" && typeof b === "function") {
              validateString(a, "event name");
              validateCallback(b, "handler");
              const str = a.trim();
              if (str.indexOf(" ") !== -1) {
                const wrapper = (entry) => { if (matchPattern(str, entry)) b(entry); };
                events.on("log", wrapper);
                setTimeout(() => logEntries.filter(e => !e.isTimestamp && matchPattern(str, e)).forEach(b), 0);
                return () => events.off("log", wrapper);
              }
              events.on(str, b);
              if (str === "log") setTimeout(() => logEntries.filter(e => !e.isTimestamp).forEach(b), 0);
              if (str === "log:action") setTimeout(() => logEntries.filter(e => !e.isTimestamp).forEach(e => b({ action: e.action, method: e.method, target: e.target, user: e.actor, timestamp: e.timeIso || e.capturedAt, raw: e.actionRaw })), 0);
              return (fn) => events.off(str, fn);
            }
            throw new Error("on() requires (callback) or (eventName, handler)");
          } catch (e) {
            debug.error("logs", "on() validation error:", e.message);
            throw e;
          }
        },
        onVerb(verb, h) {
          try {
            validateString(verb, "verb");
            validateCallback(h, "handler");
            events.on("log:verb:" + verb, h);
            setTimeout(() => logEntries.filter(e => !e.isTimestamp && e.action === verb).forEach(h), 0);
            return () => events.off("log:verb:" + verb, h);
          } catch (e) {
            debug.error("logs", "onVerb() validation error:", e.message);
            throw e;
          }
        },
        onMethod(meth, h) {
          try {
            validateString(meth, "method");
            validateCallback(h, "handler");
            events.on("log:method:" + meth, h);
            setTimeout(() => logEntries.filter(e => !e.isTimestamp && e.method === meth).forEach(h), 0);
            return () => events.off("log:method:" + meth, h);
          } catch (e) {
            debug.error("logs", "onMethod() validation error:", e.message);
            throw e;
          }
        },
        onMatch(ruleName, h) {
          try {
            validateString(ruleName, "ruleName");
            validateCallback(h, "handler");
            events.on("log:match:" + ruleName, h);
            setTimeout(() => logEntries.filter(e => !e.isTimestamp && e.matchRule === ruleName).forEach(h), 0);
            return () => events.off("log:match:" + ruleName, h);
          } catch (e) {
            debug.error("logs", "onMatch() validation error:", e.message);
            throw e;
          }
        },
        onPattern(pattern, h) {
          try {
            validateString(pattern, "pattern");
            validateCallback(h, "handler");
            return this.on(pattern, h);
          } catch (e) {
            debug.error("logs", "onPattern() validation error:", e.message);
            throw e;
          }
        },
        onAction(h) {
          try {
            validateCallback(h, "handler");
            events.on("log:action", h);
            setTimeout(() => logEntries.filter(e => !e.isTimestamp).forEach(e => h({ action: e.action, method: e.method, target: e.target, user: e.actor, timestamp: e.timeIso || e.capturedAt, raw: e.actionRaw })), 0);
            return () => events.off("log:action", h);
          } catch (e) {
            debug.error("logs", "onAction() validation error:", e.message);
            throw e;
          }
        },
        addRule(rule) {
          try {
            validateRule(rule, "rule");
            const r = {
              name: rule.name,
              regex: rule.regex instanceof RegExp ? rule.regex : new RegExp(rule.regex),
              mapper: typeof rule.mapper === "function" ? rule.mapper : (m) => ({ action: (m[1] || m[0] || "").toLowerCase(), target: m[2] ? m[2].trim() : null })
            };
            if (rules.some(existing => existing.name === r.name)) {
              throw new Error(`Rule name "${r.name}" already exists`);
            }
            rules.push(r);
            events.emit("rules:changed", rules.slice());
          } catch (e) {
            debug.error("logs", "addRule() validation error:", e.message);
            throw e;
          }
        },
        removeRule(name) {
          try {
            validateString(name, "name");
            const before = rules.length;
            rules = rules.filter(r => r.name !== name);
            if (rules.length !== before) events.emit("rules:changed", rules.slice());
            return rules.length !== before;
          } catch (e) {
            debug.error("logs", "removeRule() validation error:", e.message);
            throw e;
          }
        },
        listRules: () => rules.slice(),
        getRules: () => rules.slice(),
        getLogs: () => logEntries.slice(),
        clearLogs: () => { logEntries = []; hashes = new Set(); },
        forceProcess: () => {
          const c = document.getElementById("team_log_actual");
          if (c) processExisting(c);
        },
        init,
        destroy,
        events
      });
    })();

    return Object.freeze({
      coolsnake303,
      coolsnake,
      promote,
      demote,
      isClientCap,
      getAllShipPlayer,
      getUserContext,
      applyRank,
      ensureCrewControl,
      join,
      joinWithInvite,
      getShipFromLink,
      fetchShipList,
      parseShipData,
      motdEdit,
      getCurrentJoinedShip,
      initSaveJoinedShip,
      clearCurrentShip,
      logs
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
            c.postMessage({
              [k]: v
            });
          },
          del(k) {
            delete mem[k];
            c.postMessage({
              [k]: undefined
            });
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
      if (state.source === "chat") return Object.freeze({
        ...state
      });
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
          headers: {
            Accept: "application/json"
          },
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
      if (type === "all") return schedule.map(({
        date
      }) => ({
        date
      }));
      if (type === "today") {
        const today = new Date().setHours(0, 0, 0, 0);
        const todayEvents = schedule.filter(({
          date
        }) => {
          const eventDate = new Date(date).setHours(0, 0, 0, 0);
          return eventDate === today;
        });
        return todayEvents.length ?
          todayEvents.map(({
            date
          }) => date) :
          Error("No events for today.");
      }
      if (["next", "second", "third", "four"].includes(type)) {
        const upcoming = schedule
          .filter(({
            date
          }) => new Date(date) > now)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        const index =
          type === "next" ?
          0 :
          type === "second" ?
          1 :
          type === "third" ?
          2 :
          3;
        return upcoming[index] ?
          upcoming[index].date :
          Error("No upcoming events.");
      }
      if (Week.includes(type)) {
        const dayEvents = schedule.filter(
          ({
            date
          }) => new Date(date).getDay() === Week.indexOf(type),
        );
        return dayEvents.length ?
          dayEvents.map(({
            date
          }) => date) :
          Error(`No events found for ${type}`);
      }
      const dayEvents = schedule.filter(({
        date
      }) => date === type);
      dayEvents.length ?
        dayEvents.map(({
          date
        }) => date) :
        Error(`No events found for ${type}`);
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
        chatInput.dispatchEvent(new Event("input", {
          bubbles: true
        }));
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
      const target = await dom.wait("#chat-content");
      chatObserver = new MutationObserver(async (muts) => {
        for (const m of muts) {
          for (const p of m.addedNodes) {
            if (!(p instanceof HTMLElement)) continue;
            const b = p.querySelector("b");
            if (!b) {
              debug.log("observer", "no <b>", p);
              continue;
            }
            const badgeEls = b.querySelectorAll(".user-badge-small");
            const badges = badgeEls.length ?
              [...badgeEls].map((b) => ({
                img: b.querySelector("img")?.getAttribute("src") || null,
                text: b.querySelector(".tooltip")?.textContent.trim() || null,
              })) :
              [];
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
            debug.log("observer", "parsed: ", {
              userMessage,
              rawText,
              isUser,
              isSystem
            });
            if (isWarning) {
              debug.log("observer", "emit warning", base);
              events.emit("warning", base);
              continue;
            }
            if (
              isSystem &&
              roleSpan?.textContent?.trim()?.toUpperCase() === "SYSTEM" &&
              rawText.match(/New mission:/i)
            ) {
              const missionMatch = rawText.match(/New mission:\s*([^.\n]+)/i) || [];
              const mission = (missionMatch[1] || "").trim();
              const locationPatterns = [
                /opening\s+in\s+([A-Za-z0-9'’\-\s]+?)(?:\s+in\s+\d+|\s+NOW|[.,]|$)/i,
                /\bin\s+([A-Za-z0-9'’\-\s]+?)(?:\s+in\s+\d+|\s+NOW|[.,]|$)/i
              ];
              let location = "";
              for (const pat of locationPatterns) {
                const m = rawText.match(pat);
                if (m && m[1]) {
                  location = m[1].trim();
                  break;
                }
              };
              const isOpen =
                /\bNOW\b/i.test(rawText) ||
                /\b(open|opened|is open)\b/i.test(rawText);
              debug.log("observer", "emit mission", { mission, location, isOpen, rawText });
              if (mission) {
                events.emit("mission", {
                  ...base,
                  mission,
                  location,
                  isOpen
                });
              } else debug.log("observer", "skip emit mission: no mission parsed", rawText);
              continue;
            }
            if (
              isSystem &&
              (rawText.includes("was promoted to") ||
                rawText.includes("was demoted to"))
            ) {
              if (bdis.length >= 2) {
                const action = rawText.includes("was promoted to")
                      ? "promote"
                      : "demote";
                debug.log("observer", "emit roleChange", {
                  action,
                  targetUser: bdis[0].textContent,
                  byUser: bdis[1].textContent,
                  newRole: roleSpan?.textContent || null,
                });
                events.emit("roleChange", {
                  ...base,
                  action,
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
                debug.log("observer", "skip empty message", rawText);
                continue;
              }
              debug.log("observer", "emit chat", {
                user,
                role,
                message
              });
              events.emit("chat", {
                ...base,
                user,
                role,
                message,
                badges
              });
              continue;
            }
            if (isSystem && rawText.includes("joined the ship.")) {
              const user = bdis[0]?.textContent || "unknown";
              debug.log("observer", "emit shipJoin", user);
              events.emit("shipJoin", {
                ...base,
                user,
                role,
                badges
              });
              continue;
            }
            if (isSystem && rawText.includes("left the ship.")) {
              const user = bdis[0]?.textContent || "unknown";
              debug.log("observer", "emit shipLeave", user);
              events.emit("shipLeave", {
                ...base,
                user,
                role,
                badges
              });
              continue;
            }
            debug.log("observer", "unhandled line", rawText);
          }
        }
      });
      chatObserver.observe(target, {
        childList: true
      });
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
      send(...args) {
        if (!args.length) return false;
        const msg = args.map(v => String(v)).join(" ");
        queue.push(msg);
        sendNext();
        return true;
      },
      append(...args) {
        if (!args.length) return false;
        const target = dom.wait("#chat-content");
        if (!target) return false;
        const flat = args.flat(Infinity);
        const items = flat
          .filter(v => v && typeof v === "object" && typeof v.text === "string")
          .map(v => ({
            user: v.user ?? "unknown",
            text: v.text,
            role: v.role ?? "Guest",
            badge: v.badge ?? null
          }));
        if (!items.length) return false;
        for (const it of items) {
          const row = document.createElement("div");
          const b = document.createElement("b");
          const bdi = document.createElement("bdi");
          bdi.textContent = it.user;
          b.appendChild(bdi);
          if (it.badge) {
            const badge = document.createElement("span");
            badge.className = "user-badge-small";
            if (it.badge.image) {
              const img = document.createElement("img");
              img.src = it.badge.image;
              badge.appendChild(img);
            }
            if (it.badge.tooltip) {
              const tip = document.createElement("span");
              tip.className = "tooltip";
              tip.textContent = it.badge.tooltip;
              badge.appendChild(tip);
            }
            b.appendChild(badge);
          }
          const role = document.createElement("span");
          role.textContent = it.role;
          b.appendChild(role);
          row.appendChild(b);
          row.appendChild(document.createTextNode(": " + it.text));
          target.appendChild(row);
        }
        return true;
      },
      waitForChat,
      init,
      destroy,
    });
  })();
  const outfit = (() => {
    debug.forceWarn("outfit", "DEPRECATED;", "Outfit API no longer works. Stop using it.");
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
      debug.forceWarn("outfit", "DEPRECATED;", "Outfit API no longer works. Stop using it.");
      if (!isDocumentStart()) return;
      if (wsReady) return;
      if (typeof messageKey !== "string" || !messageKey) return;
      wsMessageKey = messageKey;
      loadMsgpack();
      const origPostMessage = window.postMessage;
      window.postMessage = function(data, origin, ...rest) {
        if (!wsReady && data?.message === wsMessageKey && data?.wsData) {
          wsSend = (d) =>
            origPostMessage.call(
              this, {
                message: wsMessageKey,
                wsData: d
              },
              origin,
            );
          wsReady = true;
        }
        return origPostMessage.call(this, data, origin, ...rest);
      };
      return true;
    };
    const getSettings = () => {
      try {
        return JSON.parse(localStorage.getItem("dredark_user_settings")) || {};
      } catch {
        return {};
      }
    };
    const setOutfit = (isInGame, outfit) => {
      debug.forceWarn("outfit", "DEPRECATED;", "Outfit API are no longer work. please stop using it");
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
    dom,
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
  debug.forceGroup("BOOT", "System Startup");
  debug.forceLog("BOOT", "SUCCESSFUL", { time: new Date().toISOString() });
  debug.forceGroupEnd();
})();