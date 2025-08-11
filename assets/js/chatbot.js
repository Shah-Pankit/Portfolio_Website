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
    const response = await fetch('http://127.0.0.1:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    addMessage('bot', data.reply);
  } catch (err) {
    addMessage('bot', '⚠️ Failed to get response. Check server.');
  }
}

function convertMarkdownToHtml(text) {
  let html = text;
  
  // Convert bold text **text** to <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert bullet points (lines starting with * or -) to HTML lists
  const lines = html.split('\n');
  const result = [];
  let inList = false;
  let currentList = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line is a bullet point (starts with * or - followed by space)
    if (/^\s*[\*\-]\s+/.test(line)) {
      const bulletContent = line.replace(/^\s*[\*\-]\s+/, '');
      currentList.push(`<li>${bulletContent}</li>`);
      
      if (!inList) {
        inList = true;
      }
    } else {
      // If we were in a list and now we're not, close the list
      if (inList && currentList.length > 0) {
        result.push(`<ul>${currentList.join('')}</ul>`);
        currentList = [];
        inList = false;
      }
      
      // Add the non-list line (skip empty lines between sections)
      if (line) {
        result.push(line);
      }
    }
  }
  
  // Close any remaining list
  if (inList && currentList.length > 0) {
    result.push(`<ul>${currentList.join('')}</ul>`);
  }
  
  return result.join('<br>');
}

function addMessage(sender, text) {
  const msgContainer = document.getElementById('chat-messages');

  const wrapper = document.createElement('div');
  wrapper.className = `chat-message-wrapper ${sender}`;

  const avatar = document.createElement('img');
  avatar.src = sender === 'user'
    ? './assets/images/user.png'
    : './assets/images/hero.png';
  avatar.alt = `${sender} avatar`;
  avatar.className = 'chat-avatar';

  const msgBubble = document.createElement('div');
  msgBubble.className = `${sender}-message`;

  let processedText = text;

  // For bot messages, convert markdown to HTML
  if (sender === 'bot') {
    // Check if it already contains HTML
    if (text.includes('<ul>') && text.includes('<li>')) {
      processedText = text; // Already HTML
    } else {
      // Convert markdown to HTML
      processedText = convertMarkdownToHtml(text);
    }
  }

  // Apply linkification
  const linkified = processedText
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      `<a href="$1" target="_blank" class="chat-link">$1</a>`
    )
    .replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      `<a href="mailto:$1" class="chat-link">$1</a>`
    );

  msgBubble.innerHTML = linkified;

  // Arrange order based on sender
  if (sender === 'user') {
    wrapper.appendChild(avatar);
    wrapper.appendChild(msgBubble);
  } else {
    wrapper.appendChild(msgBubble);
    wrapper.appendChild(avatar);
  }

  msgContainer.appendChild(wrapper);
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

function linkifyText(text) {
  // Handle HTML content more carefully
  if (text.includes('<ul>') || text.includes('<li>')) {
    // For HTML lists, only linkify the text content inside <li> tags
    return text.replace(
      /(<li[^>]*>)(.*?)(<\/li>)/gi,
      function(match, openTag, content, closeTag) {
        const linkifiedContent = content
          .replace(
            /((mailto:)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            `<a href="mailto:$1" target="_blank" class="chat-link">$1</a>`
          )
          .replace(
            /(https?:\/\/[^\s<]+)/g,
            `<a href="$1" target="_blank" class="chat-link">$1</a>`
          );
        return openTag + linkifiedContent + closeTag;
      }
    );
  } else {
    // For plain text, apply normal linkification
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
}