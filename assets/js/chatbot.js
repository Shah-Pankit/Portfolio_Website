// === Chat API endpoints ===
const CHAT_ENDPOINT =
  "https://my-portfolio-website-bot-backend.onrender.com/api/chat";
const API_BASE = CHAT_ENDPOINT.replace(/\/api\/chat.*$/, "");
const HEALTH_ENDPOINT = `${API_BASE}/health`; // now exists on your backend

// === Chat UI ===
function toggleChat() {
  const chatWindow = document.getElementById("chat-window");
  chatWindow.classList.toggle("hidden");
}

async function sendMessage(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  const input = document.getElementById("user-input");
  const message = (input?.value || "").trim();
  if (!message) return;

  addMessage("user", message);
  if (input) input.value = "";

  // ---- Cold-start: decide if this message is the "first after long idle"
  const lastOk = _getLastOk();
  const longInactive = _now() - lastOk > INACTIVITY_MS;
  const handledKey = `cold_handled_${lastOk || "never"}`;

  // Only consider showing banner if:
  //  - we've been idle for a long time AND
  //  - we haven't already shown the cold banner for THIS idle period
  const considerColdBanner = longInactive && !_isColdHandled(handledKey);

  let responseReceived = false;
  let coldTimer = null;

  // Start a delayed timer: only show banner if still waiting after COLD_SHOW_AFTER_MS
  if (considerColdBanner) {
    coldTimer = setTimeout(() => {
      if (!responseReceived) showColdStartNotice();
    }, COLD_SHOW_AFTER_MS);
  }

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: window.__chatHistory || "",
      }),
    });

    responseReceived = true;
    if (coldTimer) clearTimeout(coldTimer);
    removeColdStartNotice();

    if (!response.ok) {
      setOfflineUI?.();
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    window.__chatHistory = data.updatedHistory || "";
    addMessage("bot", data.reply || "Sorry—no reply.");

    // success ⇒ mark online + mark last-success timestamp
    setOnlineUI?.();
    _setLastOk(_now());

    // We handled the cold banner decision for this idle period:
    // mark it so we don't show it again until next long idle.
    if (considerColdBanner) _markColdHandled(handledKey);
  } catch (err) {
    responseReceived = true;
    if (coldTimer) clearTimeout(coldTimer);
    removeColdStartNotice();

    addMessage("bot", "Sorry—something went wrong. Please try again.");
    setOfflineUI?.();

    // Even on failure, we "handled" this idle period's first attempt.
    if (considerColdBanner) _markColdHandled(handledKey);
  }
}


// Renders a chat bubble with avatar; supports your existing CSS classes
function addMessage(sender, text) {
  const msgContainer = document.getElementById("chat-messages");
  if (!msgContainer) return;

  const wrapper = document.createElement("div");
  wrapper.className = `chat-message-wrapper ${sender}`;

  const avatar = document.createElement("img");
  avatar.src = sender === "user" ? "assets/images/user.png" : "assets/images/hero.png";
  avatar.alt = `${sender} avatar`;
  avatar.className = "chat-avatar";

  const msgBubble = document.createElement("div");
  msgBubble.className = `${sender}-message`;

  // Respect your existing helpers
  let processed = text;
  if (sender === "bot") {
    const isHTMLList = text.includes("<ul>") && text.includes("<li>");
    processed = isHTMLList ? text : convertMarkdownToHtml(text);
  }
  const linkified = linkifyText(processed);

  if (sender === "user") {
    // user: avatar left, bubble right
    wrapper.appendChild(avatar);
    msgBubble.innerHTML = linkified;
    wrapper.appendChild(msgBubble);
  } else {
    // bot: bubble left, avatar right (matches your .bot layout)
    msgBubble.innerHTML = linkified;
    wrapper.appendChild(msgBubble);
    wrapper.appendChild(avatar);
  }

  msgContainer.appendChild(wrapper);
  msgContainer.scrollTop = msgContainer.scrollHeight;
}


