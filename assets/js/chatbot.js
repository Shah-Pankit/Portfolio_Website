// === Chat API endpoints ===
// const CHAT_ENDPOINT = "http://127.0.0.1:8000/api/chat"; // <— change to local
// const API_BASE = "http://127.0.0.1:8000"; // <— add
// const HEALTH_ENDPOINT = `${API_BASE}/health`;

// === Chat API endpoints (Render)===

const API_BASE = "https://my-portfolio-website-bot-backend.onrender.com";
const CHAT_ENDPOINT = `${API_BASE}/api/chat`;
const HEALTH_ENDPOINT = `${API_BASE}/health`;

// === Chat API endpoints (Vercel) ===

// const API_BASE = "my-portfolio-website-bot-backend-j4k68r805.vercel.app";
// const CHAT_ENDPOINT = `${API_BASE}/api/chat`;
// const HEALTH_ENDPOINT = `${API_BASE}/health`;

// === Chat UI ===
function toggleChat() {
  const chatWindow = document.getElementById("chat-window");
  chatWindow.classList.toggle("hidden");
  if (!chatWindow.classList.contains("hidden")) {
    setTimeout(showOfflineGreeting, 100);
  }
}

// Show offline message when chat opens if bot is offline
let hasShownOfflineGreeting = false;

function showOfflineGreeting() {
  if (hasShownOfflineGreeting) return;
  const msgContainer = document.getElementById("chat-messages");
  if (!msgContainer || msgContainer.children.length > 0) return;

  const statusEl = document.getElementById("chat-status");
  const isOffline = statusEl && statusEl.classList.contains("offline");

  if (isOffline) {
    hasShownOfflineGreeting = true;
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message-wrapper bot";
    const avatar = document.createElement("img");
    avatar.src = "../assets/images/hero.png";
    avatar.alt = "bot avatar";
    avatar.className = "chat-avatar";
    const msgBubble = document.createElement("div");
    msgBubble.className = "bot-message";
    msgBubble.innerHTML = `Sorry for the inconvenience — I'm currently undergoing a quick tune-up to serve you better. Please check back soon; I'll be up and running shortly!<br><br>Meanwhile, you can contact Pankit directly here:<br><br><button class="contact-pankit-btn" onclick="document.getElementById('contact')?.scrollIntoView({behavior:'smooth'});toggleChat();">Contact Pankit</button>`;
    wrapper.appendChild(msgBubble);
    wrapper.appendChild(avatar);
    msgContainer.appendChild(wrapper);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }
}

async function sendMessage(event) {
  if (event && typeof event.preventDefault === "function")
    event.preventDefault();

  // robustly find the input
  const inputEl =
    document.getElementById("chat-input") ||
    document.getElementById("user-input");
  if (!inputEl) return;

  const msg = (inputEl.value || "").trim();
  if (!msg) return;

  // normal flow
  addMessage("user", msg);
  inputEl.value = "";

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: msg,
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
  } catch (err) {
    const msgContainer = document.getElementById("chat-messages");
    if (msgContainer) {
      const wrapper = document.createElement("div");
      wrapper.className = "chat-message-wrapper bot";
      const avatar = document.createElement("img");
      avatar.src = "../assets/images/hero.png";
      avatar.alt = "bot avatar";
      avatar.className = "chat-avatar";
      const msgBubble = document.createElement("div");
      msgBubble.className = "bot-message";
      msgBubble.innerHTML = `I’m currently getting a quick refresh to serve you better. Please check back shortly — I’ll be up and running again soon!<br><br>Meanwhile, you can contact Pankit directly here:<br><br><button class="contact-pankit-btn" onclick="document.getElementById('contact')?.scrollIntoView({behavior:'smooth'});toggleChat();">Contact Pankit</button>`;
      wrapper.appendChild(msgBubble);
      wrapper.appendChild(avatar);
      msgContainer.appendChild(wrapper);
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }
    setOfflineUI?.();
  }
}

