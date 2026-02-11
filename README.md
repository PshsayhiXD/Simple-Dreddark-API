# Simple Dreddark API v2

## Overview
Simple Dreddark API is a **client-side developer API** for **drednot.io**, delivered as a Tampermonkey userscript.
It exposes structured access to **chat parsing, events, commands, ship helpers, storage, outfit control, and utilities**.

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
fetch("https://raw.githubusercontent.com/PshsayhiXD/Simple-Dreddark-API/master/stable.min.js")
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
Dreddark.version // "2.1.9"
```

## Document
Soon.