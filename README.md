\# Simple Dreddark API v2



A lightweight client-side developer API for drednot.io



This project does NOT add gameplay features by itself.

It exposes events, helpers, and hooks so developers can build their own tools, bots, or plugins on top of the game UI.



All data is inferred from DOM and chat parsing.

Nothing is server-trusted or authoritative.



---



\## Features



\- Chat event parsing

\- Ship join / leave detection

\- Role change detection

\- Mission announcements

\- Warning detection

\- Chat command system

\- Chat message sending

\- Ship role promotion via UI interaction

\- Plugin system via `Dreddark.use`



---



\## Initialization



The API is not active by default.



```js

const script = document.createElement("script");

script.src = "https://raw.githubusercontent.com/PshsayhiXD/Simple-Dreddark-API/main/dreddark.js";

script.type = "text/javascript";

script.onload = () => {

&nbsp; Dreddark.init();

};

document.head.appendChild(script);



Dreddark.init();

// Cleanup: Dreddark.destroy();



console.log(Dreddark.version); // Version

```

