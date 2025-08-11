// === Chat UI ===
function toggleChat() {
  const chatWindow = document.getElementById('chat-window');
  chatWindow.classList.toggle('hidden');
}

async function sendMessage(event) {
  event.preventDefault();
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;

  addMessage('user', message);
  input.value = '';

  try {
    // NOTE: keep your backend URL as-is
    const response = await fetch('https://my-portfolio-website-bot-backend.onrender.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: window.__chatHistory || ''
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    window.__chatHistory = data.updatedHistory || '';
    addMessage('bot', data.reply || 'Sorry—no reply.');
  } catch (error) {
    addMessage('bot', 'Sorry—something went wrong. Please try again.');
  }
}

// === Helpers: convert + linkify ===
function convertMarkdownToHtml(text) {
  // bold **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // italics *text*
  text = text.replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
  // simple markdown bullets to <ul><li>
  if (/^\s*([-*]|\d+[.)])\s+/m.test(text)) {
    const lines = text.split(/\r?\n/);
    let inList = false;
    let html = '';
    for (const ln of lines) {
      if (/^\s*([-*]|\d+[.)])\s+/.test(ln)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + ln.replace(/^\s*([-*]|\d+[.)])\s+/, '') + '</li>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (ln.trim()) html += `<div>${ln}</div>`;
      }
    }
    if (inList) html += '</ul>';
    return html;
  }
  return text;
}

function linkifyText(text) {
  // If HTML list, linkify only li contents (preserve structure)
  if (text.includes('<ul>') || text.includes('<li>')) {
    return text.replace(/(<li[^>]*>)(.*?)(<\/li>)/gi, function (match, openTag, content, closeTag) {
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
    });
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
  return document.getElementById('chat-messages');
}

function scrollToBottom() {
  const msgContainer = getMessagesContainer();
  if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
}

// Promisified word-by-word typing (so lists can type each li sequentially)
function typeWordsAsync(el, htmlText, wordDelay = 99) {
  return new Promise((resolve) => {
    // Render visible text progressively, then swap in linked HTML to preserve anchors
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlText;
    const visible = (tmp.textContent || tmp.innerText || '').trim();

    const words = visible.split(/\s+/).filter(Boolean);
    el.textContent = '';
    let i = 0;

    const tick = () => {
      if (i >= words.length) {
        // After typing, replace with linkified original HTML (so links are clickable)
        el.innerHTML = linkifyText(htmlText);
        scrollToBottom();
        resolve();
        return;
      }
      el.textContent += (i === 0 ? '' : ' ') + words[i++];
      scrollToBottom();
      setTimeout(tick, wordDelay);
    };
    tick();
  });
}

// Animate each <li> inside one or more <ul>, word-by-word per item
async function typeListAsync(msgBubble, ulHTML, itemWordDelay = 26, gapBetweenItems = 120) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = ulHTML.trim();

  const uls = Array.from(wrapper.querySelectorAll('ul'));
  if (uls.length === 0) {
    // Fallback: not a list — type as words
    const p = createEl('div', '');
    msgBubble.appendChild(p);
    await typeWordsAsync(p, ulHTML, itemWordDelay);
    return;
  }

  for (const srcUL of uls) {
    const dstUL = document.createElement('ul');
    msgBubble.appendChild(dstUL);

    const items = Array.from(srcUL.children).filter(li => li.tagName.toLowerCase() === 'li');

    for (const srcLI of items) {
      const li = document.createElement('li');
      dstUL.appendChild(li);

      // Create a span to type into, then swap to linked HTML when finished
      const span = document.createElement('span');
      li.appendChild(span);

      // Word-by-word typing using the li's innerHTML (preserving links at the end)
      await typeWordsAsync(span, srcLI.innerHTML, itemWordDelay);

      // Optional small gap before starting next bullet
      await new Promise(r => setTimeout(r, gapBetweenItems));
    }
  }
}

// === Render a message (user: instant, bot: animated word-by-word) ===
function addMessage(sender, text) {
  const msgContainer = document.getElementById('chat-messages');

  const wrapper = document.createElement('div');
  wrapper.className = `chat-message-wrapper ${sender}`;

  const avatar = document.createElement('img');
  avatar.src = sender === 'user' ? './assets/images/user.png' : './assets/images/hero.png';
  avatar.alt = `${sender} avatar`;
  avatar.className = 'chat-avatar';

  const msgBubble = document.createElement('div');
  msgBubble.className = `${sender}-message`;

  // Keep your existing processing flow
  let processedText = text;
  if (sender === 'bot') {
    // If backend already returned <ul><li>, respect it
    const isHTMLList = text.includes('<ul>') && text.includes('<li>');
    if (!isHTMLList) {
      processedText = convertMarkdownToHtml(text); // your existing converter
    }
  }

  const linkified = linkifyText(processedText);

  if (sender === 'user') {
    // user message: render instantly
    wrapper.appendChild(avatar);
    wrapper.appendChild(msgBubble);
    msgBubble.innerHTML = linkified;
    msgContainer.appendChild(wrapper);
    scrollToBottom();
  } else {
    // bot message: animate (word-by-word globally; lists type li word-by-word)
    wrapper.appendChild(msgBubble);
    wrapper.appendChild(avatar);
    msgContainer.appendChild(wrapper);
    scrollToBottom();

    if (linkified.includes('<ul>') && linkified.includes('<li>')) {
      // Animate list items, typing each item's words
      typeListAsync(msgBubble, linkified, 26, 120);
    } else {
      const p = document.createElement('div');
      msgBubble.appendChild(p);
      // Word-by-word animation
      typeWordsAsync(p, linkified, 26);
    }
  }
}