// === Helpers: convert + linkify ===
function convertMarkdownToHtml(text) {
  // bold **text**
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // italics *text*
  text = text.replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
  // simple markdown bullets to <ul><li>
  if (/^\s*([-*]|\d+[.)])\s+/m.test(text)) {
    const lines = text.split(/\r?\n/);
    let inList = false;
    let html = "";
    for (const ln of lines) {
      if (/^\s*([-*]|\d+[.)])\s+/.test(ln)) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += "<li>" + ln.replace(/^\s*([-*]|\d+[.)])\s+/, "") + "</li>";
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        if (ln.trim()) html += `<div>${ln}</div>`;
      }
    }
    if (inList) html += "</ul>";
    return html;
  }
  return text;
}

function linkifyText(text) {
  // If HTML list, linkify only li contents (preserve structure)
  if (text.includes("<ul>") || text.includes("<li>")) {
    return text.replace(
      /(<li[^>]*>)(.*?)(<\/li>)/gi,
      function (match, openTag, content, closeTag) {
        const linked = content
          .replace(
            /((mailto:)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            `<a href="mailto:$1" target="_blank" class="chat-link">$1</a>`
          )
          .replace(
            /(https?:\/\/[^\s<]+)/g,
            `<a href="$1" target="_blank" class="chat-link">$1</a>`
          );
        return openTag + linked + closeTag;
      }
    );
  }

  // Plain text: normal linkification
  return text
    .replace(
      /((mailto:)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      `<a href="mailto:$1" target="_blank" class="chat-link">$1</a>`
    )
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      `<a href="$1" target="_blank" class="chat-link">$1</a>`
    );
}

// === NEW: Typewriter animation (word-by-word) ===
function createEl(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function getMessagesContainer() {
  return document.getElementById("chat-messages");
}

function scrollToBottom() {
  const msgContainer = getMessagesContainer();
  if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
}

// Promisified word-by-word typing (so lists can type each li sequentially)
function typeWordsAsync(el, htmlText, wordDelay = 99) {
  return new Promise((resolve) => {
    // Render visible text progressively, then swap in linked HTML to preserve anchors
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlText;
    const visible = (tmp.textContent || tmp.innerText || "").trim();

    const words = visible.split(/\s+/).filter(Boolean);
    el.textContent = "";
    let i = 0;

    const tick = () => {
      if (i >= words.length) {
        // After typing, replace with linkified original HTML (so links are clickable)
        el.innerHTML = linkifyText(htmlText);
        scrollToBottom();
        resolve();
        return;
      }
      el.textContent += (i === 0 ? "" : " ") + words[i++];
      scrollToBottom();
      setTimeout(tick, wordDelay);
    };
    tick();
  });
}

// Animate each <li> inside one or more <ul>, word-by-word per item
async function typeListAsync(
  msgBubble,
  ulHTML,
  itemWordDelay = 26,
  gapBetweenItems = 120
) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = ulHTML.trim();

  const uls = Array.from(wrapper.querySelectorAll("ul"));
  if (uls.length === 0) {
    // Fallback: not a list — type as words
    const p = createEl("div", "");
    msgBubble.appendChild(p);
    await typeWordsAsync(p, ulHTML, itemWordDelay);
    return;
  }

  for (const srcUL of uls) {
    const dstUL = document.createElement("ul");
    msgBubble.appendChild(dstUL);

    const items = Array.from(srcUL.children).filter(
      (li) => li.tagName.toLowerCase() === "li"
    );

    for (const srcLI of items) {
      const li = document.createElement("li");
      dstUL.appendChild(li);

      // Create a span to type into, then swap to linked HTML when finished
      const span = document.createElement("span");
      li.appendChild(span);

      // Word-by-word typing using the li's innerHTML (preserving links at the end)
      await typeWordsAsync(span, srcLI.innerHTML, itemWordDelay);

      // Optional small gap before starting next bullet
      await new Promise((r) => setTimeout(r, gapBetweenItems));
    }
  }
}

// === Render a message (user: instant, bot: animated word-by-word) ===
async function sendMessage(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  const input = document.getElementById("user-input");
  if (!input) return;

  const message = (input.value || "").trim();
  if (!message) return;

  addMessage("user", message);
  input.value = "";

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: window.__chatHistory || "",
      }),
    });

    if (!response.ok) {
      setOfflineUI?.();
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    window.__chatHistory = data.updatedHistory || "";
    addMessage("bot", data.reply || "Sorry—no reply.");
    setOnlineUI?.();
  } catch (error) {
    addMessage("bot", "Sorry—something went wrong. Please try again.");
    setOfflineUI?.();
  }
}