// Renders a chat bubble with avatar; supports your existing CSS classes
function addMessage(sender, text) {
  const msgContainer = document.getElementById("chat-messages");
  if (!msgContainer) return;

  const wrapper = document.createElement("div");
  wrapper.className = `chat-message-wrapper ${sender}`;

  const avatar = document.createElement("img");
  avatar.src =
    sender === "user"
      ? "../assets/images/user.png"
      : "../assets/images/hero.png";
  avatar.alt = `${sender} avatar`;
  avatar.className = "chat-avatar";

  const msgBubble = document.createElement("div");
  msgBubble.className = `${sender}-message`;

  // Respect your existing helpers
  let processed = text;
  if (sender === "bot") {
    const isHTMLList = text.includes("<ul>") && text.includes("<li>");
    processed = isHTMLList ? text : convertMarkdownToHtml(text);
    rememberLastBot(text);
  }
  const linkified = linkifyText(processed);

  if (sender === "user") {
    // user: avatar left, bubble right
    wrapper.appendChild(avatar);
    msgBubble.innerHTML = linkified;
    wrapper.appendChild(msgBubble);
  } else {
    // bot: bubble left, avatar right (typed animation)
    const typedTarget = document.createElement("span");
    typedTarget.className = "typed-target";
    msgBubble.appendChild(typedTarget);

    wrapper.appendChild(msgBubble);
    wrapper.appendChild(avatar);

    // keep chat scrolled while typing
    const msgContainer = document.getElementById("chat-messages");
    function isNearBottom(el, threshold = 32) {
      return el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;
    }
    const keepScroll = setInterval(() => {
      if (msgContainer && isNearBottom(msgContainer)) {
        msgContainer.scrollTop = msgContainer.scrollHeight;
      }
    }, 50);

    const finish = () => clearInterval(keepScroll);

    // Prefer typed.js (already in your <head>); fallback to manual typing
    if (window.Typed) {
      /* types HTML safely */
      new Typed(typedTarget, {
        strings: [linkified],
        typeSpeed: 12,
        backSpeed: 0,
        smartBackspace: false,
        showCursor: false,
        contentType: "html",
        onComplete: finish,
      });
    } else {
      // fallback: naive char-by-char
      const s = linkified;
      let i = 0;
      const t = setInterval(() => {
        typedTarget.innerHTML = s.slice(0, ++i);
        if (i >= s.length) {
          clearInterval(t);
          finish();
        }
      }, 12);
    }
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
  itemWordDelay = 12, //26
  gapBetweenItems = 1000 //120
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

// === Chat Nudge (tooltip) ===
(function setupChatNudge() {
  const BTN_ID = "chat-icon";
  const NUDGE_ID = "chat-nudge";

  // Config
  const messages = [
    "Have a question? Let's discuss it here.",
    "Want to know more about my work? Ask me.",
    "Looking for a developer you can rely on? Chat now.",
    "Explore my skills—directly from me.",
    "Need help turning an idea into reality? Let's talk.",
    "Tell me your requirements—I'll explain how I can help.",
  ];
  const showAfterMs = 5000; // first nudge after 5s
  const intervalMs = 20000; // subsequent nudges every 20s
  const showForMs = 5000; // how long it stays visible
  const maxPerSess = 6; // cap per session
  const MIN_GAP_MS = 20000; // hard cooldown between any two shows
  const IGNORE_SCROLL_FOR_MS = 6000; // don't allow scroll-nudge immediately

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
    const statusEl = document.getElementById("chat-status");
    if (statusEl && statusEl.classList.contains("offline")) return false; // don't show nudges when offline
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
      if (Date.now() - pageLoadedAt < IGNORE_SCROLL_FOR_MS) return; // prevent "instant" nudge
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
    const res = await fetch(HEALTH_ENDPOINT, {
      method: "GET",
      cache: "no-store",
    });
    if (res.ok) return true;
  } catch (_) {
    /* ignore */
  }

  // Suspenders
  try {
    const res = await fetch(CHAT_ENDPOINT + "?ping=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "__ping__", healthCheck: true }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function updateBotStatus() {
  const ok = await probeHealth();
  if (ok) setOnlineUI();
  else setOfflineUI();
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
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stop();
      else start();
    },
    { passive: true }
  );
})();

// --- Cold-start detection config ---
const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes of no successful replies
const COLD_SHOW_AFTER_MS = 1500; // show banner only if still waiting after 1.5s

function _now() {
  return Date.now();
}
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

/* === TTS: speak only the last bot message === */
let __lastBotText = "";

// Call this when you append a bot message
function rememberLastBot(text) {
  __lastBotText = (text || "").trim();
}

// Prefer Microsoft Mark (Windows). Fallback to en-US, then any English, then any voice.
function getMarkVoice() {
  const voices = window.speechSynthesis.getVoices() || [];
  let v = voices.find(
    (v) => v.name === "Microsoft Mark - English (United States)"
  );
  if (v) return v;
  v =
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => (v.lang || "").toLowerCase().startsWith("en")) ||
    voices[0];
  return v || null;
}

// Ensure voices are loaded
window.speechSynthesis.onvoiceschanged = () => {
  getMarkVoice();
};

// === Floating TTS controls (Pause/Resume + Stop) ===
let currentUtterance = null;

const ttsControls = document.getElementById("ttsControls");
const ttsPauseBtn = document.getElementById("ttsPauseBtn");
const ttsStopBtn = document.getElementById("ttsStopBtn");
const ttsPauseIcon = document.getElementById("ttsPauseIcon");

function showTTSControls() {
  if (ttsControls) ttsControls.hidden = false;
  if (ttsPauseBtn) ttsPauseBtn.setAttribute("aria-pressed", "false"); // playing
  if (ttsPauseIcon) ttsPauseIcon.src = "../assets/images/pause.png";
  if (ttsPauseBtn) ttsPauseBtn.title = "Pause";
}

function hideTTSControls() {
  if (ttsControls) ttsControls.hidden = true;
  if (ttsPauseBtn) ttsPauseBtn.setAttribute("aria-pressed", "false");
  if (ttsPauseIcon) ttsPauseIcon.src = "../assets/images/pause.png"; // reset to pause for next start
  if (ttsPauseBtn) ttsPauseBtn.title = "Pause";
  currentUtterance = null;
}

// Pause/Resume toggle
ttsPauseBtn?.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return;
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    // Going to paused state
    speechSynthesis.pause();
    ttsPauseBtn.setAttribute("aria-pressed", "true");
    if (ttsPauseIcon) ttsPauseIcon.src = "../assets/images/play.png";
    ttsPauseBtn.title = "Resume";
  } else if (speechSynthesis.paused) {
    // Resuming playback
    speechSynthesis.resume();
    ttsPauseBtn.setAttribute("aria-pressed", "false");
    if (ttsPauseIcon) ttsPauseIcon.src = "../assets/images/pause.png";
    ttsPauseBtn.title = "Pause";
  }
});

// Stop
ttsStopBtn?.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  hideTTSControls();
});

// Wire button click
(function wireSpeakLastBot() {
  const btn = document.getElementById("speakLastBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!__lastBotText) return;

    // Sanitize/normalize for speech (no HTML, nicer phrasing)
    let spoken = __lastBotText
      .replace(/<[^>]+>/g, " ") // strip any HTML tags like <li>, </ol>
      .replace(/\bAI\/ML\b/gi, "AI and ML") // say "AI and ML" instead of "AI slash ML"
      .replace(/[•·▪︎◦]/g, " ") // bullets to spaces
      .replace(/\s*\n+\s*/g, ". ") // newlines -> short pause
      .replace(/\s{2,}/g, " ") // collapse spaces
      .trim();
    // Cancel any ongoing speech and build a fresh utterance
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(spoken);
    const v = getMarkVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;

    // Show controls while speaking; hide when done
    u.onstart = () => {
      currentUtterance = u;
      showTTSControls();
    };
    u.onend = () => {
      hideTTSControls();
    };
    u.oncancel = () => {
      hideTTSControls();
    };
    u.onerror = () => {
      hideTTSControls();
    };

    window.speechSynthesis.speak(u);
  });
})();

// Close chat when clicking outside
document.addEventListener("click", (e) => {
  const chatWindow = document.getElementById("chat-window");
  const chatIcon = document.getElementById("chat-icon");

  if (!chatWindow || !chatIcon) return;

  const isClickInsideChat = chatWindow.contains(e.target);
  const isClickOnIcon = chatIcon.contains(e.target);
  const isChatOpen = !chatWindow.classList.contains("hidden");

  if (isChatOpen && !isClickInsideChat && !isClickOnIcon) {
    chatWindow.classList.add("hidden");
  }
});