// Wire handlers once the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const sendBtn = form ? form.querySelector('button[type="submit"]') : null;

  // Let the form submission call sendMessage (Enter key included)
  if (form) form.addEventListener("submit", sendMessage);

  // Clicking the button also calls sendMessage
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);

  // Enter sends; Shift+Enter would allow multiline if you ever switch to <textarea>
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(e);
      }
    });
  }
});



// === Chat Nudge (tooltip) ===
(function setupChatNudge() {
  const BTN_ID = "chat-icon";
  const NUDGE_ID = "chat-nudge";

  // Config
  const messages = [
    "Have a question? Let’s discuss it here.",
    "Want to know more about my work? Ask me.",
    "Looking for a developer you can rely on? Chat now.",
    "Explore my skills—directly from me.",
    "Need help turning an idea into reality? Let’s talk.",
    "Tell me your requirements—I'll explain how I can help.",
  ];
  const showAfterMs = 5000; // first nudge after 5s
  const intervalMs = 20000; // subsequent nudges every 20s
  const showForMs = 5000; // how long it stays visible
  const maxPerSess = 6; // cap per session
  const MIN_GAP_MS = 20000; // hard cooldown between any two shows
  const IGNORE_SCROLL_FOR_MS = 6000; // don’t allow scroll-nudge immediately

  let timer = null;
  let cycle = null;
  let msgIndex = 0;
  let lastShownAt = 0;
  const pageLoadedAt = Date.now();
  let shownCount = Number(sessionStorage.getItem("chat_nudges_shown") || 0);

  const chatBtn = document.getElementById(BTN_ID);
  if (!chatBtn) return;

  // Create DOM once
  let nudge = document.getElementById(NUDGE_ID);
  if (!nudge) {
    nudge = document.createElement("div");
    nudge.id = NUDGE_ID;
    nudge.innerHTML = `
      <button class="nudge-close" aria-label="Close nudge">×</button>
      <span class="nudge-text"></span>
    `;
    document.body.appendChild(nudge);
  }
  const nudgeText = nudge.querySelector(".nudge-text");

  // Utility: is chat open?
  function isChatOpen() {
    const win = document.getElementById("chat-window");
    return win && !win.classList.contains("hidden");
  }

  function canShow() {
    if (document.hidden) return false;
    if (isChatOpen()) return false;
    if (shownCount >= maxPerSess) return false;
    if (Date.now() - lastShownAt < MIN_GAP_MS) return false; // cooldown
    return true;
  }

  // Show/Hide
  function showNudge() {
    if (!canShow()) return;

    nudgeText.textContent = messages[msgIndex++ % messages.length];
    nudge.classList.add("visible");

    lastShownAt = Date.now();
    shownCount += 1;
    sessionStorage.setItem("chat_nudges_shown", String(shownCount));

    setTimeout(() => nudge.classList.remove("visible"), showForMs);
  }

  // Schedule
  function startSchedule() {
    stopSchedule();
    timer = setTimeout(() => {
      showNudge(); // respects cooldown internally
      cycle = setInterval(showNudge, intervalMs); // respects cooldown each tick
    }, showAfterMs);
  }
  function stopSchedule() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (cycle) {
      clearInterval(cycle);
      cycle = null;
    }
  }

  // Interactions that should pause it
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSchedule();
    } else if (!isChatOpen()) {
      startSchedule();
    }
  });

  chatBtn.addEventListener("click", () => {
    // opening chat should stop nudges; closing later restarts via toggle
    setTimeout(() => {
      if (isChatOpen()) stopSchedule();
      else startSchedule();
    }, 0);
  });

  nudge.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("nudge-close")) {
      nudge.classList.remove("visible");
      stopSchedule();
      return;
    }
    try {
      toggleChat();
    } catch (_) {}
  });

  // Debounced scroll nudge with initial ignore window + cooldown
  let scrollTO = null;
  window.addEventListener(
    "scroll",
    () => {
      if (isChatOpen()) return;
      if (Date.now() - pageLoadedAt < IGNORE_SCROLL_FOR_MS) return; // prevent “instant” nudge
      if (scrollTO) clearTimeout(scrollTO);
      scrollTO = setTimeout(() => {
        showNudge(); // cooldown enforced
      }, 900);
    },
    { passive: true }
  );

  // Kick off
  startSchedule();
})();

// === Online/Offline indicator ===

function setOnlineUI() {
  const el = document.getElementById("chat-status");
  if (!el) return;
  el.classList.remove("offline");
  el.classList.add("online");
  const label = el.querySelector(".status-label");
  if (label) label.textContent = "online";
}

function setOfflineUI() {
  const el = document.getElementById("chat-status");
  if (!el) return;
  el.classList.remove("online");
  el.classList.add("offline");
  const label = el.querySelector(".status-label");
  if (label) label.textContent = "offline";
}

/** Robust health probe:
 *  1) Belt: GET /health (cheap and fast)
 *  2) Suspenders: tiny POST to /api/chat (treat HTTP 200 as online)
 */
async function probeHealth() {
  // Belt
  try {
    const res = await fetch(HEALTH_ENDPOINT, { method: "GET", cache: "no-store" });
    if (res.ok) return true;
  } catch (_) { /* ignore */ }

  // Suspenders
  try {
    const res = await fetch(CHAT_ENDPOINT + "?ping=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "__ping__", healthCheck: true })
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function updateBotStatus() {
  const ok = await probeHealth();
  if (ok) setOnlineUI(); else setOfflineUI();
}

// Kick off and poll every 30s (pause when tab hidden to save battery)
(function initStatusPolling() {
  let timer = null;

  function start() {
    if (timer) return;
    updateBotStatus(); // immediate
    timer = setInterval(updateBotStatus, 30_000);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  start();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else start();
  }, { passive: true });
})();


// --- Cold-start detection config ---
const INACTIVITY_MS = 15 * 60 * 1000;    // 15 minutes of no successful replies
const COLD_SHOW_AFTER_MS = 1500;         // show banner only if still waiting after 1.5s

function _now() { return Date.now(); }
function _getLastOk() {
  return Number(localStorage.getItem("chat_last_success_at") || 0);
}
function _setLastOk(ts) {
  localStorage.setItem("chat_last_success_at", String(ts));
}
function _markColdHandled(key) {
  localStorage.setItem(key, "1");
}
function _isColdHandled(key) {
  return localStorage.getItem(key) === "1";
}

// UI helpers for the banner
let _coldBannerEl = null;

function showColdStartNotice() {
  if (_coldBannerEl) return;
  const msgContainer = document.getElementById("chat-messages");
  if (!msgContainer) return;

  const wrap = document.createElement("div");
  wrap.className = "coldstart-wrap";

  const spin = document.createElement("div");
  spin.className = "coldstart-spinner";

  const txt = document.createElement("div");
  txt.innerHTML = `<strong>Waking the server</strong><span class="coldstart-dots"></span> (free tier)`;

  wrap.appendChild(spin);
  wrap.appendChild(txt);

  // append as a "system" style note; keep it at the end
  msgContainer.appendChild(wrap);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  _coldBannerEl = wrap;
}

function removeColdStartNotice() {
  if (_coldBannerEl && _coldBannerEl.parentNode) {
    _coldBannerEl.parentNode.removeChild(_coldBannerEl);
  }
  _coldBannerEl = null;
}
